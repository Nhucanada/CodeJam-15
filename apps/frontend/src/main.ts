import './style.css'
import * as THREE from 'three'
import { Floor } from './scene/Floor'
import { GlassLoader } from './scene/GlassLoader'
import { IceLoader } from './scene/IceLoader'
import { GarnishLoader, getAllowedGarnishes } from './scene/GarnishLoader'
import { CharacterLoader } from './scene/CharacterLoader'
import { Lighting } from './scene/Lighting'
import { CameraSetup } from './scene/CameraSetup'
import { ControlsSetup } from './scene/ControlsSetup'
import { chatWebSocket } from './websocket/chatHandler'
import { cocktailAPI } from './api/client'
import type { CocktailDetail } from './types/cocktail'
import { LoginOverlay } from './components/LoginOverlay'
import { authAPI } from './api/client'

// Authentication check and login overlay
let loginOverlay: LoginOverlay;

function initializeAuth(): void {
  if (!authAPI.isAuthenticated()) {
    loginOverlay = new LoginOverlay(() => {
      console.log('Authentication successful!');
      // Reload shelf and any other authenticated content
      if (typeof loadAndDisplayShelf === 'function') {
        loadAndDisplayShelf();
      }
    });
    loginOverlay.show();
  }
}

// Initialize authentication on page load
initializeAuth();

// Add logout functionality (optional - you can add a logout button later)
(window as any).logout = () => {
  authAPI.logout();
  initializeAuth();
};

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

// Load glass model
const GLASS_TO_LOAD = 'martini_glass_9' // Options: zombie_glass_0, cocktail_glass_1, rocks_glass_2,
                                            // hurricane_glass_3, pint_glass_4, seidel_Glass_5,
                                            // shot_glass_6, highball_glass_7, margarita_glass_8, martini_glass_9
const glassLoader = new GlassLoader()
const iceLoader = new IceLoader()
const garnishLoader = new GarnishLoader()
const characterLoader = new CharacterLoader()

// Helper function to create multiple ice cubes for a glass
function createIceCubesForGlass(glassName: typeof glassNames[number], loadGarnishAfter: boolean = false) {
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
    let lastIceIndex = iceConfig.count - 1
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
              // Get the garnish's target Y position (it was loaded with startHidden, so subtract 8)
              const garnish = garnishLoader.getGarnish('mint')
              if (garnish) {
                const targetY = garnish.position.y - 8 // Currently at hidden position, target is 8 below

                console.log('[GARNISH] Triggering garnish falling animation')
                garnishLoader.animateGarnishFalling('mint', targetY, () => {
                  console.log('[GARNISH] Garnish falling complete')
                })
              }
            }
          })
        }
      }, delay)
    }
  })
}

glassLoader.loadGlass(scene, GLASS_TO_LOAD, controls, camera).then(() => {
  createIceCubesForGlass(GLASS_TO_LOAD)

  // Load all garnishes for tweaking
  loadAllGarnishes()

  // Load character behind the cocktail glass
  characterLoader.loadCharacter(
    scene,
    new THREE.Vector3(0, -30, -20), // Position closer behind the glass
    24, // Scale (16 times bigger than original 1.5)
    new THREE.Euler(0, 0, 0) // Rotation
  ).catch(console.error)
})

// Handle window resize
window.addEventListener('resize', () => {
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

let currentGlassIndex = 8 // Start with margarita_glass_8

// Load all garnishes for tweaking (press 'G' key)
function loadAllGarnishes() {
  console.log('Loading all garnishes for showcase...')

  // Remove any existing garnishes
  garnishLoader.removeAllGarnishes()

  // Get allowed garnishes for the current glass type
  const allowedGarnishes = getAllowedGarnishes(GLASS_TO_LOAD)
  console.log(`Allowed garnishes for ${GLASS_TO_LOAD}:`, allowedGarnishes)

  // Load only allowed garnishes for this glass type
  allowedGarnishes.forEach((garnishName) => {
    garnishLoader.loadGarnish(scene, garnishName, GLASS_TO_LOAD).then(() => {
      console.log(`${garnishName} loaded`)
    }).catch(console.error)
  })
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault() // Prevent page scroll

    currentGlassIndex = (currentGlassIndex + 1) % glassNames.length
    const newGlassName = glassNames[currentGlassIndex]
    console.log(`Switching to ${newGlassName}`)

    glassLoader.switchGlass(newGlassName, iceLoader, garnishLoader).then(() => {
      // Create ice cubes for the new glass
      createIceCubesForGlass(newGlassName, true)

      // Load garnish for new glass (positioned above scene, ready to fall)
      garnishLoader.loadGarnish(scene, 'mint', newGlassName, true).then(() => {
        console.log('[GARNISH] Mint garnish loaded (hidden above scene)')
        garnishLoader.setGarnishScale('mint', 0.2)
        // Garnish is positioned 8 units above final position
        // The falling animation will be triggered after ice completes
      }).catch((error) => {
        console.error('Failed to load mint:', error)
      })
    }).catch(console.error)
  }

  // Press 'G' to load all garnishes for tweaking
  if (event.code === 'KeyG') {
    event.preventDefault()
    loadAllGarnishes()
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
showShelf()

// WebSocket and Chat Integration
let selectedCocktail: CocktailDetail | null = null;

// Initialize WebSocket
chatWebSocket.onMessage((message) => {
  console.log('Received WebSocket message:', message);
});

async function loadAndDisplayShelf() {
  try {
    const response = await cocktailAPI.getUserShelf();
    updateShelfDisplay(response.cocktails, response.agent_greeting);
  } catch (error) {
    console.error('Failed to load shelf:', error);

    // Show user-friendly error message
    const recipeContent = document.querySelector('.recipe-content');
    if (recipeContent) {
      // Clear any existing content first
      const existingShelfBoxes = document.querySelectorAll('.shelf-box, .shelf-empty, .shelf-error');
      existingShelfBoxes.forEach(box => box.remove());

      const errorDiv = document.createElement('div');
      errorDiv.className = 'shelf-error';

      // Check error type for better messaging
      if (error instanceof Error) {
        if (error.message.includes('Backend server not running')) {
          errorDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f44336;">
              <h3>🔌 Backend Not Running</h3>
              <p>The backend server needs to be started to load cocktails.</p>
              <p style="font-size: 0.9em; opacity: 0.7;">Run: <code>npm run dev</code> in the backend folder</p>
            </div>
          `;
        } else {
          errorDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f44336;">
              <h3>⚠️ Connection Error</h3>
              <p>${error.message}</p>
            </div>
          `;
        }
      } else {
        errorDiv.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #f44336;">
            <h3>❌ Unknown Error</h3>
            <p>Could not load cocktails.</p>
          </div>
        `;
      }

      recipeContent.appendChild(errorDiv);
    }
  }
}

function updateShelfDisplay(cocktails: any[], greeting: string) {
  const shelfBoxes = document.querySelectorAll('.shelf-box');

  // Clear existing shelf boxes
  shelfBoxes.forEach(box => box.remove());

  // Add greeting message if needed
  console.log('Agent greeting:', greeting);

  // Create new shelf boxes for each cocktail
  const recipePanel = document.querySelector('.recipe-content');
  if (recipePanel) {
    cocktails.forEach((cocktail, index) => {
      if (index < 3) { // Limit to 3 visible cocktails
        const shelfBox = createShelfBox(cocktail);
        recipePanel.appendChild(shelfBox);
      }
    });
  }
}

function createShelfBox(cocktail: any) {
  const shelfBox = document.createElement('div');
  shelfBox.className = 'shelf-box';
  shelfBox.style.cursor = 'pointer';

  shelfBox.innerHTML = `
    <img src="/src/img/1742270047720.jpeg" alt="Cocktail" class="drink-img">
    <div class="drink-text">
      <div class="message drink-title">${cocktail.name}</div>
      <div class="message drink-info">${cocktail.ingredients_summary}</div>
    </div>
  `;

  // Add click handler to select cocktail with error handling
  shelfBox.addEventListener('click', async () => {
    try {
      // Show loading state
      showRecipeLoading();

      const detail = await cocktailAPI.getCocktailDetail(cocktail.id);
      await selectAndDisplayCocktail(detail);

      // Switch to recipe view
      const recipeButton = Array.from(document.querySelectorAll('.recipe-btn')).find(btn =>
        btn.textContent === 'RECIPE'
      ) as HTMLButtonElement;
      if (recipeButton) {
        recipeButton.click();
      }
    } catch (error) {
      console.error('Failed to load cocktail details:', error);

      if (error instanceof Error) {
        if (error.message.includes('Backend server not running')) {
          showRecipeError('Backend server not running. Please start the backend.');
        } else {
          showRecipeError(`Failed to load cocktail: ${error.message}`);
        }
      } else {
        showRecipeError('Failed to load cocktail details');
      }
    }
  });

  return shelfBox;
}

function showRecipeLoading() {
  // Show loading in ingredients box
  const ingredientsBox = document.querySelector('.ingredients-box .message-container');
  if (ingredientsBox) {
    ingredientsBox.innerHTML = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot recipe-loading';
    loadingDiv.style.cssText = `
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      color: #1976d2;
      padding: 8px;
      border-radius: 4px;
      font-style: italic;
    `;
    loadingDiv.textContent = '⏳ Loading ingredients...';
    ingredientsBox.appendChild(loadingDiv);
  }

  // Show loading in recipe box
  const recipeBox = document.querySelector('.recipe-box .message-container');
  if (recipeBox) {
    recipeBox.innerHTML = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot recipe-loading';
    loadingDiv.style.cssText = `
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      color: #1976d2;
      padding: 8px;
      border-radius: 4px;
      font-style: italic;
    `;
    loadingDiv.textContent = '⏳ Loading recipe...';
    recipeBox.appendChild(loadingDiv);
  }
}

async function selectAndDisplayCocktail(cocktail: CocktailDetail) {
  selectedCocktail = cocktail;

  try {
    // Update ingredients display
    const ingredientsBox = document.querySelector('.ingredients-box .message-container');
    if (ingredientsBox) {
      // Clear previous content and errors
      ingredientsBox.innerHTML = '';

      cocktail.ingredients.forEach((ing, index) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.textContent = `${index + 1}. ${ing.quantity} ${ing.unit} ${ing.name}`;
        ingredientsBox.appendChild(messageDiv);
      });
    }

    // Update recipe display
    const recipeBox = document.querySelector('.recipe-box .message-container');
    if (recipeBox) {
      // Clear previous content and errors
      recipeBox.innerHTML = '';

      const messageDiv = document.createElement('div');
      messageDiv.className = 'message bot';
      messageDiv.textContent = cocktail.description || 'Cocktail preparation instructions.';
      recipeBox.appendChild(messageDiv);
    }

    // Update 3D scene if needed
    updateSceneForCocktail(cocktail);

  } catch (error) {
    console.error('Error displaying cocktail:', error);
    showRecipeError('Failed to display cocktail details');
  }
}

function showRecipeError(message: string) {
  // Show error in ingredients box
  const ingredientsBox = document.querySelector('.ingredients-box .message-container');
  if (ingredientsBox) {
    ingredientsBox.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message bot recipe-error';
    errorDiv.style.cssText = `
      background: #ffebee;
      border-left: 4px solid #f44336;
      color: #c62828;
      padding: 8px;
      border-radius: 4px;
    `;
    errorDiv.textContent = `❌ ${message}`;
    ingredientsBox.appendChild(errorDiv);
  }

  // Show error in recipe box
  const recipeBox = document.querySelector('.recipe-box .message-container');
  if (recipeBox) {
    recipeBox.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message bot recipe-error';
    errorDiv.style.cssText = `
      background: #ffebee;
      border-left: 4px solid #f44336;
      color: #c62828;
      padding: 8px;
      border-radius: 4px;
    `;
    errorDiv.textContent = `❌ ${message}`;
    recipeBox.appendChild(errorDiv);
  }
}

function updateSceneForCocktail(cocktail: CocktailDetail) {
  // Update liquid color based on ingredients
  const liquidHandler = glassLoader.getLiquidHandler();
  const liquidMesh = liquidHandler?.getLiquid();

  if (liquidMesh && liquidMesh.material) {
    // Calculate dominant color from ingredients
    const dominantColor = calculateLiquidColor(cocktail.ingredients);

    // Update the liquid material color directly
    const material = liquidMesh.material as THREE.MeshPhysicalMaterial;
    if (material && material.color) {
      material.color.setHex(dominantColor);
    }

    // Also update the top surface if it exists
    const liquidTop = liquidHandler?.getLiquidTop();
    if (liquidTop && liquidTop.material) {
      const topMaterial = liquidTop.material as THREE.MeshPhysicalMaterial;
      if (topMaterial && topMaterial.color) {
        topMaterial.color.setHex(dominantColor);
      }
    }
  }

  // Add garnishes if any
  cocktail.garnishes.forEach(garnish => {
    // This would need to be implemented based on your garnish system
    console.log('Adding garnish:', garnish.name);
  });
}

function calculateLiquidColor(ingredients: any[]): number {
  // Simple color calculation based on ingredient hex codes
  const coloredIngredients = ingredients.filter(ing => ing.hexcode);
  if (coloredIngredients.length === 0) return 0x4169E1; // Default blue

  // Use the first colored ingredient's color
  return parseInt(coloredIngredients[0].hexcode.replace('#', ''), 16);
}

// Enhanced chat input handling
const chatInput = document.querySelector('.chat-input') as HTMLInputElement;
const sendButton = document.querySelector('.send-btn') as HTMLButtonElement;

// Enhanced chat input handling with error handling
function sendChatMessage() {
  const message = chatInput?.value.trim();
  if (message) {
    try {
      // Add user message to chat
      const chatMessages = document.querySelector('.chat-messages .message-container');
      if (chatMessages) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.textContent = `You: ${message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      // Send via WebSocket
      if (chatWebSocket) {
        chatWebSocket.sendMessage(message);
      } else {
        throw new Error('Chat service not available');
      }

      // Clear input
      if (chatInput) chatInput.value = '';

    } catch (error) {
      console.error('Failed to send message:', error);

      // Show error in chat
      const chatMessages = document.querySelector('.chat-messages .message-container');
      if (chatMessages) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message bot chat-error';
        errorDiv.style.cssText = `
          background: #ffebee;
          border-left: 4px solid #f44336;
          color: #c62828;
          padding: 8px;
          border-radius: 4px;
        `;
        errorDiv.textContent = `❌ Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
  }
}

sendButton?.addEventListener('click', sendChatMessage);
chatInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendChatMessage();
  }
});

// Expose refresh function globally for WebSocket updates
(window as any).refreshShelfPanel = loadAndDisplayShelf;

// Load shelf on startup
loadAndDisplayShelf();

function showShelfEnhanced() {
  // Hide recipe elements
  if (ingredientsBox) ingredientsBox.style.display = 'none'
  if (recipeBox) recipeBox.style.display = 'none'
  if (ingredientsHeader) ingredientsHeader.style.display = 'none'
  if (recipeHeader) recipeHeader.style.display = 'none'

  // Show shelf elements
  const shelfBoxes = document.querySelectorAll('.shelf-box') as NodeListOf<HTMLElement>;
  shelfBoxes.forEach(box => box.style.display = 'flex')

  // Update button states
  shelfButton?.classList.add('selected')
  recipeButton?.classList.remove('selected')

  // Reload shelf data with error handling
  loadAndDisplayShelf().catch(error => {
    console.error('Error loading shelf in enhanced view:', error);
  });
}

// Replace the existing shelf button listener
shelfButton?.removeEventListener('click', showShelf);
shelfButton?.addEventListener('click', showShelfEnhanced);