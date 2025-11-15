import * as THREE from 'three'

export class LiquidHandler {
  private liquidMesh: THREE.Mesh | null = null
  private liquidGeometry: THREE.CylinderGeometry | null = null
  private liquidTopMesh: THREE.Mesh | null = null
  private liquidTopGeometry: THREE.CircleGeometry | null = null
  private currentFillLevel: number = 0
  private targetFillLevel: number = 0
  private clippingPlane: THREE.Plane | null = null
  private scene: THREE.Scene | null = null
  private glass: THREE.Object3D | null = null
  private glassBox: THREE.Box3 | null = null
  private isPaused: boolean = false
  private liquidStartPercent: number = 0.06
  private liquidEndPercent: number = 0.90
  private waveTime: number = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  /**
   * Measures the glass width at a specific height using raycasting
   */
  private measureGlassRadiusAtHeight(glass: THREE.Object3D, yPosition: number): number {
    const raycaster = new THREE.Raycaster()

    // Cast rays from the glass's center position, not (0,0,0)
    const glassCenter = glass.position.clone()
    const origin = new THREE.Vector3(glassCenter.x, yPosition, glassCenter.z)
    const direction = new THREE.Vector3(1, 0, 0) // Cast ray along X axis

    raycaster.set(origin, direction)

    let maxDistance = 0
    glass.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const intersects = raycaster.intersectObject(child, false)
        if (intersects.length > 0) {
          const distance = intersects[0].distance
          if (distance > maxDistance) {
            maxDistance = distance
          }
        }
      }
    })

    // Also check in negative X direction
    raycaster.set(origin, new THREE.Vector3(-1, 0, 0))
    glass.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const intersects = raycaster.intersectObject(child, false)
        if (intersects.length > 0) {
          const distance = intersects[0].distance
          if (distance > maxDistance) {
            maxDistance = distance
          }
        }
      }
    })

    return maxDistance * 0.98 // Scale down very slightly to avoid z-fighting
  }

  /**
   * Creates a liquid mesh inside the glass with full-height precomputed geometry
   */
  public createLiquid(
    glass: THREE.Object3D,
    glassBox: THREE.Box3,
    liquidStartPercent: number = 0.06,
    liquidEndPercent: number = 0.90
  ): void {
    this.glass = glass
    this.glassBox = glassBox
    this.liquidStartPercent = liquidStartPercent
    this.liquidEndPercent = liquidEndPercent

    // Calculate glass dimensions
    const glassSize = new THREE.Vector3()
    glassBox.getSize(glassSize)

    // Create full-height liquid (from liquidStartPercent to 90% of glass height)
    const liquidBottom = glassBox.min.y + glassSize.y * this.liquidStartPercent
    const liquidTop = glassBox.min.y + glassSize.y * this.liquidEndPercent
    const fullHeight = liquidTop - liquidBottom

    // Measure glass profile at multiple heights for better shape matching
    console.log('=== Glass Profile Analysis ===')
    console.log('Glass box min.y:', glassBox.min.y, 'max.y:', glassBox.max.y)
    console.log('Glass total height:', glassSize.y)

    const heightSegments = 20 // Segments for smooth shape
    const radialSegments = 64 // Smoother curves

    // Sample glass radius at multiple heights
    const radiusSamples: number[] = []
    for (let i = 0; i <= heightSegments; i++) {
      const percent = i / heightSegments
      const y = liquidBottom + fullHeight * percent
      const radius = this.measureGlassRadiusAtHeight(glass, y)
      radiusSamples.push(radius)
      console.log(`  ${(percent * 100).toFixed(0)}% liquid height (Y=${y.toFixed(2)}): radius=${radius.toFixed(3)}`)
    }
    console.log('==============================')

    // Create cylinder geometry with average radius at top and bottom
    const radiusBottom = radiusSamples[0]
    const radiusTop = radiusSamples[radiusSamples.length - 1]

    this.liquidGeometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      fullHeight,
      radialSegments,
      heightSegments,
      false // Not open-ended
    )

    // Adjust vertices to match glass shape at each height segment with smooth interpolation
    const position = this.liquidGeometry.attributes.position
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i)

      // Find which height segment this vertex belongs to (0 to 1), clamp to valid range
      const normalizedY = Math.max(0, Math.min(1, (y + fullHeight / 2) / fullHeight))

      // Get the exact position in the samples array (can be fractional)
      const samplePosition = normalizedY * heightSegments
      const lowerIndex = Math.max(0, Math.min(heightSegments - 1, Math.floor(samplePosition)))
      const upperIndex = Math.min(heightSegments, lowerIndex + 1)
      const fraction = samplePosition - lowerIndex

      // Interpolate between the two nearest radius samples
      const lowerRadius = radiusSamples[lowerIndex] || 0
      const upperRadius = radiusSamples[upperIndex] || lowerRadius
      const targetRadius = lowerRadius + (upperRadius - lowerRadius) * fraction

      // Get current vertex radius
      const x = position.getX(i)
      const z = position.getZ(i)
      const currentRadius = Math.sqrt(x * x + z * z)

      // Scale vertex to match glass radius at this height
      if (currentRadius > 0.001 && targetRadius > 0) {
        const scale = targetRadius / currentRadius
        position.setX(i, x * scale)
        position.setZ(i, z * scale)
      }
    }
    position.needsUpdate = true
    this.liquidGeometry.computeVertexNormals()

    // Create clipping plane (starts at bottom, will be animated to control fill level)
    this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)

    // Create transparent colored liquid material with clipping plane
    const liquidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff6b35, // Orange cocktail color
      transparent: true,
      opacity: 1,
      transmission: 0.6,
      roughness: 0.05,
      thickness: 0.3,
      ior: 1.33, // Water refraction index
      depthWrite: true,
      clippingPlanes: [this.clippingPlane], // Add clipping plane
      clipShadows: true,
    })

    this.liquidMesh = new THREE.Mesh(this.liquidGeometry, liquidMaterial)
    this.liquidMesh.castShadow = true
    this.liquidMesh.receiveShadow = true
    this.liquidMesh.renderOrder = 1

    // Position liquid mesh (centered at middle of full height)
    const liquidCenterY = liquidBottom + fullHeight / 2

    this.liquidMesh.position.set(
      glass.position.x,
      liquidCenterY,
      glass.position.z
    )

    // Initialize clipping plane to show 0% fill (empty)
    this.updateClippingPlane()

    // Create top surface for the liquid
    this.createLiquidTop(liquidBottom, fullHeight)

    // Add liquid to scene
    if (this.scene) {
      this.scene.add(this.liquidMesh)
      if (this.liquidTopMesh) {
        this.scene.add(this.liquidTopMesh)
      }
    }
  }

  /**
   * Creates the top surface of the liquid
   */
  private createLiquidTop(liquidBottom: number, fullHeight: number): void {
    if (!this.glass || !this.glassBox) return

    // Start with a circle at current fill level
    const initialFillHeight = fullHeight * this.currentFillLevel
    const initialY = liquidBottom + initialFillHeight
    const initialRadius = this.measureGlassRadiusAtHeight(this.glass, initialY)

    // Create circle geometry for the top surface with more segments for wave animation
    this.liquidTopGeometry = new THREE.CircleGeometry(initialRadius, 64, 16)

    // Same material as the liquid
    const topMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 1,
      transmission: 0.9,
      roughness: 0.05,
      thickness: 0.3,
      ior: 1.33,
      depthWrite: true,
      side: THREE.DoubleSide, // Visible from both sides
    })

    this.liquidTopMesh = new THREE.Mesh(this.liquidTopGeometry, topMaterial)
    this.liquidTopMesh.castShadow = true
    this.liquidTopMesh.receiveShadow = true
    this.liquidTopMesh.renderOrder = 1

    // Rotate to face upward
    this.liquidTopMesh.rotation.x = -Math.PI / 2

    // Position at the initial fill level
    if (this.glass) {
      this.liquidTopMesh.position.set(
        this.glass.position.x,
        initialY,
        this.glass.position.z
      )
    }
  }

  /**
   * Set the target fill level of the liquid (0 to 1)
   * The actual fill will smoothly interpolate to this value
   */
  public setFillLevel(percent: number): void {
    this.targetFillLevel = Math.max(0, Math.min(1, percent))
  }

  /**
   * Updates the clipping plane position and top surface based on current fill level
   */
  private updateClippingPlane(): void {
    if (!this.clippingPlane || !this.glassBox) return

    const glassSize = new THREE.Vector3()
    this.glassBox.getSize(glassSize)

    // Calculate the Y position where liquid should be clipped
    const liquidBottom = this.glassBox.min.y + glassSize.y * this.liquidStartPercent
    const liquidTop = this.glassBox.min.y + glassSize.y * this.liquidEndPercent
    const fullHeight = liquidTop - liquidBottom

    // Current fill level determines clipping plane Y position
    const currentFillHeight = fullHeight * this.currentFillLevel
    const clipY = liquidBottom + currentFillHeight

    // Update clipping plane (plane normal points down, so we use negative Y)
    // The constant determines the plane's position along its normal
    this.clippingPlane.constant = clipY

    // Update top surface position and size
    this.updateLiquidTop(clipY)
  }

  /**
   * Updates the liquid top surface position and radius
   */
  private updateLiquidTop(yPosition: number): void {
    if (!this.liquidTopMesh || !this.liquidTopGeometry || !this.glass) return

    // Measure glass radius at the current fill height
    const radius = this.measureGlassRadiusAtHeight(this.glass, yPosition)

    // Recreate geometry with new radius (circles are simple, low cost)
    this.liquidTopGeometry.dispose()
    this.liquidTopGeometry = new THREE.CircleGeometry(radius, 64, 16)
    this.liquidTopMesh.geometry = this.liquidTopGeometry

    // Update position
    this.liquidTopMesh.position.y = yPosition
  }

  /**
   * Update the actual fill level based on the target
   */
  private updateFillLevel(): void {
    if (!this.liquidMesh || !this.glassBox) return

    // Smooth interpolation towards target (lerp with speed factor)
    const lerpSpeed = 0.04 // Adjust this for faster/slower filling (0.04 = ~1 second)
    const previousFillLevel = this.currentFillLevel
    this.currentFillLevel += (this.targetFillLevel - this.currentFillLevel) * lerpSpeed

    // Only update clipping plane if fill level changed significantly (optimization)
    if (Math.abs(this.currentFillLevel - previousFillLevel) < 0.001) return

    // Update clipping plane position and top surface (no geometry recreation!)
    this.updateClippingPlane()
  }

  /**
   * Updates the wave animation on the liquid surface
   */
  private updateWaveAnimation(): void {
    if (!this.liquidTopMesh || !this.liquidTopGeometry) return

    // Increment wave time for animation
    this.waveTime += 0.02

    const position = this.liquidTopGeometry.attributes.position
    const positionArray = position.array as Float32Array

    // Wave parameters
    const waveAmplitude = 0.008 // Height of the waves
    const waveFrequency = 4 // Number of waves around the circle
    const waveSpeed = this.waveTime

    // Animate vertices (skip center vertex at index 0)
    for (let i = 1; i < position.count; i++) {
      const x = positionArray[i * 3]
      const y = positionArray[i * 3 + 1]

      // Calculate angle and distance from center for wave pattern
      const angle = Math.atan2(y, x)
      const distance = Math.sqrt(x * x + y * y)

      // Create wave displacement using sine waves
      const wave1 = Math.sin(angle * waveFrequency + waveSpeed) * waveAmplitude
      const wave2 = Math.sin(angle * waveFrequency * 0.7 - waveSpeed * 1.3) * waveAmplitude * 0.5
      const radialWave = Math.sin(distance * 15 + waveSpeed * 2) * waveAmplitude * 0.3

      // Combine waves and apply to Z coordinate
      positionArray[i * 3 + 2] = wave1 + wave2 + radialWave
    }

    position.needsUpdate = true
    this.liquidTopGeometry.computeVertexNormals()
  }

  /**
   * Update function (call this in animation loop)
   */
  public update(): void {
    // Only update fill level if not paused
    if (!this.isPaused) {
      this.updateFillLevel()
    }

    // Always update wave animation (even when paused for visual effect)
    this.updateWaveAnimation()
  }

  /**
   * Pause the filling animation
   */
  public pause(): void {
    this.isPaused = true
  }

  /**
   * Unpause the filling animation
   */
  public unpause(): void {
    this.isPaused = false
  }

  /**
   * Get the liquid mesh for external manipulation
   */
  public getLiquid(): THREE.Mesh | null {
    return this.liquidMesh
  }

  /**
   * Get the liquid top mesh for external manipulation
   */
  public getLiquidTop(): THREE.Mesh | null {
    return this.liquidTopMesh
  }
}
