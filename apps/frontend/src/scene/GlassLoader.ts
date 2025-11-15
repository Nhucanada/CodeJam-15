import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

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
  private liquidMesh: THREE.Mesh | null = null
  private liquidGeometry: THREE.CylinderGeometry | null = null
  private scene: THREE.Scene | null = null
  private currentFillLevel: number = 0.5
  private targetFillLevel: number = 0.5
  private glassBox: THREE.Box3 | null = null

  constructor() {
    this.loader = new GLTFLoader()
  }

  public async loadGlass(
    scene: THREE.Scene,
    glassName: GlassName,
    controls: OrbitControls,
    camera: THREE.Camera
  ): Promise<void> {
    this.scene = scene

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

            // Store glass box for dynamic liquid updates
            this.glassBox = finalBox

            // Create liquid inside the glass
            this.createLiquid(selectedGlass, finalBox)

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
   * Measures the glass width at a specific height using raycasting
   */
  private measureGlassRadiusAtHeight(glass: THREE.Object3D, yPosition: number): number {
    const raycaster = new THREE.Raycaster()

    // Cast rays from the glass's center position, not (0,0,0)
    const glassCenter = glass.position.clone()
    const origin = new THREE.Vector3(glassCenter.x, yPosition, glassCenter.z)
    const direction = new THREE.Vector3(1, 0, 0) // Cast ray along X axis

    raycaster.set(origin, direction)

    let maxDistance = 0
    glass.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const intersects = raycaster.intersectObject(child, false)
        if (intersects.length > 0) {
          const distance = intersects[0].distance
          if (distance > maxDistance) {
            maxDistance = distance
          }
        }
      }
    })

    // Also check in negative X direction
    raycaster.set(origin, new THREE.Vector3(-1, 0, 0))
    glass.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const intersects = raycaster.intersectObject(child, false)
        if (intersects.length > 0) {
          const distance = intersects[0].distance
          if (distance > maxDistance) {
            maxDistance = distance
          }
        }
      }
    })

    return maxDistance * 0.98 // Scale down very slightly to avoid z-fighting
  }

  /**
   * Creates a liquid mesh inside the glass
   */
  private createLiquid(glass: THREE.Object3D, glassBox: THREE.Box3): void {
    // Calculate glass dimensions
    const glassSize = new THREE.Vector3()
    glassBox.getSize(glassSize)

    const height = glassSize.y * 0.5 // Start at 50% fill

    // Measure glass profile at multiple heights to understand shape
    console.log('=== Glass Profile Analysis ===')
    console.log('Glass box min.y:', glassBox.min.y, 'max.y:', glassBox.max.y)
    console.log('Glass total height:', glassSize.y)

    for (let i = 0; i <= 10; i++) {
      const percent = i / 10
      const y = glassBox.min.y + glassSize.y * percent
      const radius = this.measureGlassRadiusAtHeight(glass, y)
      console.log(`  ${(percent * 100).toFixed(0)}% height (Y=${y.toFixed(2)}): radius=${radius.toFixed(3)}`)
    }
    console.log('==============================')

    // Measure glass radius at top and bottom of liquid to match taper
    const bottomY = glassBox.min.y + 0.1 // Slightly above bottom to avoid rim
    const topY = glassBox.min.y + height

    const radiusBottom = this.measureGlassRadiusAtHeight(glass, bottomY)
    const radiusTop = this.measureGlassRadiusAtHeight(glass, topY)

    console.log('Initial liquid: bottom Y:', bottomY, 'radius:', radiusBottom)
    console.log('Initial liquid: top Y:', topY, 'radius:', radiusTop)

    const radialSegments = 32
    const heightSegments = 1 // Simple geometry, no animation needed

    this.liquidGeometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments,
      heightSegments
    )

    // Create transparent colored liquid material
    const liquidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff6b35, // Orange cocktail color (change as desired)
      transparent: true,
      opacity: 1,
      transmission: 0.9,
      roughness: 0.05,
      thickness: 0.3,
      ior: 1.33, // Water refraction index
      depthWrite: true, // Ensure liquid renders properly
    })

    this.liquidMesh = new THREE.Mesh(this.liquidGeometry, liquidMaterial)
    this.liquidMesh.castShadow = true
    this.liquidMesh.receiveShadow = true
    this.liquidMesh.renderOrder = 1 // Render after glass (glass has default renderOrder 0)

    // Position liquid at the bottom of the glass (in world space, not as child)
    // This ensures liquid stays level when glass tilts
    const liquidYPosition = glassBox.min.y + height / 2

    this.liquidMesh.position.set(
      glass.position.x,
      liquidYPosition,
      glass.position.z
    )

    // Add liquid to scene (NOT as child of glass, so it doesn't rotate)
    if (this.scene) {
      this.scene.add(this.liquidMesh)
    }
  }

  /**
   * Set the target fill level of the liquid (0 to 1)
   * The actual fill will smoothly interpolate to this value
   */
  public setFillLevel(percent: number): void {
    this.targetFillLevel = Math.max(0, Math.min(1, percent))
  }

  /**
   * Update the actual fill level based on the target
   */
  private updateFillLevel(): void {
    if (!this.liquidMesh || !this.selectedGlass || !this.glassBox || !this.scene) return

    // Smooth interpolation towards target (lerp with speed factor)
    const lerpSpeed = 0.1 // Adjust this for faster/slower filling
    const previousFillLevel = this.currentFillLevel
    this.currentFillLevel += (this.targetFillLevel - this.currentFillLevel) * lerpSpeed

    // Only update geometry if fill level changed significantly (optimization)
    if (Math.abs(this.currentFillLevel - previousFillLevel) < 0.001) return

    const glassSize = new THREE.Vector3()
    this.glassBox.getSize(glassSize)

    // Calculate actual liquid height based on fill level
    // Start from 5% of glass height to avoid the base
    const liquidStartHeight = glassSize.y * 0.06 // Start liquid at 5% of glass height
    const maxLiquidHeight = glassSize.y * 0.90 // Max fill to 90% of glass height
    const currentHeight = maxLiquidHeight * this.currentFillLevel

    // Both bottom and top of liquid move up together as it fills
    const bottomY = this.glassBox.min.y + liquidStartHeight
    const topY = bottomY + currentHeight

    const radiusBottom = this.measureGlassRadiusAtHeight(this.selectedGlass, bottomY)
    const radiusTop = this.measureGlassRadiusAtHeight(this.selectedGlass, topY)

    console.log(`Updating liquid: fillLevel=${this.currentFillLevel.toFixed(3)}, height=${currentHeight.toFixed(3)}, bottomY=${bottomY.toFixed(2)}, topY=${topY.toFixed(2)}, radiusBottom=${radiusBottom.toFixed(3)}, radiusTop=${radiusTop.toFixed(3)}`)

    // Dispose old geometry and create new one with updated radii
    if (this.liquidGeometry) {
      this.liquidGeometry.dispose()
    }

    this.liquidGeometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      currentHeight,
      32,
      1
    )

    this.liquidMesh.geometry = this.liquidGeometry

    // Position liquid centered at its height
    this.liquidMesh.position.y = bottomY + currentHeight / 2
  }

  /**
   * Update function (call this in animation loop)
   */
  public update(): void {
    this.updateFillLevel()
  }

  /**
   * Get the liquid mesh for external manipulation
   */
  public getLiquid(): THREE.Mesh | null {
    return this.liquidMesh
  }
}
