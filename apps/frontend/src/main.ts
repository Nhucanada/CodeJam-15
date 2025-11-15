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


// Create floor
new Floor(scene)

// Load glass model
const GLASS_TO_LOAD = 'martini_glass_9' // Options: zombie_glass_0, cocktail_glass_1, rocks_glass_2,
                                          // hurricane_glass_3, pint_glass_4, seidel_Glass_5,
                                          // shot_glass_6, highball_glass_7, margarita_glass_8, martini_glass_9
const glassLoader = new GlassLoader()
const iceLoader = new IceLoader()

// Helper function to create multiple ice cubes for a glass
function createIceCubesForGlass(glassName: typeof glassNames[number]) {
  const liquid = glassLoader.getLiquid()
  const liquidHandler = glassLoader.getLiquidHandler()

  if (!liquid || !liquidHandler) return

  // Get ice configuration for this glass type
  const iceConfig = GlassLoader.getIceConfig(glassName)

  // Calculate base Y position from liquid surface
  const liquidBox = new THREE.Box3().setFromObject(liquid)
  const baseY = liquidBox.max.y + iceConfig.yOffset

  // Initialize ice loader with scene
  iceLoader.setScene(scene)

  // Create all ice cubes for this glass
  for (let i = 0; i < iceConfig.count; i++) {
    const iceName = `cube_ice_${i}`
    const pos = iceConfig.positions[i]

    // Create ice cube at hidden position initially
    const rotation = pos.rotation ? new THREE.Euler(pos.rotation.x, pos.rotation.y, pos.rotation.z) : undefined
    iceLoader.createIceCube(
      iceName,
      new THREE.Vector3(pos.x, -10, pos.z), // Start below scene
      iceConfig.scale,
      rotation
    )
  }

  // Set callback to trigger ice falling when water fill completes
  liquidHandler.setOnFillComplete(() => {
    console.log('Water fill complete, starting ice animations')

    // Animate each ice cube with staggered timing for natural effect
    for (let i = 0; i < iceConfig.count; i++) {
      const iceName = `cube_ice_${i}`
      const pos = iceConfig.positions[i]
      const delay = i * 150 // 150ms delay between each cube

      setTimeout(() => {
        const ice = iceLoader.getIce(iceName)
        if (ice) {
          // Set X/Z position before falling
          ice.position.x = pos.x
          ice.position.z = pos.z

          // Animate falling
          iceLoader.animateIceFalling(iceName, baseY, () => {
            // After falling completes, start bobbing with different time offset for each cube
            const timeOffset = Math.random() * Math.PI * 2 // Random phase 0 to 2π
            iceLoader.animateIceBobbing(iceName, baseY, timeOffset)
          })
        }
      }, delay)
    }
  })
}

glassLoader.loadGlass(scene, GLASS_TO_LOAD, controls, camera).then(() => {
  createIceCubesForGlass(GLASS_TO_LOAD)
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

    // Remove all existing ice cubes before switching
    iceLoader.removeAllIce()

    currentGlassIndex = (currentGlassIndex + 1) % glassNames.length
    const newGlassName = glassNames[currentGlassIndex]
    console.log(`Switching to ${newGlassName}`)

    glassLoader.switchGlass(newGlassName).then(() => {
      // Create ice cubes for the new glass
      createIceCubesForGlass(newGlassName)
    }).catch(console.error)
  }
})

// Animation loop with delta time tracking
let lastTime = performance.now()

function animate() {
  requestAnimationFrame(animate)

  // Calculate delta time in seconds
  const currentTime = performance.now()
  const deltaTime = (currentTime - lastTime) / 1000
  lastTime = currentTime

  // Update liquid fill animation
  glassLoader.update()

  // Update ice animations with delta time
  iceLoader.update(deltaTime)

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