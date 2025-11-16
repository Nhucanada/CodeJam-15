import './style.css'
import * as THREE from 'three'
import { Floor } from './scene/Floor'
import { GlassLoader } from './scene/GlassLoader'
import { IceLoader } from './scene/IceLoader'
import { GarnishLoader, type GlassName } from './scene/GarnishLoader'
import { CharacterLoader } from './scene/CharacterLoader'
import { Lighting } from './scene/Lighting'
import { CameraSetup } from './scene/CameraSetup'
import { ControlsSetup } from './scene/ControlsSetup'
import { exampleCocktails } from './data/cocktails'
import { glassTypeToRenderer, garnishToRenderer } from './types'

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0f) // Darker background for bar atmosphere

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
renderer.localClippingEnabled = true // Enable clipping planes for liquid masking
document.body.appendChild(renderer.domElement)

// Camera setup
const cameraSetup = new CameraSetup()
const camera = cameraSetup.getCamera()

// Controls setup
const controlsSetup = new ControlsSetup(camera, renderer)
const controls = controlsSetup.getControls()

// Lighting
new Lighting(scene)


// Create floor
new Floor(scene)

// Initialize loaders
const glassLoader = new GlassLoader()
const iceLoader = new IceLoader()
const garnishLoader = new GarnishLoader()
const characterLoader = new CharacterLoader()

// Cocktail state
let currentCocktailIndex = 0

// Helper function to render a complete cocktail
function renderCocktail(index: number) {
  const cocktail = exampleCocktails[index]
  console.log(`Rendering cocktail: ${cocktail.name}`)

  // Map user-friendly types to renderer types
  const glassName = glassTypeToRenderer[cocktail.glassType]
  const garnishName = cocktail.garnish && cocktail.garnish !== 'none'
    ? garnishToRenderer[cocktail.garnish]
    : null

  // Switch to new glass
  glassLoader.switchGlass(glassName, iceLoader, garnishLoader).then(() => {
    // Update liquid color
    const liquidHandler = glassLoader.getLiquidHandler()
    if (liquidHandler) {
      const color = new THREE.Color(cocktail.liquidColor)
      liquidHandler.setLiquidColor(color)
    }

    // Add ice if needed
    if (cocktail.hasIce) {
      createIceCubesForGlass(glassName, !!garnishName)
    }

    // Add garnish if specified
    if (garnishName) {
      // Always start hidden (above the glass) so it can fall
      garnishLoader.loadGarnish(scene, garnishName, glassName, true, cocktail.garnish && cocktail.garnish !== 'none' ? cocktail.garnish : undefined).then(() => {
        console.log(`[GARNISH] ${garnishName} loaded`)

        // If no ice, trigger garnish falling immediately after liquid fills
        if (!cocktail.hasIce) {
          const liquidHandler = glassLoader.getLiquidHandler()
          if (liquidHandler) {
            liquidHandler.setOnFillComplete(() => {
              const garnish = garnishLoader.getGarnish(garnishName)
              if (garnish) {
                const targetY = garnish.position.y - 8
                garnishLoader.animateGarnishFalling(garnishName, targetY, () => {
                  console.log('[GARNISH] Garnish falling complete')
                })
              }
            })
          }
        }
      }).catch(console.error)
    }
  }).catch(console.error)
}

// Helper function to create multiple ice cubes for a glass
function createIceCubesForGlass(glassName: GlassName, loadGarnishAfter: boolean = false) {
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
    // Animate each ice cube with staggered timing for natural effect
    const lastIceIndex = iceConfig.count - 1
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

            // If this is the last ice cube and we should load garnish, trigger garnish falling
            if (i === lastIceIndex && loadGarnishAfter) {
              // Get all garnishes and trigger falling for each
              const currentCocktail = exampleCocktails[currentCocktailIndex]
              const garnishName = currentCocktail.garnish && currentCocktail.garnish !== 'none'
                ? garnishToRenderer[currentCocktail.garnish]
                : null

              if (garnishName) {
                const garnish = garnishLoader.getGarnish(garnishName)
                if (garnish) {
                  const targetY = garnish.position.y - 8

                  console.log('[GARNISH] Triggering garnish falling animation')
                  garnishLoader.animateGarnishFalling(garnishName, targetY, () => {
                    console.log('[GARNISH] Garnish falling complete')
                  })
                }
              }
            }
          })
        }
      }, delay)
    }
  })
}

// Load first cocktail and character
const firstCocktail = exampleCocktails[0]
const firstGlass = glassTypeToRenderer[firstCocktail.glassType]

glassLoader.loadGlass(scene, firstGlass, controls, camera).then(() => {
  renderCocktail(0)

  // Load character behind the cocktail glass
  characterLoader.loadCharacter(
    scene,
    new THREE.Vector3(0, -30, -20),
    24,
    new THREE.Euler(0, 0, 0)
  ).catch(console.error)
})

// Handle window resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Cocktail cycling with spacebar
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault() // Prevent page scroll

    currentCocktailIndex = (currentCocktailIndex + 1) % exampleCocktails.length
    console.log(`Cycling to cocktail ${currentCocktailIndex + 1}/${exampleCocktails.length}`)

    renderCocktail(currentCocktailIndex)
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

  // Update garnish animations
  garnishLoader.update()

  controlsSetup.update()
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