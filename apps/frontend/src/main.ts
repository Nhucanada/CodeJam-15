import './style.css'
import * as THREE from 'three'
import { GlassLoader } from './scene/GlassLoader'
import { IceLoader } from './scene/IceLoader'
import { GarnishLoader, type GlassName } from './scene/GarnishLoader'
import { CharacterLoader } from './scene/CharacterLoader'
import { BarLoader } from './scene/BarLoader'
import { Lighting } from './scene/Lighting'
import { CameraSetup } from './scene/CameraSetup'
import { ControlsSetup } from './scene/ControlsSetup'
import { chatWebSocket } from './websocket/chatHandler'
import { cocktailAPI } from './api/client'
import type { CocktailDetail, DrinkRecipeSchema } from './types/cocktail'
import { LoginOverlay } from './components/LoginOverlay'
import { authAPI } from './api/client'
import { exampleCocktails } from './data/cocktails'
import { glassTypeToRenderer, garnishToRenderer } from './types'
import { mapBackendDrinkToFrontend } from './utils/drinkMapper'

// Token refresh management
class TokenManager {
    private refreshInterval: number | null = null;
    private readonly REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes (refresh before 5min expiry)

    start() {
        this.stop(); // Clear any existing interval

        if (authAPI.isAuthenticated()) {
            console.log('Starting token refresh manager');
            this.scheduleNextRefresh();
        }
    }

    stop() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Token refresh manager stopped');
        }
    }

    private scheduleNextRefresh() {
        this.refreshInterval = window.setInterval(async () => {
            await this.refreshTokenIfNeeded();
        }, this.REFRESH_INTERVAL);
    }

    private async refreshTokenIfNeeded() {
    try {
        if (!authAPI.isAuthenticated()) {
            console.log('User not authenticated, stopping token refresh');
            this.stop();
            return;
        }

        console.log('Refreshing access token...');
        console.log('Current tokens:', {
            access_token: localStorage.getItem('access_token')?.substring(0, 20) + '...',
            refresh_token: localStorage.getItem('refresh_token')?.substring(0, 20) + '...'
        });

        await authAPI.refreshToken();
        console.log('Token refreshed successfully');

    } catch (error) {
        console.error('Token refresh failed:', error);

        // If refresh fails, user needs to log in again
        this.stop();
        authAPI.logout();

        // Show login overlay
        const loginOverlay = document.querySelector('.login-overlay');
        if (loginOverlay) {
            (loginOverlay as HTMLElement).style.display = 'flex';
        } else {
            initializeAuth();
        }

        // Show notification to user
        this.showTokenExpiredNotification();
    }
}

    private showTokenExpiredNotification() {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = 'Your session has expired. Please log in again.';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 25px;
            border-radius: 4px;
            z-index: 10000;
            font-family: 'Sixtyfour', monospace;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Create and start token manager
const tokenManager = new TokenManager();

// Start token refresh when authenticated
if (authAPI.isAuthenticated()) {
    tokenManager.start();
}

// Authentication check and login overlay
let loginOverlay: LoginOverlay;

// Update the initializeAuth function to include token manager
function initializeAuth(): void {
  if (!authAPI.isAuthenticated()) {
    // Hide all panels during login
    const chatPanel = document.querySelector('.chat-panel') as HTMLElement;
    const recipePanel = document.querySelector('.recipe-panel') as HTMLElement;
    const drinkPanel = document.querySelector('.drink-panel') as HTMLElement;
    if (chatPanel) {
      chatPanel.style.display = 'none';
    }
    if (recipePanel) {
      recipePanel.style.display = 'none';
    }
    if (drinkPanel) {
      drinkPanel.style.display = 'none';
    }

  loginOverlay = new LoginOverlay(() => {
    console.log('Authentication successful!');

    // Show all panels after login
    const chatPanel = document.querySelector('.chat-panel') as HTMLElement;
    const recipePanel = document.querySelector('.recipe-panel') as HTMLElement;
    const drinkPanel = document.querySelector('.drink-panel') as HTMLElement;
    if (chatPanel) {
      chatPanel.style.display = 'block';
    }
    if (recipePanel) {
      recipePanel.style.display = 'block';
    }
    if (drinkPanel) {
      drinkPanel.style.display = 'block';
    }

    // Clear any existing WebSocket errors
    const chatMessages = document.querySelector('.chat-messages .message-container');
    if (chatMessages) {
      const existingErrors = chatMessages.querySelectorAll('.chat-error');
      existingErrors.forEach(error => error.remove());
    }

    tokenManager.start(); // Start token refresh after login

    // Reconnect WebSocket with new token
    chatWebSocket.reconnect();

    // Reload shelf and any other authenticated content
    if (typeof loadAndDisplayShelf === 'function') {
      loadAndDisplayShelf();
    }

    // Show Arthur's greeting after login
    setTimeout(showArthurGreeting, 2000);
  });
    loginOverlay.show();
  } else {
    // Show all panels if already authenticated
    const chatPanel = document.querySelector('.chat-panel') as HTMLElement;
    const recipePanel = document.querySelector('.recipe-panel') as HTMLElement;
    const drinkPanel = document.querySelector('.drink-panel') as HTMLElement;
    if (chatPanel) {
      chatPanel.style.display = 'block';
    }
    if (recipePanel) {
      recipePanel.style.display = 'block';
    }
    if (drinkPanel) {
      drinkPanel.style.display = 'block';
    }
    tokenManager.start(); // Start token refresh if already authenticated
  }
}

// Initialize authentication on page load
initializeAuth();

// Add logout functionality (optional - you can add a logout button later)
(window as any).logout = () => {
  authAPI.logout();
  initializeAuth();
};

// Audio setup
const pourSound = new Audio('/src/assets/SFX/PourSFX.mp3')
const iceSound = new Audio('/src/assets/SFX/IceSFX.mp3')

// Helper function to play audio with optional start time trimming and duration
function playSound(audio: HTMLAudioElement, startTime: number = 0, duration?: number) {
  audio.currentTime = startTime
  audio.play().catch(err => console.error('Audio playback error:', err))

  // If duration is specified, stop playback after that duration
  if (duration) {
    setTimeout(() => {
      audio.pause()
    }, duration * 1000) // Convert to milliseconds
  }
}

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0f) // Darker background for bar atmosphere

// Add fog for atmospheric depth - objects fade into darkness with distance
// Fog(color, near distance, far distance)
scene.fog = new THREE.Fog(0x0a0a0f, 30, 140)

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


// // Create floor
// new Floor(scene)

// Initialize loaders
const glassLoader = new GlassLoader()
const iceLoader = new IceLoader()
const garnishLoader = new GarnishLoader()
const characterLoader = new CharacterLoader()
const barLoader = new BarLoader()

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

      // Play pour sound when liquid starts filling
      // Trim start by 1.0 second and play for 1 second to match fill duration
      playSound(pourSound, 1.5, 2.0)
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

// Helper function to render drink from backend recipe data
function renderDrinkFromBackend(recipe: DrinkRecipeSchema) {
  console.log('[3D RENDER] ========== Starting renderDrinkFromBackend ==========')
  console.log('[3D RENDER] Backend recipe:', recipe)
  console.log('[3D RENDER] Recipe name:', recipe.name)
  console.log('[3D RENDER] Backend glass_type:', recipe.glass_type)
  console.log('[3D RENDER] Backend garnish:', recipe.garnish)
  console.log('[3D RENDER] Backend has_ice:', recipe.has_ice)
  console.log('[3D RENDER] Backend ingredients:', recipe.ingredients)

  // Convert backend recipe to frontend cocktail config
  console.log('[3D RENDER] Calling mapBackendDrinkToFrontend...')
  const cocktailConfig = mapBackendDrinkToFrontend(recipe)
  console.log('[3D RENDER] Mapped cocktailConfig:', cocktailConfig)
  console.log('[3D RENDER] Frontend glassType:', cocktailConfig.glassType)
  console.log('[3D RENDER] Frontend liquidColor:', cocktailConfig.liquidColor)
  console.log('[3D RENDER] Frontend garnish:', cocktailConfig.garnish)
  console.log('[3D RENDER] Frontend hasIce:', cocktailConfig.hasIce)

  // Map user-friendly types to renderer types
  const glassName = glassTypeToRenderer[cocktailConfig.glassType]
  console.log('[3D RENDER] Renderer glass name:', glassName)

  const garnishName = cocktailConfig.garnish && cocktailConfig.garnish !== 'none'
    ? garnishToRenderer[cocktailConfig.garnish]
    : null
  console.log('[3D RENDER] Renderer garnish name:', garnishName)

  // Update drink title using the proper function
  console.log('[3D RENDER] Updating drink title to:', recipe.name)
  updateDrinkTitle(recipe.name)

  // Switch to new glass
  glassLoader.switchGlass(glassName, iceLoader, garnishLoader).then(() => {
    // Update liquid color
    const liquidHandler = glassLoader.getLiquidHandler()
    if (liquidHandler) {
      const color = new THREE.Color(cocktailConfig.liquidColor)
      liquidHandler.setLiquidColor(color)

      // Play pour sound when liquid starts filling
      playSound(pourSound, 1.5, 2.0)
    }

    // Add ice if needed
    if (cocktailConfig.hasIce) {
      createIceCubesForGlass(glassName, !!garnishName)
    }

    // Add garnish if specified
    if (garnishName) {
      garnishLoader.loadGarnish(scene, garnishName, glassName, true, cocktailConfig.garnish && cocktailConfig.garnish !== 'none' ? cocktailConfig.garnish : undefined).then(() => {
        console.log(`[GARNISH] ${garnishName} loaded`)

        // If no ice, trigger garnish falling immediately after liquid fills
        if (!cocktailConfig.hasIce) {
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
    // Play ice sound when ice starts falling
    // Trim start by 0.5 seconds
    playSound(iceSound, 1)

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

  // Load sci-fi bar in the background
  barLoader.loadBar(
    scene,
    new THREE.Vector3(-7, -21.85, 40),
    200,
    new THREE.Euler(0, Math.PI/2, 0)
  ).catch(console.error)
})

// Handle window resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
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
    console.log('[SHELF] Loading shelf...');
    const response = await cocktailAPI.getUserShelf();
    console.log('[SHELF] Shelf loaded successfully:', response);

    // Clear any existing error messages when backend is working
    clearAllErrorMessages();

    updateShelfDisplay(response.cocktails, response.agent_greeting);

  // Only reset drink title to default if we're actually switching to shelf view
  // and don't have a currently selected cocktail
  console.log('[DRINK TITLE] Checking if we should reset title for shelf view');
  const shelfButton = Array.from(document.querySelectorAll('.recipe-btn')).find(btn =>
    btn.textContent === 'SHELF'
  ) as HTMLButtonElement;
  const isShelfView = shelfButton?.classList.contains('selected');

  if (isShelfView && !selectedCocktail) {
    console.log('[DRINK TITLE] Resetting to default for shelf view (no selected cocktail)');
    resetDrinkTitle();
  } else if (selectedCocktail) {
    console.log('[DRINK TITLE] Keeping current cocktail title:', selectedCocktail.name);
    updateDrinkTitle(selectedCocktail.name);
  }

  } catch (error) {
    console.error('Failed to load shelf:', error);
    // Don't show error UI - let the app continue working
  }

    // Only show error if we're actually in shelf view
    const shelfButton = document.querySelector('.recipe-btn') as HTMLButtonElement;
    const isShelfView = shelfButton?.classList.contains('selected');

    if (isShelfView) {
      // Show user-friendly error message in shelf
      const recipeContent = document.querySelector('.recipe-content');
      if (recipeContent) {
        // Clear any existing content first
        const existingShelfBoxes = document.querySelectorAll('.shelf-box, .shelf-empty, .shelf-error');
        existingShelfBoxes.forEach(box => box.remove());

        const errorDiv = document.createElement('div');
        errorDiv.className = 'shelf-error';

        // Check error type for better messaging
        if (error instanceof Error) {
          if (error.message.includes('Backend server not running') || error.message.includes('fetch')) {
            errorDiv.innerHTML = `
              <div style="text-align: center; padding: 40px; color: #f44336;">
                <h3>🔌 Backend Not Running</h3>
                <p>The backend server needs to be started to load cocktails.</p>
                <p style="font-size: 0.9em; opacity: 0.7;">Run: <code>npm run dev</code> in the backend folder</p>
              </div>
            `;

            // Show same error in drink title
            showDrinkTitleError('Backend server not running');

          } else {
            errorDiv.innerHTML = `
              <div style="text-align: center; padding: 40px; color: #f44336;">
                <h3>⚠️ Connection Error</h3>
              </div>
            `;

            // Show same error in drink title
            showDrinkTitleError('⚠️ Connection Error');
          }
        } else {
          errorDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f44336;">
              <h3>❌ Unknown Error</h3>
              <p>Could not load cocktails.</p>
            </div>
          `;

          // Show same error in drink title
          showDrinkTitleError('Unknown Error');
        }

        recipeContent.appendChild(errorDiv);
      }
    } else {
      // If we're not in shelf view, just log the error but don't show UI errors
      console.log('[SHELF] Not in shelf view, skipping error display');
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
        recipePanel.appendChipld(shelfBox);
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
      // Don't show persistent errors
    }
  });

  return shelfBox;
}

function showRecipeLoading() {
  // Show loading in drink title
  showDrinkTitleLoading();

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
    // Update drink title with the cocktail name
    console.log('[DRINK TITLE] Updating drink title to:', cocktail.name);
    updateDrinkTitle(cocktail.name);

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
    // Don't show persistent errors
  }
}

function updateDrinkTitle(cocktailName: string) {
  const drinkTitleContainer = document.querySelector('.drink-title-container');
  if (drinkTitleContainer) {
    drinkTitleContainer.innerHTML = `
      <h2 class="drink-title">${cocktailName}</h2>
      <button class="drink-action-btn">
        <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M46 8V4H18V8H14V60H18V56H22V52H26V48H30V44H34V48H38V52H42V56H46V60H50V8H46Z" fill="currentColor"/>
        </svg>
      </button>
    `;
  }
}

function showDrinkTitleLoading() {
  const drinkTitleContainer = document.querySelector('.drink-title-container');
  if (drinkTitleContainer) {
    drinkTitleContainer.innerHTML = `
      <div class="drink-title-loading" style="
        background: #e3f2fd;
        border-left: 4px solid #2196f3;
        color: #1976d2;
        padding: 12px;
        border-radius: 4px;
        text-align: center;
        font-size: 14px;
        font-style: italic;
      ">⏳ Loading drink...</div>
      <button class="drink-action-btn">
        <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M46 8V4H18V8H14V60H18V56H22V52H26V48H30V44H34V48H38V52H42V56H46V60H50V8H46Z" fill="currentColor"/>
        </svg>
      </button>
    `;
  }
}

function resetDrinkTitle() {
  const drinkTitleContainer = document.querySelector('.drink-title-container');
  if (drinkTitleContainer) {
    drinkTitleContainer.innerHTML = `
      <h2 class="drink-title">Select a Drink</h2>
      <button class="drink-action-btn">
        <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M46 8V4H18V8H14V60H18V56H22V52H26V48H30V44H34V48H38V52H42V56H46V60H50V8H46Z" fill="currentColor"/>
        </svg>
      </button>
    `;
  }
}

function clearAllErrorMessages() {
  console.log('[CLEAR ERRORS] Clearing all error messages because backend is working');

  // Clear shelf errors
  const existingShelfErrors = document.querySelectorAll('.shelf-error');
  existingShelfErrors.forEach(error => error.remove());

  // Clear recipe errors
  const existingRecipeErrors = document.querySelectorAll('.recipe-error');
  existingRecipeErrors.forEach(error => error.remove());

  // Clear chat errors
  const existingChatErrors = document.querySelectorAll('.chat-error');
  existingChatErrors.forEach(error => error.remove());

  // Clear drink title errors but preserve current state
  // Don't handle drink title errors - they shouldn't persist
  console.log('[CLEAR ERRORS] Skipping drink title error handling');
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

// Debug functions for testing token refresh
(window as any).testTokenRefresh = async () => {
    console.log('Testing token refresh manually...');
    try {
        await authAPI.refreshToken();
        console.log('Manual token refresh successful');
    } catch (error) {
        console.error('Manual token refresh failed:', error);
    }
};

(window as any).checkTokens = () => {
    console.log('Current tokens:', {
        access_token: localStorage.getItem('access_token'),
        refresh_token: localStorage.getItem('refresh_token'),
        isAuthenticated: authAPI.isAuthenticated()
    });
};

sendButton?.addEventListener('click', sendChatMessage);
chatInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendChatMessage();
  }
});

// Expose refresh function globally for WebSocket updates
(window as any).refreshShelfPanel = loadAndDisplayShelf;

// Expose renderDrinkFromBackend globally for WebSocket updates
(window as any).renderDrinkFromBackend = renderDrinkFromBackend;

chatInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendChatMessage();
  }
});

// Handle placeholder label visibility
const chatInputElement = document.getElementById('chat-input') as HTMLInputElement;
const sendMessageTitle = document.querySelector('.send-message-title') as HTMLElement;

if (chatInputElement && sendMessageTitle) {
  // Function to update label visibility
  function updateLabelVisibility() {
    if (chatInputElement.value.trim().length > 0) {
      chatInputElement.classList.add('has-content');
    } else {
      chatInputElement.classList.remove('has-content');
    }
  }

  // Update on input
  chatInputElement.addEventListener('input', updateLabelVisibility);

  // Update on focus/blur
  chatInputElement.addEventListener('focus', () => {
    sendMessageTitle.style.opacity = '0';
  });

  chatInputElement.addEventListener('blur', () => {
    if (chatInputElement.value.trim().length === 0) {
      sendMessageTitle.style.opacity = '1';
    }
  });

  // Initial check
  updateLabelVisibility();
}

// Expose refresh function globally for WebSocket updates
(window as any).refreshShelfPanel = loadAndDisplayShelf;

// Load shelf on startup
loadAndDisplayShelf();

// Add Arthur's automatic greeting after page load
function showArthurGreeting() {
  if (authAPI.isAuthenticated()) {
    const chatMessages = document.querySelector('.chat-messages .message-container');
    if (chatMessages) {
      // Check if there are already messages (to avoid duplicate greetings)
      const existingMessages = chatMessages.querySelectorAll('.message.bot:not(.chat-error)');
      if (existingMessages.length === 0) {
        // Array of possible greetings
        const greetings = [
          "Hey! What can I get you?",
          "What do you want to drink?",
          "Good evening! What can I get you started with?",
          "Hi! What do you want?"
        ];

        // Randomly select a greeting
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

        const greetingDiv = document.createElement('div');
        greetingDiv.className = 'message bot';
        greetingDiv.textContent = `Arthur: ${randomGreeting}`;
        chatMessages.appendChild(greetingDiv);

        // Auto-scroll to show the greeting
        const chatContainer = document.querySelector('.chat-messages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }
    }
  }
}

// Show greeting after 2 seconds, but only if authenticated
setTimeout(showArthurGreeting, 2000);

setTimeout(() => {
  const profileImg = document.getElementById('profile-img') as HTMLImageElement;
  if (profileImg) {
    profileImg.src = '/src/img/image_3.png';
  }
}, 0);

// Update login overlay to start token manager after successful login
const originalLoginOverlay = LoginOverlay;

// Enhanced logout functionality with custom dialog
function logoutWithConfirmation() {
  showLogoutDialog();
}

function showLogoutDialog() {
  // Create logout overlay if it doesn't exist
  let logoutOverlay = document.querySelector('.logout-overlay') as HTMLElement;

  if (!logoutOverlay) {
    logoutOverlay = document.createElement('div');
    logoutOverlay.className = 'logout-overlay';
    logoutOverlay.innerHTML = `
      <div class="logout-modal">
        <div class="logout-content">
          <h2 class="logout-title">Confirm Logout</h2>
          <p class="logout-message">Are you sure you want to log out?<br>You'll need to sign in again to continue.</p>
          <div class="logout-buttons">
            <button class="logout-cancel-btn">Cancel</button>
            <button class="logout-confirm-btn">Log Out</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(logoutOverlay);

    // Add event listeners
    const cancelBtn = logoutOverlay.querySelector('.logout-cancel-btn');
    const confirmBtn = logoutOverlay.querySelector('.logout-confirm-btn');

    cancelBtn?.addEventListener('click', hideLogoutDialog);
    confirmBtn?.addEventListener('click', () => {
      hideLogoutDialog();
      performLogout();
    });

    // Close on overlay click
    logoutOverlay.addEventListener('click', (e) => {
      if (e.target === logoutOverlay) {
        hideLogoutDialog();
      }
    });
  }

  logoutOverlay.style.display = 'flex';
}

function hideLogoutDialog() {
  const logoutOverlay = document.querySelector('.logout-overlay') as HTMLElement;
  if (logoutOverlay) {
    logoutOverlay.style.display = 'none';
  }
}

async function performLogout() {
  tokenManager.stop(); // Stop token refresh before logout

  try {
    // Call backend logout endpoint
    const token = localStorage.getItem('access_token');
    if (token) {
      const response = await fetch('http://localhost:8000/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Log response for debugging but continue even if it fails
      if (!response.ok) {
        console.warn('Backend logout failed, but continuing with local logout');
      }
    }
  } catch (error) {
    console.warn('Failed to contact logout endpoint, but continuing with local logout:', error);
  }

  // Always clear local storage and show login
  authAPI.logout();
  initializeAuth();
}

// Add logout button event listener
const logoutBtn = document.querySelector('.logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', logoutWithConfirmation);
}

// Update the global logout function to use the new confirmation
(window as any).logout = logoutWithConfirmation;

function showShelfEnhanced() {
  console.log('[SHELF] Showing enhanced shelf view');

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

  // Reload shelf data with error handling - this will handle drink title state
  loadAndDisplayShelf().catch(error => {
    console.error('Error loading shelf in enhanced view:', error);
  });
}

// Replace the existing shelf button listener
shelfButton?.removeEventListener('click', showShelf);
shelfButton?.addEventListener('click', showShelfEnhanced);