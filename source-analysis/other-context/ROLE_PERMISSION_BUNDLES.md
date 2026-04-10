# 🎭 Role Permission Bundles - Professional EAM System

## Role Definitions with Module-Based Permissions

### 1. Admin Role
**Description:** Full system access, all modules, all permissions

```typescript
const ADMIN_PERMISSIONS = [
  // Wildcard - all permissions
  '*',
  
  // Or explicitly:
  'assets.*',
  'work_orders.*',
  'pm_schedules.*',
  'production.*',
  'inventory.*',
  'hrms.*',
  'iot.*',
  'digital_twin.*',
  'safety.*',
  'reports.*',
  'settings.*',
  'roles.*',
  'permissions.*',
  'users.*'
];
```

**Access:**
- All modules
- All features
- All data (cross-plant if multi-plant)
- System configuration
- User & role management

---

### 2. Maintenance Manager Role
**Description:** Oversees all maintenance activities (RWOP + MRMP)

```typescript
const MAINTENANCE_MANAGER_PERMISSIONS = [
  // RWOP - Work Orders
  'work_orders.view_all',
  'work_orders.create',
  'work_orders.edit',
  'work_orders.assign',
  'work_orders.approve',
  'work_orders.close',
  'work_orders.export',
  'work_order_templates.view',
  'work_order_templates.create',
  'recurring_work_orders.view',
  'recurring_work_orders.manage',
  
  // Maintenance Requests
  'maintenance_requests.view',
  'maintenance_requests.approve',
  'maintenance_requests.reject',
  'maintenance_requests.convert',
  
  // Approvals
  'approvals.view',
  'approvals.approve',
  'approvals.reject',
  
  // Material & Tool Requests
  'material_requests.view',
  'material_requests.approve',
  'tool_requests.view',
  'tool_requests.approve',
  
  // Failure Analysis
  'failure_codes.view',
  'failure_codes.manage',
  'rca.view',
  'rca.create',
  
  // Analytics
  'work_order_analytics.view',
  'maintenance_analytics.view',
  
  // MRMP - PM System
  'pm_schedules.view',
  'pm_schedules.create',
  'pm_schedules.edit',
  'pm_schedules.activate',
  'pm_templates.view',
  'pm_templates.create',
  'pm_work_orders.view',
  'pm_analytics.view',
  'calibration.view',
  'calibration.manage',
  'asset_health.view',
  
  // Assets (view only)
  'assets.view',
  'machines.view',
  'equipment.view',
  
  // Inventory (view only)
  'inventory.view',
  'parts.view',
  
  // HRMS (limited)
  'users.view',
  'assignments.view',
  'assignments.create',
  
  // Reports
  'reports.view',
  'reports.export',
  'analytics.view'
];
```

---

### 3. Maintenance Planner Role
**Description:** Plans and schedules maintenance work

```typescript
const MAINTENANCE_PLANNER_PERMISSIONS = [
  // Work Orders
  'work_orders.view_all',
  'work_orders.create',
  'work_orders.edit',
  'work_orders.assign',
  'work_order_templates.view',
  
  // Maintenance Requests
  'maintenance_requests.view',
  'maintenance_requests.approve',
  'maintenance_requests.convert',
  
  // PM Schedules
  'pm_schedules.view',
  'pm_schedules.create',
  'pm_schedules.edit',
  'pm_templates.view',
  'pm_templates.create',
  'pm_work_orders.view',
  
  // Assets
  'assets.view',
  'machines.view',
  'equipment.view',
  'asset_health.view',
  
  // Inventory
  'inventory.view',
  'parts.view',
  'material_requests.view',
  
  // HRMS
  'users.view',
  'assignments.view',
  'assignments.create',
  'skills.view',
  
  // Reports
  'reports.view',
  'pm_analytics.view',
  'work_order_analytics.view'
];
```

---

### 4. Maintenance Supervisor Role
**Description:** Supervises maintenance team and work execution

```typescript
const MAINTENANCE_SUPERVISOR_PERMISSIONS = [
  // Work Orders
  'work_orders.view_all',
  'work_orders.create',
  'work_orders.assign',
  'work_orders.approve',
  
  // Maintenance Requests
  'maintenance_requests.view',
  'maintenance_requests.approve',
  
  // Approvals
  'approvals.view',
  'approvals.approve',
  
  // Material & Tool Requests
  'material_requests.view',
  'material_requests.approve',
  'tool_requests.view',
  'tool_requests.approve',
  
  // PM Work Orders
  'pm_work_orders.view',
  'pm_work_orders.execute',
  
  // Assets
  'assets.view',
  'machines.view',
  'equipment.view',
  
  // Inventory
  'inventory.view',
  'parts.view',
  
  // HRMS
  'users.view',
  'assignments.view',
  'assignments.create',
  'assignments.manage',
  'shifts.view',
  'shift_assignments.view',
  
  // Reports
  'reports.view',
  'work_order_analytics.view'
];
```

---

### 5. Maintenance Technician Role
**Description:** Executes maintenance work orders

```typescript
const MAINTENANCE_TECHNICIAN_PERMISSIONS = [
  // Work Orders (own only)
  'work_orders.view_own',
  'work_orders.edit_own',
  'work_orders.complete',
  
  // Maintenance Requests
  'maintenance_requests.view',
  'maintenance_requests.create',
  
  // Material & Tool Requests
  'material_requests.view',
  'material_requests.create',
  'tool_requests.view',
  'tool_requests.create',
  
  // PM Work Orders
  'pm_work_orders.view',
  'pm_work_orders.execute',
  'pm_work_orders.complete',
  
  // Assets (view only)
  'assets.view',
  'machines.view',
  'equipment.view',
  'meters.read',
  
  // Inventory (view & request)
  'inventory.view',
  'parts.view',
  
  // Mobile Access
  'mobile.access',
  
  // Checklists
  'checklists.view',
  'checklists.complete'
];
```

---

### 6. Production Manager Role
**Description:** Oversees production operations (MPMP module)

```typescript
const PRODUCTION_MANAGER_PERMISSIONS = [
  // Production
  'production.view',
  'production.manage',
  'production_surveys.view',
  'production_surveys.approve',
  'production_targets.view',
  'production_targets.create',
  'production_targets.manage',
  'production_runs.view',
  'production_runs.manage',
  
  // Work Centers
  'work_centers.view',
  'work_centers.create',
  'work_centers.manage',
  
  // OEE & Downtime
  'oee.view',
  'oee.monitor',
  'downtime.view',
  'downtime.analyze',
  
  // Quality
  'quality.view',
  'quality.manage',
  
  // Energy
  'energy.view',
  'energy.monitor',
  
  // Shifts
  'shifts.view',
  'shifts.manage',
  'shift_assignments.view',
  'shift_handover.view',
  
  // Analytics
  'production_analytics.view',
  
  // Assets (view only)
  'assets.view',
  'machines.view',
  
  // Maintenance Requests
  'maintenance_requests.view',
  'maintenance_requests.create',
  
  // HRMS
  'users.view',
  'assignments.view',
  'assignments.create',
  
  // Reports
  'reports.view',
  'production_reports.view',
  'production_reports.export'
];
```

---

### 7. Production Planner Role
**Description:** Plans production schedules and targets

```typescript
const PRODUCTION_PLANNER_PERMISSIONS = [
  // Production
  'production.view',
  'production_targets.view',
  'production_targets.create',
  'production_targets.manage',
  'production_runs.view',
  'production_runs.create',
  
  // Work Centers
  'work_centers.view',
  'work_centers.manage',
  
  // OEE
  'oee.view',
  'downtime.view',
  
  // Shifts
  'shifts.view',
  'shift_assignments.view',
  
  // Assets
  'assets.view',
  'machines.view',
  
  // Maintenance Requests
  'maintenance_requests.view',
  'maintenance_requests.create',
  
  // PM Schedules (view only)
  'pm_schedules.view',
  
  // Reports
  'reports.view',
  'production_reports.view'
];
```

---

### 8. Production Operator Role
**Description:** Operates machines and records production data

```typescript
const PRODUCTION_OPERATOR_PERMISSIONS = [
  // Production
  'production.view',
  'production_surveys.view',
  'production_surveys.create',
  'production_data.view',
  'production_data.enter',
  
  // Meter Readings
  'meter_readings.view',
  'meter_readings.create',
  
  // Checklists
  'checklists.view',
  'checklists.complete',
  
  // Shift Handover
  'shift_handover.view',
  'shift_handover.create',
  
  // Assets (view only)
  'assets.view',
  'machines.view',
  
  // Maintenance Requests
  'maintenance_requests.view',
  'maintenance_requests.create',
  
  // Mobile Access
  'mobile.access'
];
```

---

### 9. Inventory Manager / Shop Attendant Role
**Description:** Manages inventory and spare parts (IMS module)

```typescript
const INVENTORY_MANAGER_PERMISSIONS = [
  // Inventory
  'inventory.view',
  'inventory.create',
  'inventory.edit',
  'inventory.export',
  
  // Stock Management
  'stock.view',
  'stock.adjust',
  'stock.transfer',
  'stock.receive',
  'stock.issue',
  
  // Parts
  'parts.view',
  'parts.create',
  'parts.edit',
  'parts_categories.view',
  'parts_categories.manage',
  
  // Material Requisition
  'material_requisition.view',
  'material_requisition.approve',
  
  // Stock Transactions
  'stock_transactions.view',
  'stock_transactions.export',
  
  // Inventory Forecast
  'inventory_forecast.view',
  'inventory_forecast.manage',
  
  // Vendors
  'vendors.view',
  'vendors.create',
  'vendors.edit',
  
  // Tool Management
  'tools.view',
  'tools.manage',
  'tool_requests.view',
  'tool_requests.issue',
  
  // Assets (view only)
  'assets.view',
  'machines.view',
  
  // Reports
  'reports.view',
  'stock_reports.view',
  'stock_reports.export'
];
```

---

### 10. Quality Inspector Role
**Description:** Manages quality control and inspections

```typescript
const QUALITY_INSPECTOR_PERMISSIONS = [
  // Quality
  'quality.view',
  'quality.record',
  'quality.manage',
  
  // Production (view only)
  'production.view',
  'production_surveys.view',
  
  // Checklists
  'checklists.view',
  'checklists.complete',
  
  // Assets
  'assets.view',
  'machines.view',
  
  // Calibration
  'calibration.view',
  
  // Reports
  'reports.view',
  'production_reports.view'
];
```

---

### 11. Safety Officer Role
**Description:** Manages safety, LOTO, permits (TRAC module)

```typescript
const SAFETY_OFFICER_PERMISSIONS = [
  // LOTO
  'loto.view',
  'loto.create',
  'loto.manage',
  'loto_locks.view',
  'loto_locks.manage',
  
  // Permits
  'permits.view',
  'permits.create',
  'permits.approve',
  'permits.manage',
  'permit_to_work.view',
  'permit_to_work.create',
  'permit_to_work.approve',
  
  // Risk Assessment
  'risk_assessment.view',
  'risk_assessment.create',
  'risk_assessment.manage',
  
  // Safety Tools
  'safety_tools.view',
  'safety_tools.manage',
  
  // Assets (view only)
  'assets.view',
  'machines.view',
  
  // Work Orders (view only)
  'work_orders.view',
  
  // Training
  'training.view',
  'training_records.view',
  
  // Reports
  'reports.view'
];
```

---

### 12. Asset Manager Role
**Description:** Manages asset lifecycle and registry (ASSET module)

```typescript
const ASSET_MANAGER_PERMISSIONS = [
  // Assets
  'assets.view',
  'assets.create',
  'assets.edit',
  'assets.delete',
  'assets.export',
  'assets.hierarchy.view',
  'assets.hierarchy.manage',
  
  // Machines & Equipment
  'machines.view',
  'machines.create',
  'machines.edit',
  'equipment.view',
  'equipment.create',
  'equipment.edit',
  
  // Assemblies & Parts
  'assemblies.view',
  'assemblies.create',
  'parts.view',
  'parts.create',
  
  // BOM
  'bom.view',
  'bom.create',
  'bom.edit',
  'bom.explode',
  
  // Facilities
  'facilities.view',
  'facilities.manage',
  
  // Meters
  'meters.view',
  'meters.create',
  
  // Asset Health
  'asset_health.view',
  'asset_health.monitor',
  
  // Digital Twin
  'digital_twin.view',
  'models_3d.view',
  
  // Documents
  'documents.view',
  'documents.upload',
  
  // Reports
  'reports.view',
  'analytics.view'
];
```

---

### 13. IoT Specialist Role
**Description:** Manages IoT devices and predictive maintenance

```typescript
const IOT_SPECIALIST_PERMISSIONS = [
  // IoT
  'iot_devices.view',
  'iot_devices.create',
  'iot_devices.manage',
  'iot_data.view',
  'iot_data.export',
  'iot_rules.view',
  'iot_rules.create',
  'iot_rules.manage',
  
  // Predictive Maintenance
  'predictive.view',
  'predictive.analyze',
  'predictive.manage',
  
  // Assets (view only)
  'assets.view',
  'machines.view',
  'asset_health.view',
  
  // Analytics
  'analytics.view',
  
  // Reports
  'reports.view'
];
```

---

### 14. HR Manager Role
**Description:** Manages workforce, skills, training (HRMS module)

```typescript
const HR_MANAGER_PERMISSIONS = [
  // Users
  'users.view',
  'users.create',
  'users.edit',
  
  // Departments
  'departments.view',
  'departments.create',
  'departments.manage',
  
  // Assignments
  'assignments.view',
  'assignments.create',
  'assignments.manage',
  
  // Skills
  'skills.view',
  'skills.create',
  'skills.manage',
  'skill_categories.view',
  'skill_categories.manage',
  
  // Training
  'training.view',
  'training.create',
  'training.manage',
  'training_records.view',
  'training_records.create',
  
  // Shifts
  'shifts.view',
  'shifts.create',
  'shifts.manage',
  'shift_assignments.view',
  'shift_assignments.create',
  
  // Scheduler
  'scheduler.view',
  'scheduler.manage',
  
  // Resources
  'resources.view',
  'resources.manage',
  
  // Groups
  'operator_groups.view',
  'operator_groups.manage',
  'technician_groups.view',
  'technician_groups.manage',
  
  // Reports
  'reports.view'
];
```

---

### 15. Report Analyst Role
**Description:** Creates and analyzes reports

```typescript
const REPORT_ANALYST_PERMISSIONS = [
  // Reports
  'reports.view',
  'reports.create',
  'reports.export',
  'custom_reports.view',
  'custom_reports.create',
  
  // Analytics
  'analytics.view',
  'analytics.export',
  'production_analytics.view',
  'work_order_analytics.view',
  'maintenance_analytics.view',
  'pm_analytics.view',
  
  // All Reports
  'production_reports.view',
  'production_reports.export',
  'work_order_reports.view',
  'work_order_reports.export',
  'stock_reports.view',
  'stock_reports.export',
  
  // View-only access to data
  'assets.view',
  'work_orders.view_all',
  'production.view',
  'inventory.view',
  'pm_schedules.view'
];
```

---

## Permission Assignment Matrix

| Role | ASSET | RWOP | MRMP | MPMP | IMS | HRMS | IOT | DIGITAL_TWIN | TRAC | REPORTS |
|------|-------|------|------|------|-----|------|-----|--------------|------|---------|
| Admin | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Maintenance Manager | 👁️ View | ✅ Full | ✅ Full | - | 👁️ View | 📝 Limited | - | - | 👁️ View | ✅ Full |
| Maintenance Planner | 👁️ View | ✅ Manage | ✅ Manage | - | 👁️ View | 📝 Limited | - | - | - | 👁️ View |
| Maintenance Supervisor | 👁️ View | ✅ Manage | 📝 Execute | - | 👁️ View | 📝 Limited | - | - | - | 👁️ View |
| Maintenance Technician | 👁️ View | 📝 Execute | 📝 Execute | - | 👁️ View | - | - | - | - | - |
| Production Manager | 👁️ View | 📝 Request | - | ✅ Full | 👁️ View | 📝 Limited | - | - | - | ✅ Full |
| Production Planner | 👁️ View | 📝 Request | 👁️ View | ✅ Manage | - | - | - | - | - | 👁️ View |
| Production Operator | 👁️ View | 📝 Request | - | 📝 Execute | - | - | - | - | - | - |
| Inventory Manager | 👁️ View | - | - | - | ✅ Full | - | - | - | - | 👁️ View |
| Quality Inspector | 👁️ View | - | - | 📝 Quality | - | - | - | - | - | 👁️ View |
| Safety Officer | 👁️ View | 👁️ View | - | - | - | 📝 Training | - | - | ✅ Full | 👁️ View |
| Asset Manager | ✅ Full | - | - | - | 📝 Parts | - | - | ✅ Full | - | 👁️ View |
| IoT Specialist | 👁️ View | - | 📝 Predictive | - | - | - | ✅ Full | - | - | 👁️ View |
| HR Manager | - | - | - | - | - | ✅ Full | - | - | - | 👁️ View |
| Report Analyst | 👁️ View | 👁️ View | 👁️ View | 👁️ View | 👁️ View | - | - | - | - | ✅ Full |

**Legend:**
- ✅ Full: Complete access to module
- 📝 Limited: Specific permissions only
- 👁️ View: View-only access
- -: No access

---

## Next Steps

1. Review role definitions
2. Adjust permissions as needed
3. Implement in backend
4. Test with real users
5. Document any custom roles

See `IMPLEMENTATION_ROADMAP.md` for implementation steps.
