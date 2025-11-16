import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class ControlsSetup {
  private controls: OrbitControls

  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 2
    this.controls.maxDistance = 15
    this.controls.maxPolarAngle = Math.PI / 1.9 // Prevent camera from going below horizontal
    this.controls.enablePan = false // Disable camera panning
    this.controls.target.set(0, 0, 0)
  }

  public getControls(): OrbitControls {
    return this.controls
  }

  public update(): void {
    this.controls.update()
  }
}
