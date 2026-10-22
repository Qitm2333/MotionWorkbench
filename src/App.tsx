import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import './monaco-workers'
import * as monaco from 'monaco-editor'
import { ModuleResolutionKind, typescriptDefaults } from 'monaco-editor/languages/features/typescript/register.js'
import { Activity, AlertCircle, BookOpen, Box, Check, ChevronDown, ChevronRight, Circle, Copy, Download, FileCode2, FilePlus2, Folder, FolderOpen, FolderPlus, Maximize2, Minimize2, Minus, Moon, Package, Pencil, Play, Plus, RotateCcw, Save, SlidersHorizontal, Square, Sun, Trash2, Upload, Waves, X } from 'lucide-react'
import './App.css'
import { createCurveFromPreset, curvePresets, isAllowedProjectFile, isProjectEntry, isProjectSource, readProjectDirectory, sampleCurveValue, starterHtmlProject, starterProject, validateProject, writeProjectDirectory } from './project'
import type { CurveResource, DirectoryHandle, Project } from './project'
import { startHtmlPreview, startPreview } from './runtime'
import type { ParameterDefinition, ParameterValue, PreviewRuntime } from './runtime'
import { ExamplesDialog } from './ExamplesDialog'
import { assetMime, encodeAsset, isProjectAsset } from './assets'
import { starterThreeProject } from './threeProject'
import { clearDraft, readDraft, saveDraft } from './drafts'
import type { ProjectDraft } from './drafts'

loader.config({ monaco })

type Status = 'ready' | 'running' | 'paused' | 'error'
type FileTreeNode = { name: string; path: string; children?: FileTreeNode[] }
type CurvePoints = Extract<CurveResource, { type: 'cubic-bezier' }>['points']
type PreviewDimensions = { width: number; height: number }
const layoutStorageKey = 'motion-workbench-layout-v1'
const editorFontSizeStorageKey = 'motion-workbench-editor-font-size-v1'
const defaultEditorFontSize = 13
const minEditorFontSize = 10
const maxEditorFontSize = 32

function readEditorFontSize() {
  try {
    const value = Number(localStorage.getItem(editorFontSizeStorageKey))
    return Number.isInteger(value) && value >= minEditorFontSize && value <= maxEditorFontSize ? value : defaultEditorFontSize
  } catch {
    return defaultEditorFontSize
  }
}

function readLayout() {
  try {
    const layout = JSON.parse(localStorage.getItem(layoutStorageKey) ?? 'null') as { split?: number; consoleOpen?: boolean } | null
    return { split: typeof layout?.split === 'number' ? Math.max(30, Math.min(70, layout.split)) : 50, consoleOpen: layout?.consoleOpen ?? true }
  } catch {
    return { split: 50, consoleOpen: true }
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

function resolveRelativeProjectPath(fromFile: string, reference: string) {
  if (!reference.startsWith('./') && !reference.startsWith('../')) return null
  const parts = [...fromFile.split('/').slice(0, -1), ...reference.split('/')]
  const resolved: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (!resolved.length) return null
      resolved.pop()
    } else {
      resolved.push(part)
    }
  }
  return resolved.join('/')
}

function relativeProjectPath(fromFile: string, targetFile: string) {
  const fromDirectory = fromFile.split('/').slice(0, -1)
  const targetParts = targetFile.split('/')
  let common = 0
  while (common < fromDirectory.length && common < targetParts.length && fromDirectory[common] === targetParts[common]) common += 1
  const relativeParts = [...Array(fromDirectory.length - common).fill('..'), ...targetParts.slice(common)]
  return `./${relativeParts.join('/')}`
}

function rewriteRelativeProjectReferences(files: Record<string, string>, oldPath: string, nextPath: string) {
  const oldPathWithoutExtension = oldPath.replace(/\.(?:[cm]?[jt]sx?|html?|css)$/i, '')
  const oldExtension = oldPath.slice(oldPathWithoutExtension.length)
  const nextPathWithoutExtension = nextPath.replace(/\.(?:[cm]?[jt]sx?|html?|css)$/i, '')
  let changedReferences = 0
  const nextFiles = Object.fromEntries(Object.entries(files).map(([filePath, contents]) => {
    const rewritten = contents.replace(/(["'`])((?:\.\.\/|\.\/)[^"'`]+)\1/g, (full, quote: string, reference: string) => {
      if (reference.includes('${')) return full
      const referencePath = reference.split(/[?#]/, 1)[0]
      const suffix = reference.slice(referencePath.length)
      const resolved = resolveRelativeProjectPath(filePath, referencePath)
      if (resolved !== oldPath && resolved !== oldPathWithoutExtension) return full
      const usesExtension = resolved === oldPath || referencePath.toLowerCase().endsWith(oldExtension.toLowerCase())
      const replacement = relativeProjectPath(filePath, usesExtension ? nextPath : nextPathWithoutExtension)
      changedReferences += 1
      return `${quote}${replacement}${suffix}${quote}`
    })
    return [filePath, rewritten]
  }))
  return { files: nextFiles, changedReferences }
}

function App() {
  const [project, setProject] = useState<Project>(starterProject)
  const [activeFile, setActiveFile] = useState(starterProject.manifest.entry)
  const [saved, setSaved] = useState(true)
  const [status, setStatus] = useState<Status>('ready')
  const [previewReady, setPreviewReady] = useState(false)
  const [message, setMessage] = useState('Ready to run')
  const [split, setSplit] = useState(() => readLayout().split)
  const [consoleOpen, setConsoleOpen] = useState(() => readLayout().consoleOpen)
  const [editorFontSize, setEditorFontSize] = useState(readEditorFontSize)
  const [workspaceMode, setWorkspaceMode] = useState<'code' | 'curve' | 'parameters'>('code')
  const [selectedCurveId, setSelectedCurveId] = useState<string | null>(null)
  const [draggingCurveHandle, setDraggingCurveHandle] = useState<number | null>(null)
  const [curvePreviewProgress, setCurvePreviewProgress] = useState(0.5)
  const [pendingCurveDelete, setPendingCurveDelete] = useState<string | null>(null)
  const [curveReplacementId, setCurveReplacementId] = useState('')
  const [parameters, setParameters] = useState<ParameterDefinition[]>([])
  const [parameterValues, setParameterValues] = useState<Record<string, ParameterValue>>({})
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [examplesOpen, setExamplesOpen] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState<ProjectDraft | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [projectLoadId, setProjectLoadId] = useState(0)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [directoryName, setDirectoryName] = useState('Orbit study')
  const [previewZoom, setPreviewZoom] = useState('fit')
  const [htmlViewport, setHtmlViewport] = useState('responsive')
  const [previewFullscreen, setPreviewFullscreen] = useState(false)
  const [stageSize, setStageSize] = useState<PreviewDimensions>({ width: 0, height: 0 })
  const [explorerDragActive, setExplorerDragActive] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('workbench-theme') === 'light' ? 'light' : 'dark')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const runtimeRef = useRef<PreviewRuntime | null>(null)
  const projectRef = useRef(project)
  const directoryRef = useRef<DirectoryHandle | null>(null)
  const projectModelsRef = useRef(new Set<string>())
  const importInputRef = useRef<HTMLInputElement>(null)
  const applyRequestRef = useRef(0)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const measureStage = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const style = getComputedStyle(stage)
    setStageSize({
      width: Math.max(1, stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)),
      height: Math.max(1, stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)),
    })
  }, [])

  useLayoutEffect(() => {
    measureStage()
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(measureStage)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [measureStage, previewFullscreen])

  useEffect(() => {
    localStorage.setItem(layoutStorageKey, JSON.stringify({ split, consoleOpen }))
  }, [split, consoleOpen])

  useEffect(() => {
    localStorage.setItem(editorFontSizeStorageKey, String(editorFontSize))
  }, [editorFontSize])

  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize: editorFontSize, lineHeight: Math.round(editorFontSize * 21 / defaultEditorFontSize) })
  }, [editorFontSize])

  useEffect(() => {
    let cancelled = false
    void readDraft().then((draft) => { if (!cancelled) setDraftPrompt(draft) }).catch(() => {}).finally(() => { if (!cancelled) setDraftLoaded(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (saved || !draftLoaded || draftPrompt) return
    const timeout = window.setTimeout(() => {
      void saveDraft({ project, activeFile, savedAt: Date.now() }).catch(() => {
        setMessage('Draft could not be stored in this browser')
      })
    }, 400)
    return () => window.clearTimeout(timeout)
  }, [project, activeFile, saved, draftLoaded, draftPrompt])

  useLayoutEffect(() => {
    projectRef.current = project
  }, [project])

  const sourceFiles = useMemo(() => Object.keys(project.files).filter(isProjectSource).sort(), [project.files])
  const fileTree = useMemo(() => buildFileTree(sourceFiles), [sourceFiles])
  const assetFiles = useMemo(() => Object.keys(project.assets ?? {}).sort(), [project.assets])
  const assetTree = useMemo(() => buildFileTree(assetFiles), [assetFiles])
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
    const requestId = ++applyRequestRef.current
    const currentProject = projectRef.current
    setMessage('Compiling project…')
    try {
      const runtime = currentProject.manifest.projectType === 'html'
        ? await startHtmlPreview(iframeRef.current!, currentProject, (nextParameters, values) => {
          if (requestId !== applyRequestRef.current) return
          setParameters(nextParameters)
          setParameterValues(values)
        }, currentProject.manifest.parameterValues, (error) => {
          if (requestId !== applyRequestRef.current) return
          setStatus('error')
          setMessage(error.message)
        }, () => requestId === applyRequestRef.current)
        : await startPreview(canvasRef.current!, currentProject, (error) => {
          if (requestId !== applyRequestRef.current) return
          setStatus('error')
          setMessage(error.message)
        }, currentProject.manifest.parameterValues, () => requestId === applyRequestRef.current)
      if (requestId !== applyRequestRef.current) {
        runtime.dispose()
        return
      }
      runtimeRef.current?.dispose()
      runtimeRef.current = runtime
      setParameters(runtime.parameters)
      setParameterValues(runtime.getParameterValues())
      setPreviewReady(true)
      setStatus('running')
      setMessage(`Applied ${currentProject.manifest.entry}`)
    } catch (error) {
      if (requestId !== applyRequestRef.current) return
      setStatus('error')
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    const request = requestAnimationFrame(() => { void applyCode() })
    return () => cancelAnimationFrame(request)
  }, [applyCode, projectLoadId])

  useEffect(() => {
    if (!previewFullscreen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewFullscreen])

  const openProject = async () => {
    if (!window.showDirectoryPicker) {
      importInputRef.current?.click()
      setMessage('Folder access is unavailable; choose a portable project bundle instead')
      return
    }
    try {
      // Opening an existing project only needs read access. Save requests write access later.
      const handle = await window.showDirectoryPicker({ mode: 'read' }) as DirectoryHandle
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

  const saveProject = async (snapshot: Project = projectRef.current) => {
    if (!window.showDirectoryPicker) {
      exportProject(snapshot)
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
      await writeProjectDirectory(handle, snapshot)
      await clearDraft()
      setDraftPrompt(null)
      setSaved(true)
      setMessage(`Saved ${handle.name}/project.json`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const saveAndApply = async () => {
    const editor = editorRef.current
    const model = editor?.getModel()
    const snapshot = model && activeFile
      ? { ...projectRef.current, files: { ...projectRef.current.files, [activeFile]: model.getValue() } }
      : projectRef.current
    projectRef.current = snapshot
    setProject(snapshot)
    await saveProject(snapshot)
    void applyCode()
  }

  const importDroppedFiles = async (files: File[]) => {
    if (!files.length) return
    const current = projectRef.current
    const accepted = files.filter((file) => isAllowedProjectFile(file.name, current.manifest.projectType) || isProjectAsset(file.name))
    if (!accepted.length) {
      setMessage(current.manifest.projectType === 'html' ? 'Drop source, model, texture, font, or media files into Explorer' : 'Drop .js, .jsx, .ts, or .tsx files into Explorer')
      return
    }
    const nextFiles = { ...current.files }
    const nextAssets = { ...(current.assets ?? {}) }
    const imported: string[] = []
    const normalizePath = (file: File) => {
      const relative = (file.webkitRelativePath || file.name).replaceAll('\\', '/')
      const parts = relative.split('/').filter((part) => part && part !== '.')
      if (parts.some((part) => part === '..') || relative.startsWith('/')) return file.name
      return parts.join('/')
    }
    for (const file of accepted) {
      const originalPath = normalizePath(file)
      if (isProjectAsset(originalPath) && !isAllowedProjectFile(originalPath, current.manifest.projectType)) {
        if (originalPath in nextFiles || originalPath in nextAssets) {
          setMessage(`Resource path already exists: ${originalPath}`)
          continue
        }
        nextAssets[originalPath] = encodeAsset(await file.arrayBuffer(), file.type || assetMime(originalPath))
        imported.push(originalPath)
        continue
      }
      if (!isAllowedProjectFile(originalPath, current.manifest.projectType)) continue
      const dot = originalPath.lastIndexOf('.')
      const stem = dot > originalPath.lastIndexOf('/') ? originalPath.slice(0, dot) : originalPath
      const extension = dot > originalPath.lastIndexOf('/') ? originalPath.slice(dot) : ''
      let targetPath = originalPath
      let suffix = 2
      while (targetPath in nextFiles || targetPath in nextAssets) targetPath = `${stem} (${suffix++})${extension}`
      nextFiles[targetPath] = await file.text()
      imported.push(targetPath)
    }
    if (!imported.length) return
    const firstHtml = imported.find((path) => /\.html?$/i.test(path))
    const nextProject = {
      ...current,
      files: nextFiles,
      assets: nextAssets,
      manifest: firstHtml && current.manifest.projectType === 'html'
        ? { ...current.manifest, entry: firstHtml }
        : current.manifest,
    }
    projectRef.current = nextProject
    setProject(nextProject)
    const firstSource = imported.find((path) => path in nextFiles)
    if (firstHtml ?? firstSource) setActiveFile((firstHtml ?? firstSource)!)
    setWorkspaceMode('code')
    setSelectedCurveId(null)
    setSaved(false)
    setMessage(`Imported ${imported.length} file${imported.length === 1 ? '' : 's'} into Explorer`)
    void applyCode()
  }

  const onExplorerDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setExplorerDragActive(false)
    void importDroppedFiles(Array.from(event.dataTransfer.files))
  }

  const previewBaseSize: PreviewDimensions = project.manifest.projectType === 'html'
    ? htmlViewport === 'responsive'
      ? stageSize
      : (() => {
        const [width, height] = htmlViewport.split('x').map(Number)
        return { width, height }
      })()
    : project.manifest.renderer.type === 'canvas2d'
      ? { width: project.manifest.renderer.width, height: project.manifest.renderer.height }
      : stageSize
  // Keep a small breathing room so Fit never lands exactly on the scrollbar
  // threshold and causes the stage to oscillate between scrollable states.
  const fitWidth = Math.max(1, stageSize.width - 16)
  const fitHeight = Math.max(1, stageSize.height - 16)
  const requestedZoom = previewZoom === 'fit' ? Math.min(1, fitWidth / Math.max(1, previewBaseSize.width), fitHeight / Math.max(1, previewBaseSize.height)) : Number(previewZoom) / 100
  const displayedZoom = Math.max(0.1, requestedZoom || 0.1)
  const previewFrameStyle = {
    width: `${previewBaseSize.width * displayedZoom}px`,
    height: `${previewBaseSize.height * displayedZoom}px`,
  }
  const previewContentStyle = {
    width: `${previewBaseSize.width}px`,
    height: `${previewBaseSize.height}px`,
    transform: `scale(${displayedZoom})`,
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
    const paused = runtimeRef.current.getPaused()
    setStatus(paused ? 'paused' : 'running')
    setMessage(paused ? 'Simulation reset while paused' : 'Simulation reset')
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
    if (currentCurve?.type === 'cubic-bezier') {
      const points = currentCurve.points.map((point, index) => index === pointIndex ? value : point) as CurvePoints
      setCurvePoints(curveId, points)
    }
  }

  const setCurvePoints = (curveId: string, points: CurvePoints) => {
    const existing = projectRef.current.manifest.curves?.find((curve) => curve.id === curveId)
    if (existing?.type === 'cubic-bezier') runtimeRef.current?.setCurve?.({ ...existing, points })
    setProject((current) => ({
      ...current,
      manifest: {
        ...current.manifest,
        curves: (current.manifest.curves ?? []).map((curve) => {
          if (curve.id !== curveId || curve.type !== 'cubic-bezier') return curve
          return { ...curve, points }
        }),
      },
    }))
    setSaved(false)
  }

  const updateCurveFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (draggingCurveHandle === null || selectedCurve?.type !== 'cubic-bezier') return
    const svg = event.currentTarget
    const transform = svg.getScreenCTM()
    if (!transform) return
    const pointer = svg.createSVGPoint()
    pointer.x = event.clientX
    pointer.y = event.clientY
    const point = pointer.matrixTransform(transform.inverse())
    const x = Math.max(0, Math.min(1, (point.x - 32) / 256))
    const y = Math.max(-2, Math.min(3, (216 - point.y) / 192))
    const points = [...selectedCurve.points] as CurvePoints
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

  const changeCurveType = (curveId: string, type: CurveResource['type']) => {
    const existing = projectRef.current.manifest.curves?.find((curve) => curve.id === curveId)
    if (existing && existing.type !== type) {
      const updated: CurveResource = type === 'linear'
        ? { id: existing.id, name: existing.name, type }
        : type === 'spring'
          ? { id: existing.id, name: existing.name, type, mass: 1, stiffness: 100, damping: 10 }
          : { id: existing.id, name: existing.name, type, points: [0.25, 0.1, 0.25, 1] }
      runtimeRef.current?.setCurve?.(updated)
    }
    setProject((current) => ({
      ...current,
      manifest: { ...current.manifest, curves: (current.manifest.curves ?? []).map((curve) => {
        if (curve.id !== curveId || curve.type === type) return curve
        const updated: CurveResource = type === 'linear'
          ? { id: curve.id, name: curve.name, type }
          : type === 'spring'
            ? { id: curve.id, name: curve.name, type, mass: 1, stiffness: 100, damping: 10 }
            : { id: curve.id, name: curve.name, type, points: [0.25, 0.1, 0.25, 1] }
        return updated
      }) },
    }))
    setSaved(false)
  }

  const addCurvePreset = (preset: string) => {
    const id = `curve-${crypto.randomUUID().slice(0, 8)}`
    const curve = createCurveFromPreset(preset, id)
    if (!curve) return
    setProject((current) => ({ ...current, manifest: { ...current.manifest, curves: [...(current.manifest.curves ?? []), curve] } }))
    setSelectedCurveId(curve.id)
    setWorkspaceMode('curve')
    setSaved(false)
  }

  const curveGraphPath = (curve: CurveResource, left: number, baseY: number, plotWidth: number, plotHeight: number) => {
    const sampleCount = curve.type === 'linear' ? 1 : 48
    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const progress = index / sampleCount
      const value = sampleCurveValue(curve, progress)
      const x = left + progress * plotWidth
      const y = baseY - value * plotHeight
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`
    }).join(' ')
  }

  const updateSpringCurve = (curve: Extract<CurveResource, { type: 'spring' }>, key: 'mass' | 'stiffness' | 'damping', value: number) => {
    const updated = { ...curve, [key]: value }
    runtimeRef.current?.setCurve?.(updated)
    setProject((current) => ({ ...current, manifest: { ...current.manifest, curves: (current.manifest.curves ?? []).map((item) => item.id === curve.id ? updated : item) } }))
    setSaved(false)
  }

  const curveReferences = (curveId: string) => Object.entries(project.files)
    .filter(([, source]) => new RegExp(`curves\\.sample\\(\\s*([\\x27\\x22\\x60])${escapeRegExp(curveId)}\\1`, 'g').test(source))
    .map(([path]) => path)

  const removeCurve = (curveId: string) => {
    const curve = project.manifest.curves?.find((item) => item.id === curveId)
    if (!curve) return
    const replacement = project.manifest.curves?.find((item) => item.id !== curveId)
    setPendingCurveDelete(curveId)
    setCurveReplacementId(replacement?.id ?? '')
  }

  const confirmRemoveCurve = async () => {
    if (!pendingCurveDelete) return
    const references = curveReferences(pendingCurveDelete)
    if (references.length && !project.manifest.curves?.some((item) => item.id === curveReplacementId && item.id !== pendingCurveDelete)) {
      setMessage('Choose a replacement for the referenced curve')
      return
    }
    const referencePattern = new RegExp(`(curves\\.sample\\(\\s*)([\\x27\\x22\\x60])${escapeRegExp(pendingCurveDelete)}\\2`, 'g')
    const files = references.length
      ? Object.fromEntries(Object.entries(project.files).map(([path, source]) => [path, source.replace(referencePattern, (_match, prefix: string, quote: string) => `${prefix}${quote}${curveReplacementId}${quote}`)]))
      : project.files
    const nextProject: Project = {
      ...project,
      files,
      manifest: { ...project.manifest, curves: (project.manifest.curves ?? []).filter((item) => item.id !== pendingCurveDelete) },
    }
    projectRef.current = nextProject
    setProject(nextProject)
    setSelectedCurveId(null)
    setWorkspaceMode('code')
    setPendingCurveDelete(null)
    setSaved(false)
    setMessage(references.length ? `Replaced curve references in ${references.length} file${references.length === 1 ? '' : 's'}` : 'Curve deleted')
    await applyCode()
  }

  const resetLayout = () => {
    setSplit(50)
    setConsoleOpen(true)
    setCollapsedFolders(new Set())
    setMessage('Workspace layout restored')
  }

  const exportProject = (snapshot: Project = projectRef.current) => {
    const blob = new Blob([JSON.stringify({ format: 'motion-workbench-project', version: 1, project: snapshot }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${snapshot.manifest.name.replace(/[^\w-]+/g, '-').toLowerCase() || 'motion-project'}.motionworkbench.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Project exported as a portable JSON bundle')
  }

  const importProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const bundle = JSON.parse(await file.text()) as { format?: string; version?: number; project?: Project }
      if (bundle.format !== 'motion-workbench-project' || bundle.version !== 1 || !bundle.project?.manifest || !bundle.project.files) throw new Error('Unsupported project bundle')
      const opened = validateProject(bundle.project)
      runtimeRef.current?.dispose()
      runtimeRef.current = null
      setProject(opened)
      setDirectoryName(opened.manifest.name)
      setActiveFile(opened.manifest.entry)
      setSelectedCurveId(null)
      setWorkspaceMode('code')
      setSaved(false)
      setPreviewReady(false)
      setProjectLoadId((id) => id + 1)
      directoryRef.current = null
      setMessage(`Imported ${file.name}; save to a project folder when ready`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const duplicateCurve = (curveId: string) => {
    const source = project.manifest.curves?.find((curve) => curve.id === curveId)
    if (!source) return
    const copy: CurveResource = source.type === 'cubic-bezier'
      ? { ...source, id: `curve-${crypto.randomUUID().slice(0, 8)}`, name: `${source.name} copy`, points: [...source.points] }
      : { ...source, id: `curve-${crypto.randomUUID().slice(0, 8)}`, name: `${source.name} copy` }
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
    void clearDraft().catch(() => setMessage('Draft could not be removed from this browser'))
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
    const nextProject = {
      ...projectRef.current,
      files: Object.fromEntries(Object.entries(projectRef.current.files).filter(([filePath]) => filePath !== path)),
    }
    projectRef.current = nextProject
    setProject(nextProject)
    if (activeFile === path) setActiveFile(projectRef.current.manifest.entry)
    setSaved(false)
    setMessage(`Removed ${path}`)
    void applyCode()
  }

  const renameFile = (path: string) => {
    const currentProject = projectRef.current
    if (!(path in currentProject.files)) return
    const slash = path.lastIndexOf('/')
    const directory = slash >= 0 ? path.slice(0, slash) : ''
    const currentName = slash >= 0 ? path.slice(slash + 1) : path
    const requestedName = window.prompt('Rename file', currentName)?.trim()
    if (!requestedName || requestedName === currentName) return
    if (requestedName === '.' || requestedName === '..' || /[\\/]/.test(requestedName)) {
      setMessage('Use a file name without a folder path')
      return
    }
    const nextPath = directory ? `${directory}/${requestedName}` : requestedName
    if (!isAllowedProjectFile(nextPath, currentProject.manifest.projectType)) {
      setMessage(`Use a supported ${currentProject.manifest.projectType === 'html' ? 'HTML, CSS, or JavaScript' : 'JavaScript or TypeScript'} file name`)
      return
    }
    if (nextPath in currentProject.files) {
      setMessage(`A file already exists at ${nextPath}`)
      return
    }
    const renamedFiles = rewriteRelativeProjectReferences(currentProject.files, path, nextPath)
    const nextFiles = { ...renamedFiles.files, [nextPath]: renamedFiles.files[path] }
    delete nextFiles[path]
    const nextProject = {
      ...currentProject,
      files: nextFiles,
      manifest: currentProject.manifest.entry === path
        ? { ...currentProject.manifest, entry: nextPath }
        : currentProject.manifest,
    }
    projectRef.current = nextProject
    setProject(nextProject)
    if (activeFile === path) setActiveFile(nextPath)
    setSaved(false)
    setMessage(`Renamed ${path} to ${nextPath}${renamedFiles.changedReferences ? ` · updated ${renamedFiles.changedReferences} reference${renamedFiles.changedReferences === 1 ? '' : 's'}` : ''}`)
    void applyCode()
  }

  const loadProjectCopy = (nextProject: Project) => {
    // Invalidate an in-flight compile before replacing the preview and its state.
    applyRequestRef.current += 1
    runtimeRef.current?.dispose()
    runtimeRef.current = null
    setParameters([])
    setParameterValues({})
    projectRef.current = nextProject
    setProject(nextProject)
    setSelectedCurveId(null)
    setWorkspaceMode('code')
    setCollapsedFolders(new Set())
    setPendingCurveDelete(null)
    setDraggingCurveHandle(null)
    setProjectLoadId((id) => id + 1)
    setActiveFile(nextProject.manifest.entry)
    setDirectoryName(nextProject.manifest.name)
    setSaved(false)
    setStatus('ready')
    setPreviewReady(false)
    directoryRef.current = null
  }

  const createProject = (type: 'canvas2d' | 'html' | 'three') => {
    const template = type === 'three' ? starterThreeProject : type === 'html' ? starterHtmlProject : starterProject
    loadProjectCopy(structuredClone(template))
    setMessage(`${type === 'three' ? 'Three.js' : type === 'html' ? 'HTML/CSS' : 'Canvas2D'} project created`)
    setNewProjectOpen(false)
  }

  const openExample = (exampleProject: Project, viewport?: string) => {
    loadProjectCopy(exampleProject)
    setPreviewZoom('fit')
    setHtmlViewport(viewport ?? 'responsive')
    setExamplesOpen(false)
    setMessage(`Opened example: ${exampleProject.manifest.name}`)
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
    <button className="file-remove" disabled={project.manifest.entry === node.path} onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); removeFile(node.path) }} title={project.manifest.entry === node.path ? 'Entry file cannot be removed' : 'Double-click to remove'} aria-label={project.manifest.entry === node.path ? 'Entry file cannot be removed' : `Double-click to remove ${node.path}`}><Trash2 size={12} /></button>
    <button className="file-select" onClick={() => { setActiveFile(node.path); setSelectedCurveId(null); setWorkspaceMode('code') }}><FileCode2 size={14} /><span>{node.name}</span></button>
    <div className="file-actions">
      <button className="file-rename" onClick={() => renameFile(node.path)} title={`Rename ${node.path}`} aria-label={`Rename ${node.path}`}><Pencil size={12} /></button>
      <button className={`entry-button ${project.manifest.entry === node.path ? 'is-entry' : ''}`} disabled={!isProjectEntry(node.path, project.manifest.projectType)} onClick={() => {
        if (projectRef.current.manifest.entry === node.path) return
        const nextProject = { ...projectRef.current, manifest: { ...projectRef.current.manifest, entry: node.path } }
        projectRef.current = nextProject
        setProject(nextProject)
        setActiveFile(node.path)
        setSaved(false)
        setMessage(`Entry file set to ${node.path}`)
        void applyCode()
      }} title={project.manifest.entry === node.path ? 'Entry file' : 'Set as entry file'}><Circle size={9} fill={project.manifest.entry === node.path ? 'currentColor' : 'none'} /></button>
    </div>
  </div>)

  const renderAssetTree = (nodes: FileTreeNode[], depth = 0): ReactNode => nodes.map((node) => node.children ? <div key={`asset-${node.path}`}>
    <div className="asset-folder" style={{ paddingLeft: 13 + depth * 13 }}><Folder size={13} /><span>{node.name}</span></div>
    {renderAssetTree(node.children, depth + 1)}
  </div> : <button className="asset-row" key={`asset-${node.path}`} style={{ paddingLeft: 17 + depth * 13 }} onClick={() => {
    const asset = project.assets?.[node.path]
    if (!asset) return
    setMessage(`${node.path} · ${asset.mime} · ${Math.round(asset.base64.length * 3 / 4 / 1024).toLocaleString()} KB`)
  }} title={node.path}><Package size={13} /><span>{node.name}</span></button>)

  return (
    <main className="workbench" data-theme={theme}>
      <header className="topbar">
        <div className="top-left">
          <div className="project-actions">
            <button className="tool-button" onClick={() => setNewProjectOpen(true)} title="Create a project"><FolderPlus size={15} /><span>New</span></button>
            <button className="tool-button" onClick={openProject} title="Open project folder"><FolderOpen size={15} /><span>Open</span></button>
            <button className="tool-button" onClick={() => void saveProject()} title="Save project folder"><Save size={15} /><span>Save</span></button>
          </div>
          <span className="top-separator" />
          <button className="tool-button" onClick={() => setExamplesOpen(true)} title="Browse examples"><BookOpen size={15} /><span>Examples</span></button>
        </div>
        <div className="top-actions">
          <button className="icon-button" onClick={() => importInputRef.current?.click()} title="Import portable project"><Upload size={15} /></button>
          <button className="icon-button" onClick={() => exportProject()} title="Export portable project"><Download size={15} /></button>
          <input ref={importInputRef} className="visually-hidden" type="file" accept=".json,.motionworkbench.json,application/json" onChange={importProject} />
          <span className="top-separator" />
          <button className="icon-button theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button className="run-button" onClick={applyCode}><Play size={14} fill="currentColor" /> Apply</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="explorer">
          <div className="section-heading"><span>EXPLORER</span><div><button className="icon-button" onClick={addFile} title="New source file"><FilePlus2 size={15} /></button><button className="icon-button" onClick={openProject} title="Open project folder"><FolderPlus size={15} /></button></div></div>
          <button className="tree-root" onClick={() => setMessage(`${directoryName} · ${sourceFiles.length} source files`)}><ChevronDown size={14} /><span>{directoryName.toUpperCase()}</span></button>
          <div className={`file-list ${explorerDragActive ? 'drag-active' : ''}`} onDragEnter={(event) => { event.preventDefault(); setExplorerDragActive(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExplorerDragActive(false) }} onDrop={onExplorerDrop}>
            {renderTree(fileTree)}
            {assetFiles.length > 0 && <details className="asset-section"><summary><ChevronRight size={12} /><span>ASSETS</span><small>{assetFiles.length}</small></summary><div className="asset-list">{renderAssetTree(assetTree)}</div></details>}
            {explorerDragActive && <div className="drop-overlay"><Upload size={17} /><span>Drop project files to import</span></div>}
          </div>
          <section className="curves-list" aria-label="Project curves">
            <div className="curves-list-heading"><span>CURVES</span><div className="curve-list-actions"><select className="curve-preset-select" aria-label="Add curve preset" value="" onChange={(event) => addCurvePreset(event.target.value)}><option value="" disabled>+ Preset</option>{(['Basic', 'Ease', 'Expressive'] as const).map((group) => <optgroup key={group} label={group}>{curvePresets.filter((preset) => preset.group === group).map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</optgroup>)}</select><button className="icon-button" onClick={addCurve} title="New cubic bezier curve"><FilePlus2 size={14} /></button></div></div>
            {(project.manifest.curves ?? []).map((curve) => {
              const [x1, y1, x2, y2] = curve.type === 'cubic-bezier' ? curve.points : [0, 0, 0, 0]
              return <div className={`curve-row ${selectedCurveId === curve.id ? 'selected' : ''}`} key={curve.id}>
                <button className="curve-row-select" onClick={() => { setSelectedCurveId(curve.id); setWorkspaceMode('curve') }} title={`Edit ${curve.name}`}>
                  <svg viewBox="0 0 32 20" aria-hidden="true"><path d={curve.type === 'cubic-bezier' ? `M1 19 C${1 + x1 * 30} ${19 - y1 * 18}, ${1 + x2 * 30} ${19 - y2 * 18}, 31 1` : curveGraphPath(curve, 1, 19, 30, 18)} /></svg>
                  <span>{curve.name}</span>
                </button>
                <button className="icon-button curve-copy" onClick={() => duplicateCurve(curve.id)} title={`Duplicate ${curve.name}`}><Copy size={12} /></button>
                <button className="icon-button curve-delete" onClick={() => removeCurve(curve.id)} title={`Delete ${curve.name}`}><Trash2 size={12} /></button>
              </div>
            })}
            {!(project.manifest.curves?.length) && <div className="parameters-empty">No curves yet.</div>}
          </section>
          <div className="explorer-foot"><button className={`parameters-toggle ${workspaceMode === 'parameters' ? 'active' : ''}`} onClick={() => setWorkspaceMode((mode) => mode === 'parameters' ? 'code' : 'parameters')} aria-pressed={workspaceMode === 'parameters'}><SlidersHorizontal size={13} /><span>Parameters</span><span className="parameter-count">{parameters.length}</span></button><button className="icon-button layout-reset" onClick={resetLayout} title="Restore default workspace layout"><RotateCcw size={13} /></button><span className="file-count">{sourceFiles.length.toString().padStart(2, '0')} files</span></div>
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
            <div className="panel-tabs"><div className="active-tab"><Waves size={13} />{selectedCurve.name}<span className="curve-id">{selectedCurve.id}</span></div><div className="editor-actions"><span>{selectedCurve.type.toUpperCase()}</span></div></div>
            <div className="curve-editor-content">
              <div className="curve-editor-graph-wrap">
                <svg className="curve-editor-graph" viewBox="0 0 320 240" onPointerMove={updateCurveFromPointer} onPointerUp={() => setDraggingCurveHandle(null)} onPointerCancel={() => setDraggingCurveHandle(null)} role="img" aria-label={`${selectedCurve.name} curve editor`}>
                  <path className="curve-editor-grid" d="M32 24V216H288M32 120H288M160 24V216" />
                  {selectedCurve.type === 'cubic-bezier' && <path className="curve-editor-handle-line" d={`M32 216L${32 + selectedCurve.points[0] * 256} ${216 - selectedCurve.points[1] * 192}M288 24L${32 + selectedCurve.points[2] * 256} ${216 - selectedCurve.points[3] * 192}`} />}
                  <path className="curve-editor-line" d={selectedCurve.type === 'cubic-bezier' ? `M32 216 C${32 + selectedCurve.points[0] * 256} ${216 - selectedCurve.points[1] * 192}, ${32 + selectedCurve.points[2] * 256} ${216 - selectedCurve.points[3] * 192}, 288 24` : curveGraphPath(selectedCurve, 32, 216, 256, 192)} />
                  <line className="curve-editor-probe" x1={32 + curvePreviewProgress * 256} x2={32 + curvePreviewProgress * 256} y1="24" y2="216" />
                  <circle className="curve-editor-probe-point" cx={32 + curvePreviewProgress * 256} cy={Math.max(0, Math.min(240, 216 - sampleCurveValue(selectedCurve, curvePreviewProgress) * 192))} r="4" />
                  {selectedCurve.type === 'cubic-bezier' && [0, 1].map((handle) => <circle key={handle} className="curve-editor-handle" cx={32 + selectedCurve.points[handle * 2] * 256} cy={216 - selectedCurve.points[handle * 2 + 1] * 192} r="6" onPointerDown={(event) => { event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId); setDraggingCurveHandle(handle) }} />)}
                </svg>
                <div className="curve-axis-labels"><span>START</span><span>PROGRESS</span><span>END</span></div>
              </div>
              <div className="curve-inspector">
                <label className="curve-name-field">NAME<input value={selectedCurve.name} onChange={(event) => renameCurve(selectedCurve.id, event.target.value)} /></label>
                <label className="curve-name-field">TYPE<select value={selectedCurve.type} onChange={(event) => changeCurveType(selectedCurve.id, event.target.value as CurveResource['type'])}><option value="linear">Linear</option><option value="cubic-bezier">Cubic bezier</option><option value="spring">Spring</option></select></label>
                {selectedCurve.type === 'cubic-bezier' && <div className="curve-point-fields">{selectedCurve.points.map((point, index) => <label key={index}><span>{index < 2 ? 'P1' : 'P2'} · {index % 2 === 0 ? 'X' : 'Y'}</span><input type="number" min={index % 2 === 0 ? 0 : -2} max={index % 2 === 0 ? 1 : 3} step="0.01" value={point} onChange={(event) => updateCurvePoint(selectedCurve.id, index, Math.max(index % 2 === 0 ? 0 : -2, Math.min(index % 2 === 0 ? 1 : 3, Number(event.target.value))))} /></label>)}</div>}
                {selectedCurve.type === 'spring' && <div className="curve-point-fields spring-fields">{(['mass', 'stiffness', 'damping'] as const).map((key) => <label key={key}><span>{key.toUpperCase()}</span><input type="number" min={key === 'damping' ? 0 : 0.1} max={key === 'mass' ? 10 : 500} step="0.1" value={selectedCurve[key]} onChange={(event) => updateSpringCurve(selectedCurve, key, Math.max(key === 'damping' ? 0 : 0.1, Number(event.target.value)))} /></label>)}</div>}
                <label className="curve-sampler"><span>SAMPLE</span><input type="range" min="0" max="1" step="0.01" value={curvePreviewProgress} onChange={(event) => setCurvePreviewProgress(Number(event.target.value))} /><output>{curvePreviewProgress.toFixed(2)} → {sampleCurveValue(selectedCurve, curvePreviewProgress).toFixed(3)}</output></label>
                <div className="curve-reference"><span>REFERENCE ID</span><code>{selectedCurve.id}</code></div>
                <div className="curve-reference"><span>REFERENCED IN</span><code>{curveReferences(selectedCurve.id).join(', ') || 'No literal sample references found'}</code></div>
                <button className="tool-button curve-duplicate-action" onClick={() => duplicateCurve(selectedCurve.id)}><Copy size={13} />Duplicate curve</button>
              </div>
            </div>
          </div> : <div className="editor-panel">
            <div className="panel-tabs"><div className="active-tab"><FileCode2 size={13} />{activeFile}<span className="tab-dirty">{saved ? '' : '●'}</span></div><div className="editor-actions"><span>{editorLanguage === 'typescript' ? 'TypeScript' : editorLanguage.toUpperCase()}</span><div className="editor-font-controls" role="group" aria-label="Code editor font size"><button className="icon-button editor-font-button" onClick={() => setEditorFontSize((size) => Math.max(minEditorFontSize, size - 1))} disabled={editorFontSize <= minEditorFontSize} title="Decrease code font size" aria-label="Decrease code font size"><Minus size={13} /></button><output className="editor-font-readout" aria-live="polite">{editorFontSize}px</output><button className="icon-button editor-font-button" onClick={() => setEditorFontSize((size) => Math.min(maxEditorFontSize, size + 1))} disabled={editorFontSize >= maxEditorFontSize} title="Increase code font size" aria-label="Increase code font size"><Plus size={13} /></button><button className="icon-button editor-font-button editor-font-reset" onClick={() => setEditorFontSize(defaultEditorFontSize)} disabled={editorFontSize === defaultEditorFontSize} title="Reset code font size" aria-label="Reset code font size"><RotateCcw size={12} /></button></div><span>UTF-8</span></div></div>
            <div className="editor-body">
              <Editor
                height="100%"
                path={monaco.Uri.parse(`file:///${activeFile}`).toString()}
                language={editorLanguage}
                value={project.files[activeFile] ?? ''}
                onChange={updateFile}
                onMount={(editor) => {
                  editorRef.current = editor
                  editor.addAction({
                    id: 'motion-workbench.save-and-apply',
                    label: 'Save project and refresh preview',
                    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
                    run: () => { void saveAndApply() },
                  })
                }}
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                options={{ minimap: { enabled: false }, fontSize: editorFontSize, lineHeight: Math.round(editorFontSize * 21 / defaultEditorFontSize), fontFamily: 'Consolas, monospace', scrollBeyondLastLine: false, padding: { top: 16 }, automaticLayout: true, tabSize: 2, wordWrap: 'off', renderLineHighlight: 'all', overviewRulerBorder: false }}
              />
            </div>
          </div>}
          <div className="splitter" onPointerDown={dragSplit} role="separator" aria-label="Resize editor and preview" />
          <div className={`preview-column ${consoleOpen ? '' : 'console-collapsed'}`}>
            <div className={`preview-panel ${previewFullscreen ? 'preview-fullscreen' : ''}`}>
              <div className="panel-heading"><div className="heading-label"><span className="live-indicator" /><span>{project.manifest.projectType === 'html' ? 'PAGE PREVIEW' : 'CANVAS PREVIEW'}</span><span className="dimensions">{Math.round(previewBaseSize.width)} × {Math.round(previewBaseSize.height)}</span></div><div className="preview-controls">
                {project.manifest.projectType === 'html' && <select className="viewport-select" aria-label="HTML viewport size" value={htmlViewport} onChange={(event) => setHtmlViewport(event.target.value)}><option value="responsive">Responsive</option><option value="1440x900">Desktop · 1440 × 900</option><option value="1024x768">Laptop · 1024 × 768</option><option value="768x1024">Tablet · 768 × 1024</option><option value="390x844">Mobile · 390 × 844</option></select>}
                <select className="zoom-select" aria-label="Preview zoom" value={previewZoom} onChange={(event) => setPreviewZoom(event.target.value)}><option value="fit">Fit</option>{[25, 50, 75, 100, 125, 150, 200].map((zoom) => <option key={zoom} value={zoom.toString()}>{zoom}%</option>)}</select><span className="zoom-readout">{Math.round(displayedZoom * 100)}%</span>
                <button className="icon-button" onClick={toggleRuntime} title={status === 'paused' ? 'Resume' : 'Pause'}>{status === 'paused' ? <Play size={14} /> : <Square size={13} />}</button><button className="icon-button" onClick={resetRuntime} title="Reset simulation"><RotateCcw size={14} /></button><button className="icon-button" onClick={() => setPreviewFullscreen((value) => !value)} title={previewFullscreen ? 'Exit expanded preview' : 'Expand preview'} aria-label={previewFullscreen ? 'Exit expanded preview' : 'Expand preview'}>{previewFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
              </div></div>
              <div ref={stageRef} className={`canvas-stage ${previewReady ? 'has-preview' : ''} ${project.manifest.projectType === 'html' ? 'html-stage' : ''}`}>
                <div className="preview-frame" style={previewFrameStyle}><div className="preview-content" style={previewContentStyle}>
                  {project.manifest.projectType === 'html' ? <iframe ref={iframeRef} title="HTML project preview" sandbox="allow-scripts" /> : <canvas ref={canvasRef} aria-label="Canvas2D animation preview" />}
                </div></div>
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
      {newProjectOpen && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setNewProjectOpen(false) }}><section className="new-project-dialog" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><div className="dialog-heading"><div><span className="dialog-eyebrow">START A STUDY</span><h2 id="new-project-title">New project</h2></div><button className="icon-button" onClick={() => setNewProjectOpen(false)} title="Close"><X size={16} /></button></div><div className="project-choices"><button className="project-choice" onClick={() => createProject('canvas2d')}><span className="choice-icon canvas-choice"><Activity size={18} /></span><span><strong>Canvas2D</strong><small>TypeScript scene with a frame loop</small></span><ChevronRight size={16} /></button><button className="project-choice" onClick={() => createProject('html')}><span className="choice-icon html-choice"><FileCode2 size={18} /></span><span><strong>HTML + CSS</strong><small>A page for small visual experiments</small></span><ChevronRight size={16} /></button><button className="project-choice" onClick={() => createProject('three')}><span className="choice-icon three-choice"><Box size={18} /></span><span><strong>Three.js</strong><small>WebGL scene with a local glTF model</small></span><ChevronRight size={16} /></button></div></section></div>}
      {pendingCurveDelete && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingCurveDelete(null) }}><section className="new-project-dialog curve-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-curve-title"><div className="dialog-heading"><div><span className="dialog-eyebrow">CURVE RESOURCE</span><h2 id="delete-curve-title">Delete {project.manifest.curves?.find((curve) => curve.id === pendingCurveDelete)?.name}</h2></div><button className="icon-button" onClick={() => setPendingCurveDelete(null)} title="Close"><X size={16} /></button></div>{curveReferences(pendingCurveDelete).length ? <><p>This curve is sampled in <code>{curveReferences(pendingCurveDelete).join(', ')}</code>. Choose a replacement before deleting it.</p><label>REPLACE WITH<select value={curveReplacementId} onChange={(event) => setCurveReplacementId(event.target.value)}>{(project.manifest.curves ?? []).filter((curve) => curve.id !== pendingCurveDelete).map((curve) => <option key={curve.id} value={curve.id}>{curve.name} · {curve.id}</option>)}</select></label></> : <p>This curve has no literal <code>curves.sample(...)</code> references in project source.</p>}<div className="draft-actions"><button className="tool-button" onClick={() => setPendingCurveDelete(null)}>Cancel</button><button className="tool-button danger-action" disabled={curveReferences(pendingCurveDelete).length > 0 && !curveReplacementId} onClick={() => void confirmRemoveCurve()}><Trash2 size={13} />Delete curve</button></div></section></div>}
      {draftPrompt && <div className="dialog-backdrop"><section className="new-project-dialog draft-dialog" role="dialog" aria-modal="true" aria-labelledby="draft-title"><div className="dialog-heading"><div><span className="dialog-eyebrow">UNSAVED WORK</span><h2 id="draft-title">Recover this draft?</h2></div></div><p>{draftPrompt.project.manifest.name} · {new Date(draftPrompt.savedAt).toLocaleString()}</p><div className="draft-actions"><button className="tool-button" onClick={discardDraft}>Discard</button><button className="tool-button primary-action" onClick={recoverDraft}>Recover draft</button></div></section></div>}
      {examplesOpen && <ExamplesDialog hasUnsavedChanges={!saved} onClose={() => setExamplesOpen(false)} onOpen={openExample} />}
    </main>
  )
}

export default App
