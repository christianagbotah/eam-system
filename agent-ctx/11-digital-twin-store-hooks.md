# Task ID: 11 — Digital Twin Zustand Store & Custom Hooks

## Agent: State Management & Hooks Layer

## Summary

Created the complete state management and hooks layer for the Digital Twin Visualization system in the iAssetsPro EAM project. All files pass ESLint with zero errors, and the dev server compiles successfully.

---

## Files Created

### 1. `src/stores/digitalTwinStore.ts`

Comprehensive Zustand store with `devtools` middleware (enabled in development only). Manages all digital twin viewer state:

**Exported Types:**
- `MeshHealthEntry` — health score per mesh (score 0-100, status: healthy/warning/critical/unknown)
- `LiveReading` — live IoT reading value, unit, timestamp
- `CameraPreset` — named camera position + target + optional FOV
- `DigitalTwinScene` — scene data with model URL, presets, hotspots, annotations
- `DigitalTwinHotspot` — pinned hotspot with position, type, link
- `DigitalTwinAnnotation` — text annotation with position and author
- `SectionAxis` — `'x' | 'y' | 'z'` union type
- `DigitalTwinState` — full store interface

**State Domains (all with typed interfaces):**
| Domain | Key State Fields |
|--------|-----------------|
| Scene | `currentSceneId`, `currentScene`, `isLoadingScene`, `sceneError` |
| Model | `modelUrl`, `modelLoading`, `modelError` |
| Selection | `selectedMeshName`, `selectedAssetId`, `selectedAsset`, `hoveredMeshName`, `isInfoPanelOpen` |
| Camera | `cameraPosition`, `cameraTarget`, `cameraPreset`, `isTransitioning` |
| Exploded View | `explodeMode`, `explodeProgress` (0-1), `explodeAssemblyId` |
| Section/Isolation | `sectionMode`, `sectionAxis`, `sectionPosition` (-1 to 1), `isolationAssetId` |
| IoT Overlay | `iotOverlayEnabled`, `iotHealthMap`, `liveReadings` |
| Hotspots | `hotspotsVisible`, `activeHotspotId` |
| Annotations | `annotationsVisible` |
| Asset Data | `assetWorkOrders`, `assetIoTDevices`, `assetPmSchedules`, `assetBomChildren`, `assetAttachments`, `isLoadingAssetData` |

**Actions (26 total):**
- `setScene`, `loadScene` — scene loading with error handling
- `setModelUrl` — model URL management
- `selectMesh`, `hoverMesh` — mesh interaction
- `setCameraPosition`, `setCameraTarget`, `goToPreset` — camera control
- `toggleExplodeMode`, `setExplodeProgress`, `setExplodeAssembly` — exploded view
- `toggleSectionMode`, `setSectionAxis`, `setSectionPosition`, `isolateAsset` — section/isolation
- `toggleIoTOverlay`, `updateHealthMap`, `updateLiveReading` — IoT overlay
- `toggleHotspots`, `toggleAnnotations` — visibility toggles
- `setInfoPanelOpen` — info panel
- `loadAssetData` — parallel asset data loading (5 API calls)
- `reset` — full state reset to initial values

**Design Patterns:**
- All actions use descriptive devtools action names (e.g., `'digitalTwin/setScene'`)
- `loadAssetData` uses `Promise.all` with individual `.catch()` fallbacks for graceful degradation
- `isolateAsset` auto-clears section and explode modes
- `setExplodeProgress` and `setSectionPosition` include clamping
- State shape defined via `DigitalTwinStateData` interface to avoid inline type assertions

---

### 2. `src/hooks/useDigitalTwin/useDigitalTwinScene.ts`

**`useDigitalTwinScene(sceneId, options?)`** — Scene lifecycle hook

**Features:**
- Automatic scene loading when `sceneId` changes
- Configurable IoT polling interval (default: 15s, set to 0 to disable)
- WebSocket subscription for real-time IoT reading and health updates
- Manual refresh function
- Proper cleanup on unmount and scene change

**Options:**
- `iotPollInterval?: number` — polling frequency in ms
- `enableRealtime?: boolean` — enable/disable WebSocket subscriptions

**Returns:** `{ scene, isLoading, error, refresh, isPolling, refreshCount }`

**API Integration:**
- Fetches scene from `/api/digital-twins/{sceneId}`
- Polls `/api/iot/monitoring/summary` for IoT device readings
- Derives health scores from device status (online→healthy, warning→warning, error→critical)
- Listens to `iot:reading-update` and `iot:health-update` WebSocket events

---

### 3. `src/hooks/useDigitalTwin/useMeshInteraction.ts`

**`useMeshInteraction()`** — Mesh click/hover interaction hook

**Features:**
- `handleMeshClick(mesh)` — selects mesh, opens info panel, or deselects on empty click
- `handleMeshHover(mesh)` — 30ms debounced hover to avoid excessive re-renders
- `handleMeshLeave()` — clears hover state immediately
- Toggle behavior: clicking same mesh toggles info panel
- Skips invisible meshes

**Returns:** `{ selectedMeshName, selectedAssetId, hoveredMeshName, isInfoPanelOpen, handleMeshClick, handleMeshHover, handleMeshLeave, closeInfoPanel, toggleInfoPanel }`

**Exported Types:**
- `MeshMeta` — mesh metadata (name, assetId, visible)
- `UseMeshInteractionReturn`

---

### 4. `src/hooks/useDigitalTwin/useCameraControls.ts`

**`useCameraControls()`** — Camera animation and management hook

**Features:**
- `focusOnMesh(meshPosition, meshBounds?)` — smooth zoom to mesh with elevated angle offset
- `goToPreset(presetName)` — animated transition to named camera preset from scene
- `resetCamera()` — animated return to default home position (1.2s)
- `onTransitionComplete()` — marks transition done (called by 3D renderer)
- Direct setters (cancel animation on set)

**Animation System:**
- Pure `requestAnimationFrame` with cubic ease-out interpolation
- No external animation library dependency
- Proper cancellation of in-flight animations on new request
- Variable duration: 800ms (focus), 1000ms (preset), 1200ms (reset)
- All camera position/target read from `useDigitalTwinStore.getState()` to avoid stale closure issues

**Math Helpers (module-private):**
- `lerp`, `distance3D`, `lerpVec3`, `addVec3`, `subVec3`, `scaleVec3`, `normalizeVec3`

**Returns:** `{ cameraPosition, cameraTarget, isTransitioning, cameraPreset, cameraPresets, focusOnMesh, goToPreset, resetCamera, onTransitionComplete, setCameraPosition, setCameraTarget }`

**Exported Types:**
- `UseCameraControlsReturn`

---

### 5. `src/hooks/useDigitalTwin/index.ts`

Barrel export file re-exporting all hooks and their types:
- `useDigitalTwinScene`, `UseDigitalTwinSceneOptions`, `UseDigitalTwinSceneReturn`
- `useMeshInteraction`, `MeshMeta`, `UseMeshInteractionReturn`
- `useCameraControls`, `UseCameraControlsReturn`

---

## Quality

- **ESLint:** Zero errors across all 5 files
- **TypeScript:** All files fully typed with explicit interfaces
- **Dev Server:** Compiles successfully (HTTP 200, ready in 785ms)
- **Patterns:** Follows existing project conventions (api import, store structure, hook patterns)
- **React Compliance:** No ref access during render, inline arrow function in useCallback, proper cleanup in useEffect
