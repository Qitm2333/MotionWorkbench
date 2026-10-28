import type { Project } from './project'

export type ProjectSnapshot = {
  id: string
  parentId: string | null
  branchId: string
  label: string
  createdAt: number
  project: Project
}

export type HistoryBranch = {
  id: string
  name: string
  createdAt: number
  baseSnapshotId: string | null
  headSnapshotId: string | null
}

export type ProjectHistory = {
  projectId: string
  branches: HistoryBranch[]
  snapshots: ProjectSnapshot[]
  activeBranchId: string
  updatedAt: number
}

export type HistoryGraphNode = {
  snapshot: ProjectSnapshot
  branchName: string
  x: number
  y: number
}

export type HistoryGraphBranch = {
  branch: HistoryBranch
  x: number
  y: number
  baseX: number
  baseY: number
  empty: boolean
}

export function layoutHistoryGraph(history: ProjectHistory, columnGap = 230, rowGap = 92) {
  const snapshots = new Map(history.snapshots.map((snapshot) => [snapshot.id, snapshot]))
  const mainBranch = history.branches.find((branch) => branch.name === 'main') ?? history.branches[0]
  const branches = [...history.branches].sort((a, b) => a.id === mainBranch?.id ? -1 : b.id === mainBranch?.id ? 1 : a.createdAt - b.createdAt)
  const laneByBranch = new Map(branches.map((branch, index) => [branch.id, index === 0 ? 0 : Math.ceil(index / 2) * (index % 2 ? 1 : -1)]))
  const laneExtent = Math.ceil((branches.length - 1) / 2)
  const centerY = Math.max(90, 64 + laneExtent * rowGap)
  const depths = new Map<string, number>()
  const depthOf = (snapshot: ProjectSnapshot, seen = new Set<string>()): number => {
    const cached = depths.get(snapshot.id)
    if (cached !== undefined) return cached
    if (!snapshot.parentId || !snapshots.has(snapshot.parentId) || seen.has(snapshot.id)) return 0
    seen.add(snapshot.id)
    const depth = depthOf(snapshots.get(snapshot.parentId)!, seen) + 1
    depths.set(snapshot.id, depth)
    return depth
  }
  for (const snapshot of history.snapshots) depthOf(snapshot)

  const laneOfSnapshot = new Map<string, number>()
  const branchChildren = new Map<string, ProjectSnapshot[]>()
  for (const snapshot of history.snapshots) {
    if (!snapshot.parentId) continue
    const key = `${snapshot.parentId}:${snapshot.branchId}`
    branchChildren.set(key, [...(branchChildren.get(key) ?? []), snapshot])
  }
  for (const siblings of branchChildren.values()) siblings.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  let nextExtraLane = laneExtent + 1
  for (const snapshot of [...history.snapshots].sort((a, b) => (depths.get(a.id) ?? 0) - (depths.get(b.id) ?? 0) || a.createdAt - b.createdAt)) {
    const parent = snapshot.parentId ? snapshots.get(snapshot.parentId) : null
    if (!parent || parent.branchId !== snapshot.branchId) {
      laneOfSnapshot.set(snapshot.id, laneByBranch.get(snapshot.branchId) ?? 0)
      continue
    }
    const siblings = branchChildren.get(`${parent.id}:${snapshot.branchId}`) ?? []
    const siblingIndex = siblings.findIndex((candidate) => candidate.id === snapshot.id)
    const parentLane = laneOfSnapshot.get(parent.id) ?? laneByBranch.get(snapshot.branchId) ?? 0
    laneOfSnapshot.set(snapshot.id, siblingIndex > 0 ? nextExtraLane++ : parentLane)
  }

  const nodes: HistoryGraphNode[] = history.snapshots.flatMap((snapshot) => {
    const branch = branches.find((item) => item.id === snapshot.branchId)
    const lane = laneOfSnapshot.get(snapshot.id) ?? laneByBranch.get(snapshot.branchId) ?? 0
    return [{
      snapshot,
      branchName: branch?.name ?? 'unknown',
      x: 80 + (depths.get(snapshot.id) ?? 0) * columnGap,
      y: centerY + lane * rowGap,
    }]
  })
  const graphBranches: HistoryGraphBranch[] = branches.filter((branch) => branch.id !== mainBranch?.id).flatMap((branch) => {
    const base = branch.baseSnapshotId ? nodes.find((node) => node.snapshot.id === branch.baseSnapshotId) : null
    if (!base) return []
    const firstSnapshot = nodes.find((node) => node.snapshot.branchId === branch.id)
    return [{
      branch,
      x: firstSnapshot?.x ?? base.x + columnGap,
      y: firstSnapshot?.y ?? centerY + (laneByBranch.get(branch.id) ?? 0) * rowGap,
      baseX: base.x,
      baseY: base.y,
      empty: !firstSnapshot,
    }]
  })
  return {
    nodes,
    branches: graphBranches,
    width: Math.max(320, ...nodes.map((node) => node.x + 190), ...graphBranches.map((branch) => branch.x + 190)),
    height: Math.max(180, centerY + Math.max(laneExtent, ...nodes.map((node) => Math.abs((node.y - centerY) / rowGap))) * rowGap + 64),
  }
}

const databaseName = 'motion-workbench-history'
const storeName = 'projects'
const databaseVersion = 1

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'projectId' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local history storage'))
  })
}

export async function loadProjectHistory(projectId: string): Promise<ProjectHistory | null> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(projectId)
    request.onsuccess = () => { database.close(); resolve((request.result as ProjectHistory | undefined) ?? null) }
    request.onerror = () => { database.close(); reject(request.error ?? new Error('Could not read local project history')) }
  })
}

export async function saveProjectHistory(history: ProjectHistory) {
  const database = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(history)
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('Could not save local project history')) }
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error('Local project history save was cancelled')) }
  })
}

export function createSnapshot(history: ProjectHistory | null, sourceProject: Project, label: string) {
  const projectId = sourceProject.manifest.historyId || crypto.randomUUID()
  const project = {
    ...sourceProject,
    manifest: { ...sourceProject.manifest, historyId: projectId },
    files: { ...sourceProject.files },
    ...(sourceProject.assets ? { assets: { ...sourceProject.assets } } : {}),
  }
  const now = Date.now()
  const current = history ?? {
    projectId,
    branches: [{ id: crypto.randomUUID(), name: 'main', createdAt: now, baseSnapshotId: null, headSnapshotId: null }],
    snapshots: [],
    activeBranchId: '',
    updatedAt: now,
  }
  const branch = current.branches.find((item) => item.id === current.activeBranchId) ?? current.branches[0]
  if (!branch) throw new Error('Project history has no active work line')
  const snapshot: ProjectSnapshot = {
    id: crypto.randomUUID(),
    parentId: branch.headSnapshotId,
    branchId: branch.id,
    label: label.trim() || 'Checkpoint',
    createdAt: now,
    project,
  }
  const nextHistory: ProjectHistory = {
    ...current,
    projectId,
    activeBranchId: branch.id,
    branches: current.branches.map((item) => item.id === branch.id ? { ...item, headSnapshotId: snapshot.id } : item),
    snapshots: [...current.snapshots, snapshot],
    updatedAt: now,
  }
  return { history: nextHistory, project, snapshot }
}

export function forkHistoryBranch(history: ProjectHistory, snapshotId: string, name: string) {
  const snapshot = history.snapshots.find((item) => item.id === snapshotId)
  const normalizedName = name.trim()
  if (!snapshot) throw new Error('Choose a valid history snapshot first')
  if (!normalizedName) throw new Error('Enter a name for the new work line')
  if (history.branches.some((branch) => branch.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) throw new Error('A work line with that name already exists')
  const branch: HistoryBranch = {
    id: crypto.randomUUID(),
    name: normalizedName,
    createdAt: Date.now(),
    baseSnapshotId: snapshotId,
    headSnapshotId: snapshotId,
  }
  const nextHistory = { ...history, branches: [...history.branches, branch], activeBranchId: branch.id, updatedAt: Date.now() }
  return nextHistory
}

export function createBranchFromSnapshot(
  history: ProjectHistory,
  snapshotId: string,
  name: string,
  workingProject: Project,
  mode: 'snapshot' | 'working-copy',
) {
  const nextHistory = forkHistoryBranch(history, snapshotId, name)
  const baseline = nextHistory.snapshots.find((item) => item.id === snapshotId)
  if (!baseline) throw new Error('The selected baseline is no longer available')
  const carriesChanges = mode === 'working-copy' && !isSameProjectContent(workingProject, baseline.project)
  const committed = carriesChanges
    ? createSnapshot(nextHistory, workingProject, `Branch start ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
    : null
  const branch = (committed?.history ?? nextHistory).branches.find((item) => item.id === nextHistory.activeBranchId)
  if (!branch) throw new Error('The new work line could not be activated')
  return {
    history: committed?.history ?? nextHistory,
    project: committed?.project ?? baseline.project,
    branch,
    snapshot: committed?.snapshot ?? null,
    carriesChanges,
  }
}

export function restoreHistoryBaseline(history: ProjectHistory, snapshotId: string) {
  const snapshot = history.snapshots.find((item) => item.id === snapshotId)
  if (!snapshot) throw new Error('Choose a valid history snapshot first')
  const branch = history.branches.find((item) => item.id === snapshot.branchId)
  if (!branch) throw new Error('The selected snapshot has no work line')
  const now = Date.now()
  return {
    ...history,
    activeBranchId: branch.id,
    branches: history.branches.map((item) => item.id === branch.id ? { ...item, headSnapshotId: snapshot.id } : item),
    updatedAt: now,
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]))
}

export function isSameProjectContent(left: Project, right: Project) {
  const leftManifest = { ...left.manifest, historyId: undefined }
  const rightManifest = { ...right.manifest, historyId: undefined }
  const leftContent = { manifest: leftManifest, files: left.files, assets: left.assets ?? {} }
  const rightContent = { manifest: rightManifest, files: right.files, assets: right.assets ?? {} }
  return JSON.stringify(stableValue(leftContent)) === JSON.stringify(stableValue(rightContent))
}

export function snapshotChanges(previous: Project | null, current: Project) {
  const before = new Set(previous ? [...Object.keys(previous.files), ...Object.keys(previous.assets ?? {})] : [])
  const after = new Set([...Object.keys(current.files), ...Object.keys(current.assets ?? {})])
  let changed = 0
  let added = 0
  let removed = 0
  for (const path of after) {
    if (!before.has(path)) added += 1
    else if ((previous?.files[path] ?? previous?.assets?.[path]?.base64) !== (current.files[path] ?? current.assets?.[path]?.base64)) changed += 1
  }
  for (const path of before) if (!after.has(path)) removed += 1
  return { changed, added, removed }
}
