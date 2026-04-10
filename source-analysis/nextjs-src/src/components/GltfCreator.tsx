'use client'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

interface Part {
  id: string
  name: string
  type: 'box' | 'cylinder' | 'sphere'
  position: [number, number, number]
  scale: [number, number, number]
  color: string
}

export default function GltfCreator() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [selectedPart, setSelectedPart] = useState<string | null>(null)
  const [partName, setPartName] = useState('')
  const [partType, setPartType] = useState<'box' | 'cylinder' | 'sphere'>('box')
  const [partColor, setPartColor] = useState('#3b82f6')

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000)
    camera.position.set(5, 5, 5)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    containerRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const gridHelper = new THREE.GridHelper(10, 10)
    scene.add(gridHelper)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 10)
    scene.add(directionalLight)

    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      containerRef.current?.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current) return

    sceneRef.current.children.forEach(child => {
      if (child.userData.isPart) {
        sceneRef.current?.remove(child)
      }
    })

    parts.forEach(part => {
      let geometry: THREE.BufferGeometry
      switch (part.type) {
        case 'cylinder':
          geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
          break
        case 'sphere':
          geometry = new THREE.SphereGeometry(0.5, 32, 32)
          break
        default:
          geometry = new THREE.BoxGeometry(1, 1, 1)
      }

      const material = new THREE.MeshStandardMaterial({ color: part.color })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...part.position)
      mesh.scale.set(...part.scale)
      mesh.name = part.name
      mesh.userData.isPart = true
      mesh.userData.partId = part.id
      sceneRef.current?.add(mesh)
    })
  }, [parts])

  const addPart = () => {
    if (!partName) return
    const newPart: Part = {
      id: Date.now().toString(),
      name: partName,
      type: partType,
      position: [0, 0, 0],
      scale: [1, 1, 1],
      color: partColor
    }
    setParts([...parts, newPart])
    setPartName('')
  }

  const updatePart = (id: string, updates: Partial<Part>) => {
    setParts(parts.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const deletePart = (id: string) => {
    setParts(parts.filter(p => p.id !== id))
    if (selectedPart === id) setSelectedPart(null)
  }

  const exportGltf = () => {
    if (!sceneRef.current) return

    const exporter = new GLTFExporter()
    const exportScene = new THREE.Scene()

    parts.forEach(part => {
      let geometry: THREE.BufferGeometry
      switch (part.type) {
        case 'cylinder':
          geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
          break
        case 'sphere':
          geometry = new THREE.SphereGeometry(0.5, 32, 32)
          break
        default:
          geometry = new THREE.BoxGeometry(1, 1, 1)
      }

      const material = new THREE.MeshStandardMaterial({ color: part.color })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...part.position)
      mesh.scale.set(...part.scale)
      mesh.name = part.name
      exportScene.add(mesh)
    })

    exporter.parse(
      exportScene,
      (gltf) => {
        const blob = new Blob([JSON.stringify(gltf)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'model.gltf'
        link.click()
      },
      (error) => console.error(error),
      { binary: false }
    )
  }

  const selectedPartData = parts.find(p => p.id === selectedPart)

  return (
    <div className="flex h-screen">
      <div className="w-64 bg-white border-r p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">glTF Creator</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Part Name</label>
          <input
            type="text"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="e.g., Motor"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={partType}
            onChange={(e) => setPartType(e.target.value as any)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="box">Box</option>
            <option value="cylinder">Cylinder</option>
            <option value="sphere">Sphere</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Color</label>
          <input
            type="color"
            value={partColor}
            onChange={(e) => setPartColor(e.target.value)}
            className="w-full h-10 border rounded"
          />
        </div>

        <button
          onClick={addPart}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-4"
        >
          Add Part
        </button>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Parts ({parts.length})</h3>
          {parts.map(part => (
            <div
              key={part.id}
              className={`p-2 mb-2 border rounded cursor-pointer ${selectedPart === part.id ? 'bg-blue-50 border-blue-500' : ''}`}
              onClick={() => setSelectedPart(part.id)}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{part.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deletePart(part.id) }}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
              <div className="text-xs text-gray-500">{part.type}</div>
            </div>
          ))}
        </div>

        <button
          onClick={exportGltf}
          disabled={parts.length === 0}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 mt-4 disabled:bg-gray-400"
        >
          Export glTF
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <div ref={containerRef} className="flex-1" />

        {selectedPartData && (
          <div className="bg-white border-t p-4">
            <h3 className="font-semibold mb-3">Edit: {selectedPartData.name}</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Position X</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedPartData.position[0]}
                  onChange={(e) => updatePart(selectedPartData.id, { position: [+e.target.value, selectedPartData.position[1], selectedPartData.position[2]] })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Position Y</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedPartData.position[1]}
                  onChange={(e) => updatePart(selectedPartData.id, { position: [selectedPartData.position[0], +e.target.value, selectedPartData.position[2]] })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Position Z</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedPartData.position[2]}
                  onChange={(e) => updatePart(selectedPartData.id, { position: [selectedPartData.position[0], selectedPartData.position[1], +e.target.value] })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Scale X</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedPartData.scale[0]}
                  onChange={(e) => updatePart(selectedPartData.id, { scale: [+e.target.value, selectedPartData.scale[1], selectedPartData.scale[2]] })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Scale Y</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedPartData.scale[1]}
                  onChange={(e) => updatePart(selectedPartData.id, { scale: [selectedPartData.scale[0], +e.target.value, selectedPartData.scale[2]] })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Scale Z</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedPartData.scale[2]}
                  onChange={(e) => updatePart(selectedPartData.id, { scale: [selectedPartData.scale[0], selectedPartData.scale[1], +e.target.value] })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
