import * as THREE from 'three'
import { CameraController } from './CameraController'
import { Lighting } from './Lighting'

export class SceneManager {
  private static instance: SceneManager

  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public cameraController: CameraController
  public lighting: Lighting

  private constructor() {
    // Scene setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.getAspectRatio(),
      0.1,
      1000
    )
    this.camera.position.set(0, 1.5, 5)
    this.camera.lookAt(0, 1, 0)

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(this.getCanvasWidth(), window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Camera controller
    this.cameraController = new CameraController(this.camera, this.renderer.domElement)

    // Lighting
    this.lighting = new Lighting(this.scene)

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize())
  }

  public static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager()
    }
    return SceneManager.instance
  }

  public mount(container: HTMLElement): void {
    container.appendChild(this.renderer.domElement)
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  public update(): void {
    this.cameraController.update()
  }

  private onWindowResize(): void {
    this.camera.aspect = this.getAspectRatio()
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.getCanvasWidth(), window.innerHeight)
  }

  private getAspectRatio(): number {
    return this.getCanvasWidth() / window.innerHeight
  }

  private getCanvasWidth(): number {
    // Account for side panels (300px each)
    return window.innerWidth - 600
  }

  public dispose(): void {
    this.cameraController.dispose()
    this.renderer.dispose()
    window.removeEventListener('resize', () => this.onWindowResize())
  }
}
