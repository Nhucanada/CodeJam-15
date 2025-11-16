import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export class BarLoader {
  private bar: THREE.Object3D | null = null
  private scene: THREE.Scene | null = null
  private loader: GLTFLoader = new GLTFLoader()

  /**
   * Load the sci-fi bar model and add it to the scene
   */
  public async loadBar(
    scene: THREE.Scene,
    position?: THREE.Vector3,
    scale?: number,
    rotation?: THREE.Euler
  ): Promise<void> {
    this.scene = scene

    return new Promise((resolve, reject) => {
      const modelPath = '/models/sci-fi_bar/scene.gltf'

      this.loader.load(
        modelPath,
        (gltf) => {
          this.bar = gltf.scene

          // Apply transforms
          if (position) {
            this.bar.position.copy(position)
          } else {
            // Default position: behind the cocktail glass
            this.bar.position.set(0, -30, -30)
          }

          if (scale !== undefined) {
            this.bar.scale.set(scale, scale, scale)
          } else {
            // Default scale
            this.bar.scale.set(10, 10, 10)
          }

          if (rotation) {
            this.bar.rotation.copy(rotation)
          }

          // Enable shadows for all meshes in the bar
          this.bar.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true
            }
          })

          scene.add(this.bar)
          console.log('Sci-fi bar model loaded successfully!')
          resolve()
        },
        (progress) => {
          console.log(
            `Loading bar: ${(progress.loaded / progress.total) * 100}%`
          )
        },
        (error) => {
          console.error('Error loading bar:', error)
          reject(error)
        }
      )
    })
  }

  /**
   * Get the bar object
   */
  public getBar(): THREE.Object3D | null {
    return this.bar
  }

  /**
   * Remove the bar from the scene
   */
  public removeBar(): void {
    if (this.bar && this.scene) {
      this.scene.remove(this.bar)
      this.bar = null
    }
  }

  /**
   * Set the position of the bar
   */
  public setPosition(position: THREE.Vector3): void {
    if (this.bar) {
      this.bar.position.copy(position)
    }
  }

  /**
   * Set the scale of the bar
   */
  public setScale(scale: number): void {
    if (this.bar) {
      this.bar.scale.set(scale, scale, scale)
    }
  }

  /**
   * Set the rotation of the bar
   */
  public setRotation(rotation: THREE.Euler): void {
    if (this.bar) {
      this.bar.rotation.copy(rotation)
    }
  }

  /**
   * Initialize the scene for the bar loader
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene
  }
}
