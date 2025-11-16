import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'

export type IceName = string // Changed to string to support dynamic names like 'cube_ice_1', 'cube_ice_2', etc.

interface BobbingParams {
  centerY: number
  amplitude: number
  speed: number
  timeOffset: number // Add time offset for varied bobbing phases
}

export class IceLoader {
  private iceObjects: Map<IceName, THREE.Object3D> = new Map()
  private scene: THREE.Scene | null = null
  private tweenGroup: TWEEN.Group = new TWEEN.Group()
  private bobbingParams: Map<IceName, BobbingParams> = new Map()
  private bobbingTime: number = 0

  /**
   * Create a procedural ice cube with randomized bumps and rounded corners
   */
  private createProceduralIceCube(): THREE.Mesh {
    // Start with a rounded box geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1, 20, 20, 20)

    // Apply random bumps to vertices
    const positions = geometry.attributes.position
    const vertex = new THREE.Vector3()

    // Use a seed-based approach for more consistent bumps
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)

      // Round corners slightly by pushing vertices toward sphere
      const cornerRadius = 0.35
      const distance = vertex.length()
      if (distance > 0) {
        const targetLength = Math.max(Math.abs(vertex.x), Math.abs(vertex.y), Math.abs(vertex.z))
        const sphereInfluence = cornerRadius
        const blendedLength = targetLength * (1 - sphereInfluence) + distance * sphereInfluence
        vertex.normalize().multiplyScalar(blendedLength)
      }

      // No bumps - smooth surface only
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }

    // Recompute normals for smooth shading
    geometry.computeVertexNormals()

    // Make the geometry non-indexed to avoid shared vertices causing artifacts
    const nonIndexedGeometry = geometry.toNonIndexed()
    nonIndexedGeometry.computeVertexNormals()

    geometry.dispose()

    // Create cloudy ice material (opaque for visibility through liquid)
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xe8f4f8, // Light blue-white color for cloudy ice
      metalness: 0.0,
      roughness: 0.4, // Higher roughness for frosted look
      transmission: 0.0, // No transmission - fully opaque to be visible through liquid
      transparent: false, // Not transparent
      side: THREE.FrontSide,
      ior: 1.1, // Reduced index of refraction for less distortion
      clearcoat: 0.5, // Higher clearcoat for wet surface
      clearcoatRoughness: 0.3, // Rougher clearcoat for frosted effect
      sheen: 0.5, // Add sheen for subtle glow
      sheenColor: new THREE.Color(0xffffff),
      depthWrite: true, // Write to depth buffer
      clippingPlanes: [], // Empty array to prevent global clipping planes from affecting ice
      clipShadows: false,
    })

    const mesh = new THREE.Mesh(nonIndexedGeometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.renderOrder = 2 // Render after liquid (liquid is renderOrder 1)

    return mesh
  }

  /**
   * Load a specific ice type and add it to the scene
   */
  public async loadIce(scene: THREE.Scene, iceName: IceName): Promise<void> {
    this.scene = scene

    return new Promise((resolve) => {
      // Create procedural ice cube instead of loading from model
      const iceCube = this.createProceduralIceCube()

      iceCube.position.y = -10 // Start well below the glass so it's not visible initially
      iceCube.scale.set(0.4, 0.4, 0.4)

      scene.add(iceCube)
      this.iceObjects.set(iceName, iceCube)

      console.log(`Ice "${iceName}" created successfully!`)
      resolve()
    })
  }

  /**
   * Load all ice types at once
   */
  public async loadAllIce(scene: THREE.Scene): Promise<void> {
    this.scene = scene
    const iceTypes: IceName[] = ['cube_ice']

    // Load sequentially to avoid issues
    for (let index = 0; index < iceTypes.length; index++) {
      const iceName = iceTypes[index]
      await this.loadIce(scene, iceName)

      // Position ice pieces in a row for display
      const ice = this.iceObjects.get(iceName)
      if (ice) {
        ice.position.x = (index - 2.5) * 2 // Spread them out
        ice.position.z = -3 // Move back so not overlapping with glass
      }
    }
  }

  /**
   * Get a specific ice object
   */
  public getIce(iceName: IceName): THREE.Object3D | undefined {
    return this.iceObjects.get(iceName)
  }

  /**
   * Remove a specific ice type from the scene
   */
  public removeIce(iceName: IceName): void {
    const ice = this.iceObjects.get(iceName)
    if (ice && this.scene) {
      this.scene.remove(ice)
      this.iceObjects.delete(iceName)
    }
  }

  /**
   * Remove all ice from the scene
   */
  public removeAllIce(): void {
    if (this.scene) {
      this.iceObjects.forEach((ice) => {
        this.scene!.remove(ice)
      })
      this.iceObjects.clear()
    }
  }

  /**
   * Set the position of a specific ice object
   */
  public setIcePosition(iceName: IceName, position: THREE.Vector3): void {
    const ice = this.iceObjects.get(iceName)
    if (ice) {
      ice.position.copy(position)
    }
  }

  /**
   * Set the scale of a specific ice object
   */
  public setIceScale(iceName: IceName, scale: number): void {
    const ice = this.iceObjects.get(iceName)
    if (ice) {
      ice.scale.set(scale, scale, scale)
    }
  }

  /**
   * Set the rotation of a specific ice object
   */
  public setIceRotation(iceName: IceName, rotation: THREE.Euler): void {
    const ice = this.iceObjects.get(iceName)
    if (ice) {
      ice.rotation.copy(rotation)
    }
  }

  /**
   * Animate ice cube falling from above with elastic water dip effect
   */
  public animateIceFalling(
    iceName: IceName,
    targetY: number,
    onComplete?: () => void
  ): void {
    const ice = this.iceObjects.get(iceName)
    if (!ice) return

    // Start position: 5 units above target
    const startY = targetY + 5
    ice.position.y = startY

    // Falling animation with elastic effect - goes below target then bounces back
    const dipDepth = 0.15 // How far below target the ice dips into the water

    new TWEEN.Tween({ y: startY }, this.tweenGroup)
      .to({ y: targetY - dipDepth }, 800)
      .easing(TWEEN.Easing.Cubic.In) // Accelerate as it falls
      .onUpdate((obj) => {
        ice.position.y = obj.y
      })
      .onComplete(() => {
        // After dipping, elastically rise back to final position
        new TWEEN.Tween({ y: targetY - dipDepth }, this.tweenGroup)
          .to({ y: targetY }, 600)
          .easing(TWEEN.Easing.Elastic.Out)
          .onUpdate((obj) => {
            ice.position.y = obj.y
          })
          .onComplete(() => {
            if (onComplete) {
              onComplete()
            }
          })
          .start()
      })
      .start()
  }

  /**
   * Animate ice cube bobbing up and down continuously using smooth sine wave
   */
  public animateIceBobbing(iceName: IceName, centerY: number, timeOffset: number = 0): void {
    const ice = this.iceObjects.get(iceName)
    if (!ice) return

    // Store bobbing parameters instead of creating a tween
    // Speed is in radians per second, calculated to match the original 1500ms period (3000ms full cycle)
    // Angular frequency = 2π / period = 2π / 3 ≈ 2.094
    this.bobbingParams.set(iceName, {
      centerY: centerY,
      amplitude: 0.05,
      speed: Math.PI * 2 / 3, // Full cycle in 3 seconds
      timeOffset: timeOffset, // Each ice cube can have different phase
    })
  }

  /**
   * Stop bobbing animation for a specific ice cube
   */
  public stopBobbing(iceName: IceName): void {
    this.bobbingParams.delete(iceName)
  }

  /**
   * Update all ice animations
   * @param deltaTime - Time elapsed since last frame in seconds
   */
  public update(deltaTime: number = 0.016): void {
    // Update bobbing time
    this.bobbingTime += deltaTime

    // Update bobbing animations using sine wave
    this.bobbingParams.forEach((params, iceName) => {
      const ice = this.iceObjects.get(iceName)
      if (ice) {
        ice.position.y = params.centerY + Math.sin((this.bobbingTime + params.timeOffset) * params.speed) * params.amplitude
      }
    })

    // Update tweens for other animations (like falling)
    this.tweenGroup.update()
  }

  /**
   * Create a new ice cube instance with a unique name
   */
  public createIceCube(
    iceName: IceName,
    position: THREE.Vector3,
    scale: number = 0.4,
    rotation?: THREE.Euler
  ): void {
    if (!this.scene) {
      console.error('Scene not initialized')
      return
    }

    // Create procedural ice cube
    const iceCube = this.createProceduralIceCube()

    iceCube.position.copy(position)
    iceCube.scale.set(scale, scale, scale)

    if (rotation) {
      iceCube.rotation.copy(rotation)
    }

    this.scene.add(iceCube)
    this.iceObjects.set(iceName, iceCube)
  }

  /**
   * Initialize the scene for the ice loader
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene
  }
}
