---
### UI Audit: Assets, Components, Parts, Assemblies, Diagrams, Digital Twins

**Scope:** AssetPages.tsx, AssetDetailPage.tsx, AssetCategoriesPage.tsx, all module files

#### 1. Creation Workflows That Exist

**Asset Create/Edit Form** (AssetPages.tsx, line 235-382)
- Fields: name, assetTag, serialNumber, category (async select), manufacturer, model, year, condition, status, criticality, location/building/floor/area, plant (async), department (async), assignedTo user (async), parentAsset (async), description, purchaseDate, purchaseCost, expectedLifeYears
- AI Generate button also available via AIAssetGenerator component
- Links: Category, Plant, Department, User, Parent Asset
- **Missing:** No link to Component Registry, no link to BOM, no link to inventory/spare parts

**BOM Component Create** (AssetPages.tsx, line 719-871)
- Standalone BOM page with its own create form
- Links: Parent Asset (async), Component/child asset (async)
- Fields: partNumber, quantity, unit, specification, revision
- API: POST /api/bill-of-materials

**Component Registry Create** (AssetDetailPage.tsx, line 552-610)
- Inline form on asset detail Components tab
- Fields: componentCode, name, componentType (component/sub_assembly/consumable/instrument), criticality, serialNumber, manufacturer, modelNumber, expectedLifeHours, operatingHours, description
- API: POST /api/component-registry with assetId

**Digital Twin Create** (two locations)
- AssetPages.tsx (line 1060-1228): Standalone Digital Twin page, form has name, asset (async), type, syncInterval
- AssetDetailPage.tsx (line 698-748): Inline form on detail Digital Twin tab, auto-links to current asset
- API: POST /api/digital-twins

**Diagram Create** (AssetDetailPage.tsx, line 792-828)
- Inline form on detail Diagrams tab
- Fields: name, type (process/piping/electrical/hvac/control/safety), description
- API: POST /api/system-diagrams (creates with empty nodes/edges)
- Note: Full diagram editor exists at /src/components/digital-twin/SystemDiagramPage.tsx (2252 lines)

**Condition Monitoring Point Create** (AssetPages.tsx, line 883-1050)
- Fields: asset (async), parameter (vibration/temperature/pressure/flow/current), thresholds
- API: POST /api/condition-monitoring

#### 2. Linked Data Displayed on Asset Detail (AssetDetailPage.tsx)

**Tabs:** Overview, Hierarchy, BOM, Components, Monitoring, Digital Twin, Diagrams

| Tab | Data Shown | Data Source |
|-----|-----------|-------------|
| Overview | Specs, PM schedules, financials, assigned user, recent MRs/WOs, hierarchy/BOM/monitoring/twin quick-links | Asset API (includes) |
| Hierarchy | Parent asset, child assets with status/condition | Asset parent/children relations |
| BOM | Components this asset contains (bomItems), assemblies this asset is used in (bomAsChild) | /api/bill-of-materials |
| Components | Component Registry items: code, name, type, criticality, health score, life hours | /api/component-registry?assetId= |
| Monitoring | IoT devices: name, parameter, type, status, last seen | asset.iotDevices (eager-loaded) |
| Digital Twin | Health score ring, type, active status, sync interval, last synced | /api/digital-twins?assetId= |
| Diagrams | List: name, type, version, updated date, template badge | /api/system-diagrams (global, not filtered by asset) |

**NOT displayed on Asset Detail:** Spare parts, inventory/stock levels, work order history (only shows recent), maintenance cost summary, documents/attachments

#### 3. Component Registry References (component-registry API)

- AssetDetailPage.tsx: 2 calls (GET list, POST create)
- MaintenancePages.tsx: 1 call (GET by assetId for WO component selection)
- RepairsPages.tsx: 1 call (GET by assetId for repair component selection)
- No dedicated ComponentRegistry management page exists as a standalone module

#### 4. Digital Twin References

- AssetPages.tsx: 6 refs (standalone Digital Twins page with CRUD)
- AssetDetailPage.tsx: 12 refs (detail tab + inline create)
- AIHubPage.tsx: 2 refs (AI generation descriptions)
- AIConfigPage.tsx: 1 ref (AI config)
- SettingsPages.tsx: 1 ref (AI settings icon)

#### 5. Assembly References

- AssetDetailPage.tsx: 3 refs (BOM tab descriptions: "Parent Assembly", "sub-assemblies")
- ProductionPages.tsx: 3 refs (production order type filter = "Assembly")
- **No dedicated Assembly management page or model exists.** Assemblies are just assets with parent-child BOM relationships.

#### 6. Diagram References

- AssetDetailPage.tsx: 18 refs (tab + inline create + display)
- AIHubPage.tsx: 2 refs (AI generation)
- AIConfigPage.tsx: 1 ref
- Full editor: /src/components/digital-twin/SystemDiagramPage.tsx (2252 lines, ReactFlow-based)
- Templates: /src/components/digital-twin/DiagramTemplates.ts
- Node types: /src/components/digital-twin/DiagramNodeTypes.tsx

#### 7. What's Missing

1. **No spare parts / inventory linking on asset detail** - InventoryPages.tsx exists separately but is never referenced from asset detail
2. **No dedicated Component Registry page** - components only accessible from within individual asset detail tabs; no cross-asset component search/browse
3. **No Assembly entity/model** - assemblies are implied through BOM parent-child, but no formal assembly management
4. **Diagram-asset association is broken** - diagram create in AssetDetailPage does NOT pass assetId; lists ALL diagrams globally, not per-asset
5. **BOM tab is read-only on detail** - no inline BOM add from detail page (must go to standalone BOM page)
6. **No document/attachment management** on asset detail
7. **No work order creation** directly from asset detail (only viewing recent WOs)
8. **AssetCategoriesPage.tsx** - pure category CRUD, no parts/assembly/BOM management
9. **Digital twin on detail has no edit/update** - only create, no parameter configuration or simulation UI
10. **Component form has no link to BOM** - registering a component does not auto-add it to the BOM
