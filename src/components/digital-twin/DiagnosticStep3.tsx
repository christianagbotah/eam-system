'use client';

import React, { Suspense, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';
import { useDigitalTwinScene, useCameraControls } from '@/hooks/useDigitalTwin';

/**
 * Diagnostic Step 3 — Binary search for Error #185
 *
 * Level: ALL Zustand hooks + Canvas wrapper (same props as DigitalTwinViewer)
 * Canvas has ONLY OrbitControls + green box (no other R3F children,
 * no AdaptiveDpr/AdaptiveEvents, no Suspense wrapper).
 *
 * PURPOSE:
 *   If this CRASHES → the 30+ Zustand selectors / custom hooks are the problem
 *   If this WORKS → the R3F children (AdaptiveDpr, AdaptiveEvents,
 *                   SceneLighting, GroundPlane, ExplodedView, etc.) are the problem
 */
export function DiagnosticStep3() {
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

  // ── useEffect for scene resolution (same as DigitalTwinViewer) ──────────
  useEffect(() => {
    // Returns early when sceneId is null (no twinId provided)
    return;
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: 'calc(100vh - 120px)',
        background: 'linear-gradient(135deg, #0a0a12 0%, #0d0d1a 50%, #0a0f14 100%)',
      }}
    >
      {/* ── Bare Canvas — same props as DigitalTwinViewer ──────────────── */}
      <Canvas
        shadows
        dpr={dprValue}
        gl={glConfig}
        style={{ background: '#0a0a12' }}
        onCreated={handleCreated}
      >
        <ambientLight intensity={0.5} />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="#22d3ee" />
        </mesh>
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={1} maxDistance={100} />

        {/* NOTE: No AdaptiveDpr, AdaptiveEvents, SceneLighting, GroundPlane,
            CameraController, ExplodedView, SectionPlane, IoTOverlayLayer,
            HotspotLayer, AnnotationLayer, BackgroundClickHandler, Preload,
            or Suspense — those are all removed for this diagnostic. */}
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
          Step 3: Zustand hooks + bare Canvas (no R3F children)
        </span>
        <span style={{ color: hookError ? '#f87171' : '#34d399', fontSize: 12, fontFamily: 'monospace' }}>
          {hookError ? 'ERROR: ' + hookError : 'STATUS: OK'}
        </span>
      </div>
    </div>
  );
}

DiagnosticStep3.displayName = 'DiagnosticStep3';
export default DiagnosticStep3;
