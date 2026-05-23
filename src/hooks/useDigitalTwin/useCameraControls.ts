'use client';

import React, { useCallback, useRef } from 'react';
import { useDigitalTwinStore, type CameraPreset } from '@/stores/digitalTwinStore';

// ============================================================================
// Types
// ============================================================================

/** 3D vector (x, y, z) */
type Vec3 = [number, number, number];

/** Return type for useCameraControls */
export interface UseCameraControlsReturn {
  /** Current camera position */
  cameraPosition: Vec3;
  /** Current camera look-at target */
  cameraTarget: Vec3;
  /** Whether a camera transition is in progress */
  isTransitioning: boolean;
  /** Currently active camera preset name (null if free camera) */
  cameraPreset: string | null;
  /** Available camera presets from the current scene */
  cameraPresets: CameraPreset[];
  /** Smoothly animate camera to focus on a specific mesh position */
  focusOnMesh: (meshPosition: Vec3, meshBounds?: { radius: number }) => void;
  /** Move to a named camera preset */
  goToPreset: (presetName: string) => void;
  /** Reset camera to default home position */
  resetCamera: () => void;
  /** Mark the camera transition as complete (called by the 3D renderer) */
  onTransitionComplete: () => void;
  /** Manually update the camera position (without animation) */
  setCameraPosition: (pos: Vec3) => void;
  /** Manually update the camera target (without animation) */
  setCameraTarget: (target: Vec3) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_POSITION: Vec3 = [5, 5, 5];
const DEFAULT_TARGET: Vec3 = [0, 0, 0];
const FOCUS_OFFSET_MULTIPLIER = 2.5;
const MIN_FOCUS_DISTANCE = 2;
const LERP_SPEED = 0.08;
const LERP_THRESHOLD = 0.01;

// ============================================================================
// Math Helpers
// ============================================================================

/** Linear interpolation between two values */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Compute distance between two 3D points */
function distance3D(a: Vec3, b: Vec3): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2);
}

/** Lerp between two 3D vectors */
function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Add two 3D vectors */
function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Subtract two 3D vectors */
function subVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** Scale a 3D vector */
function scaleVec3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/** Normalize a 3D vector */
function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

// ============================================================================
// Animation Frame Driver
// ============================================================================

interface AnimationFrame {
  id: number;
  fromPosition: Vec3;
  toPosition: Vec3;
  fromTarget: Vec3;
  toTarget: Vec3;
  startTime: number;
  duration: number; // ms
}

/**
 * Manages a single camera animation via requestAnimationFrame.
 * Returns a cancel function.
 */
function animateCamera(
  frame: AnimationFrame,
  onFrame: (position: Vec3, target: Vec3, done: boolean) => void,
): () => void {
  let cancelled = false;

  function step(timestamp: number) {
    if (cancelled) return;

    const elapsed = timestamp - frame.startTime;
    // Ease-out cubic
    let t = Math.min(elapsed / frame.duration, 1);
    t = 1 - Math.pow(1 - t, 3);

    const position = lerpVec3(frame.fromPosition, frame.toPosition, t);
    const target = lerpVec3(frame.fromTarget, frame.toTarget, t);
    const done = t >= 1;

    onFrame(position, target, done);

    if (!done) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);

  return () => {
    cancelled = true;
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useCameraControls
 *
 * Provides camera management functions including smooth animated transitions,
 * preset navigation, mesh focus, and reset functionality.
 *
 * Uses requestAnimationFrame with cubic ease-out interpolation for smooth
 * camera transitions without external animation library dependencies.
 */
export function useCameraControls(): UseCameraControlsReturn {
  // Store state & actions
  const cameraPosition = useDigitalTwinStore((s) => s.cameraPosition);
  const cameraTarget = useDigitalTwinStore((s) => s.cameraTarget);
  const cameraPreset = useDigitalTwinStore((s) => s.cameraPreset);
  const isTransitioning = useDigitalTwinStore((s) => s.isTransitioning);
  const currentScene = useDigitalTwinStore((s) => s.currentScene);
  const setCameraPosition = useDigitalTwinStore((s) => s.setCameraPosition);
  const setCameraTarget = useDigitalTwinStore((s) => s.setCameraTarget);
  const storeGoToPreset = useDigitalTwinStore((s) => s.goToPreset);

  // Ref to track the current animation cancel function
  const cancelAnimationRef = useRef<(() => void) | null>(null);

  // Ref to track the latest position/target — always read from store inside callbacks
  // to avoid React ref-during-render errors

  // Available presets from scene
  const cameraPresets: CameraPreset[] = currentScene?.cameraPresets ?? [];

  // ──────────────────────────────────────────────────────────────────────
  // Cancel any running animation
  // ──────────────────────────────────────────────────────────────────────

  const cancelCurrentAnimation = useCallback(() => {
    if (cancelAnimationRef.current) {
      cancelAnimationRef.current();
      cancelAnimationRef.current = null;
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────
  // Transition Complete Callback
  // ──────────────────────────────────────────────────────────────────────

  const onTransitionComplete = useCallback(() => {
    useDigitalTwinStore.setState({ isTransitioning: false }, false, 'digitalTwin/cameraTransitionComplete');
  }, []);

  // ──────────────────────────────────────────────────────────────────────
  // Focus on a Mesh
  // ──────────────────────────────────────────────────────────────────────

  const focusOnMesh = useCallback(
    (meshPosition: Vec3, meshBounds?: { radius: number }) => {
      cancelCurrentAnimation();

      const radius = meshBounds?.radius ?? 1;
      const distance = Math.max(radius * FOCUS_OFFSET_MULTIPLIER, MIN_FOCUS_DISTANCE);

      // Compute a camera position that looks at the mesh from an elevated angle
      const currentCamPosition = useDigitalTwinStore.getState().cameraPosition;
      const direction = normalizeVec3(subVec3(currentCamPosition, meshPosition));
      const newPosition = addVec3(meshPosition, scaleVec3(direction, distance));
      // Offset upward slightly for a better viewing angle
      newPosition[1] += distance * 0.3;

      const fromPosition = useDigitalTwinStore.getState().cameraPosition;
      const fromTarget = useDigitalTwinStore.getState().cameraTarget;
      const duration = 800; // ms

      cancelAnimationRef.current = animateCamera(
        {
          id: Date.now(),
          fromPosition,
          toPosition: newPosition,
          fromTarget,
          toTarget: meshPosition,
          startTime: performance.now(),
          duration,
        },
        (position, target, done) => {
          // Wrap in startTransition to avoid Error #185:
          // rAF callbacks fire outside React's render cycle and can
          // collide with concurrent rendering of other components.
          React.startTransition(() => {
            setCameraPosition(position);
            setCameraTarget(target);
          });
          if (done) {
            onTransitionComplete();
          }
        },
      );

      useDigitalTwinStore.setState(
        { isTransitioning: true, cameraPreset: null },
        false,
        'digitalTwin/focusOnMesh',
      );
    },
    [cancelCurrentAnimation, setCameraPosition, setCameraTarget, onTransitionComplete],
  );

  // ──────────────────────────────────────────────────────────────────────
  // Go to Preset
  // ──────────────────────────────────────────────────────────────────────

  const goToPreset = useCallback(
    (presetName: string) => {
      const preset = cameraPresets.find((p) => p.name === presetName);
      if (!preset) return;

      cancelCurrentAnimation();

      const fromPosition = useDigitalTwinStore.getState().cameraPosition;
      const fromTarget = useDigitalTwinStore.getState().cameraTarget;
      const duration = 1000; // ms

      cancelAnimationRef.current = animateCamera(
        {
          id: Date.now(),
          fromPosition,
          toPosition: preset.position,
          fromTarget,
          toTarget: preset.target,
          startTime: performance.now(),
          duration,
        },
        (position, target, done) => {
          React.startTransition(() => {
            setCameraPosition(position);
            setCameraTarget(target);
          });
          if (done) {
            onTransitionComplete();
          }
        },
      );

      useDigitalTwinStore.setState(
        { isTransitioning: true, cameraPreset: presetName },
        false,
        'digitalTwin/goToPreset:animate',
      );
    },
    [cameraPresets, cancelCurrentAnimation, setCameraPosition, setCameraTarget, onTransitionComplete],
  );

  // ──────────────────────────────────────────────────────────────────────
  // Reset Camera
  // ──────────────────────────────────────────────────────────────────────

  const resetCamera = useCallback(() => {
    cancelCurrentAnimation();

    const fromPosition = useDigitalTwinStore.getState().cameraPosition;
    const fromTarget = useDigitalTwinStore.getState().cameraTarget;
    const duration = 1200; // ms

    cancelAnimationRef.current = animateCamera(
      {
        id: Date.now(),
        fromPosition,
        toPosition: DEFAULT_POSITION,
        fromTarget,
        toTarget: DEFAULT_TARGET,
        startTime: performance.now(),
        duration,
      },
      (position, target, done) => {
        React.startTransition(() => {
          setCameraPosition(position);
          setCameraTarget(target);
        });
        if (done) {
          onTransitionComplete();
        }
      },
    );

    useDigitalTwinStore.setState(
      { isTransitioning: true, cameraPreset: null },
      false,
      'digitalTwin/resetCamera',
    );
  }, [cancelCurrentAnimation, setCameraPosition, setCameraTarget, onTransitionComplete]);

  // ──────────────────────────────────────────────────────────────────────
  // Direct Setters (no animation)
  // ──────────────────────────────────────────────────────────────────────

  const directSetPosition = useCallback(
    (pos: Vec3) => {
      cancelCurrentAnimation();
      setCameraPosition(pos);
    },
    [cancelCurrentAnimation, setCameraPosition],
  );

  const directSetTarget = useCallback(
    (target: Vec3) => {
      cancelCurrentAnimation();
      setCameraTarget(target);
    },
    [cancelCurrentAnimation, setCameraTarget],
  );

  return {
    cameraPosition,
    cameraTarget,
    isTransitioning,
    cameraPreset,
    cameraPresets,
    focusOnMesh,
    goToPreset,
    resetCamera,
    onTransitionComplete,
    setCameraPosition: directSetPosition,
    setCameraTarget: directSetTarget,
  };
}
