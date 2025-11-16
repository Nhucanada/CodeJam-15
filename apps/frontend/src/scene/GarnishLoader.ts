import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as TWEEN from '@tweenjs/tween.js'
import {
  createProceduralOlive,
  createProceduralCherry,
  createProceduralSaltRim,
  createProceduralOrangeRound,
} from './ProceduralGarnishes'

export type GarnishName =
  | 'cherry'
  | 'olive'
  | 'salt_rim'
  | 'orange_round'
  | 'mint'

export type GlassName =
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

// Allowed garnishes for each glass type
const ALLOWED_GARNISHES: Record<GlassName, GarnishName[]> = {
  zombie_glass_0: ['cherry', 'olive', 'salt_rim', 'orange_round', 'mint'],
  cocktail_glass_1: ['cherry', 'olive', 'salt_rim', 'orange_round', 'mint'],
  rocks_glass_2: ['cherry', 'olive', 'salt_rim', 'orange_round', 'mint'],
  hurricane_glass_3: ['cherry', 'olive', 'salt_rim', 'orange_round', 'mint'],
  pint_glass_4: ['cherry', 'olive', 'salt_rim', 'orange_round', 'mint'],
  seidel_Glass_5: ['cherry', 'olive', 'salt_rim', 'orange_round', 'mint'],
  shot_glass_6: ['salt_rim'], // Only salt rim and orange round
  highball_glass_7: ['cherry', 'olive', 'salt_rim', 'orange_round', 'mint'],
  margarita_glass_8: ['cherry', 'olive', 'salt_rim', 'orange_round', 'mint'],
  martini_glass_9: ['cherry', 'olive', 'salt_rim', 'orange_round', 'mint'],
}

/**
 * Get the list of allowed garnishes for a specific glass type
 */
export function getAllowedGarnishes(glassName: GlassName): GarnishName[] {
  return ALLOWED_GARNISHES[glassName]
}

// Rim radius for each glass type (for salt rim particles)
const GLASS_RIM_RADIUS: Record<GlassName, number> = {
  zombie_glass_0: 0.8,
  cocktail_glass_1: 0.9,
  rocks_glass_2: 0.9,
  hurricane_glass_3: 0.65,
  pint_glass_4: 1.1,
  seidel_Glass_5: 1.3,  
  shot_glass_6: 0.4,
  highball_glass_7: 1.2,
  margarita_glass_8: 1.5,
  martini_glass_9: 1.5,
}

// Garnish configuration for each glass type (position and optional rotation)
interface GarnishConfig {
  position: THREE.Vector3
  rotation?: THREE.Euler
}

const GARNISH_POSITIONS: Record<GlassName, Record<GarnishName, GarnishConfig>> = {
  zombie_glass_0: {
    cherry: { position: new THREE.Vector3(0, 4.35, 0.4) },
    olive: { position: new THREE.Vector3(0, 4.35, 0.4) },
    salt_rim: { position: new THREE.Vector3(0, 4.35, 0) },
    orange_round: { position: new THREE.Vector3(0.8, 4.35, 0), rotation: new THREE.Euler(0,0, Math.PI/ 6) },
    mint: { position: new THREE.Vector3(0, 4.35, -1) },
  },
  cocktail_glass_1: {
    cherry: { position: new THREE.Vector3(0, 2.70, 0.5) },
    olive: { position: new THREE.Vector3(0, 2.70, 0.5) },
    salt_rim: { position: new THREE.Vector3(0, 2.70, 0) },
    orange_round: { position: new THREE.Vector3(0.85, 2.70, 0) },
    mint: { position: new THREE.Vector3(0, 2.70, -0.8) },
  },
  rocks_glass_2: {
    cherry: { position: new THREE.Vector3(0, 2.3, 0.4) },
    olive: { position: new THREE.Vector3(0, 2.3, 0.4) },
    salt_rim: { position: new THREE.Vector3(0, 2.3, 0) },
    orange_round: { position: new THREE.Vector3(0.85, 2.3, 0) },
    mint: { position: new THREE.Vector3(0, 2.3, -0.7) },
  },
  hurricane_glass_3: {
    cherry: { position: new THREE.Vector3(0, 4, 0.2) },
    olive: {position: new THREE.Vector3(0, 4, 0.2) },
    salt_rim: { position: new THREE.Vector3(0, 4, 0) },
    orange_round: { position: new THREE.Vector3(0.6, 4, 0) },
    mint: { position: new THREE.Vector3(0, 4, -0.5) },
  },
  pint_glass_4: {
    cherry: { position: new THREE.Vector3(0, 4.05, 0.7) },
    olive: { position: new THREE.Vector3(0, 4.05, 0.7)  },
    salt_rim: { position: new THREE.Vector3(0, 4.05, 0) },
    orange_round: { position: new THREE.Vector3(1.1, 4.05, 0) },
    mint: { position: new THREE.Vector3(0, 4.05, -1) },
  },
  seidel_Glass_5: {
    cherry: { position: new THREE.Vector3(0, 4.3, 1.5) },
    olive: { position: new THREE.Vector3(0, 4.3, 1.5) },
    salt_rim: { position: new THREE.Vector3(0, 4.3,0.45 ) },
    orange_round: { position: new THREE.Vector3(1.2, 4.3, 0.6) },
    mint: { position: new THREE.Vector3(0, 4.3, -0.8) },
  },
  shot_glass_6: {
    cherry: { position: new THREE.Vector3(0, 1.5, 0) },
    olive: { position: new THREE.Vector3(0, 1.5, 0) },
    salt_rim: { position: new THREE.Vector3(0, 1.5, 0) },
    orange_round: { position: new THREE.Vector3(0, 1.5, 0) },
    mint: { position: new THREE.Vector3(0, 1.7, 0) },
  },
  highball_glass_7: {
    cherry: { position: new THREE.Vector3(0, 4.3, 0.8) },
    olive: { position: new THREE.Vector3(0, 4.3, 0.8) },
    salt_rim: { position: new THREE.Vector3(0, 4.3, 0) },
    orange_round: { position: new THREE.Vector3(1.1, 4.3, 0) },
    mint: { position: new THREE.Vector3(0, 4.3, -1.1) },
  },
  margarita_glass_8: {
    cherry: { position: new THREE.Vector3(0, 3.3, 1) },
    olive: { position: new THREE.Vector3(0, 3.3, 1) },
    salt_rim: { position: new THREE.Vector3(0, 3.3, 0) },
    orange_round: { position: new THREE.Vector3(-1.3, 3.3, 0) },
    mint: {
      position: new THREE.Vector3(0, 3.3, -1.4),
    },
  },
  martini_glass_9: {
    cherry: { position: new THREE.Vector3(0, 3.3, 1) },
    olive: { position: new THREE.Vector3(0, 3.3, 1) },
    salt_rim: { position: new THREE.Vector3(0, 3.25, 0) },
    orange_round: { position: new THREE.Vector3(-1.3, 3.3, 0) },
    mint: {
      position: new THREE.Vector3(0, 3.3, -1.4),
    },
  },
}

export class GarnishLoader {
  private garnishObjects: Map<GarnishName, THREE.Object3D> = new Map()
  private scene: THREE.Scene | null = null
  private loader: GLTFLoader = new GLTFLoader()
  private tweenGroup: TWEEN.Group = new TWEEN.Group()

  /**
   * Load a specific garnish type and add it to the scene
   */
  public async loadGarnish(
    scene: THREE.Scene,
    garnishName: GarnishName,
    glassName?: GlassName,
    startHidden: boolean = false
  ): Promise<void> {
    this.scene = scene

    // Handle procedural garnishes
    if (
      garnishName === 'olive' ||
      garnishName === 'cherry' ||
      garnishName === 'salt_rim' ||
      garnishName === 'orange_round'
    ) {
      return new Promise((resolve) => {
        let garnish: THREE.Object3D

        if (garnishName === 'olive') {
          garnish = createProceduralOlive()
        } else if (garnishName === 'cherry') {
          garnish = createProceduralCherry()
        } else if (garnishName === 'orange_round') {
          garnish = createProceduralOrangeRound()
        } else {
          // salt_rim
          // Get rim radius for this glass type
          const rimRadius = glassName ? GLASS_RIM_RADIUS[glassName] : 0.5

          garnish = createProceduralSaltRim(rimRadius, 0)
        }

        // Apply default transforms to all garnishes
        this.applyDefaultTransforms(garnish, garnishName, glassName, startHidden)

        // Set renderOrder to render at same time as ice (ice is renderOrder 2)
        this.setRenderOrder(garnish, 2)

        scene.add(garnish)
        this.garnishObjects.set(garnishName, garnish)

        console.log(`Garnish "${garnishName}" created successfully!`)
        resolve()
      })
    }

    return new Promise((resolve, reject) => {
      const modelPath = this.getModelPath(garnishName)

      this.loader.load(
        modelPath,
        (gltf) => {
          const garnish = gltf.scene

          // Apply default transforms
          this.applyDefaultTransforms(garnish, garnishName, glassName, startHidden)

          // Apply custom materials and enable shadows
          garnish.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true

              // Apply custom material based on garnish type
              this.applyCustomMaterial(child, garnishName)
            }
          })

          // Set renderOrder to render at same time as ice (ice is renderOrder 2)
          this.setRenderOrder(garnish, 2)

          scene.add(garnish)
          this.garnishObjects.set(garnishName, garnish)

          console.log(`Garnish "${garnishName}" loaded successfully!`)
          resolve()
        },
        (progress) => {
          console.log(
            `Loading ${garnishName}: ${(progress.loaded / progress.total) * 100}%`
          )
        },
        (error) => {
          console.error(`Error loading ${garnishName}:`, error)
          reject(error)
        }
      )
    })
  }

  /**
   * Get the model path for a specific garnish
   */
  private getModelPath(garnishName: GarnishName): string {
    const paths: Record<GarnishName, string> = {
      cherry: '', // Procedural, no model needed
      olive: '', // Procedural, no model needed
      salt_rim: '', // Procedural, no model needed
      orange_round: '', // Procedural, no model needed
      mint: './src/models/mint_leaves/scene.gltf',
    }

    return paths[garnishName]
  }

  /**
   * Apply custom material to mesh based on garnish type
   */
  private applyCustomMaterial(mesh: THREE.Mesh, garnishName: GarnishName): void {
    switch (garnishName) {
      case 'cherry':
        // Cherry material is already applied in createProceduralCherry()
        break
      case 'olive':
        // Olive material is already applied in createProceduralOlive()
        break
      case 'salt_rim':
        // Keep default material for now
        break
      case 'orange_round':
        // Keep default material for now
        break
      case 'mint':
        // Modify existing material properties without replacing it
        if (mesh.material) {
          const material = mesh.material as THREE.Material
          // Set clipping planes to prevent liquid clipping
          if ('clippingPlanes' in material) {
            ;(material as THREE.MeshStandardMaterial).clippingPlanes = []
          }
        }
        break
    }
  }

  /**
   * Apply default transforms for each garnish type
   */
  private applyDefaultTransforms(
    garnish: THREE.Object3D,
    garnishName: GarnishName,
    glassName?: GlassName,
    startHidden: boolean = false
  ): void {
    // If glass type is specified, use the position map
    if (glassName && GARNISH_POSITIONS[glassName]) {
      const config = GARNISH_POSITIONS[glassName][garnishName]
      garnish.position.copy(config.position)

      // Apply rotation if specified
      if (config.rotation) {
        garnish.rotation.copy(config.rotation)
      }

      // If startHidden, position garnish 8 units above final position
      if (startHidden) {
        garnish.position.y += 8
      }
    } else {
      // Default position above the glass
      garnish.position.set(0, 3, 0)
      if (startHidden) {
        garnish.position.y += 8
      }
    }

    // Apply specific transforms based on garnish type
    switch (garnishName) {
      case 'cherry':
        garnish.scale.set(1.4, 1.4, 1.4) // Same size as olive
        if (!glassName) {
          garnish.position.y = 2.5 // Default position on glass rim
          if (startHidden) {
            garnish.position.y += 8
          }
        }
        break
      case 'olive':
        garnish.scale.set(1.4, 1.4, 1.4) // Larger cocktail size
        if (!glassName) {
          garnish.position.y = 2.5
          if (startHidden) {
            garnish.position.y += 8
          }
        }
        break
      case 'salt_rim':
        garnish.scale.set(1, 1, 1)
        if (!glassName) {
          garnish.position.y = 2 // Position on rim
          if (startHidden) {
            garnish.position.y += 8
          }
        }
        break
      case 'orange_round':
        garnish.scale.set(2.5, 1, 2.5) // Make it bigger in X and Z, keep Y (thickness) the same
        garnish.rotation.set(Math.PI / 2, 0, 0) // Rotate 90° to make it vertical
        if (!glassName) {
          garnish.position.y = 2.5
          if (startHidden) {
            garnish.position.y += 8
          }
        }
        break
      case 'mint':
        garnish.scale.set(0.2, 0.2, 0.2) // Always scale down mint leaves
        if (!glassName) {
          garnish.position.y = 3 // Position floating on top
          if (startHidden) {
            garnish.position.y += 8
          }
        }
        break
    }
  }

  /**
   * Get a specific garnish object
   */
  public getGarnish(garnishName: GarnishName): THREE.Object3D | undefined {
    return this.garnishObjects.get(garnishName)
  }

  /**
   * Remove a specific garnish from the scene
   */
  public removeGarnish(garnishName: GarnishName): void {
    const garnish = this.garnishObjects.get(garnishName)
    if (garnish && this.scene) {
      this.scene.remove(garnish)
      this.garnishObjects.delete(garnishName)
    }
  }

  /**
   * Remove all garnishes from the scene
   */
  public removeAllGarnishes(): void {
    if (this.scene) {
      this.garnishObjects.forEach((garnish) => {
        this.scene!.remove(garnish)
      })
      this.garnishObjects.clear()
    }
  }

  /**
   * Set the position of a specific garnish object
   */
  public setGarnishPosition(garnishName: GarnishName, position: THREE.Vector3): void {
    const garnish = this.garnishObjects.get(garnishName)
    if (garnish) {
      garnish.position.copy(position)
    }
  }

  /**
   * Set the scale of a specific garnish object
   */
  public setGarnishScale(garnishName: GarnishName, scale: number): void {
    const garnish = this.garnishObjects.get(garnishName)
    if (garnish) {
      garnish.scale.set(scale, scale, scale)
    }
  }

  /**
   * Set the rotation of a specific garnish object
   */
  public setGarnishRotation(garnishName: GarnishName, rotation: THREE.Euler): void {
    const garnish = this.garnishObjects.get(garnishName)
    if (garnish) {
      garnish.rotation.copy(rotation)
    }
  }

  /**
   * Initialize the scene for the garnish loader
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene
  }

  /**
   * Move all visible garnishes by an X offset (for glass switching animation)
   */
  public moveVisibleGarnishesByOffset(deltaX: number): void {
    this.garnishObjects.forEach((garnish) => {
      garnish.position.x += deltaX
    })
  }

  /**
   * Animate a garnish falling from above with a smooth drop animation
   */
  public animateGarnishFalling(
    garnishName: GarnishName,
    targetY: number,
    onComplete?: () => void
  ): void {
    const garnish = this.garnishObjects.get(garnishName)
    if (!garnish) {
      console.warn(`Garnish "${garnishName}" not found for falling animation`)
      return
    }

    // Current Y position (should already be 8 units above target if startHidden was used)
    const startY = garnish.position.y

    console.log(`[GARNISH] Animating ${garnishName} falling from Y=${startY} to Y=${targetY}`)

    // Animate falling with smooth cubic easing
    new TWEEN.Tween({ y: startY }, this.tweenGroup)
      .to({ y: targetY }, 1000) // 1 second duration
      .easing(TWEEN.Easing.Cubic.Out) // Smooth deceleration
      .onUpdate((obj) => {
        garnish.position.y = obj.y
      })
      .onComplete(() => {
        console.log(`[GARNISH] ${garnishName} falling complete at Y=${garnish.position.y}`)
        if (onComplete) {
          onComplete()
        }
      })
      .start()
  }

  /**
   * Update the tween group (should be called in the animation loop)
   */
  public update(): void {
    this.tweenGroup.update()
  }

  /**
   * Set the render order for all meshes in a garnish object
   */
  private setRenderOrder(garnish: THREE.Object3D, renderOrder: number): void {
    garnish.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        child.renderOrder = renderOrder
      }
    })
  }
}
