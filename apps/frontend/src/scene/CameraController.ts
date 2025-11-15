import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class CameraController {
  private controls: OrbitControls

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.controls = new OrbitControls(camera, domElement)

    // Configure controls
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 2
    this.controls.maxDistance = 10
    this.controls.maxPolarAngle = Math.PI / 1.5
    this.controls.target.set(0, 1, 0)
  }

  public update(): void {
    this.controls.update()
  }

  public dispose(): void {
    this.controls.dispose()
  }
}
