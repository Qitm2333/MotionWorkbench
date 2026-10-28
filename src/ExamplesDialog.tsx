import { useEffect, useRef, useState } from 'react'
import { ArrowRight, LoaderCircle, Search, X } from 'lucide-react'
import { examples, loadExampleProjectWithHistory } from './examples'
import type { Project } from './project'
import type { ProjectHistory } from './projectHistory'

type Props = {
  hasUnsavedChanges: boolean
  onClose: () => void
  onOpen: (project: Project, viewport?: string, history?: ProjectHistory) => void
}

export function ExamplesDialog({ hasUnsavedChanges, onClose, onOpen }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const [selectedId, setSelectedId] = useState(examples[0].id)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const categories = ['All', ...new Set(examples.map((example) => example.category))]
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredExamples = examples.filter((example) => {
    const matchesCategory = category === 'All' || example.category === category
    const searchable = `${example.name} ${example.category} ${example.renderer} ${example.description} ${example.compatibility ?? ''}`.toLocaleLowerCase()
    return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery))
  })
  const selected = filteredExamples.find((example) => example.id === selectedId) ?? filteredExamples[0]
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
    if (!selected) return
    const request = new AbortController()
    requestRef.current?.abort()
    requestRef.current = request
    setLoading(true)
    setError('')
    try {
      const result = await loadExampleProjectWithHistory(selected.id, import.meta.env.BASE_URL, request.signal)
      if (!request.signal.aborted) onOpen(result.project, selected.viewport, result.history)
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
        <div className="examples-toolbar">
          <label className="examples-search"><Search size={15} /><input type="search" aria-label="Search examples" placeholder="Search examples" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="examples-categories" role="group" aria-label="Filter examples by category">
            {categories.map((item) => <button key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
        </div>
        <div className="examples-browser">
          <section className="examples-results" aria-label="Example projects">
            <div className="examples-results-heading"><span>{category === 'All' ? 'ALL EXAMPLES' : category.toUpperCase()}</span><small>{filteredExamples.length} / {examples.length}</small></div>
            <nav className="examples-list" aria-label="Example projects">
              {filteredExamples.map((example) => <button key={example.id} className={`example-item ${example.id === selected?.id ? 'selected' : ''}`} aria-current={example.id === selected?.id ? 'true' : undefined} disabled={loading} onClick={() => { setSelectedId(example.id); setError('') }}>
                <span className="example-item-copy"><strong>{example.name}</strong><small>{example.category} · {example.renderer}</small></span>
                {example.id === selected?.id && <span className="example-item-indicator" aria-hidden="true" />}
              </button>)}
              {!filteredExamples.length && <p className="examples-empty">No examples match this search.</p>}
            </nav>
          </section>
          {selected ? <section className="example-details" aria-labelledby="example-name">
            <span className="example-badge">{selected.renderer}</span>
            <h3 id="example-name">{selected.name}</h3>
            <p>{selected.description}</p>
            <ul>{selected.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
            <p className="example-copy-note">Loads the complete editable project into Explorer and applies it. Any documented iteration snapshots are stored in the project History.</p>
          </section> : <section className="example-details examples-no-selection"><p>No examples match this search.</p></section>}
        </div>
        <footer className="examples-footer">
          <p>{hasUnsavedChanges ? 'Your workspace has unsaved changes. Save or export them before replacing it.' : 'The example opens as a new editable project copy. Save to choose its folder.'}</p>
          {error && <p className="example-error" role="alert">{error}</p>}
          <button className="tool-button primary-action" disabled={loading || !selected} onClick={() => void openSelected()}>
            {loading ? <LoaderCircle size={14} className="example-loading" /> : <ArrowRight size={14} />}
            {loading ? 'Loading…' : hasUnsavedChanges ? 'Replace unsaved project' : 'Open example'}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
