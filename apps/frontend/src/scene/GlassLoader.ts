import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LiquidHandler } from './LiquidHandler'

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

export class GlassLoader {
  private loader: GLTFLoader
  private selectedGlass: THREE.Object3D | null = null
  private liquidHandler: LiquidHandler | null = null

  constructor() {
    this.loader = new GLTFLoader()
  }

  public async loadGlass(
    scene: THREE.Scene,
    glassName: GlassName,
    controls: OrbitControls,
    camera: THREE.Camera
  ): Promise<void> {
    this.liquidHandler = new LiquidHandler(scene)

    return new Promise((resolve, reject) => {
      this.loader.load(
        '/src/models/scene.gltf',
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
                  transmission: 0.9, // Makes it see-through like glass
                  thickness: 0.2,
                  transparent: true,
                  color: 0xffffff,
                  depthWrite: false, // Allow seeing objects behind transparent glass
                  side: THREE.DoubleSide, // Render both sides of glass
                })
              }
            })

            // Center the glass and place it on the floor
            const box = new THREE.Box3().setFromObject(selectedGlass)
            const center = box.getCenter(new THREE.Vector3())

            selectedGlass.position.sub(center) // Move to origin
            selectedGlass.position.y = 1 // Adjust this value to move glass up/down

            scene.add(selectedGlass)
            this.selectedGlass = selectedGlass

            // Recalculate bounding box after positioning
            const finalBox = new THREE.Box3().setFromObject(selectedGlass)
            const glassCenter = finalBox.getCenter(new THREE.Vector3())

            // Create liquid inside the glass
            this.liquidHandler!.createLiquid(selectedGlass, finalBox)

            // Update camera and controls to focus on the center of the glass
            controls.target.copy(glassCenter)
            camera.lookAt(glassCenter)
            controls.update()

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
}
