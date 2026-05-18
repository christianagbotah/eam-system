# Phase 8A: DnD Kanban Upgrade — Work Record

## Task ID: phase8a
## Agent: Frontend Enhancement Agent
## Task: Upgrade PlannerWorkbench with real drag-and-drop Kanban using @dnd-kit

---

## Work Log

### 1. Package Installation
- Installed `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`
- Verified all required exports are available: DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent, DragEndEvent, DragOverEvent, SortableContext, useSortable, verticalListSortingStrategy, UniqueIdentifier, CSS

### 2. New Imports Added (lines 44-61)
- `@dnd-kit/core`: DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay, type DragStartEvent, type DragEndEvent, type DragOverEvent
- `@dnd-kit/sortable`: SortableContext, useSortable, verticalListSortingStrategy, type UniqueIdentifier
- `@dnd-kit/utilities`: CSS (for transform string conversion)
- Added `useRef` to React imports

### 3. DnD State Variables Added (lines 160-163)
- `activeId`: tracks the currently dragged item
- `localKanbanData`: local copy of kanban data that updates in real-time during DnD
- `dndApiCalledRef`: prevents duplicate API calls during drag events

### 4. DnD Helper Functions (lines 336-381)
- `findColumnForId(id)`: finds which Kanban column a WO belongs to
- `findWOById(id)`: finds the WO data object for DragOverlay rendering
- `useEffect` to sync local kanban data from `kanbanData` when source data changes

### 5. DnD Event Handlers (lines 383-497)
- **PointerSensor** with 8px activation distance (prevents accidental drags on click)
- **handleDragStart**: sets activeId, resets API call guard
- **handleDragOver**: moves items between columns in local state during drag
  - Same-column: reorder by splicing before over item
  - Cross-column: remove from source, insert before over item in destination
- **handleDragEnd**: commits the move
  - If cross-column: calls appropriate API endpoint based on target column
    - `in_progress` → POST `/api/work-orders/[id]/start`
    - `pending_review` → POST `/api/work-orders/[id]/complete`
    - `completed` → POST `/api/work-orders/[id]/complete`
    - `assigned` → POST `/api/work-orders/[id]/assign`
    - `approved` → just refresh (no specific API)
  - Shows success/error toast
  - Reverts on failure by refreshing data

### 6. Kanban Columns Replaced with DnD-enabled version (lines 653-690)
- Wrapped in `<DndContext>` with sensors, collision detection, and handlers
- Each column rendered via `<KanbanColumn>` component
- `<DragOverlay>` shows the card being dragged with rotation effect and enhanced styling

### 7. New Component: SortableWorkOrderCard (lines 1199-1235)
- Uses `useSortable` hook for DnD tracking
- Renders a drag handle (`GripVertical` icon) with grab cursor
- Wraps the existing `WOCard` component
- Applies CSS transform and transition for smooth movement
- Sets opacity to 0.4 while being dragged (original ghost)

### 8. New Component: KanbanColumn (lines 1241-1285)
- Wraps each column with `<SortableContext>` using `verticalListSortingStrategy`
- Passes item IDs as sortable identifiers
- Shows "Drop work orders here" in empty columns
- Preserves all original column styling (header, scroll area, border)

### 9. Enhanced WOCard Component (line 1148)
- Added optional `isDragging` prop
- When dragging: enhanced shadow, emerald ring, larger visual presence
- Used by DragOverlay for the floating drag preview

### 10. Preserved Functionality
- Stats bar (Open WOs, In Progress, Awaiting Planning, Overdue, Completed MTD)
- Planning Queue panel (left side, not draggable)
- Technician Capacity panel (right side, not draggable)
- All tab content (Work Packages, Backlog Aging, Shutdown Coordination)
- WO Detail Sheet, Create WO Dialog, Work Package Dialog
- Card selection toggle, search/filter

---

## Quality
- ESLint passes with zero errors on PlannerWorkbench.tsx
- No existing functionality broken
- DnD only applies to Kanban Board tab (not other tabs)
- Planning queue and capacity panels remain non-draggable as specified
