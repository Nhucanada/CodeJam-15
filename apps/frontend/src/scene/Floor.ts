import * as THREE from 'three'

export class Floor {
  private mesh: THREE.Mesh

  constructor(scene: THREE.Scene) {
    const textureLoader = new THREE.TextureLoader()

    // Load plank flooring textures
    const floorDiffuse = textureLoader.load('/assets/textures/textures/plank_flooring_04_diff_4k.jpg')
    const floorDisplacement = textureLoader.load('/assets/textures/textures/plank_flooring_04_disp_4k.png')

    // Configure texture tiling and wrapping
    floorDiffuse.wrapS = THREE.RepeatWrapping
    floorDiffuse.wrapT = THREE.RepeatWrapping
    floorDiffuse.repeat.set(6, 4) // Tile 6x4 times across the 45x20 floor

    floorDisplacement.wrapS = THREE.RepeatWrapping
    floorDisplacement.wrapT = THREE.RepeatWrapping
    floorDisplacement.repeat.set(6, 4)

    const floorGeometry = new THREE.PlaneGeometry(45, 20, 400, 400) // Longer bar counter
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorDiffuse,
      displacementMap: floorDisplacement,
      displacementScale: 0.1, // Adjust this value to control depth (0.0 to 1.0)
      roughness: 0.8,
      metalness: 0.1,
    })
    this.mesh = new THREE.Mesh(floorGeometry, floorMaterial)
    this.mesh.rotation.x = -Math.PI / 2 // Rotate to horizontal
    this.mesh.position.y = 0
    this.mesh.receiveShadow = true
    scene.add(this.mesh)

    // Note: Normal map (.exr format) requires EXRLoader - can be added if needed
    // Roughness map (.exr format) also requires EXRLoader for full PBR workflow
  }

  getMesh(): THREE.Mesh {
    return this.mesh
  }
}
