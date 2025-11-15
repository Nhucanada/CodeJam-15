import * as THREE from 'three'

export type IceName =
  | 'cup_ice'
  | 'mound_ice'
  | 'cube_ice'
  | 'round_ice'
  | 'bump_ice'
  | 'rectangle_ice'

// Y position offsets for each ice type to align them properly
const ICE_Y_POSITIONS: Record<IceName, number> = {
  cup_ice: 0.5,
  mound_ice: 0.5,
  cube_ice: 0.5,
  round_ice: 0.5,
  bump_ice: 0.5,
  rectangle_ice: 0.5,
}

export class IceLoader {
  private iceObjects: Map<IceName, THREE.Object3D> = new Map()
  private scene: THREE.Scene | null = null

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

      iceCube.position.y = ICE_Y_POSITIONS[iceName]
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
    const iceTypes: IceName[] = [
      'cup_ice',
      'mound_ice',
      'cube_ice',
      'round_ice',
      'bump_ice',
      'rectangle_ice',
    ]

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
}
