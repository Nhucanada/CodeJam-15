import * as THREE from 'three'

export class CameraSetup {
  private camera: THREE.PerspectiveCamera

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 2, 8)
    this.camera.lookAt(0, 0, 0)

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this))
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
  }
}
