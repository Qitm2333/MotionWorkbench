import { useEffect, useRef, useState } from 'react'
import { ArrowRight, LoaderCircle, X } from 'lucide-react'
import { examples, loadExampleProject } from './examples'
import type { Project } from './project'

type Props = {
  hasUnsavedChanges: boolean
  onClose: () => void
  onOpen: (project: Project, viewport?: string) => void
}

export function ExamplesDialog({ hasUnsavedChanges, onClose, onOpen }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const [selectedId, setSelectedId] = useState(examples[0].id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const selected = examples.find((example) => example.id === selectedId)!

  useEffect(() => {
    const dialog = dialogRef.current!
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    return () => {
      requestRef.current?.abort()
      dialog.close()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  const openSelected = async () => {
    const request = new AbortController()
    requestRef.current?.abort()
    requestRef.current = request
    setLoading(true)
    setError('')
    try {
      const project = await loadExampleProject(selectedId, import.meta.env.BASE_URL, request.signal)
      if (!request.signal.aborted) onOpen(project, selected.viewport)
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      if (!request.signal.aborted) setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="new-project-dialog examples-dialog" aria-labelledby="examples-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div>
        <div className="dialog-heading">
          <div><span className="dialog-eyebrow">EXPLORE & EXPERIMENT</span><h2 id="examples-title">Examples</h2></div>
          <button className="icon-button" onClick={onClose} title="Close examples" aria-label="Close examples"><X size={16} /></button>
        </div>
        <p className="examples-intro">Past explorations and small starting points. Open a copy, inspect the code, and make it yours.</p>
        <div className="examples-browser">
          <nav className="examples-list" aria-label="Example projects">
            {examples.map((example) => <button key={example.id} className={`example-item ${example.id === selectedId ? 'selected' : ''}`} aria-current={example.id === selectedId ? 'true' : undefined} disabled={loading} onClick={() => { setSelectedId(example.id); setError('') }}>
              <small>{example.category}</small><strong>{example.name}</strong><span>{example.renderer}</span>
            </button>)}
          </nav>
          <section className="example-details" aria-labelledby="example-name">
            <span className="example-badge">{selected.renderer}</span>
            <h3 id="example-name">{selected.name}</h3>
            <p>{selected.description}</p>
            <ul>{selected.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
            <p className="example-copy-note">Loads all source files into Explorer and applies automatically. The bundled original stays available for a fresh start.</p>
          </section>
        </div>
        <footer className="examples-footer">
          <p>{hasUnsavedChanges ? 'Your workspace has unsaved changes. Save or export them before replacing it.' : 'The example opens as a new project copy. Save to choose its folder.'}</p>
          {error && <p className="example-error" role="alert">{error}</p>}
          <button className="tool-button primary-action" disabled={loading} onClick={() => void openSelected()}>
            {loading ? <LoaderCircle size={14} className="example-loading" /> : <ArrowRight size={14} />}
            {loading ? 'Loading…' : hasUnsavedChanges ? 'Replace unsaved project' : 'Open example'}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
