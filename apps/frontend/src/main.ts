import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Floor } from './scene/Floor'
import { GlassLoader } from './scene/GlassLoader'
import { Lighting } from './scene/Lighting'

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0f) // Darker background for bar atmosphere

// Camera setup
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 2, 8)
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
controls.maxPolarAngle = Math.PI / 2 // Prevent camera from going below horizontal
controls.target.set(0, 0, 0)

// Lighting - Using Lighting class (for testing)
new Lighting(scene)

// Lighting - ambient bar atmosphere (commented out for testing)
// const directionalLight = new THREE.DirectionalLight(0xffcc88, 0.4) // Warm, dim key light
// directionalLight.position.set(5, 8, 5)
// directionalLight.castShadow = true
// scene.add(directionalLight)

// const ambientLight = new THREE.AmbientLight(0xff9955, 0.15) // Very dim warm ambient
// scene.add(ambientLight)

// const fillLight = new THREE.DirectionalLight(0xff6633, 0.2) // Subtle warm accent
// fillLight.position.set(-3, 2, -3)
// scene.add(fillLight)

// Spotlight on the glass for bar effect
// const spotLight = new THREE.SpotLight(0xffffff, 1.5)
// spotLight.position.set(0, 5, 0)
// spotLight.angle = Math.PI / 6
// spotLight.penumbra = 0.3
// spotLight.decay = 2
// spotLight.distance = 10
// spotLight.castShadow = true
// scene.add(spotLight)

// Create floor
new Floor(scene)

// Load glass model - choose which glass to display
const GLASS_TO_LOAD = 'pint_glass_4' // Options: zombie_glass_0, cocktail_glass_1, rocks_glass_2,
                                          // hurricane_glass_3, pint_glass_4, seidel_Glass_5,
                                          // shot_glass_6, highball_glass_7, margarita_glass_8, martini_glass_9

const glassLoader = new GlassLoader()
glassLoader.loadGlass(scene, GLASS_TO_LOAD, controls, camera)

// Fill animation state
let fillDirection = 1
let targetFill = 0.5

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Animation loop
function animate() {
  requestAnimationFrame(animate)

  // Continuously update fill target for smooth animation
  targetFill += fillDirection * 0.002 // Smooth continuous increment
  if (targetFill >= 1 || targetFill <= 0.2) {
    fillDirection *= -1
  }
  glassLoader.setFillLevel(targetFill)

  // Update liquid fill animation
  glassLoader.update()

  controls.update()
  renderer.render(scene, camera)
}

animate()