import { validateProject } from './project'
import type { Project } from './project'

export type ProjectDraft = { project: Project; activeFile: string; savedAt: number }
const legacyKey = 'motion-workbench-draft-v1'
let pending: Promise<unknown> = Promise.resolve()

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('motion-workbench', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transaction(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', mode)
      const request = run(tx.objectStore('drafts'))
      tx.oncomplete = () => resolve(request.result)
      tx.onabort = () => reject(tx.error)
      tx.onerror = () => reject(tx.error)
    })
  } finally { db.close() }
}

// Serialize writes and deletion so an older autosave cannot resurrect a draft.
export function saveDraft(draft: ProjectDraft): Promise<unknown> {
  pending = pending.catch(() => {}).then(() => transaction('readwrite', (store) => store.put(draft, 'current')))
  return pending
}

export function clearDraft(): Promise<unknown> {
  localStorage.removeItem(legacyKey)
  pending = pending.catch(() => {}).then(() => transaction('readwrite', (store) => store.delete('current')))
  return pending
}

export async function readDraft(): Promise<ProjectDraft | null> {
  const stored = await transaction('readonly', (store) => store.get('current'))
  const value = (stored ?? JSON.parse(localStorage.getItem(legacyKey) ?? 'null')) as ProjectDraft | null
  if (!value || typeof value.activeFile !== 'string' || !Number.isFinite(value.savedAt)) return null
  const draft = { ...value, project: validateProject(value.project) }
  if (!stored) {
    await saveDraft(draft)
    localStorage.removeItem(legacyKey)
  }
  return draft
}
