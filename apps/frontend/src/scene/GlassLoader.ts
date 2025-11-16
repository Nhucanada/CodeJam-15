import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as TWEEN from '@tweenjs/tween.js'
import { LiquidHandler } from './LiquidHandler'
import { IceLoader } from './IceLoader'
import { GarnishLoader } from './GarnishLoader'

type GlassName =
  | 'zombie_glass_0'
  | 'cocktail_glass_1'
  | 'rocks_glass_2'
  | 'hurricane_glass_3'
  | 'pint_glass_4'
  | 'seidel_Glass_5'
  | 'shot_glass_6'
  | 'highball_glass_7'
  | 'margarita_glass_8'
  | 'martini_glass_9'

// Y position offsets for each glass type to align them on the floor
const GLASS_Y_POSITIONS: Record<GlassName, number> = {
  zombie_glass_0: 0.17,
  cocktail_glass_1: 0.15,
  rocks_glass_2: 1.2,
  hurricane_glass_3: 0.12,
  pint_glass_4: 0.12,
  seidel_Glass_5: 0.12,
  shot_glass_6: 0.10,
  highball_glass_7: 1,
  margarita_glass_8: 0.16,
  martini_glass_9: 0.15,
}

// Liquid start position as percentage of glass height (0.0 to 1.0)
// For glasses with stems (like martini), set higher to start above the stem
const LIQUID_START_PERCENT: Record<GlassName, number> = {
  zombie_glass_0: 0.06,
  cocktail_glass_1: 0.25, // Has stem
  rocks_glass_2: 0.06,
  hurricane_glass_3: 0.24,
  pint_glass_4: 0.06,
  seidel_Glass_5: 0.06,
  shot_glass_6: 0.06,
  highball_glass_7: 0.06,
  margarita_glass_8: 0.55, // Has stem
  martini_glass_9: 0.55, // Has stem
}

// Liquid end position as percentage of glass height (0.0 to 1.0)
// Different drinks fill to different levels based on serving standards
const LIQUID_END_PERCENT: Record<GlassName, number> = {
  zombie_glass_0: 0.85, // Zombie - tropical cocktail, filled generously
  cocktail_glass_1: 0.80, // Cocktail glass - filled to just below rim
  rocks_glass_2: 0.70, // Rocks glass - spirits served on ice, moderate fill
  hurricane_glass_3: 0.88, // Hurricane - large tropical drink, filled high
  pint_glass_4: 0.90, // Pint glass - beer, filled to top with head
  seidel_Glass_5: 0.90, // Seidel (beer mug) - beer, filled to top
  shot_glass_6: 0.95, // Shot glass - filled to the brim
  highball_glass_7: 0.85, // Highball - mixed drinks with ice, standard fill
  margarita_glass_8: 0.95, // Margarita glass - filled to bowl, not stem
  martini_glass_9: 0.97,
}

// Ice cube configuration for each glass type
export interface IceCubeConfig {
  count: number // Number of ice cubes
  positions: Array<{ x: number; z: number; rotation?: { x: number; y: number; z: number } }> // Relative X/Z positions from glass center, optional rotation in radians
  scale: number // Scale of ice cubes (default ~0.4-0.5)
  yOffset: number // Y offset from liquid surface (negative = below surface)
}

const ICE_CUBE_CONFIGS: Record<GlassName, IceCubeConfig> = {
  zombie_glass_0: {
    count: 3,
    positions: [
      { x: 0.25, z: 0.25, rotation: { x: -0.05, y: 0.5, z: 0.08 } },
      { x: -0.25, z: 0.25, rotation: { x: 0.08, y: -0.2, z: -0.05 } },
      { x: 0, z: -0.3, rotation: { x: -0.08, y: 0.4, z: 0.05 } },
    ],
    scale: 0.55,
    yOffset: -0.2,
  },
  cocktail_glass_1: {
    count: 1,
    positions: [{ x: 0, z: 0, rotation: { x: 0.1, y: 0.2, z: 0.15 } }],
    scale: 0.65,
    yOffset: -0.25,
  },
  rocks_glass_2: {
    count: 1,
    positions: [
      { x: 0, z: 0, rotation: { x: 0.1, y: 0.05, z: 0.05 } },
    ],
    scale: 1.15,
    yOffset: -0.5,
  },
  hurricane_glass_3: {
    count: 3,
    positions: [
      { x: 0.15, z: 0.15, rotation: { x: -0.2, y: 0.35, z: 0.2 } },
      { x: -0.15, z: 0.15, rotation: { x: 0.25, y: -0.15, z: -0.1 } },
      { x: -0.15, z: -0.15, rotation: { x: 0.2, y: -0.25, z: -0.2 } },
    ],
    scale: 0.35,
    yOffset: -0.2,
  },
  pint_glass_4: {
    count: 8,
    positions: [
      { x: 0, z: 0, rotation: { x: 0.05, y: 0.3, z: 0.05 } },
      { x: 0.45, z: 0.45, rotation: { x: -0.05, y: 0.5, z: 0.08 } },
      { x: -0.45, z: 0.45, rotation: { x: 0.08, y: -0.2, z: -0.05 } },
      { x: 0.45, z: -0.45, rotation: { x: -0.08, y: 0.35, z: 0.05 } },
      { x: -0.45, z: -0.45, rotation: { x: 0.05, y: 0.3, z: 0.05 } },
      { x: 0.65, z: 0, rotation: { x: -0.05, y: 0.5, z: 0.08 } },
      { x: -0.65, z: 0, rotation: { x: 0.08, y: -0.2, z: -0.05 } },
      { x: 0, z: 0.65, rotation: { x: -0.08, y: 0.35, z: 0.05 } },
    ],
    scale: 0.55,
    yOffset: -0.25,
  },
  seidel_Glass_5: {
    count: 4,
    positions: [
      { x: 0, z: 0, rotation: { x: 0.2, y: 0.3, z: 0.1 } },
      { x: 0.2, z: 0.2, rotation: { x: -0.15, y: 0.5, z: 0.25 } },
      { x: -0.2, z: 0.2, rotation: { x: 0.3, y: -0.2, z: -0.15 } },
      { x: 0, z: -0.25, rotation: { x: -0.25, y: 0.35, z: 0.2 } },
    ],
    scale: 0.42,
    yOffset: -0.25,
  },
  shot_glass_6: {
    count: 1,
    positions: [{ x: 0, z: 0, rotation: { x: 0.1, y: 0.15, z: 0.1 } }],
    scale: 0.25,
    yOffset: -0.1,
  },
  highball_glass_7: {
    count: 8,
    positions: [
      { x: 0, z: 0, rotation: { x: 0.05, y: 0.3, z: 0.05 } },
      { x: 0.45, z: 0.45, rotation: { x: -0.05, y: 0.5, z: 0.08 } },
      { x: -0.45, z: 0.45, rotation: { x: 0.08, y: -0.2, z: -0.05 } },
      { x: 0.45, z: -0.45, rotation: { x: -0.08, y: 0.35, z: 0.05 } },
      { x: -0.45, z: -0.45, rotation: { x: 0.05, y: 0.3, z: 0.05 } },
      { x: 0.6, z: 0, rotation: { x: -0.05, y: 0.5, z: 0.08 } },
      { x: -0.6, z: 0, rotation: { x: 0.08, y: -0.2, z: -0.05 } },
      { x: 0, z: 0.6, rotation: { x: -0.08, y: 0.35, z: 0.05 } },
    ],
    scale: 0.55,
    yOffset: -0.22,
  },
  margarita_glass_8: {
    count: 9,
   positions: [
      { x: 0, z: 0, rotation: { x: 0.05, y: 0.3, z: 0.05 } },
      { x: 0.55, z: 0.55, rotation: { x: -0.05, y: 0.5, z: 0.08 } },
      { x: -0.55, z: 0.55, rotation: { x: 0.08, y: -0.2, z: -0.05 } },
      { x: 0.55, z: -0.55, rotation: { x: -0.08, y: 0.35, z: 0.05 } },
      { x: -0.55, z: -0.55, rotation: { x: 0.05, y: 0.3, z: 0.05 } },
      { x: 0.75, z: 0, rotation: { x: -0.05, y: 0.5, z: 0.08 } },
      { x: -0.75, z: 0, rotation: { x: 0.08, y: -0.2, z: -0.05 } },
      { x: 0, z: 0.75, rotation: { x: -0.08, y: 0.35, z: 0.05 } },
      { x: 0, z: -0.75, rotation: { x: 0.05, y: -0.3, z: 0.08 } },
    ],
    scale: 0.55,
    yOffset: -0.15,
  },
  martini_glass_9: {
    count: 9,
    positions: [
      { x: 0, z: 0, rotation: { x: 0.05, y: 0.3, z: 0.05 } },
      { x: 0.55, z: 0.55, rotation: { x: -0.05, y: 0.5, z: 0.08 } },
      { x: -0.55, z: 0.55, rotation: { x: 0.08, y: -0.2, z: -0.05 } },
      { x: 0.55, z: -0.55, rotation: { x: -0.08, y: 0.35, z: 0.05 } },
      { x: -0.55, z: -0.55, rotation: { x: 0.05, y: 0.3, z: 0.05 } },
      { x: 0.75, z: 0, rotation: { x: -0.05, y: 0.5, z: 0.08 } },
      { x: -0.75, z: 0, rotation: { x: 0.08, y: -0.2, z: -0.05 } },
      { x: 0, z: 0.75, rotation: { x: -0.08, y: 0.35, z: 0.05 } },
      { x: 0, z: -0.75, rotation: { x: 0.05, y: -0.3, z: 0.08 } },
    ],
    scale: 0.45,
    yOffset: -0.12,
  },
}

export class GlassLoader {
  private loader: GLTFLoader
  private selectedGlass: THREE.Object3D | null = null
  private liquidHandler: LiquidHandler | null = null
  private scene: THREE.Scene | null = null
  private controls: OrbitControls | null = null
  private camera: THREE.Camera | null = null
  private tweenGroup: TWEEN.Group

  constructor() {
    this.loader = new GLTFLoader()
    this.tweenGroup = new TWEEN.Group()
  }

  public async loadGlass(
    scene: THREE.Scene,
    glassName: GlassName,
    controls: OrbitControls,
    camera: THREE.Camera,
    autoStartFill: boolean = true
  ): Promise<void> {
    this.scene = scene
    this.controls = controls
    this.camera = camera
    this.liquidHandler = new LiquidHandler(scene)

    return new Promise((resolve, reject) => {
      this.loader.load(
        '/models/scene.gltf',
        (gltf) => {
          const model = gltf.scene

          // Find the specific glass we want to load
          let selectedGlass: THREE.Object3D | undefined
          model.traverse((child: THREE.Object3D) => {
            if (child.name === glassName) {
              selectedGlass = child
            }
          })

          if (selectedGlass) {
            // Enable shadows and adjust material for all meshes in the selected glass
            selectedGlass.traverse((child: THREE.Object3D) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true
                child.receiveShadow = true

                // Replace with glass material for see-through effect
                child.material = new THREE.MeshPhysicalMaterial({
                  metalness: 0.0,
                  roughness: 0.05,
                  transmission: 0.5, // Makes it see-through like glass
                  thickness: 0.2,
                  transparent: true,
                  opacity: 0.6,
                  color: 0xffffff,
                  ior: 1.1, // Reduced refraction index for less distortion
                  depthWrite: false, // Allow seeing objects behind transparent glass
                  side: THREE.DoubleSide, // Render both sides of glass
                })
              }
            })

            // Center the glass and place it on the floor
            const box = new THREE.Box3().setFromObject(selectedGlass)
            const center = box.getCenter(new THREE.Vector3())

            selectedGlass.position.sub(center) // Move to origin
            selectedGlass.position.y = GLASS_Y_POSITIONS[glassName]

            scene.add(selectedGlass)
            this.selectedGlass = selectedGlass

            // Recalculate bounding box after positioning
            const finalBox = new THREE.Box3().setFromObject(selectedGlass)
            const glassCenter = finalBox.getCenter(new THREE.Vector3())

            // Create liquid inside the glass
            this.liquidHandler!.createLiquid(
              selectedGlass,
              finalBox,
              LIQUID_START_PERCENT[glassName],
              LIQUID_END_PERCENT[glassName]
            )

            // Start filling animation to 100% if auto-start is enabled
            if (autoStartFill) {
              this.liquidHandler!.setFillLevel(1)
            }

            // Update camera and controls to focus on the center of the glass with smooth transition
            this.smoothCameraTransition(controls, glassCenter)

            console.log('Glass loaded successfully!')
            resolve()
          } else {
            const error = `Glass "${glassName}" not found in model`
            console.error(error)
            reject(new Error(error))
          }
        },
        undefined,
        (error) => {
          console.error('Error loading model:', error)
          reject(error)
        }
      )
    })
  }

  public getGlass(): THREE.Object3D | null {
    return this.selectedGlass
  }

  /**
   * Switch to a new glass with animations
   * - Current glass swipes out in x direction
   * - New glass drops in from top with bounce
   */
  public async switchGlass(newGlassName: GlassName, iceLoader: IceLoader, garnishLoader?: GarnishLoader): Promise<void> {
    if (!this.scene || !this.controls || !this.camera) {
      throw new Error('Scene, controls, or camera not initialized')
    }

    const oldGlass = this.selectedGlass
    const oldLiquidHandler = this.liquidHandler

    // Pause liquid filling animation
    if (oldLiquidHandler) {
      oldLiquidHandler.pause()
    }

    // Step 1: Swipe out animation (if there's an old glass)
    if (oldGlass && oldLiquidHandler) {
      const liquid = oldLiquidHandler.getLiquid()
      const liquidTop = oldLiquidHandler.getLiquidTop()

      await new Promise<void>((resolve) => {
        const startPos = { x: oldGlass.position.x }
        const endPos = { x: oldGlass.position.x + 5 } // Swipe 5 units to the right
        let previousX = startPos.x

        new TWEEN.Tween(startPos, this.tweenGroup)
          .to(endPos, 500) // 500ms duration
          .easing(TWEEN.Easing.Quadratic.In) // Accelerate out
          .onUpdate(() => {
            // Calculate the change in X position
            const deltaX = startPos.x - previousX
            previousX = startPos.x

            oldGlass.position.x = startPos.x
            // Move liquid with glass
            if (liquid) {
              liquid.position.x = startPos.x
            }
            if (liquidTop) {
              liquidTop.position.x = startPos.x
            }
            // Move ice with glass
            iceLoader.moveAllIceByOffset(deltaX)
            // Move garnishes with glass
            if (garnishLoader) {
              garnishLoader.moveVisibleGarnishesByOffset(deltaX)
            }
          })
          .onComplete(() => {
            // Clean up old glass, liquid, and ice
            this.scene!.remove(oldGlass)
            if (liquid) {
              this.scene!.remove(liquid)
            }
            if (liquidTop) {
              this.scene!.remove(liquidTop)
            }
            // Remove all ice after the old glass has swiped out
            iceLoader.removeAllIce()
            // Remove all garnishes after the old glass has swiped out
            if (garnishLoader) {
              garnishLoader.removeAllGarnishes()
            }
            resolve()
          })
          .start()
      })
    }

    // Step 2: Load new glass (positioned above scene, don't start filling yet)
    await this.loadGlass(this.scene, newGlassName, this.controls, this.camera, false)

    // Step 3: Bounce in animation from top
    if (this.selectedGlass && this.liquidHandler) {
      const glass = this.selectedGlass
      const liquid = this.liquidHandler.getLiquid()
      const liquidTop = this.liquidHandler.getLiquidTop()
      const targetY = glass.position.y // Final position (already set by loadGlass)
      glass.position.y = targetY + 8 // Start 8 units above

      // Also position liquid above with glass
      if (liquid) {
        const liquidOffsetY = liquid.position.y - targetY
        liquid.position.y = targetY + 8 + liquidOffsetY
      }
      if (liquidTop) {
        const liquidTopOffsetY = liquidTop.position.y - targetY
        liquidTop.position.y = targetY + 8 + liquidTopOffsetY
      }

      return new Promise<void>((resolve) => {
        const startPos = { y: glass.position.y }
        const endPos = { y: targetY }

        new TWEEN.Tween(startPos, this.tweenGroup)
          .to(endPos, 800) // 800ms duration
          .easing(TWEEN.Easing.Bounce.Out) // Bounce effect
          .onUpdate(() => {
            const deltaY = startPos.y - glass.position.y
            glass.position.y = startPos.y
            // Move liquid with glass
            if (liquid) {
              liquid.position.y += deltaY
            }
            if (liquidTop) {
              liquidTop.position.y += deltaY
            }
          })
          .onComplete(() => {
            // Start filling animation to 100% after bounce completes
            if (this.liquidHandler) {
              this.liquidHandler.setFillLevel(1)
            }
            resolve()
          })
          .start()
      })
    }
  }

  /**
   * Smoothly transition camera to focus on a new target point
   */
  private smoothCameraTransition(
    controls: OrbitControls,
    targetPoint: THREE.Vector3
  ): void {
    // Store current target
    const startTarget = controls.target.clone()

    // Animate the camera target smoothly
    const targetAnim = { x: startTarget.x, y: startTarget.y, z: startTarget.z }
    const endTarget = { x: targetPoint.x, y: targetPoint.y, z: targetPoint.z }

    new TWEEN.Tween(targetAnim, this.tweenGroup)
      .to(endTarget, 600) // 600ms duration for smooth transition
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        controls.target.set(targetAnim.x, targetAnim.y, targetAnim.z)
        controls.update()
      })
      .start()
  }

  /**
   * Set the target fill level of the liquid (0 to 1)
   */
  public setFillLevel(percent: number): void {
    if (this.liquidHandler) {
      this.liquidHandler.setFillLevel(percent)
    }
  }

  /**
   * Update function (call this in animation loop)
   */
  public update(): void {
    this.tweenGroup.update() // Update all active tweens
    if (this.liquidHandler) {
      this.liquidHandler.update()
    }
  }

  /**
   * Get the liquid mesh for external manipulation
   */
  public getLiquid(): THREE.Mesh | null {
    return this.liquidHandler?.getLiquid() ?? null
  }

  /**
   * Get the liquid handler for direct access
   */
  public getLiquidHandler(): LiquidHandler | null {
    return this.liquidHandler
  }

  /**
   * Get the ice cube configuration for a specific glass type
   */
  public static getIceConfig(glassName: GlassName): IceCubeConfig {
    return ICE_CUBE_CONFIGS[glassName]
  }
}
