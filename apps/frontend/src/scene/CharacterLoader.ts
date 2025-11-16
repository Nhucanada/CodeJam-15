import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export class CharacterLoader {
  private character: THREE.Object3D | null = null
  private scene: THREE.Scene | null = null
  private loader: GLTFLoader = new GLTFLoader()

  /**
   * Load the male character model and add it to the scene
   */
  public async loadCharacter(
    scene: THREE.Scene,
    position?: THREE.Vector3,
    scale?: number,
    rotation?: THREE.Euler
  ): Promise<void> {
    this.scene = scene

    return new Promise((resolve, reject) => {
      const modelPath = './src/models/male_character_ps1-style/scene.gltf'

      this.loader.load(
        modelPath,
        (gltf) => {
          this.character = gltf.scene

          // Apply transforms
          if (position) {
            this.character.position.copy(position)
          } else {
            // Default position: behind the cocktail glass
            this.character.position.set(0, 0, -8)
          }

          if (scale !== undefined) {
            this.character.scale.set(scale, scale, scale)
          } else {
            // Default scale
            this.character.scale.set(1, 1, 1)
          }

          if (rotation) {
            this.character.rotation.copy(rotation)
          }

          // Enable shadows and fix lighting for all meshes in the character
          this.character.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true

              // Fix materials to respond to scene lighting
              if (child.material) {
                // Handle both single materials and material arrays
                const materials = Array.isArray(child.material) ? child.material : [child.material]

                materials.forEach((material) => {
                  // Log material type for debugging
                  console.log('Material type:', material.type, 'Emissive:', material.emissive)

                  // Handle all possible material types
                  if ('emissive' in material) {
                    // Remove emissive lighting (makes it glow independently)
                    material.emissive.setHex(0x000000)
                    if ('emissiveIntensity' in material) {
                      material.emissiveIntensity = 0
                    }
                  }

                  // Check if it's using MeshBasicMaterial (doesn't respond to lights)
                  if (material.type === 'MeshBasicMaterial') {
                    console.warn('Character is using MeshBasicMaterial - replacing with MeshStandardMaterial')

                    // Replace with MeshStandardMaterial which responds to lights
                    const newMaterial = new THREE.MeshStandardMaterial({
                      color: material.color,
                      map: material.map,
                      transparent: material.transparent,
                      opacity: material.opacity,
                      side: material.side
                    })

                    child.material = newMaterial
                  }

                  // Ensure material responds to lights
                  material.needsUpdate = true
                })
              }
            }
          })

          scene.add(this.character)
          console.log('Male character model loaded successfully!')
          resolve()
        },
        (progress) => {
          console.log(
            `Loading character: ${(progress.loaded / progress.total) * 100}%`
          )
        },
        (error) => {
          console.error('Error loading character:', error)
          reject(error)
        }
      )
    })
  }

  /**
   * Get the character object
   */
  public getCharacter(): THREE.Object3D | null {
    return this.character
  }

  /**
   * Remove the character from the scene
   */
  public removeCharacter(): void {
    if (this.character && this.scene) {
      this.scene.remove(this.character)
      this.character = null
    }
  }

  /**
   * Set the position of the character
   */
  public setPosition(position: THREE.Vector3): void {
    if (this.character) {
      this.character.position.copy(position)
    }
  }

  /**
   * Set the scale of the character
   */
  public setScale(scale: number): void {
    if (this.character) {
      this.character.scale.set(scale, scale, scale)
    }
  }

  /**
   * Set the rotation of the character
   */
  public setRotation(rotation: THREE.Euler): void {
    if (this.character) {
      this.character.rotation.copy(rotation)
    }
  }

  /**
   * Initialize the scene for the character loader
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene
  }
}
