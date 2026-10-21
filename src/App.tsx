import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { ModuleResolutionKind, typescriptDefaults } from 'monaco-editor/languages/features/typescript/register.js'
import { Activity, AlertCircle, Check, ChevronDown, ChevronRight, Circle, Copy, FileCode2, FilePlus2, Folder, FolderOpen, FolderPlus, Moon, Play, RotateCcw, Save, SlidersHorizontal, Square, Sun, Waves, X } from 'lucide-react'
import './App.css'
import { isAllowedProjectFile, isProjectEntry, isProjectSource, readProjectDirectory, starterHtmlProject, starterProject, writeProjectDirectory } from './project'
import type { CurveResource, DirectoryHandle, Project } from './project'
import { startHtmlPreview, startPreview } from './runtime'
import type { ParameterDefinition, ParameterValue, PreviewRuntime } from './runtime'

loader.config({ monaco })

type Status = 'ready' | 'running' | 'paused' | 'error'
type FileTreeNode = { name: string; path: string; children?: FileTreeNode[] }
type ProjectDraft = { project: Project; activeFile: string; savedAt: number }
const draftStorageKey = 'motion-workbench-draft-v1'

function readDraft(): ProjectDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(draftStorageKey) ?? 'null') as ProjectDraft | null
    if (!value || !value.project?.manifest || !value.project.files || typeof value.activeFile !== 'string' || !Number.isFinite(value.savedAt)) return null
    const manifest = value.project.manifest
    if (manifest.formatVersion !== 1 || !['canvas2d', 'html'].includes(manifest.projectType) || typeof manifest.entry !== 'string' || typeof manifest.name !== 'string') return null
    if (!Object.keys(value.project.files).length || Object.values(value.project.files).some((contents) => typeof contents !== 'string')) return null
    return value
  } catch {
    return null
  }
}

function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = []
  for (const path of paths) {
    const parts = path.split('/')
    let nodes = root
    let parentPath = ''
    parts.forEach((name, index) => {
      const nodePath = parentPath ? `${parentPath}/${name}` : name
      let node = nodes.find((candidate) => candidate.name === name)
      if (!node) {
        node = { name, path: nodePath, ...(index < parts.length - 1 ? { children: [] } : {}) }
        nodes.push(node)
      }
      if (node.children) nodes = node.children
      parentPath = nodePath
    })
  }
  const sort = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => Number(!a.children) - Number(!b.children) || a.name.localeCompare(b.name))
    nodes.forEach((node) => node.children && sort(node.children))
  }
  sort(root)
  return root
}

function App() {
  const [project, setProject] = useState<Project>(starterProject)
  const [activeFile, setActiveFile] = useState(starterProject.manifest.entry)
  const [saved, setSaved] = useState(true)
  const [status, setStatus] = useState<Status>('ready')
  const [previewReady, setPreviewReady] = useState(false)
  const [message, setMessage] = useState('Ready to run')
  const [split, setSplit] = useState(50)
  const [consoleOpen, setConsoleOpen] = useState(true)
  const [workspaceMode, setWorkspaceMode] = useState<'code' | 'curve' | 'parameters'>('code')
  const [selectedCurveId, setSelectedCurveId] = useState<string | null>(null)
  const [draggingCurveHandle, setDraggingCurveHandle] = useState<number | null>(null)
  const [parameters, setParameters] = useState<ParameterDefinition[]>([])
  const [parameterValues, setParameterValues] = useState<Record<string, ParameterValue>>({})
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState<ProjectDraft | null>(() => readDraft())
  const [projectLoadId, setProjectLoadId] = useState(0)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [directoryName, setDirectoryName] = useState('Orbit study')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('workbench-theme') === 'light' ? 'light' : 'dark')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const runtimeRef = useRef<PreviewRuntime | null>(null)
  const projectRef = useRef(project)
  const directoryRef = useRef<DirectoryHandle | null>(null)
  const projectModelsRef = useRef(new Set<string>())

  useEffect(() => {
    if (saved) return
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify({ project, activeFile, savedAt: Date.now() } satisfies ProjectDraft))
      } catch {
        setMessage('Draft could not be stored in this browser')
      }
    }, 400)
    return () => window.clearTimeout(timeout)
  }, [project, activeFile, saved])

  useLayoutEffect(() => {
    projectRef.current = project
  }, [project])

  const sourceFiles = useMemo(() => Object.keys(project.files).filter(isProjectSource).sort(), [project.files])
  const fileTree = useMemo(() => buildFileTree(sourceFiles), [sourceFiles])
  const selectedCurve = project.manifest.curves?.find((curve) => curve.id === selectedCurveId)

  useEffect(() => {
    typescriptDefaults.setEagerModelSync(true)
    typescriptDefaults.setCompilerOptions({
      ...typescriptDefaults.getCompilerOptions(),
      allowNonTsExtensions: true,
      moduleResolution: ModuleResolutionKind.NodeJs,
      noEmit: true,
    })
    const currentModels = new Set<string>()
    for (const [path, contents] of Object.entries(project.files)) {
      const uri = monaco.Uri.parse(`file:///${path}`)
      const key = uri.toString()
      currentModels.add(key)
      const language = /\.html?$/i.test(path) ? 'html' : /\.css$/i.test(path) ? 'css' : /\.tsx?$/i.test(path) ? 'typescript' : 'javascript'
      const model = monaco.editor.getModel(uri)
      if (model) {
        if (model.getValue() !== contents) model.setValue(contents)
        if (model.getLanguageId() !== language) monaco.editor.setModelLanguage(model, language)
      } else {
        monaco.editor.createModel(contents, language, uri)
      }
    }
    for (const key of projectModelsRef.current) {
      if (!currentModels.has(key)) monaco.editor.getModel(monaco.Uri.parse(key))?.dispose()
    }
    projectModelsRef.current = currentModels
  }, [project.files])

  const updateFile = (contents: string | undefined) => {
    if (contents === undefined) return
    setProject((current) => ({ ...current, files: { ...current.files, [activeFile]: contents } }))
    setSaved(false)
  }

  const applyCode = useCallback(async () => {
    const currentProject = projectRef.current
    setMessage('Compiling project…')
    try {
      const runtime = currentProject.manifest.projectType === 'html'
        ? startHtmlPreview(iframeRef.current!, currentProject, (nextParameters, values) => {
          setParameters(nextParameters)
          setParameterValues(values)
        }, currentProject.manifest.parameterValues)
        : await startPreview(canvasRef.current!, currentProject, (error) => {
          setStatus('error')
          setMessage(error.message)
        }, currentProject.manifest.parameterValues)
      runtimeRef.current?.dispose()
      runtimeRef.current = runtime
      setParameters(runtime.parameters)
      setParameterValues(runtime.getParameterValues())
      setPreviewReady(true)
      setStatus('running')
      setMessage(`Applied ${currentProject.manifest.entry}`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    const request = requestAnimationFrame(() => { void applyCode() })
    return () => cancelAnimationFrame(request)
  }, [applyCode, projectLoadId])

  const openProject = async () => {
    if (!window.showDirectoryPicker) {
      setMessage('Project folders need a Chromium browser with File System Access support')
      return
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' }) as DirectoryHandle
      const opened = await readProjectDirectory(handle)
      runtimeRef.current?.dispose()
      runtimeRef.current = null
      setParameters([])
      setParameterValues({})
      setPreviewReady(false)
      directoryRef.current = handle
      setDirectoryName(handle.name)
      setProject(opened)
      setSelectedCurveId(null)
      setWorkspaceMode('code')
      setProjectLoadId((id) => id + 1)
      setActiveFile(opened.manifest.entry)
      setSaved(true)
      setStatus('ready')
      setMessage(`Opened ${handle.name}`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const saveProject = async () => {
    if (!window.showDirectoryPicker) {
      setMessage('Project folders need a Chromium browser with File System Access support')
      return
    }
    try {
      let handle = directoryRef.current
      if (!handle) {
        handle = await window.showDirectoryPicker({ mode: 'readwrite' }) as DirectoryHandle
        directoryRef.current = handle
        setDirectoryName(handle.name)
      } else if (handle.requestPermission && await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
        handle = await window.showDirectoryPicker({ mode: 'readwrite' }) as DirectoryHandle
        directoryRef.current = handle
        setDirectoryName(handle.name)
      }
      await writeProjectDirectory(handle, project)
      localStorage.removeItem(draftStorageKey)
      setDraftPrompt(null)
      setSaved(true)
      setMessage(`Saved ${handle.name}/project.json`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const addFile = () => {
    const path = window.prompt('New file path', project.manifest.projectType === 'html' ? 'styles/new-style.css' : 'src/new-file.ts')?.trim().replaceAll('\\', '/')
    if (!path) return
    if (!isAllowedProjectFile(path, project.manifest.projectType)) {
      setMessage(project.manifest.projectType === 'html' ? 'Use an .html or .css file' : 'Use a .js, .jsx, .ts, or .tsx source file')
      return
    }
    if (path.startsWith('/') || path.split('/').includes('..') || path in project.files) {
      setMessage('Choose a unique path inside the project')
      return
    }
    setProject((current) => ({ ...current, files: { ...current.files, [path]: 'export {}\n' } }))
    setActiveFile(path)
    setSelectedCurveId(null)
    setWorkspaceMode('code')
    setSaved(false)
  }

  const resetRuntime = () => {
    if (!runtimeRef.current) {
      void applyCode()
      return
    }
    runtimeRef.current.reset()
    setStatus('running')
    setMessage('Simulation reset')
  }

  const updateParameter = (id: string, value: ParameterValue) => {
    const runtime = runtimeRef.current
    runtime?.setParameter(id, value)
    const values = runtime?.getParameterValues() ?? {}
    setParameterValues(values)
    setProject((current) => ({ ...current, manifest: { ...current.manifest, parameterValues: values } }))
    setSaved(false)
  }

  const resetParameters = () => {
    runtimeRef.current?.resetParameters()
    const values = runtimeRef.current?.getParameterValues() ?? {}
    setParameterValues(values)
    setProject((current) => ({ ...current, manifest: { ...current.manifest, parameterValues: values } }))
    setSaved(false)
  }

  const updateCurvePoint = (curveId: string, pointIndex: number, value: number) => {
    const currentCurve = projectRef.current.manifest.curves?.find((curve) => curve.id === curveId)
    if (currentCurve) {
      const points = currentCurve.points.map((point, index) => index === pointIndex ? value : point) as CurveResource['points']
      setCurvePoints(curveId, points)
    }
  }

  const setCurvePoints = (curveId: string, points: CurveResource['points']) => {
    runtimeRef.current?.setCurve?.(curveId, points)
    setProject((current) => ({
      ...current,
      manifest: {
        ...current.manifest,
        curves: (current.manifest.curves ?? []).map((curve) => curve.id !== curveId ? curve : {
          ...curve,
          points,
        }),
      },
    }))
    setSaved(false)
  }

  const updateCurveFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (draggingCurveHandle === null || !selectedCurve) return
    const svg = event.currentTarget
    const transform = svg.getScreenCTM()
    if (!transform) return
    const pointer = svg.createSVGPoint()
    pointer.x = event.clientX
    pointer.y = event.clientY
    const point = pointer.matrixTransform(transform.inverse())
    const x = Math.max(0, Math.min(1, (point.x - 32) / 256))
    const y = Math.max(-2, Math.min(3, (216 - point.y) / 192))
    const points = [...selectedCurve.points] as CurveResource['points']
    points[draggingCurveHandle * 2] = x
    points[draggingCurveHandle * 2 + 1] = y
    setCurvePoints(selectedCurve.id, points)
  }

  const addCurve = () => {
    const id = `curve-${crypto.randomUUID().slice(0, 8)}`
    const curve: CurveResource = { id, name: `Curve ${(project.manifest.curves?.length ?? 0) + 1}`, type: 'cubic-bezier', points: [0.25, 0.1, 0.25, 1] }
    setProject((current) => ({ ...current, manifest: { ...current.manifest, curves: [...(current.manifest.curves ?? []), curve] } }))
    setSelectedCurveId(id)
    setWorkspaceMode('curve')
    setSaved(false)
  }

  const renameCurve = (curveId: string, name: string) => {
    setProject((current) => ({ ...current, manifest: { ...current.manifest, curves: (current.manifest.curves ?? []).map((curve) => curve.id === curveId ? { ...curve, name } : curve) } }))
    setSaved(false)
  }

  const duplicateCurve = (curveId: string) => {
    const source = project.manifest.curves?.find((curve) => curve.id === curveId)
    if (!source) return
    const copy: CurveResource = { ...source, id: `curve-${crypto.randomUUID().slice(0, 8)}`, name: `${source.name} copy`, points: [...source.points] }
    setProject((current) => ({ ...current, manifest: { ...current.manifest, curves: [...(current.manifest.curves ?? []), copy] } }))
    setSelectedCurveId(copy.id)
    setWorkspaceMode('curve')
    setSaved(false)
  }

  const recoverDraft = () => {
    if (!draftPrompt) return
    runtimeRef.current?.dispose()
    runtimeRef.current = null
    setProject(draftPrompt.project)
    setActiveFile(draftPrompt.project.files[draftPrompt.activeFile] === undefined ? draftPrompt.project.manifest.entry : draftPrompt.activeFile)
    setDirectoryName(draftPrompt.project.manifest.name)
    setSaved(false)
    setProjectLoadId((id) => id + 1)
    setDraftPrompt(null)
    setMessage('Recovered unsaved draft')
  }

  const discardDraft = () => {
    localStorage.removeItem(draftStorageKey)
    setDraftPrompt(null)
  }

  const toggleRuntime = () => {
    if (!runtimeRef.current) {
      void applyCode()
      return
    }
    if (runtimeRef.current.getPaused()) {
      runtimeRef.current.resume()
      setStatus('running')
      setMessage('Simulation running')
    } else {
      runtimeRef.current.pause()
      setStatus('paused')
      setMessage('Simulation paused')
    }
  }

  const dragSplit = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
    const move = (pointer: PointerEvent) => {
      if (bounds) setSplit(Math.max(30, Math.min(70, ((pointer.clientX - bounds.left) / bounds.width) * 100)))
    }
    const done = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', done)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', done)
  }

  const removeFile = (path: string) => {
    if (path === project.manifest.entry) {
      setMessage('The entry file cannot be removed')
      return
    }
    setProject((current) => {
      const files = { ...current.files }
      delete files[path]
      return { ...current, files }
    })
    if (activeFile === path) setActiveFile(project.manifest.entry)
    setSaved(false)
  }

  const createProject = (type: 'canvas2d' | 'html') => {
    runtimeRef.current?.dispose()
    runtimeRef.current = null
    setParameters([])
    setParameterValues({})
    const nextProject = type === 'html' ? starterHtmlProject : starterProject
    setProject(nextProject)
    setSelectedCurveId(null)
    setWorkspaceMode('code')
    setProjectLoadId((id) => id + 1)
    setActiveFile(nextProject.manifest.entry)
    setDirectoryName(nextProject.manifest.name)
    setSaved(false)
    setStatus('ready')
    setPreviewReady(false)
    directoryRef.current = null
    setMessage(`${type === 'html' ? 'HTML/CSS' : 'Canvas2D'} project created`)
    setNewProjectOpen(false)
  }

  const editorLanguage = useMemo(() => {
    if (/\.html?$/i.test(activeFile)) return 'html'
    if (/\.css$/i.test(activeFile)) return 'css'
    return activeFile.endsWith('.ts') || activeFile.endsWith('.tsx') ? 'typescript' : 'javascript'
  }, [activeFile])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('workbench-theme', nextTheme)
  }

  const renderTree = (nodes: FileTreeNode[], depth = 0): ReactNode => nodes.map((node) => node.children ? <div key={node.path}>
    <button className="folder-row" style={{ paddingLeft: 10 + depth * 13 }} onClick={() => setCollapsedFolders((current) => {
      const next = new Set(current)
      if (next.has(node.path)) next.delete(node.path)
      else next.add(node.path)
      return next
    })}>{collapsedFolders.has(node.path) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}<Folder size={14} /><span>{node.name}</span></button>
    {!collapsedFolders.has(node.path) && renderTree(node.children, depth + 1)}
  </div> : <div className={`file-row ${activeFile === node.path ? 'selected' : ''}`} key={node.path} style={{ paddingLeft: 15 + depth * 13 }}>
    <button className="file-select" onClick={() => { setActiveFile(node.path); setSelectedCurveId(null); setWorkspaceMode('code') }}><FileCode2 size={14} /><span>{node.name}</span></button>
    <button className={`entry-button ${project.manifest.entry === node.path ? 'is-entry' : ''}`} disabled={!isProjectEntry(node.path, project.manifest.projectType)} onClick={() => {
      setProject((current) => ({ ...current, manifest: { ...current.manifest, entry: node.path } }))
      setActiveFile(node.path)
      setSaved(false)
      setMessage(`Entry file set to ${node.path}`)
    }} title={project.manifest.entry === node.path ? 'Entry file' : 'Set as entry file'}><Circle size={9} fill={project.manifest.entry === node.path ? 'currentColor' : 'none'} /></button>
    {project.manifest.entry !== node.path && <button className="file-remove" onClick={() => removeFile(node.path)} title={`Remove ${node.path}`}><Square size={11} /></button>}
  </div>)

  return (
    <main className="workbench" data-theme={theme}>
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Waves size={16} /></div><span>MOTIONWORKBENCH</span><span className="brand-divider">/</span><span className="project-name">{project.manifest.name}</span>{!saved && <span className="dirty-mark" title="Unsaved changes" />}</div>
        <div className="top-actions">
          <button className="tool-button" onClick={() => setNewProjectOpen(true)} title="Create a project"><FolderPlus size={15} /><span>New</span></button>
          <button className="tool-button" onClick={openProject} title="Open project folder"><FolderOpen size={15} /><span>Open</span></button>
          <button className="tool-button" onClick={saveProject} title="Save project folder"><Save size={15} /><span>Save</span></button>
          <span className="top-separator" />
          <button className="icon-button theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button className="run-button" onClick={applyCode}><Play size={14} fill="currentColor" /> Apply</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="explorer">
          <div className="section-heading"><span>EXPLORER</span><div><button className="icon-button" onClick={addFile} title="New source file"><FilePlus2 size={15} /></button><button className="icon-button" onClick={openProject} title="Open project folder"><FolderPlus size={15} /></button></div></div>
          <button className="tree-root" onClick={() => setMessage(`${directoryName} · ${sourceFiles.length} source files`)}><ChevronDown size={14} /><span>{directoryName.toUpperCase()}</span></button>
          <div className="file-list">
            {renderTree(fileTree)}
          </div>
          <section className="curves-list" aria-label="Project curves">
            <div className="curves-list-heading"><span>CURVES</span><button className="icon-button" onClick={addCurve} title="New curve"><FilePlus2 size={14} /></button></div>
            {(project.manifest.curves ?? []).map((curve) => {
              const [x1, y1, x2, y2] = curve.points
              return <div className={`curve-row ${selectedCurveId === curve.id ? 'selected' : ''}`} key={curve.id}>
                <button className="curve-row-select" onClick={() => { setSelectedCurveId(curve.id); setWorkspaceMode('curve') }} title={`Edit ${curve.name}`}>
                  <svg viewBox="0 0 32 20" aria-hidden="true"><path d={`M1 19 C${1 + x1 * 30} ${19 - y1 * 18}, ${1 + x2 * 30} ${19 - y2 * 18}, 31 1`} /></svg>
                  <span>{curve.name}</span>
                </button>
                <button className="icon-button curve-copy" onClick={() => duplicateCurve(curve.id)} title={`Duplicate ${curve.name}`}><Copy size={12} /></button>
              </div>
            })}
            {!(project.manifest.curves?.length) && <div className="parameters-empty">No curves yet.</div>}
          </section>
          <div className="explorer-foot"><button className={`parameters-toggle ${workspaceMode === 'parameters' ? 'active' : ''}`} onClick={() => setWorkspaceMode((mode) => mode === 'parameters' ? 'code' : 'parameters')} aria-pressed={workspaceMode === 'parameters'}><SlidersHorizontal size={13} /><span>Parameters</span><span className="parameter-count">{parameters.length}</span></button><span className="file-count">{sourceFiles.length.toString().padStart(2, '0')} files</span></div>
        </aside>

        <section className="editor-area" style={{ gridTemplateColumns: `${split}fr 5px ${100 - split}fr` }}>
          {workspaceMode === 'parameters' ? <section className="parameter-editor">
            <div className="panel-tabs"><div className="active-tab"><SlidersHorizontal size={13} />Parameters</div><div className="editor-actions"><button className="icon-button" onClick={resetParameters} disabled={!parameters.length} title="Restore parameter defaults"><RotateCcw size={13} /></button></div></div>
            <div className="parameter-editor-content">
              {parameters.length ? <div className="parameter-grid">{parameters.map((parameter) => <label className="parameter-card" key={parameter.id}>
                <span className="parameter-label">{parameter.label}<small>{parameter.group ?? parameter.id}</small></span>
                {parameter.type === 'number' && <div className="parameter-number"><input type="range" min={parameter.min} max={parameter.max} step={parameter.step ?? 'any'} value={Number(parameterValues[parameter.id] ?? parameter.default)} onChange={(event) => updateParameter(parameter.id, Number(event.target.value))} aria-label={parameter.label} /><input type="number" min={parameter.min} max={parameter.max} step={parameter.step ?? 'any'} value={Number(parameterValues[parameter.id] ?? parameter.default)} onChange={(event) => updateParameter(parameter.id, Number(event.target.value))} aria-label={`${parameter.label} value`} /></div>}
                {parameter.type === 'boolean' && <input className="parameter-checkbox" type="checkbox" checked={Boolean(parameterValues[parameter.id] ?? parameter.default)} onChange={(event) => updateParameter(parameter.id, event.target.checked)} />}
                {parameter.type === 'color' && <input className="parameter-color" type="color" value={String(parameterValues[parameter.id] ?? parameter.default)} onChange={(event) => updateParameter(parameter.id, event.target.value)} aria-label={parameter.label} />}
                {parameter.type === 'select' && <select value={String(parameterValues[parameter.id] ?? parameter.default)} onChange={(event) => updateParameter(parameter.id, event.target.value)} aria-label={parameter.label}>{parameter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
              </label>)}</div> : <div className="parameter-empty-state">No parameters declared in this project.</div>}
            </div>
          </section> : workspaceMode === 'curve' && selectedCurve ? <div className="curve-editor">
            <div className="panel-tabs"><div className="active-tab"><Waves size={13} />{selectedCurve.name}<span className="curve-id">{selectedCurve.id}</span></div><div className="editor-actions"><span>CUBIC BEZIER</span></div></div>
            <div className="curve-editor-content">
              <div className="curve-editor-graph-wrap">
                <svg className="curve-editor-graph" viewBox="0 0 320 240" onPointerMove={updateCurveFromPointer} onPointerUp={() => setDraggingCurveHandle(null)} onPointerCancel={() => setDraggingCurveHandle(null)} role="img" aria-label={`${selectedCurve.name} curve editor`}>
                  <path className="curve-editor-grid" d="M32 24V216H288M32 120H288M160 24V216" />
                  <path className="curve-editor-handle-line" d={`M32 216L${32 + selectedCurve.points[0] * 256} ${216 - selectedCurve.points[1] * 192}M288 24L${32 + selectedCurve.points[2] * 256} ${216 - selectedCurve.points[3] * 192}`} />
                  <path className="curve-editor-line" d={`M32 216 C${32 + selectedCurve.points[0] * 256} ${216 - selectedCurve.points[1] * 192}, ${32 + selectedCurve.points[2] * 256} ${216 - selectedCurve.points[3] * 192}, 288 24`} />
                  {[0, 1].map((handle) => <circle key={handle} className="curve-editor-handle" cx={32 + selectedCurve.points[handle * 2] * 256} cy={216 - selectedCurve.points[handle * 2 + 1] * 192} r="6" onPointerDown={(event) => { event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId); setDraggingCurveHandle(handle) }} />)}
                </svg>
                <div className="curve-axis-labels"><span>START</span><span>PROGRESS</span><span>END</span></div>
              </div>
              <div className="curve-inspector">
                <label className="curve-name-field">NAME<input value={selectedCurve.name} onChange={(event) => renameCurve(selectedCurve.id, event.target.value)} /></label>
                <div className="curve-point-fields">{selectedCurve.points.map((point, index) => <label key={index}><span>{index < 2 ? 'P1' : 'P2'} · {index % 2 === 0 ? 'X' : 'Y'}</span><input type="number" min={index % 2 === 0 ? 0 : -2} max={index % 2 === 0 ? 1 : 3} step="0.01" value={point} onChange={(event) => updateCurvePoint(selectedCurve.id, index, Math.max(index % 2 === 0 ? 0 : -2, Math.min(index % 2 === 0 ? 1 : 3, Number(event.target.value))))} /></label>)}</div>
                <div className="curve-reference"><span>REFERENCE ID</span><code>{selectedCurve.id}</code></div>
                <button className="tool-button curve-duplicate-action" onClick={() => duplicateCurve(selectedCurve.id)}><Copy size={13} />Duplicate curve</button>
              </div>
            </div>
          </div> : <div className="editor-panel">
            <div className="panel-tabs"><div className="active-tab"><FileCode2 size={13} />{activeFile}<span className="tab-dirty">{saved ? '' : '●'}</span></div><div className="editor-actions"><span>{editorLanguage === 'typescript' ? 'TypeScript' : editorLanguage.toUpperCase()}</span><span>UTF-8</span></div></div>
            <div className="editor-body">
              <Editor
                height="100%"
                path={monaco.Uri.parse(`file:///${activeFile}`).toString()}
                language={editorLanguage}
                value={project.files[activeFile] ?? ''}
                onChange={updateFile}
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                options={{ minimap: { enabled: false }, fontSize: 13, lineHeight: 21, fontFamily: 'Consolas, monospace', scrollBeyondLastLine: false, padding: { top: 16 }, automaticLayout: true, tabSize: 2, wordWrap: 'off', renderLineHighlight: 'all', overviewRulerBorder: false }}
              />
            </div>
          </div>}
          <div className="splitter" onPointerDown={dragSplit} role="separator" aria-label="Resize editor and preview" />
          <div className="preview-column">
            <div className="preview-panel">
              <div className="panel-heading"><div className="heading-label"><span className="live-indicator" /><span>{project.manifest.projectType === 'html' ? 'PAGE PREVIEW' : 'CANVAS PREVIEW'}</span>{project.manifest.renderer.type === 'canvas2d' && <span className="dimensions">{project.manifest.renderer.width} × {project.manifest.renderer.height}</span>}</div><div className="preview-controls"><button className="icon-button" onClick={toggleRuntime} title={status === 'paused' ? 'Resume' : 'Pause'}>{status === 'paused' ? <Play size={14} /> : <Square size={13} />}</button><button className="icon-button" onClick={resetRuntime} title="Reset simulation"><RotateCcw size={14} /></button></div></div>
              <div className={`canvas-stage ${previewReady ? 'has-preview' : ''} ${project.manifest.projectType === 'html' ? 'html-stage' : ''}`}>
                {project.manifest.projectType === 'html' ? <iframe ref={iframeRef} title="HTML project preview" sandbox="allow-scripts" /> : <canvas ref={canvasRef} aria-label="Canvas2D animation preview" />}
                <div className="canvas-empty"><Activity size={17} /><span>Apply code to start the preview</span></div>
              </div>
              <div className="preview-footer"><span>{status === 'running' ? 'LIVE' : status.toUpperCase()}</span><span>{project.manifest.projectType === 'html' ? 'HTML / CSS' : 'CANVAS2D'}</span></div>
            </div>
            <section className={`console-panel ${consoleOpen ? '' : 'collapsed'}`}>
              <div className="console-heading"><button className="console-title" onClick={() => setConsoleOpen((open) => !open)}>{consoleOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}<span>OUTPUT</span></button><span className={`console-status ${status}`}>{status === 'error' ? <AlertCircle size={13} /> : <Check size={13} />}{status}</span></div>
              {consoleOpen && <div className={`console-message ${status === 'error' ? 'error-message' : ''}`}>{status === 'error' ? <AlertCircle size={14} /> : <Circle size={7} fill="currentColor" />}{message}</div>}
            </section>
          </div>
        </section>
      </div>

      <footer className="statusbar"><div><span className={`status-dot ${status}`} />{status === 'running' ? 'Running' : status === 'paused' ? 'Paused' : status === 'error' ? 'Build failed' : 'Idle'}<span className="status-divider" />{activeFile}</div><div><span>{project.manifest.projectType === 'html' ? 'HTML / CSS' : 'Canvas2D'}</span><span className="status-divider" /><span>Project format v1</span></div></footer>
      {newProjectOpen && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setNewProjectOpen(false) }}><section className="new-project-dialog" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><div className="dialog-heading"><div><span className="dialog-eyebrow">START A STUDY</span><h2 id="new-project-title">New project</h2></div><button className="icon-button" onClick={() => setNewProjectOpen(false)} title="Close"><X size={16} /></button></div><div className="project-choices"><button className="project-choice" onClick={() => createProject('canvas2d')}><span className="choice-icon canvas-choice"><Activity size={18} /></span><span><strong>Canvas2D</strong><small>TypeScript scene with a frame loop</small></span><ChevronRight size={16} /></button><button className="project-choice" onClick={() => createProject('html')}><span className="choice-icon html-choice"><FileCode2 size={18} /></span><span><strong>HTML + CSS</strong><small>A page for small visual experiments</small></span><ChevronRight size={16} /></button></div></section></div>}
      {draftPrompt && <div className="dialog-backdrop"><section className="new-project-dialog draft-dialog" role="dialog" aria-modal="true" aria-labelledby="draft-title"><div className="dialog-heading"><div><span className="dialog-eyebrow">UNSAVED WORK</span><h2 id="draft-title">Recover this draft?</h2></div></div><p>{draftPrompt.project.manifest.name} · {new Date(draftPrompt.savedAt).toLocaleString()}</p><div className="draft-actions"><button className="tool-button" onClick={discardDraft}>Discard</button><button className="tool-button primary-action" onClick={recoverDraft}>Recover draft</button></div></section></div>}
    </main>
  )
}

export default App
