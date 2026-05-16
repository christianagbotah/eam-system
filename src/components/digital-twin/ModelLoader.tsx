'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { InteractiveMesh, type AssetMeshBinding } from './InteractiveMesh';

// ============================================================================
// Types
// ============================================================================

export interface ModelLoaderProps {
  /** URL of the GLTF/GLB model to load */
  modelUrl: string | null;
  /** Callback when loading starts */
  onLoadingStart?: () => void;
  /** Callback when loading completes */
  onLoadingComplete?: () => void;
  /** Callback with progress (0-100) */
  onProgress?: (progress: number) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Auto-center the model (default: true) */
  autoCenter?: boolean;
  /** Auto-scale to fit view (default: true) */
  autoScale?: boolean;
  /** Maximum model dimension (default: 8) */
  maxDimension?: number;
  /** Asset-mesh bindings from the store or external source */
  bindings?: AssetMeshBinding[];
}

// ============================================================================
// Helper: Compute bounding box of the entire scene
// ============================================================================

function computeSceneBounds(object: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) {
          const meshBox = mesh.geometry.boundingBox.clone();
          meshBox.applyMatrix4(mesh.matrixWorld);
          box.union(meshBox);
        }
      }
    }
  });
  return box;
}

// ============================================================================
// Helper: Apply binding properties to a mesh
// ============================================================================

function applyBindingToMesh(mesh: THREE.Mesh, binding: AssetMeshBinding) {
  if (!mesh) return;
  if (binding.isVisible === false) {
    mesh.visible = false;
  }
  if (binding.colorOverride) {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat && mat.color) {
      mat.color.set(binding.colorOverride);
    }
  }
  // Store binding reference on the mesh for runtime access
  (mesh as THREE.Mesh & { __binding?: AssetMeshBinding }).__binding = binding;
}

// ============================================================================
// Sub-component: Processed model scene graph
// ============================================================================

interface ProcessedModelProps {
  scene: THREE.Group;
  bindings: AssetMeshBinding[];
  maxDimension: number;
  autoCenter: boolean;
  autoScale: boolean;
}

function ProcessedModel({ scene, bindings, maxDimension, autoCenter, autoScale }: ProcessedModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Build a lookup map from binding meshName → binding
  const bindingMap = useMemo(() => {
    const map = new Map<string, AssetMeshBinding>();
    for (const b of bindings) {
      map.set(b.meshName, b);
    }
    return map;
  }, [bindings]);

  // Collect interactive and static meshes from the scene
  const { interactiveMeshes, staticMeshes } = useMemo(() => {
    const interactive: Array<{ mesh: THREE.Mesh; binding: AssetMeshBinding }> = [];
    const staticList: THREE.Mesh[] = [];

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      const binding = bindingMap.get(mesh.name);
      if (binding) {
        applyBindingToMesh(mesh, binding);
        interactive.push({ mesh, binding });
      } else {
        staticList.push(mesh);
      }
    });

    return { interactiveMeshes: interactive, staticMeshes: staticList };
  }, [scene, bindingMap]);

  // Auto-scale and center on mount
  useEffect(() => {
    if (!autoScale && !autoCenter) return;

    const bounds = computeSceneBounds(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scale = autoScale ? maxDimension / maxDim : 1;

    if (groupRef.current) {
      groupRef.current.scale.setScalar(scale);
      if (autoCenter) {
        groupRef.current.position.sub(center.multiplyScalar(scale));
      }
    }
  }, [scene, autoCenter, autoScale, maxDimension]);

  return (
    <group ref={groupRef}>
      {/* Render interactive meshes with binding behavior */}
      {interactiveMeshes.map(({ mesh, binding }) => (
        <InteractiveMesh
          key={`${binding.meshName}-${binding.assetId}`}
          mesh={mesh}
          binding={binding}
        />
      ))}

      {/* Render static (non-bound) meshes normally */}
      {staticMeshes.map((mesh) => (
        <primitive
          key={`static-${mesh.uuid}`}
          object={mesh}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

// ============================================================================
// Loading fallback inside Canvas
// ============================================================================

function CanvasLoadingIndicator() {
  return null; // Handled by the parent Suspense boundary
}

// ============================================================================
// Main ModelLoader Component
// ============================================================================

export function ModelLoader({
  modelUrl,
  onLoadingStart,
  onLoadingComplete,
  onProgress,
  onError,
  autoCenter = true,
  autoScale = true,
  maxDimension = 8,
  bindings: externalBindings,
}: ModelLoaderProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Use external bindings if provided, otherwise empty
  const bindings = externalBindings ?? [];

  // Track loading state
  useEffect(() => {
    if (modelUrl) {
      onLoadingStart?.();
      setLoadingProgress(0);
      setLocalError(null);
    }
  }, [modelUrl, onLoadingStart]);

  // Report error via callback (in effect to avoid side-effect during render)
  useEffect(() => {
    if (localError) onError?.(new Error(localError));
  }, [localError, onError]);

  // ── Empty state when no model URL ─────────────────────────────────────────

  if (!modelUrl) {
    return (
      <group>
        {/* Render an empty state indicator — a wireframe box placeholder */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[2, 1, 2]} />
          <meshStandardMaterial
            color="#333340"
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
      </group>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (localError) {
    return null;
  }

  // ── Loading GLTF with useGLTF (drei) ─────────────────────────────────────

  // We use a wrapper component to keep useGLTF in the Canvas tree
  return (
    <Suspense fallback={<CanvasLoadingIndicator />}>
      <GLTFModelLoaderInner
        modelUrl={modelUrl}
        bindings={bindings}
        autoCenter={autoCenter}
        autoScale={autoScale}
        maxDimension={maxDimension}
        onLoadingComplete={onLoadingComplete}
        onProgress={onProgress}
        onError={(err) => {
          setLocalError(err.message);
          onError?.(err);
        }}
      />
    </Suspense>
  );
}

// ============================================================================
// Inner component that uses useGLTF (must be inside Canvas + Suspense)
// ============================================================================

interface GLTFModelLoaderInnerProps {
  modelUrl: string;
  bindings: AssetMeshBinding[];
  autoCenter: boolean;
  autoScale: boolean;
  maxDimension: number;
  onLoadingComplete?: () => void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

function GLTFModelLoaderInner({
  modelUrl,
  bindings,
  autoCenter,
  autoScale,
  maxDimension,
  onLoadingComplete,
  onProgress,
  onError,
}: GLTFModelLoaderInnerProps) {
  // useGLTF handles loading with proper Suspense integration
  // Suspense will catch errors — no try/catch needed around hooks
  const gltf = useGLTF(modelUrl);
  const scene = gltf.scene;

  // All hooks must be called before any early returns
  // Clone to avoid shared references
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    onLoadingComplete?.();
    onProgress?.(100);
  }, [onLoadingComplete, onProgress]);

  if (!scene) {
    onError?.(new Error('GLTF scene is empty'));
    return null;
  }

  return (
    <ProcessedModel
      scene={clonedScene}
      bindings={bindings}
      maxDimension={maxDimension}
      autoCenter={autoCenter}
      autoScale={autoScale}
    />
  );
}

export default ModelLoader;
