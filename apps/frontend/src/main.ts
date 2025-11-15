import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)

// Camera setup
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 3)
camera.lookAt(0, 0, 0)

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minDistance = 1
controls.maxDistance = 10
controls.target.set(0, 0, 0)

// Lighting - increased brightness
const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5)
directionalLight.position.set(5, 8, 5)
directionalLight.castShadow = true
scene.add(directionalLight)

const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
scene.add(ambientLight)

const fillLight = new THREE.DirectionalLight(0x8899ff, 1.0)
fillLight.position.set(-3, 2, -3)
scene.add(fillLight)

// Load GLTF model - choose which glass to display
const GLASS_TO_LOAD = 'highball_glass_7' // Options: zombie_glass_0, cocktail_glass_1, rocks_glass_2,
                                          // hurricane_glass_3, pint_glass_4, seidel_Glass_5,
                                          // shot_glass_6, highball_glass_7, margarita_glass_8, martini_glass_9

const loader = new GLTFLoader()
loader.load(
  '/src/models/scene.gltf',
  (gltf) => {
    const model = gltf.scene

    // Find the specific glass we want to load
    let selectedGlass: THREE.Object3D | undefined
    model.traverse((child: THREE.Object3D) => {
      if (child.name === GLASS_TO_LOAD) {
        selectedGlass = child
      }
    })

    if (selectedGlass) {
      // Enable shadows for all meshes in the selected glass
      selectedGlass.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })

      // Center the glass
      const box = new THREE.Box3().setFromObject(selectedGlass)
      const center = box.getCenter(new THREE.Vector3())
      selectedGlass.position.sub(center) // Move to origin
      selectedGlass.position.y = 0 // Place on ground

      scene.add(selectedGlass)
      console.log('Glass loaded successfully!')
    } else {
      console.error(`Glass "${GLASS_TO_LOAD}" not found in model`)
    }
  },
  undefined,
  (error) => {
    console.error('Error loading model:', error)
  }
)

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

animate()