import './style.css'
import * as THREE from 'three'

// Scene setup
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x1a1a1a)
document.body.appendChild(renderer.domElement)

// Create a rotating cube
const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshPhongMaterial({ color: 0x00ff88 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// Add lighting
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(5, 5, 5)
scene.add(light)

const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
scene.add(ambientLight)

// Position camera
camera.position.z = 5

// Animation loop
function animate() {
  requestAnimationFrame(animate)

  cube.rotation.x += 0.01
  cube.rotation.y += 0.01

  renderer.render(scene, camera)
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Start animation
animate()

// Connect to backend - use environment-aware URL
const apiUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'http://backend:8000'

fetch(apiUrl)
  .then(response => response.json())
  .then(data => console.log('Backend says:', data.message))
  .catch(error => console.log('Backend connection failed:', error))