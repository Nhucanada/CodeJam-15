import * as THREE from 'three'

export class Lighting {
  private scene: THREE.Scene
  private directionalLight: THREE.DirectionalLight
  private ambientLight: THREE.AmbientLight
  private fillLight: THREE.DirectionalLight

  constructor(scene: THREE.Scene) {
    this.scene = scene

    // Main directional light (key light)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
    this.directionalLight.position.set(5, 8, 5)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 50
    this.scene.add(this.directionalLight)

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(this.ambientLight)

    // Fill light (softer, from opposite side)
    this.fillLight = new THREE.DirectionalLight(0x8899ff, 0.4)
    this.fillLight.position.set(-3, 2, -3)
    this.scene.add(this.fillLight)

    // Optional: Add a subtle rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3)
    rimLight.position.set(0, 2, -5)
    this.scene.add(rimLight)
  }

  public setIntensity(intensity: number): void {
    this.directionalLight.intensity = intensity * 1.2
    this.fillLight.intensity = intensity * 0.4
  }
}
