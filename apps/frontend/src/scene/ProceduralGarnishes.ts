import * as THREE from 'three'

// Common materials
const TOOTHPICK_MATERIAL = new THREE.MeshPhysicalMaterial({
  color: 0x8b7355, // Light brown
  metalness: 0.0,
  roughness: 0.8,
  transmission: 0.0, // Fully opaque
  transparent: false,
  clippingPlanes: [], // Prevent liquid clipping from affecting toothpick
})

interface FruitConfig {
  color: number
  metalness: number
  roughness: number
  radius: number
  scale?: { x: number; y: number; z: number }
}

/**
 * Creates a pair of fruits on a toothpick
 * @param config - Configuration for the fruit appearance
 * @returns THREE.Group containing two fruits and a toothpick
 */
function createFruitOnToothpick(config: FruitConfig): THREE.Group {
  const fruitGroup = new THREE.Group()

  // Fruit material
  const fruitMaterial = new THREE.MeshPhysicalMaterial({
    color: config.color,
    metalness: config.metalness,
    roughness: config.roughness,
    transmission: 0.0, // Fully opaque
    transparent: false,
    clippingPlanes: [], // Prevent liquid clipping from affecting fruit
  })

  // Create fruit geometry
  const fruitGeometry = new THREE.SphereGeometry(config.radius, 16, 16)

  // First fruit
  const fruit1 = new THREE.Mesh(fruitGeometry, fruitMaterial)
  if (config.scale) {
    fruit1.scale.set(config.scale.x, config.scale.y, config.scale.z)
  }
  fruit1.position.set(-0.2, 0, 0) // Horizontal positioning
  fruit1.castShadow = true
  fruit1.receiveShadow = true

  // Second fruit
  const fruit2 = new THREE.Mesh(fruitGeometry, fruitMaterial)
  if (config.scale) {
    fruit2.scale.set(config.scale.x, config.scale.y, config.scale.z)
  }
  fruit2.position.set(0.2, 0, 0) // Horizontal positioning
  fruit2.castShadow = true
  fruit2.receiveShadow = true

  // Create toothpick (cylinder) - rotated to be horizontal
  const toothpickGeometry = new THREE.CylinderGeometry(0.01, 0.01, 1.2, 8)
  const toothpick = new THREE.Mesh(toothpickGeometry, TOOTHPICK_MATERIAL)
  toothpick.rotation.z = Math.PI / 2 // Rotate 90 degrees to make it horizontal
  toothpick.castShadow = true
  toothpick.receiveShadow = true

  // Add all pieces to the group
  fruitGroup.add(fruit1)
  fruitGroup.add(fruit2)
  fruitGroup.add(toothpick)

  return fruitGroup
}

/**
 * Create a procedural olive garnish with toothpick
 */
export function createProceduralOlive(): THREE.Group {
  return createFruitOnToothpick({
    color: 0x6b8e23, // Olive drab green
    metalness: 0.1,
    roughness: 0.4,
    radius: 0.15,
    scale: { x: 1.5, y: 1, z: 1 }, // Elongation along X-axis (horizontal)
  })
}

/**
 * Create a procedural cherry garnish with toothpick
 */
export function createProceduralCherry(): THREE.Group {
  return createFruitOnToothpick({
    color: 0x65041d, // Crimson red
    metalness: 0.2,
    roughness: 0.3,
    radius: 0.15,
    // No scale - perfect spheres
  })
}

/**
 * Create a procedural citrus round (thin cylinder slice)
 * @param citrusType - Type of citrus: 'orange', 'lime', or 'lemon'
 */
export function createProceduralCitrusRound(
  citrusType: 'orange' | 'lime' | 'lemon' = 'orange'
): THREE.Group {
  const citrusGroup = new THREE.Group()

  // Map citrus type to color
  const citrusColors = {
    orange: 0xff8c00, // Dark orange
    lime: 0x32cd32, // Lime green
    lemon: 0xfff44f, // Bright yellow
  }

  const pithColors = {
    orange: 0xffddaa, // Very light orange
    lime: 0xe0ffcc, // Very light green
    lemon: 0xffffcc, // Very light yellow
  }

  const centerColors = {
    orange: 0xffb366, // Light orange
    lime: 0x66ff66, // Light lime
    lemon: 0xffff99, // Light yellow
  }

  // Citrus color material (for outer edge of cylinder)
  const citrusMaterial = new THREE.MeshPhysicalMaterial({
    color: citrusColors[citrusType],
    metalness: 0.1,
    roughness: 0.3,
    transmission: 0.0, // Fully opaque
    transparent: false,
    clippingPlanes: [], // Prevent liquid clipping from affecting citrus
  })

  // Create thin cylinder for the outer edge (orange colored)
  const sliceGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32)
  const slice = new THREE.Mesh(sliceGeometry, citrusMaterial)
  slice.castShadow = true
  slice.receiveShadow = true

  // Very light colored pith material
  const pithMaterial = new THREE.MeshPhysicalMaterial({
    color: pithColors[citrusType],
    metalness: 0.0,
    roughness: 0.8,
    transmission: 0.0, // Fully opaque
    transparent: false,
    clippingPlanes: [], // Prevent liquid clipping from affecting pith
  })

  // Add pith ring on the faces (outer ring on the face)
  const pithGeometry = new THREE.CylinderGeometry(0.19, 0.19, 0.051, 32)
  const pith = new THREE.Mesh(pithGeometry, pithMaterial)
  pith.castShadow = true
  pith.receiveShadow = true

  // Light colored center material
  const centerMaterial = new THREE.MeshPhysicalMaterial({
    color: centerColors[citrusType],
    metalness: 0.1,
    roughness: 0.3,
    transmission: 0.0, // Fully opaque
    transparent: false,
    clippingPlanes: [], // Prevent liquid clipping from affecting center
  })

  // Add center on the faces
  const centerGeometry = new THREE.CylinderGeometry(0.16, 0.16, 0.052, 32)
  const center = new THREE.Mesh(centerGeometry, centerMaterial)
  center.castShadow = true
  center.receiveShadow = true

  citrusGroup.add(slice)
  citrusGroup.add(pith)
  citrusGroup.add(center)

  return citrusGroup
}

/**
 * Create a procedural salt rim using particles
 * @param rimRadius - The radius of the glass rim
 * @returns THREE.Points object with salt particles
 */
export function createProceduralSaltRim(rimRadius: number): THREE.Points {
  const particleCount = 400 // Coarse grain with good coverage
  const positions = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)

  // Generate particles around the rim (centered at origin)
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3

    // Angle around the circle (full 360°)
    const angle = (i / particleCount) * Math.PI * 2

    // Add some random variation to angle for natural clustering
    const angleVariation = (Math.random() - 0.5) * 0.15

    // Add radial variation - some particles slightly inside/outside rim
    const radialOffset = (Math.random() - 0.5) * 0.08
    const radius = rimRadius + radialOffset

    // Calculate X, Z position on the rim circle (relative to origin)
    positions[i3] = Math.cos(angle + angleVariation) * radius // X
    positions[i3 + 2] = Math.sin(angle + angleVariation) * radius // Z

    // Y position with slight vertical variation for natural clumping (relative to origin)
    const verticalVariation = (Math.random() - 0.5) * 0.05
    positions[i3 + 1] = verticalVariation // Y - centered at 0, will be positioned by parent object

    // Coarse grain: particle sizes between 0.015 and 0.035
    sizes[i] = 0.015 + Math.random() * 0.02
  }

  // Create geometry and set attributes
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  // Create material - matte/natural white salt
  const material = new THREE.PointsMaterial({
    color: 0xd0d0d0, // Darker off-white for natural salt
    size: 0.025, // Base size (individual sizes will vary)
    sizeAttenuation: true, // Particles get smaller with distance
    transparent: false,
    opacity: 1.0,
    // Matte appearance - no metalness, medium roughness
  })

  // Create and return the particle system
  const saltRim = new THREE.Points(geometry, material)
  saltRim.castShadow = false // Particles typically don't cast shadows
  saltRim.receiveShadow = false

  return saltRim
}
