import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
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

// Rim radius for each glass type (for salt rim particles)
const GLASS_RIM_RADIUS: Record<GlassName, number> = {
  zombie_glass_0: 0.5,
  cocktail_glass_1: 0.6,
  rocks_glass_2: 0.45,
  hurricane_glass_3: 0.55,
  pint_glass_4: 0.5,
  seidel_Glass_5: 0.55,
  shot_glass_6: 0.3,
  highball_glass_7: 0.4,
  margarita_glass_8: 1.5,
  martini_glass_9: 0.6,
}

// Garnish positions for each glass type (Y position is height on glass rim)
const GARNISH_POSITIONS: Record<GlassName, Record<GarnishName, THREE.Vector3>> = {
  zombie_glass_0: {
    cherry: new THREE.Vector3(0, 2.8, 0),
    olive: new THREE.Vector3(0, 2.8, 0),
    salt_rim: new THREE.Vector3(0, 2.5, 0),
    orange_round: new THREE.Vector3(0, 2.8, 0),
    mint: new THREE.Vector3(0, 3.0, 0),
  },
  cocktail_glass_1: {
    cherry: new THREE.Vector3(0, 2.0, 0),
    olive: new THREE.Vector3(0, 2.0, 0),
    salt_rim: new THREE.Vector3(0, 1.8, 0),
    orange_round: new THREE.Vector3(0, 2.0, 0),
    mint: new THREE.Vector3(0, 2.2, 0),
  },
  rocks_glass_2: {
    cherry: new THREE.Vector3(0, 2.5, 0),
    olive: new THREE.Vector3(0, 2.5, 0),
    salt_rim: new THREE.Vector3(0, 2.2, 0),
    orange_round: new THREE.Vector3(0, 2.5, 0),
    mint: new THREE.Vector3(0, 2.7, 0),
  },
  hurricane_glass_3: {
    cherry: new THREE.Vector3(0, 3.2, 0),
    olive: new THREE.Vector3(0, 3.2, 0),
    salt_rim: new THREE.Vector3(0, 3.0, 0),
    orange_round: new THREE.Vector3(0, 3.2, 0),
    mint: new THREE.Vector3(0, 3.4, 0),
  },
  pint_glass_4: {
    cherry: new THREE.Vector3(0, 3.0, 0),
    olive: new THREE.Vector3(0, 3.0, 0),
    salt_rim: new THREE.Vector3(0, 2.8, 0),
    orange_round: new THREE.Vector3(0, 3.0, 0),
    mint: new THREE.Vector3(0, 3.2, 0),
  },
  seidel_Glass_5: {
    cherry: new THREE.Vector3(0, 3.0, 0),
    olive: new THREE.Vector3(0, 3.0, 0),
    salt_rim: new THREE.Vector3(0, 2.8, 0),
    orange_round: new THREE.Vector3(0, 3.0, 0),
    mint: new THREE.Vector3(0, 3.2, 0),
  },
  shot_glass_6: {
    cherry: new THREE.Vector3(0, 1.5, 0),
    olive: new THREE.Vector3(0, 1.5, 0),
    salt_rim: new THREE.Vector3(0, 1.3, 0),
    orange_round: new THREE.Vector3(0, 1.5, 0),
    mint: new THREE.Vector3(0, 1.7, 0),
  },
  highball_glass_7: {
    cherry: new THREE.Vector3(0, 2.8, 0),
    olive: new THREE.Vector3(0, 2.8, 0),
    salt_rim: new THREE.Vector3(0, 2.5, 0),
    orange_round: new THREE.Vector3(0, 2.8, 0),
    mint: new THREE.Vector3(0, 3.0, 0),
  },
  margarita_glass_8: {
    cherry: new THREE.Vector3(0, 2.2, 0),
    olive: new THREE.Vector3(0, 2.2, 0),
    salt_rim: new THREE.Vector3(0, 3.25, 0),
    orange_round: new THREE.Vector3(0, 2.2, 0),
    mint: new THREE.Vector3(0.1, 3.2, -1),
  },
  martini_glass_9: {
    cherry: new THREE.Vector3(0, 3.3, 1),
    olive: new THREE.Vector3(0, 3.3, 1),
    salt_rim: new THREE.Vector3(0, 3.25, 0),
    orange_round: new THREE.Vector3(0, 2.0, 0),
    mint: new THREE.Vector3(0, 2.2, 0),
  },
}

export class GarnishLoader {
  private garnishObjects: Map<GarnishName, THREE.Object3D> = new Map()
  private scene: THREE.Scene | null = null
  private loader: GLTFLoader = new GLTFLoader()

  /**
   * Load a specific garnish type and add it to the scene
   */
  public async loadGarnish(
    scene: THREE.Scene,
    garnishName: GarnishName,
    glassName?: GlassName
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
          // Get rim radius and height for this glass type
          const rimRadius = glassName ? GLASS_RIM_RADIUS[glassName] : 0.5
          const rimHeight = glassName
            ? GARNISH_POSITIONS[glassName][garnishName].y
            : 2.0

          garnish = createProceduralSaltRim(rimRadius, rimHeight)
        }

        // Apply default transforms (only for non-salt garnishes, salt uses absolute positioning)
        if (garnishName !== 'salt_rim') {
          this.applyDefaultTransforms(garnish, garnishName, glassName)
        }

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
          this.applyDefaultTransforms(garnish, garnishName, glassName)

          // Apply custom materials and enable shadows
          garnish.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true

              // Apply custom material based on garnish type
              this.applyCustomMaterial(child, garnishName)
            }
          })

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
  private applyCustomMaterial(_mesh: THREE.Mesh, garnishName: GarnishName): void {
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
        // Keep default material for now
        break
    }
  }

  /**
   * Apply default transforms for each garnish type
   */
  private applyDefaultTransforms(
    garnish: THREE.Object3D,
    garnishName: GarnishName,
    glassName?: GlassName
  ): void {
    // If glass type is specified, use the position map
    if (glassName && GARNISH_POSITIONS[glassName]) {
      const position = GARNISH_POSITIONS[glassName][garnishName]
      garnish.position.copy(position)
    } else {
      // Default position above the glass
      garnish.position.set(0, 3, 0)
    }

    // Apply specific transforms based on garnish type
    switch (garnishName) {
      case 'cherry':
        garnish.scale.set(1.4, 1.4, 1.4) // Same size as olive
        if (!glassName) {
          garnish.position.y = 2.5 // Default position on glass rim
        }
        break
      case 'olive':
        garnish.scale.set(1.4, 1.4, 1.4) // Larger cocktail size
        if (!glassName) {
          garnish.position.y = 2.5
        }
        break
      case 'salt_rim':
        garnish.scale.set(1, 1, 1)
        if (!glassName) {
          garnish.position.y = 2 // Position on rim
        }
        break
      case 'orange_round':
        garnish.scale.set(1, 1, 1)
        if (!glassName) {
          garnish.position.y = 2.5
        }
        break
      case 'mint':
        garnish.scale.set(1, 1, 1)
        if (!glassName) {
          garnish.position.y = 3 // Position floating on top
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
}
