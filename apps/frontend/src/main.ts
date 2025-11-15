import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Floor } from './scene/Floor'
import { GlassLoader } from './scene/GlassLoader'
import { IceLoader } from './scene/IceLoader'
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
renderer.localClippingEnabled = true // Enable clipping planes for liquid masking
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

// Load glass model
const GLASS_TO_LOAD = 'hurricane_glass_3' // Options: zombie_glass_0, cocktail_glass_1, rocks_glass_2,
                                          // hurricane_glass_3, pint_glass_4, seidel_Glass_5,
                                          // shot_glass_6, highball_glass_7, margarita_glass_8, martini_glass_9
const glassLoader = new GlassLoader()
glassLoader.loadGlass(scene, GLASS_TO_LOAD, controls, camera).then(() => {
  // After glass is loaded, load and position ice cube at the water surface
  const iceLoader = new IceLoader()
  iceLoader.loadIce(scene, 'cube_ice').then(() => {
    const ice = iceLoader.getIce('cube_ice')
    const liquid = glassLoader.getLiquid()

    if (ice && liquid) {
      // Position ice at the same Y position as the liquid surface (top of the liquid mesh)
      const liquidBox = new THREE.Box3().setFromObject(liquid)
      ice.position.y = liquidBox.max.y
      ice.position.x = 0
      ice.position.z = 0

      // Scale ice to fit nicely in the glass
      ice.scale.set(0.5, 0.5, 0.5)
    }
  }).catch(console.error)
})

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Glass switching with spacebar
const glassNames = [
  'zombie_glass_0',
  'cocktail_glass_1',
  'rocks_glass_2',
  'hurricane_glass_3',
  'pint_glass_4',
  'seidel_Glass_5',
  'shot_glass_6',
  'highball_glass_7',
  'margarita_glass_8',
  'martini_glass_9',
] as const

let currentGlassIndex = 7 // Start with highball_glass_7

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault() // Prevent page scroll
    currentGlassIndex = (currentGlassIndex + 1) % glassNames.length
    console.log(`Switching to ${glassNames[currentGlassIndex]}`)
    glassLoader.switchGlass(glassNames[currentGlassIndex]).catch(console.error)
  }
})

// Animation loop
function animate() {
  requestAnimationFrame(animate)

  // Update liquid fill animation
  glassLoader.update()

  controls.update()
  renderer.render(scene, camera)
}

animate()

// Get all elements
const buttons = document.querySelectorAll('.recipe-btn') as NodeListOf<HTMLButtonElement>
const recipeButton = Array.from(buttons).find(btn => btn.textContent === 'RECIPE')
const shelfButton = Array.from(buttons).find(btn => btn.textContent === 'SHELF')

const ingredientsBox = document.querySelector('.ingredients-box') as HTMLElement
const recipeBox = document.querySelector('.recipe-box') as HTMLElement
const allPanelHeaders = document.querySelectorAll('.message.panel-header') as NodeListOf<HTMLElement>
const ingredientsHeader = allPanelHeaders[0] // First header is "Ingredients:"
const recipeHeader = allPanelHeaders[1] // Second header is "Recipe:"
const shelfBoxes = document.querySelectorAll('.shelf-box') as NodeListOf<HTMLElement>

function showRecipe() {
  // Show recipe elements
  if (ingredientsBox) ingredientsBox.style.display = 'block'
  if (recipeBox) recipeBox.style.display = 'block'
  if (ingredientsHeader) ingredientsHeader.style.display = 'block'
  if (recipeHeader) recipeHeader.style.display = 'block'

  // Hide shelf elements
  shelfBoxes.forEach(box => box.style.display = 'none')

  // Update button states
  recipeButton?.classList.add('selected')
  shelfButton?.classList.remove('selected')
}

function showShelf() {
  // Hide recipe elements
  if (ingredientsBox) ingredientsBox.style.display = 'none'
  if (recipeBox) recipeBox.style.display = 'none'
  if (ingredientsHeader) ingredientsHeader.style.display = 'none'
  if (recipeHeader) recipeHeader.style.display = 'none'

  // Show shelf elements (with images and text)
  shelfBoxes.forEach(box => box.style.display = 'flex')

  // Update button states
  shelfButton?.classList.add('selected')
  recipeButton?.classList.remove('selected')
}

// Add event listeners
recipeButton?.addEventListener('click', showRecipe)
shelfButton?.addEventListener('click', showShelf)

// Set default state
showRecipe()