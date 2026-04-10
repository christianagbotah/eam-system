'use client'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

interface ModelViewerProps {
  modelUrl: string
  onPartClick: (partId: string, partName: string) => void
}

export default function ModelViewer({ modelUrl, onPartClick }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredPart, setHoveredPart] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000)
    camera.position.set(5, 5, 5)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    containerRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 10)
    scene.add(directionalLight)

    const loader = new GLTFLoader()
    let model: THREE.Group
    const originalMaterials = new Map()

    loader.load(modelUrl, (gltf) => {
      model = gltf.scene
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          originalMaterials.set(child.uuid, child.material.clone())
          child.userData.partId = child.name || child.uuid
          child.userData.partName = child.name || 'Unnamed Part'
        }
      })
      scene.add(model)
    })

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(scene.children, true)

      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Mesh
        if (object.userData.partId) {
          setHoveredPart(object.userData.partName)
          if (object.material) {
            (object.material as THREE.MeshStandardMaterial).emissive.setHex(0x555555)
          }
        }
      } else {
        setHoveredPart(null)
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && originalMaterials.has(child.uuid)) {
            (child.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
          }
        })
      }
    }

    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(scene.children, true)

      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Mesh
        if (object.userData.partId) {
          onPartClick(object.userData.partId, object.userData.partName)
        }
      }
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('click', onClick)

    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!containerRef.current) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('click', onClick)
      containerRef.current?.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [modelUrl, onPartClick])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {hoveredPart && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded">
          {hoveredPart}
        </div>
      )}
    </div>
  )
}
