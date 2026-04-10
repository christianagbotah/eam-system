'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ViewerState, ViewerControls, Hotspot } from '@/types/viewer3d';

interface Viewer3DProps {
  viewerState: ViewerState;
  controls: ViewerControls;
  onMeshClick: (meshId: string) => void;
  onMeshHover: (meshId: string | null) => void;
  onCameraChange: (camera: ViewerState['camera']) => void;
}

export default function Viewer3D({
  viewerState,
  controls,
  onMeshClick,
  onMeshHover,
  onCameraChange
}: Viewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<Hotspot | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    initThreeJS();
    return () => cleanup();
  }, []);

  useEffect(() => {
    updateMeshHighlighting();
  }, [viewerState.selectedMeshId, viewerState.highlightedMeshId]);

  useEffect(() => {
    updateExplodedView();
  }, [viewerState.explodedView, viewerState.explodeDistance]);

  useEffect(() => {
    updateLayerVisibility();
  }, [viewerState.visibleLayers]);

  const initThreeJS = async () => {
    if (typeof window === 'undefined') return;

    const THREE = await import('three');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(...viewerState.camera.position);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.addEventListener('change', () => {
      onCameraChange({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        zoom: camera.zoom
      });
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load sample geometry
    loadSampleGeometry(scene, THREE);

    // Mouse events
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        const meshId = object.userData.meshId;
        if (meshId) {
          onMeshHover(meshId);
          
          // Check for hotspots
          const hotspot = viewerState.hotspots.find(h => h.mesh_id === meshId);
          if (hotspot) {
            setHoveredHotspot(hotspot);
            setTooltipPosition({ x: event.clientX, y: event.clientY });
          } else {
            setHoveredHotspot(null);
          }
        }
      } else {
        onMeshHover(null);
        setHoveredHotspot(null);
      }
    };

    const onClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        const meshId = object.userData.meshId;
        if (meshId) {
          onMeshClick(meshId);
        }
      }
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
  };

  const loadSampleGeometry = (scene: any, THREE: any) => {
    // Machine base
    const machineGeometry = new THREE.BoxGeometry(4, 1, 2);
    const machineMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const machine = new THREE.Mesh(machineGeometry, machineMaterial);
    machine.position.set(0, 0, 0);
    machine.userData = { meshId: 'machine-1', layer: 'machine' };
    scene.add(machine);

    // Assembly 1
    const assembly1Geometry = new THREE.CylinderGeometry(0.5, 0.5, 2);
    const assembly1Material = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    const assembly1 = new THREE.Mesh(assembly1Geometry, assembly1Material);
    assembly1.position.set(-1, 1.5, 0);
    assembly1.userData = { meshId: 'assembly-1', layer: 'assembly' };
    scene.add(assembly1);

    // Assembly 2
    const assembly2 = assembly1.clone();
    assembly2.position.set(1, 1.5, 0);
    assembly2.userData = { meshId: 'assembly-2', layer: 'assembly' };
    scene.add(assembly2);

    // Parts
    const partGeometry = new THREE.SphereGeometry(0.2);
    const partMaterial = new THREE.MeshLambertMaterial({ color: 0x2196F3 });
    
    for (let i = 1; i <= 4; i++) {
      const part = new THREE.Mesh(partGeometry, partMaterial);
      part.position.set((i % 2 === 0 ? 1 : -1), 2.5, (i > 2 ? 0.5 : -0.5));
      part.userData = { meshId: `part-${i}`, layer: 'part' };
      scene.add(part);
    }
  };

  const updateMeshHighlighting = () => {
    if (!sceneRef.current) return;

    sceneRef.current.traverse((object: any) => {
      if (object.isMesh && object.userData.meshId) {
        const meshId = object.userData.meshId;
        
        if (meshId === viewerState.selectedMeshId) {
          object.material = object.material.clone();
          object.material.color.setHex(0xff4444);
          object.material.emissive.setHex(0x220000);
        } else if (meshId === viewerState.highlightedMeshId) {
          object.material = object.material.clone();
          object.material.color.setHex(0xffff44);
          object.material.emissive.setHex(0x222200);
        } else {
          // Reset to original color
          const originalColor = object.userData.originalColor || 0x666666;
          object.material = object.material.clone();
          object.material.color.setHex(originalColor);
          object.material.emissive.setHex(0x000000);
        }
      }
    });
  };

  const updateExplodedView = () => {
    if (!sceneRef.current) return;

    sceneRef.current.traverse((object: any) => {
      if (object.isMesh && object.userData.meshId) {
        const meshId = object.userData.meshId;
        
        if (viewerState.explodedView) {
          if (meshId.startsWith('assembly-')) {
            const assemblyNum = parseInt(meshId.split('-')[1]);
            object.position.x += (assemblyNum % 2 === 0 ? 1 : -1) * viewerState.explodeDistance;
          } else if (meshId.startsWith('part-')) {
            const partNum = parseInt(meshId.split('-')[1]);
            object.position.y += viewerState.explodeDistance;
            object.position.x += (partNum % 2 === 0 ? 1 : -1) * viewerState.explodeDistance * 0.5;
          }
        } else {
          // Reset positions
          if (meshId.startsWith('assembly-')) {
            const assemblyNum = parseInt(meshId.split('-')[1]);
            object.position.x = assemblyNum % 2 === 0 ? 1 : -1;
          } else if (meshId.startsWith('part-')) {
            const partNum = parseInt(meshId.split('-')[1]);
            object.position.set(
              (partNum % 2 === 0 ? 1 : -1),
              2.5,
              (partNum > 2 ? 0.5 : -0.5)
            );
          }
        }
      }
    });
  };

  const updateLayerVisibility = () => {
    if (!sceneRef.current) return;

    sceneRef.current.traverse((object: any) => {
      if (object.isMesh && object.userData.layer) {
        object.visible = viewerState.visibleLayers.includes(object.userData.layer);
      }
    });
  };

  const cleanup = () => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      
      {hoveredHotspot && (
        <div
          className="absolute z-10 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 30,
            transform: 'translate(-50%, 0)'
          }}
        >
          {hoveredHotspot.tooltip_text}
        </div>
      )}
    </div>
  );
}
