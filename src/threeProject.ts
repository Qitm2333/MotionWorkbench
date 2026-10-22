import type { Project } from './project'

const seedGltf = JSON.stringify({
  asset: { version: '2.0', generator: 'MotionWorkbench starter' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'Seed' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
  materials: [{ name: 'Workbench material', pbrMetallicRoughness: { baseColorFactor: [0.35, 0.66, 1, 1], metallicFactor: 0.72, roughnessFactor: 0.22 } }],
  buffers: [{ uri: 'seed.bin', byteLength: 120 }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: 72, target: 34962 },
    { buffer: 0, byteOffset: 72, byteLength: 48, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 6, type: 'VEC3', min: [-1, -1.25, -1], max: [1, 1.25, 1] },
    { bufferView: 1, componentType: 5123, count: 24, type: 'SCALAR' },
  ],
})

export const starterThreeProject: Project = {
  manifest: {
    formatVersion: 1,
    name: 'Three.js model study',
    entry: 'index.html',
    projectType: 'html',
    renderer: { type: 'html' },
    dependencies: { three: '0.180.0' },
  },
  files: {
    'index.html': `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Three.js model study</title>
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <canvas id="scene" aria-label="Interactive Three.js scene"></canvas>
  <div class="caption"><span>MODEL STUDY / 001</span><strong>Drag to orbit</strong></div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
`,
    'style.css': `* { box-sizing: border-box; }
html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #0d0f14; }
body { color: #f3f5f7; font-family: Consolas, monospace; }
#scene { display: block; width: 100%; height: 100%; touch-action: none; }
.caption { position: fixed; inset: auto 24px 22px; display: flex; justify-content: space-between; align-items: end; pointer-events: none; }
.caption span { color: #8f9aab; font-size: 10px; }
.caption strong { font-size: 12px; font-weight: 400; }
`,
    'src/main.js': `import { createStudio } from './studio.js'

const canvas = document.querySelector('#scene')
const studio = await createStudio(canvas, new URL('./assets/seed.gltf', document.baseURI))

function frame(time) {
  studio.update(time / 1000)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
addEventListener('pagehide', () => studio.dispose(), { once: true })
`,
    'src/studio.js': `import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export async function createStudio(canvas, modelUrl) {
  const params = workbench.params.define({
    rotationSpeed: { type: 'number', label: 'Rotation speed', default: 0.45, min: 0, max: 2, step: 0.05, group: 'Motion' },
    autoRotate: { type: 'boolean', label: 'Auto rotate', default: true, group: 'Motion' },
    modelColor: { type: 'color', label: 'Model color', default: '#59a7ff', group: 'Material' },
    roughness: { type: 'number', label: 'Roughness', default: 0.22, min: 0, max: 1, step: 0.01, group: 'Material' },
    metalness: { type: 'number', label: 'Metalness', default: 0.72, min: 0, max: 1, step: 0.01, group: 'Material' },
    wireframe: { type: 'boolean', label: 'Wireframe', default: false, group: 'Material' },
    exposure: { type: 'number', label: 'Exposure', default: 1.15, min: 0.3, max: 2.5, step: 0.05, group: 'Lighting' },
  })

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#0d0f14')
  scene.fog = new THREE.FogExp2('#0d0f14', 0.055)

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
  camera.position.set(4.8, 2.8, 6.8)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.target.set(0, 0.15, 0)
  controls.minDistance = 3.5
  controls.maxDistance = 12

  scene.add(new THREE.HemisphereLight('#d8e8ff', '#14131c', 2.2))
  const key = new THREE.DirectionalLight('#ffffff', 6)
  key.position.set(3, 5, 4)
  scene.add(key)
  const rim = new THREE.PointLight('#4d86ff', 25, 16)
  rim.position.set(-4, 1, -3)
  scene.add(rim)

  const floor = new THREE.Mesh(new THREE.CircleGeometry(5.6, 64), new THREE.MeshStandardMaterial({ color: '#141821', roughness: 0.8, metalness: 0.1 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.27
  scene.add(floor)
  const rings = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.012, 8, 128), new THREE.MeshBasicMaterial({ color: '#344054', transparent: true, opacity: 0.7 }))
  rings.rotation.x = Math.PI / 2
  rings.position.y = -1.24
  scene.add(rings)

  const loaded = await new GLTFLoader().loadAsync(modelUrl.href)
  const model = loaded.scene
  scene.add(model)
  const materials = []
  model.traverse((object) => {
    if (!object.isMesh) return
    object.geometry.computeVertexNormals()
    object.material = object.material.clone()
    materials.push(object.material)
  })

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  let lastTime = 0
  return {
    update(time) {
      const delta = Math.min(0.05, Math.max(0, time - lastTime))
      lastTime = time
      if (params.autoRotate) model.rotation.y += delta * params.rotationSpeed
      for (const material of materials) {
        material.color.set(params.modelColor)
        material.roughness = params.roughness
        material.metalness = params.metalness
        material.wireframe = params.wireframe
      }
      renderer.toneMappingExposure = params.exposure
      controls.update()
      renderer.render(scene, camera)
    },
    dispose() {
      observer.disconnect()
      controls.dispose()
      model.traverse((object) => {
        if (!object.isMesh) return
        object.geometry.dispose()
        object.material.dispose()
      })
      floor.geometry.dispose()
      floor.material.dispose()
      rings.geometry.dispose()
      rings.material.dispose()
      renderer.dispose()
    },
  }
}
`,
  },
  assets: {
    'assets/seed.gltf': { mime: 'model/gltf+json', base64: btoa(seedGltf) },
    'assets/seed.bin': { mime: 'application/octet-stream', base64: 'AAAAAAAAoD8AAAAAAACAvwAAAAAAAAAAAAAAAAAAAAAAAIA/AACAPwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAAAAoL8AAAAAAAABAAIAAAACAAMAAAADAAQAAAAEAAEABQACAAEABQADAAIABQAEAAMABQABAAQA' },
  },
}
