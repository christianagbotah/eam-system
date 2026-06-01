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
 * Diagnostic Step 7 — Binary search for Error #185
 *
 * Level: Step 6 + remaining R3F children (GroundPlane, ExplodedView,
 * SectionPlane, IoTOverlay, Hotspot, Annotation, BackgroundClickHandler)
 *
 * All of these subscribe to Zustand INSIDE the R3F reconciler via useDigitalTwinStore().
 * This creates cross-reconciler subscriptions that cascade when the outer
 * component's hooks (useDigitalTwinScene, useCameraControls) update the store.
 *
 * PURPOSE:
 *   If this CRASHES → the collective cross-reconciler Zustand subscriptions
 *     in these R3F children are the root cause.
 *   If this WORKS → something else in Step 5 was the problem (Preload? Suspense?)
 */
export function DiagnosticStep7() {
  // ── Store state (same 12 selectors) ──────────────────────────────────
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

  // ── Custom hooks ──────────────────────────────────────────────────────
  const { resetCamera } = useCameraControls();
  const { error: hookError, refresh } = useDigitalTwinScene(null, {
    iotPollInterval: 15000,
  });

  useEffect(() => {
    const assetId = selectedAssetId ?? currentScene?.assetId;
    if (assetId) {
      loadAssetData(assetId);
    }
  }, [selectedAssetId, currentScene?.assetId, loadAssetData]);

  // ── Local state ───────────────────────────────────────────────────────
  const [isTreeOpen, setIsTreeOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isResolvingScene, setIsResolvingScene] = useState(false);
  const [resolvedModelUrl, setResolvedModelUrl] = useState<string | null>(null);
  const [hasNoScenes, setHasNoScenes] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: 'calc(100vh - 120px)',
        background: 'linear-gradient(135deg, #0a0a12 0%, #0d0d1a 50%, #0a0f14 100%)',
      }}
    >
      <Canvas
        shadows
        dpr={dprValue}
        gl={glConfig}
        style={{ background: '#0a0a12' }}
        onCreated={handleCreated}
      >
        <Suspense fallback={null}>
          {/* From Step 6 — known working */}
          <CameraController />
          <SceneLighting />

          {/* Step 7 additions — remaining R3F children with Zustand subscriptions */}
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
          Step 7: + GroundPlane, ExplodedView, SectionPlane, IoT, Hotspot, Annotation, BgClick
        </span>
        <span style={{ color: hookError ? '#f87171' : '#34d399', fontSize: 12, fontFamily: 'monospace' }}>
          {hookError ? 'ERROR: ' + hookError : 'STATUS: OK'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Camera Controller — same as DigitalTwinViewer
// ============================================================================

function CameraController() {
  const { cameraPosition, cameraTarget, isTransitioning } = useCameraControls();
  const controlsRef = useRef<any>(null);
  const positionRef = useRef(cameraPosition);
  const targetRef = useRef(cameraTarget);

  positionRef.current = cameraPosition;
  targetRef.current = cameraTarget;

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

DiagnosticStep7.displayName = 'DiagnosticStep7';
export default DiagnosticStep7;
