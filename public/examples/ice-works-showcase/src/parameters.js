import { mountGui } from './ring/gui.js'

const ACTION_IDLE = 'idle'
const ACTION_RUN = 'run'

function optionsFrom(value, selected) {
  const options = Array.isArray(value)
    ? value.map((item) => ({ label: String(item), value: String(item) }))
    : Object.entries(value).map(([label, item]) => ({ label, value: String(item) }))
  if (!options.some((option) => option.value === String(selected))) {
    options.push({ label: `Source default: ${String(selected)}`, value: String(selected) })
  }
  return options
}

export function mountWorkbenchControls(context) {
  const records = []
  let currentGroup = 'General'
  let publish = () => {}
  let syncRecord = () => {}

  class Controller {
    constructor(object, key, args, group) {
      this.object = object
      this.key = key
      this.args = args
      this.group = group
      this.label = key
      this.change = null
      this.finish = null
      this.ignored = object === context.state || object === context.info
      records.push(this)
    }

    name(label) { this.label = label; return this }
    onChange(callback) { this.change = callback; return this }
    onFinishChange(callback) { this.finish = callback; return this }
    listen() { this.ignored = true; return this }
    disable() { this.ignored = true; return this }
    updateDisplay() { syncRecord(this); publish(); return this }
  }

  class Folder {
    constructor(group) { this.group = group }
    add(object, key, ...args) { return new Controller(object, key, args, this.group) }
    addFolder(group) { return new Folder(group) }
  }

  class WorkbenchGui extends Folder {
    constructor() { super(currentGroup) }
    addFolder(group) { currentGroup = group; return new Folder(group) }
    controllersRecursive() { return records }
    destroy() {}
  }

  const gui = mountGui(WorkbenchGui, context)
  const active = records.filter((record) => !record.ignored)
  const declarations = {}
  const values = {}

  for (const record of active) {
    const value = record.object[record.key]
    const base = { label: record.label, group: record.group }
    if (typeof value === 'function') {
      declarations[record.key] = {
        ...base,
        type: 'select',
        default: ACTION_IDLE,
        options: [
          { label: 'Ready', value: ACTION_IDLE },
          { label: 'Run', value: ACTION_RUN },
        ],
      }
      values[record.key] = ACTION_IDLE
    } else if (typeof value === 'boolean') {
      declarations[record.key] = { ...base, type: 'boolean', default: value }
      values[record.key] = value
    } else if (typeof value === 'number' && typeof record.args[0] === 'number') {
      declarations[record.key] = {
        ...base,
        type: 'number',
        default: value,
        min: record.args[0],
        max: record.args[1],
        step: record.args[2],
      }
      values[record.key] = value
    } else if (record.args[0] && typeof record.args[0] === 'object') {
      const options = optionsFrom(record.args[0], value)
      declarations[record.key] = {
        ...base,
        type: 'select',
        default: String(value),
        options,
      }
      values[record.key] = String(value)
    } else {
      declarations[record.key] = {
        ...base,
        type: /^#[\da-f]{6}$/i.test(String(value)) ? 'color' : 'text',
        default: String(value),
        ...(typeof value === 'string' && !/^#[\da-f]{6}$/i.test(value) ? { maxLength: 160 } : {}),
      }
      values[record.key] = String(value)
    }
  }

  const parameterValues = window.workbench?.params?.define
    ? window.workbench.params.define(declarations)
    : values

  const decode = (record, value) => {
    const options = record.args[0]
    if (options && !Array.isArray(options) && typeof options === 'object') {
      const match = Object.values(options).find((item) => String(item) === value)
      return match ?? value
    }
    return typeof record.object[record.key] === 'number' ? Number(value) : value
  }

  const encode = (record) => {
    const value = record.object[record.key]
    return record.args[0] && typeof record.args[0] === 'object'
      ? String(value)
      : value
  }

  syncRecord = (record) => {
    if (record.ignored || typeof record.object[record.key] === 'function') return
    values[record.key] = encode(record)
  }

  for (const record of active) {
    if (typeof record.object[record.key] === 'function') continue
    const next = parameterValues[record.key]
    if (next !== undefined) {
      record.object[record.key] = decode(record, next)
      values[record.key] = next
    }
  }

  publish = () => window.parent.postMessage({
    type: 'workbench-parameter-values',
    values: { ...values },
  }, '*')

  const onParameters = (event) => {
    if (!event.detail || typeof event.detail !== 'object') return
    const callbacks = new Set()
    for (const record of active) {
      if (!(record.key in event.detail)) continue
      const next = event.detail[record.key]
      const current = values[record.key]
      if (next === current) continue

      if (typeof record.object[record.key] === 'function') {
        if (next === ACTION_RUN) record.object[record.key]()
        values[record.key] = ACTION_IDLE
        continue
      }

      record.object[record.key] = decode(record, next)
      values[record.key] = next
      if (record.change) callbacks.add(record.change)
      if (record.finish) callbacks.add(record.finish)
    }
    callbacks.forEach((callback) => callback())
    publish()
  }

  document.addEventListener('workbench:params', onParameters)
  publish()

  return {
    ...gui,
    destroy() {
      document.removeEventListener('workbench:params', onParameters)
      gui.destroy()
    },
  }
}
