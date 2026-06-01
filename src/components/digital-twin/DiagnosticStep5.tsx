'use client';

import React, { Suspense, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';
import { useDigitalTwinScene, useCameraControls } from '@/hooks/useDigitalTwin';
import { SceneLighting } from './SceneLighting';
import { GroundPlane } from './GroundPlane';
import { ExplodedView } from './ExplodedView';
import { SectionPlane } from './SectionPlane';
import { IoTOverlayLayer } from './IoTOverlayLayer';
import { HotspotLayer } from './HotspotLayer';
import { AnnotationLayer } from './AnnotationLayer';

/**
 * Diagnostic Step 5 — Binary search for Error #185
 *
 * Level: ALL Canvas children from DigitalTwinViewer (except ModelLoader which
 * requires a model URL). Includes:
 *   - Suspense wrapper with fallback
 *   - CameraController (useCameraControls inside R3F)
 *   - SceneLighting (with Environment HDRI loader)
 *   - GroundPlane (subscribes to currentScene, returns null when no scene)
 *   - ExplodedView (useFrame + gated rAF loop)
 *   - SectionPlane (returns null when sectionMode is false)
 *   - IoTOverlayLayer (returns null when iotOverlayEnabled is false)
 *   - HotspotLayer (returns null when hotspots is empty)
 *   - AnnotationLayer (returns null when annotations is empty)
 *   - BackgroundClickHandler (THREE.BackSide sphere with onClick)
 *   - Preload all
 *   - AdaptiveDpr + AdaptiveEvents
 *
 * PURPOSE:
 *   If this CRASHES → one of these Canvas children is the culprit
 *   If this WORKS → the culprit is in the outer JSX (TwinToolbar, SceneTreePanel, etc.)
 */
export function DiagnosticStep5() {
  // ── Store state (ALL 12 selectors from DigitalTwinViewer) ──────────────
  const currentScene = useDigitalTwinStore((s) => s.currentScene);
  const modelUrl = useDigitalTwinStore((s) => s.modelUrl);
  const sceneError = useDigitalTwinStore((s) => s.sceneError);
  const isLoadingScene = useDigitalTwinStore((s) => s.isLoadingScene);
  const isInfoPanelOpen = useDigitalTwinStore((s) => s.isInfoPanelOpen);
  const selectedMeshName = useDigitalTwinStore((s) => s.selectedMeshName);
  const selectedAssetId = useDigitalTwinStore((s) => s.selectedAssetId);
  const loadScene = useDigitalTwinStore((s) => s.loadScene);
  const selectMesh = useDigitalTwinStore((s) => s.selectMesh);
  const setInfoPanelOpen = useDigitalTwinStore((s) => s.setInfoPanelOpen);
  const setModelUrl = useDigitalTwinStore((s) => s.setModelUrl);
  const reset = useDigitalTwinStore((s) => s.reset);
  const loadAssetData = useDigitalTwinStore((s) => s.loadAssetData);

  // ── Custom hooks (same as DigitalTwinViewer) ───────────────────────────
  const { resetCamera } = useCameraControls();
  const { error: hookError, refresh } = useDigitalTwinScene(null, {
    iotPollInterval: 15000,
  });

  // ── useEffect for loadAssetData (same as DigitalTwinViewer) ────────────
  useEffect(() => {
    const assetId = selectedAssetId ?? currentScene?.assetId;
    if (assetId) {
      loadAssetData(assetId);
    }
  }, [selectedAssetId, currentScene?.assetId, loadAssetData]);

  // ── Same local state as DigitalTwinViewer ──────────────────────────────
  const [isTreeOpen, setIsTreeOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isResolvingScene, setIsResolvingScene] = useState(false);
  const [resolvedModelUrl, setResolvedModelUrl] = useState<string | null>(null);
  const [hasNoScenes, setHasNoScenes] = useState(false);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Same Canvas config as DigitalTwinViewer ────────────────────────────
  const glConfig = useMemo(
    () => ({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance' as const,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.0,
      outputColorSpace: THREE.SRGBColorSpace,
    }),
    [],
  );

  const dprValue = useMemo<[number, number]>(() => [1, 2], []);

  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    canvasRef.current = gl.domElement;
    gl.setClearColor('#0a0a12');
    gl.localClippingEnabled = true;
  }, []);

  // ── effectiveModelUrl (same as DigitalTwinViewer) ─────────────────────
  const effectiveModelUrl = null; // No props passed — no model to load

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: 'calc(100vh - 120px)',
        background: 'linear-gradient(135deg, #0a0a12 0%, #0d0d1a 50%, #0a0f14 100%)',
      }}
    >
      {/* ── Full Canvas — ALL children from DigitalTwinViewer ─────────── */}
      <Canvas
        shadows
        dpr={dprValue}
        gl={glConfig}
        style={{ background: '#0a0a12' }}
        onCreated={handleCreated}
      >
        <Suspense fallback={null}>
          {/* Camera Controller (replaces plain OrbitControls) */}
          <CameraController />

          {/* ALL scene children from DigitalTwinViewer */}
          <SceneLighting />
          <GroundPlane />
          <ExplodedView bindings={[]} />
          <SectionPlane />
          <IoTOverlayLayer />
          <HotspotLayer />
          <AnnotationLayer />
          <BackgroundClickHandler />
          <Preload all />
        </Suspense>

        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
      </Canvas>

      {/* ── Diagnostic overlay ────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-1.5"
        style={{
          background: 'rgba(10,10,18,0.7)',
          borderTop: '1px solid rgba(148,163,184,0.06)',
        }}
      >
        <span style={{ color: '#888', fontSize: 12 }}>
          Step 5: ALL Canvas children (CameraController, SceneLighting, GroundPlane, ExplodedView, etc.)
        </span>
        <span style={{ color: hookError ? '#f87171' : '#34d399', fontSize: 12, fontFamily: 'monospace' }}>
          {hookError ? 'ERROR: ' + hookError : 'STATUS: OK'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Camera Controller (R3F component inside Canvas) — same as DigitalTwinViewer
// ============================================================================

function CameraController() {
  const { cameraPosition, cameraTarget, isTransitioning } = useCameraControls();
  const controlsRef = useRef<any>(null);
  const positionRef = useRef(cameraPosition);
  const targetRef = useRef(cameraTarget);
  const transitioningRef = useRef(isTransitioning);

  positionRef.current = cameraPosition;
  targetRef.current = cameraTarget;
  transitioningRef.current = isTransitioning;

  useEffect(() => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    const target = targetRef.current;
    const position = positionRef.current;
    ctrl.target.set(target[0], target[1], target[2]);
    ctrl.object.position.set(position[0], position[1], position[2]);
    ctrl.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={1}
      maxDistance={100}
      maxPolarAngle={Math.PI * 0.85}
      enablePan
      enableZoom
      enableRotate
    />
  );
}

// ============================================================================
// Background Click Handler — same as DigitalTwinViewer
// ============================================================================

function BackgroundClickHandler() {
  const selectMesh = useDigitalTwinStore((s) => s.selectMesh);
  const setInfoPanelOpen = useDigitalTwinStore((s) => s.setInfoPanelOpen);

  return (
    <mesh
      visible={false}
      position={[0, 0, 0]}
      onClick={() => {
        setTimeout(() => {
          selectMesh(null, null);
          setInfoPanelOpen(false);
        }, 0);
      }}
    >
      <sphereGeometry args={[200, 16, 16]} />
      <meshBasicMaterial side={THREE.BackSide} />
    </mesh>
  );
}

DiagnosticStep5.displayName = 'DiagnosticStep5';
export default DiagnosticStep5;
