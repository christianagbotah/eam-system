# Task 3-7: 3D Digital Twin Viewer Components

## Agent: Frontend 3D Developer

## Summary

Built 13 production-quality React Three Fiber components for the iAssetsPro EAM Digital Twin Viewer. All components follow the enterprise-grade Siemens Teamcenter / AVEVA design language with dark theme, glass-morphism toolbars, and industrial aesthetics.

## Files Created (13 components + 1 barrel export)

### 3D Scene Components (rendered inside Canvas)
1. **`SceneLighting.tsx`** — Ambient + directional + hemisphere + optional spotlight + HDRI Environment preset. Subtle directional light animation.
2. **`GroundPlane.tsx`** — Infinite grid from drei + contact shadows. Toggleable from store.
3. **`ModelLoader.tsx`** — GLTF/GLB loading via `useGLTF` from drei. Traverses scene graph, matches meshes to `AssetMeshBinding`, auto-center/scale. Suspense-aware inner component.
4. **`InteractiveMesh.tsx`** — Per-frame material color lerping for selection/hover/IoT health overlay. Uses drei `<Edges>` for outlines. `<Html>` for telemetry labels and hotspot indicators.
5. **`IoTOverlayLayer.tsx`** — Health color overlay (red/amber/green) with CSS pulse animations. Live telemetry badges via `<Html>`.
6. **`SectionPlane.tsx`** — Three.js clipping plane with axis selector UI (X/Y/Z), position slider, visible plane mesh. Per-frame clipping plane application.
7. **`ExplodedView.tsx`** — Headless component that lerps mesh positions based on `explodeOffset` from bindings. Per-assembly explosion support. Smooth ease-out animation.
8. **`HotspotLayer.tsx`** — Clickable 3D hotspot pins with type-based styling (info/warning/critical/link). CSS pulse for critical.
9. **`AnnotationLayer.tsx`** — Floating annotation pins with author/date metadata, hover-reveal cards.

### UI Overlay Components (positioned absolute outside Canvas)
10. **`TwinToolbar.tsx`** — Floating top-center toolbar with glass-morphism (backdrop-blur). 9 buttons: Exploded View, Section, IoT, Hotspots, Annotations, Reset Camera, Screenshot, Fullscreen. Active state highlighting (cyan). Keyboard shortcut badges.
11. **`SceneTreePanel.tsx`** — Collapsible 280px left panel. Searchable tree of mesh names with health status dots. Click-to-select and focus.
12. **`ComponentInfoPanel.tsx`** — Sliding 380px right panel with 5 tabs: Overview (asset details, condition, criticality), Maintenance (work orders + PM schedules), IoT/Sensors (device readings, threshold progress bars, trend indicators), BOM/Parts (component list), Documents (file type icons, download buttons).

### Orchestrator
13. **`DigitalTwinViewer.tsx`** — Main viewer component wrapping everything. Canvas with shadows, ACES tone mapping, dpr=[1,2]. Loading/error/empty state overlays. Status bar. Integrates all sub-components. Screenshot and fullscreen support.
14. **`index.ts`** — Barrel export of all components and types.

## Technical Decisions

- **CSS animations instead of JS refs** for pulse/float effects to satisfy React hooks lint rules (`react-hooks/refs` — cannot access refs during render)
- **All hooks called before early returns** to satisfy `react-hooks/rules-of-hooks`
- **Fresh objects in useFrame** instead of mutating useMemo results to satisfy `react-hooks/immutability`
- **store.getState()** pattern in callbacks to avoid stale closures
- **`<primitive>` with events** for wrapping existing Three.js meshes with R3F interaction

## Integration Notes

- All components read from `useDigitalTwinStore` Zustand store
- Uses hooks from `src/hooks/useDigitalTwin/` (scene loading, mesh interaction, camera controls)
- Uses shadcn/ui components: Button, Badge, Tabs, Card, Progress, ScrollArea, Tooltip, Input, Separator
- Icons from `lucide-react`
- The `gl.localClippingEnabled = true` is set in the Canvas `onCreated` callback in DigitalTwinViewer.tsx (not in SectionPlane due to lint restrictions on mutating hook returns)

## Quality
- ESLint: 0 errors in `src/components/digital-twin/`
- TypeScript: Strict typing throughout
- Responsive design with Tailwind CSS
- Dark enterprise theme consistent with existing EAM app
