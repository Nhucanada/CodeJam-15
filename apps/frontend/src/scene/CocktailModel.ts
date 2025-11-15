import * as THREE from 'three'
import { CocktailConfig, GlassType } from '../types'
import TWEEN from '@tweenjs/tween.js'

export class CocktailModel {
  public group: THREE.Group
  private glass: THREE.Mesh
  private liquid: THREE.Mesh
  private ice: THREE.Group
  private garnish: THREE.Object3D | null = null

  constructor(scene: THREE.Scene, config: CocktailConfig) {
    this.group = new THREE.Group()
    this.group.position.y = 1

    // Create glass
    this.glass = this.createGlass(config.glassType)
    this.group.add(this.glass)

    // Create liquid
    this.liquid = this.createLiquid(config.glassType, config.liquidColor)
    this.group.add(this.liquid)

    // Create ice
    this.ice = this.createIce(config.iceLevel)
    this.group.add(this.ice)

    // Create garnish
    if (config.garnish && config.garnish !== 'none') {
      this.garnish = this.createGarnish(config.garnish)
      this.group.add(this.garnish)
    }

    scene.add(this.group)
  }

  private createGlass(type: GlassType): THREE.Mesh {
    let geometry: THREE.BufferGeometry

    switch (type) {
      case 'highball':
        geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 32)
        break
      case 'martini':
        geometry = new THREE.ConeGeometry(0.4, 1.2, 32)
        break
      case 'rocks':
        geometry = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 32)
        break
      case 'coupe':
        geometry = new THREE.SphereGeometry(0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2)
        break
      case 'hurricane':
        geometry = new THREE.CylinderGeometry(0.25, 0.35, 1.8, 32)
        break
      default:
        geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 32)
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.95,
      thickness: 0.5,
      envMapIntensity: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  private createLiquid(type: GlassType, color: string): THREE.Mesh {
    let geometry: THREE.BufferGeometry

    switch (type) {
      case 'highball':
        geometry = new THREE.CylinderGeometry(0.28, 0.28, 1.3, 32)
        break
      case 'martini':
        geometry = new THREE.ConeGeometry(0.38, 1.0, 32)
        break
      case 'rocks':
        geometry = new THREE.CylinderGeometry(0.33, 0.33, 0.6, 32)
        break
      case 'coupe':
        geometry = new THREE.SphereGeometry(0.38, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2.5)
        break
      case 'hurricane':
        geometry = new THREE.CylinderGeometry(0.23, 0.33, 1.5, 32)
        break
      default:
        geometry = new THREE.CylinderGeometry(0.28, 0.28, 1.3, 32)
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.5,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = -0.1
    return mesh
  }

  private createIce(level: number): THREE.Group {
    const iceGroup = new THREE.Group()

    const numCubes = Math.floor(level * 6)
    const iceGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15)
    const iceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xeeffff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.2,
      metalness: 0,
      transmission: 0.8,
    })

    for (let i = 0; i < numCubes; i++) {
      const cube = new THREE.Mesh(iceGeometry, iceMaterial)
      const angle = (i / numCubes) * Math.PI * 2
      const radius = 0.15
      cube.position.set(
        Math.cos(angle) * radius,
        -0.3 + Math.random() * 0.3,
        Math.sin(angle) * radius
      )
      cube.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      iceGroup.add(cube)
    }

    return iceGroup
  }

  private createGarnish(type: string): THREE.Object3D {
    const group = new THREE.Group()

    switch (type) {
      case 'lemon':
      case 'lime':
      case 'orange': {
        const sliceGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32)
        const color = type === 'lemon' ? 0xffff00 : type === 'lime' ? 0x00ff00 : 0xffa500
        const material = new THREE.MeshStandardMaterial({ color })
        const slice = new THREE.Mesh(sliceGeometry, material)
        slice.rotation.z = Math.PI / 2
        slice.position.set(0.3, 0.7, 0)
        group.add(slice)
        break
      }
      case 'cherry': {
        const cherryGeometry = new THREE.SphereGeometry(0.1, 16, 16)
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
        const cherry = new THREE.Mesh(cherryGeometry, material)
        cherry.position.set(0, 0.8, 0)
        group.add(cherry)
        break
      }
      case 'mint': {
        const leafGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.02)
        const material = new THREE.MeshStandardMaterial({ color: 0x00aa00 })
        const leaf = new THREE.Mesh(leafGeometry, material)
        leaf.position.set(0, 0.8, 0)
        group.add(leaf)
        break
      }
      case 'umbrella': {
        const umbrellaGeometry = new THREE.ConeGeometry(0.3, 0.2, 8)
        const material = new THREE.MeshStandardMaterial({ color: 0xff6699 })
        const umbrella = new THREE.Mesh(umbrellaGeometry, material)
        umbrella.position.set(0, 0.9, 0)
        group.add(umbrella)
        break
      }
    }

    return group
  }

  public updateConfig(config: CocktailConfig): void {
    // Animate liquid color change
    const currentColor = (this.liquid.material as THREE.MeshPhysicalMaterial).color
    const targetColor = new THREE.Color(config.liquidColor)

    new TWEEN.Tween({ r: currentColor.r, g: currentColor.g, b: currentColor.b })
      .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, 500)
      .onUpdate((obj) => {
        currentColor.setRGB(obj.r, obj.g, obj.b)
      })
      .start()

    // Update ice level
    this.group.remove(this.ice)
    this.ice = this.createIce(config.iceLevel)
    this.group.add(this.ice)

    // Update garnish
    if (this.garnish) {
      this.group.remove(this.garnish)
      this.garnish = null
    }
    if (config.garnish && config.garnish !== 'none') {
      this.garnish = this.createGarnish(config.garnish)
      this.group.add(this.garnish)
    }
  }

  public dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => mat.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
  }
}
