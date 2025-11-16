import * as THREE from 'three'

export class Lighting {
  private scene: THREE.Scene
  private directionalLight: THREE.DirectionalLight
  private ambientLight: THREE.AmbientLight
  private fillLight: THREE.DirectionalLight

  constructor(scene: THREE.Scene) {
    this.scene = scene

    // Main directional light (key light) - warm spotlight feel
    this.directionalLight = new THREE.DirectionalLight(0xffddaa, 0.8)
    this.directionalLight.position.set(5, 8, 5)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 50
    this.scene.add(this.directionalLight)

    // Ambient light - much darker for moody bar atmosphere
    this.ambientLight = new THREE.AmbientLight(0x202030, 0.2)
    this.scene.add(this.ambientLight)

    // Fill light (softer, cooler blue from opposite side)
    this.fillLight = new THREE.DirectionalLight(0x4466ff, 0.2)
    this.fillLight.position.set(-3, 2, -3)
    this.scene.add(this.fillLight)

    // Rim light - purple/magenta for sci-fi feel
    const rimLight = new THREE.DirectionalLight(0xff44ff, 0.15)
    rimLight.position.set(0, 2, -5)
    this.scene.add(rimLight)

    // Add point lights for localized bar lighting
    const barLight1 = new THREE.PointLight(0xffaa44, 0.5, 20)
    barLight1.position.set(-5, 3, -10)
    this.scene.add(barLight1)

    const barLight2 = new THREE.PointLight(0x44ffff, 0.4, 20)
    barLight2.position.set(5, 3, -10)
    this.scene.add(barLight2)
  }

  public setIntensity(intensity: number): void {
    this.directionalLight.intensity = intensity * 1.2
    this.fillLight.intensity = intensity * 0.4
  }
}
