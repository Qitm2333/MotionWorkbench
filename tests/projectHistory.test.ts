import assert from 'node:assert/strict'
import test from 'node:test'
import { createBranchFromSnapshot, createSnapshot, forkHistoryBranch, isSameProjectContent, layoutHistoryGraph, restoreHistoryBaseline, snapshotChanges } from '../src/projectHistory.ts'
import { validateProject } from '../src/project.ts'
import type { Project } from '../src/project.ts'

const project: Project = {
  manifest: {
    formatVersion: 1,
    name: 'History test',
    entry: 'src/main.ts',
    projectType: 'canvas2d',
    renderer: { type: 'canvas2d', width: 640, height: 480, background: '#ffffff' },
  },
  files: { 'src/main.ts': 'export const value = 1', 'src/helper.ts': 'export const helper = true' },
}

test('first snapshot creates a project identity and main work line without mutating input', () => {
  const result = createSnapshot(null, project, 'Initial')

  assert.ok(result.project.manifest.historyId)
  assert.equal(result.history.projectId, result.project.manifest.historyId)
  assert.equal(result.history.branches[0]?.name, 'main')
  assert.equal(result.history.branches[0]?.headSnapshotId, result.snapshot.id)
  assert.equal(result.snapshot.parentId, null)
  assert.equal(project.manifest.historyId, undefined)
})

test('project history identity survives validation and rejects malformed values', () => {
  const first = createSnapshot(null, project, 'Initial')
  assert.equal(validateProject(first.project).manifest.historyId, first.project.manifest.historyId)
  assert.throws(() => validateProject({ ...project, manifest: { ...project.manifest, historyId: 7 } }), /invalid history ID/)
})

test('branching from a snapshot sets its base and head, and rejects duplicate names', () => {
  const first = createSnapshot(null, project, 'Initial')
  const branch = forkHistoryBranch(first.history, first.snapshot.id, 'Experiment')

  assert.equal(branch.branches[1]?.baseSnapshotId, first.snapshot.id)
  assert.equal(branch.branches[1]?.headSnapshotId, first.snapshot.id)
  assert.equal(branch.activeBranchId, branch.branches[1]?.id)
  assert.throws(() => forkHistoryBranch(branch, first.snapshot.id, 'experiment'), /already exists/)
})

test('branch starts at the selected snapshot before current edits are committed on it', () => {
  const initial = createSnapshot(null, project, 'Initial')
  const mainNext = createSnapshot(initial.history, { ...initial.project, files: { ...initial.project.files, 'src/main.ts': 'export const value = 2' } }, 'Main update')
  const editedProject: Project = { ...mainNext.project, files: { ...mainNext.project.files, 'src/main.ts': 'export const value = 3' } }
  const branched = forkHistoryBranch(mainNext.history, initial.snapshot.id, 'Variation')
  const branchId = branched.branches.find((branch) => branch.name === 'Variation')!.id
  const branchStart = createSnapshot(branched, editedProject, 'Branch start')

  assert.equal(branched.branches[0]?.headSnapshotId, mainNext.snapshot.id)
  assert.equal(branchStart.snapshot.parentId, initial.snapshot.id)
  assert.equal(branchStart.snapshot.branchId, branchId)
  assert.equal(branchStart.history.branches.find((branch) => branch.id === branchId)?.baseSnapshotId, initial.snapshot.id)
  assert.equal(branchStart.history.branches.find((branch) => branch.id === branchId)?.headSnapshotId, branchStart.snapshot.id)
  assert.equal(branchStart.history.activeBranchId, branchId)
  assert.equal(branchStart.snapshot.project.files['src/main.ts'], 'export const value = 3')
})

test('branching unchanged content creates only a branch at the selected snapshot', () => {
  const initial = createSnapshot(null, project, 'Initial')
  const mainNext = createSnapshot(initial.history, { ...initial.project, files: { ...initial.project.files, 'src/main.ts': 'export const value = 2' } }, 'Main update')
  const branched = forkHistoryBranch(mainNext.history, initial.snapshot.id, 'Variation')
  const branch = branched.branches.find((item) => item.name === 'Variation')!

  assert.equal(isSameProjectContent(initial.project, { ...initial.project, manifest: { ...initial.project.manifest, historyId: 'different-id' } }), true)
  assert.equal(isSameProjectContent(initial.project, mainNext.snapshot.project), false)
  assert.equal(branch.baseSnapshotId, initial.snapshot.id)
  assert.equal(branch.headSnapshotId, initial.snapshot.id)
  assert.equal(branched.snapshots.length, 2)
  assert.equal(branched.activeBranchId, branch.id)
})

test('starting a branch from its snapshot restores that snapshot without a duplicate commit', () => {
  const initial = createSnapshot(null, project, 'Initial')
  const later = createSnapshot(initial.history, { ...initial.project, files: { ...initial.project.files, 'src/main.ts': 'later' } }, 'Later')
  const result = createBranchFromSnapshot(later.history, initial.snapshot.id, 'From initial', later.project, 'snapshot')

  assert.equal(result.branch.baseSnapshotId, initial.snapshot.id)
  assert.equal(result.branch.headSnapshotId, initial.snapshot.id)
  assert.equal(result.history.activeBranchId, result.branch.id)
  assert.equal(result.snapshot, null)
  assert.equal(result.project.files['src/main.ts'], project.files['src/main.ts'])
  assert.equal(result.history.snapshots.length, 2)
})

test('carrying working edits creates the first commit under the selected branch point', () => {
  const initial = createSnapshot(null, project, 'Initial')
  const later = createSnapshot(initial.history, { ...initial.project, files: { ...initial.project.files, 'src/main.ts': 'later' } }, 'Later')
  const workingCopy: Project = { ...later.project, files: { ...later.project.files, 'src/main.ts': 'working edits' } }
  const result = createBranchFromSnapshot(later.history, initial.snapshot.id, 'Carry edits', workingCopy, 'working-copy')

  assert.equal(result.branch.baseSnapshotId, initial.snapshot.id)
  assert.equal(result.snapshot?.parentId, initial.snapshot.id)
  assert.equal(result.snapshot?.branchId, result.branch.id)
  assert.equal(result.branch.headSnapshotId, result.snapshot?.id)
  assert.equal(result.snapshot?.project.files['src/main.ts'], 'working edits')
  assert.equal(result.history.activeBranchId, result.branch.id)
  assert.equal(result.carriesChanges, true)
})

test('restoring a snapshot moves its branch baseline back without deleting later history', () => {
  const first = createSnapshot(null, project, 'Initial')
  const later = createSnapshot(first.history, first.project, 'Later')
  const restored = restoreHistoryBaseline(later.history, first.snapshot.id)
  const continued = createSnapshot(restored, first.project, 'Continued from baseline')

  assert.equal(restored.activeBranchId, first.snapshot.branchId)
  assert.equal(restored.branches[0]?.headSnapshotId, first.snapshot.id)
  assert.deepEqual(restored.snapshots.map((snapshot) => snapshot.id), [first.snapshot.id, later.snapshot.id])
  assert.equal(continued.snapshot.parentId, first.snapshot.id)
  assert.equal(continued.history.snapshots.length, 3)
  const graph = layoutHistoryGraph(continued.history)
  assert.notEqual(graph.nodes.find((node) => node.snapshot.id === later.snapshot.id)?.y, graph.nodes.find((node) => node.snapshot.id === continued.snapshot.id)?.y)
})

test('history graph keeps main centered and places branch snapshots on a forked lane', () => {
  const first = createSnapshot(null, project, 'Initial')
  const mainNext = createSnapshot(first.history, first.project, 'Main update')
  const forked = forkHistoryBranch(mainNext.history, first.snapshot.id, 'Experiment')
  const experimentNext = createSnapshot(forked, first.project, 'Experiment update')
  const graph = layoutHistoryGraph(experimentNext.history)
  const initial = graph.nodes.find((node) => node.snapshot.id === first.snapshot.id)!
  const main = graph.nodes.find((node) => node.snapshot.id === mainNext.snapshot.id)!
  const experiment = graph.nodes.find((node) => node.snapshot.id === experimentNext.snapshot.id)!

  assert.equal(main.x, experiment.x)
  assert.notEqual(main.y, experiment.y)
  assert.equal(graph.nodes.find((node) => node.snapshot.id === first.snapshot.id)?.y, graph.nodes.find((node) => node.snapshot.branchId === first.history.branches[0]?.id)?.y)
  assert.equal(main.snapshot.parentId, initial.snapshot.id)
  assert.equal(experiment.snapshot.parentId, initial.snapshot.id)
  assert.equal(graph.branches[0]?.branch.name, 'Experiment')
  assert.equal(graph.branches[0]?.empty, false)
  assert.ok(graph.width >= Math.max(...graph.nodes.map((node) => node.x + 42)))
})

test('history graph shows an unpopulated branch at its fork point', () => {
  const first = createSnapshot(null, project, 'Initial')
  const forked = forkHistoryBranch(first.history, first.snapshot.id, 'Unstarted')
  const graph = layoutHistoryGraph(forked)

  assert.equal(graph.branches[0]?.branch.name, 'Unstarted')
  assert.equal(graph.branches[0]?.empty, true)
  assert.equal(graph.branches[0]?.baseX, graph.nodes[0]?.x)
  assert.notEqual(graph.branches[0]?.y, graph.nodes[0]?.y)
})

test('snapshot change counts include added, edited, and removed project files', () => {
  const before: Project = { ...project, files: { 'src/main.ts': 'old', 'src/remove.ts': 'remove' } }
  const after: Project = { ...project, files: { 'src/main.ts': 'new', 'src/add.ts': 'add' } }

  assert.deepEqual(snapshotChanges(before, after), { changed: 1, added: 1, removed: 1 })
})
