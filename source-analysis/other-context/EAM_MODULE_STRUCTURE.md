# 🏭 Professional EAM System - Module Structure & Permissions

## Actual EAM Modules (From Backend)

Based on your backend structure (`app/Controllers/Api/V1/Modules/`), here are your professional EAM modules:

### 1. ASSET - Asset Lifecycle & Registry Management
**Controllers:** `Modules/ASSET/`
**Purpose:** Comprehensive asset registry with technical specs, warranty, maintenance history

**Permissions:**
```typescript
const ASSET_PERMISSIONS = [
  // Core Asset Management
  'assets.view',
  'assets.create',
  'assets.edit',
  'assets.delete',
  'assets.export',
  
  // Asset Hierarchy
  'assets.hierarchy.view',
  'assets.hierarchy.manage',
  'assets.tree.view',
  'assets.relationships.manage',
  
  // Machines
  'machines.view',
  'machines.create',
  'machines.edit',
  'machines.delete',
  
  // Equipment
  'equipment.view',
  'equipment.create',
  'equipment.edit',
  
  // Assemblies & Parts
  'assemblies.view',
  'assemblies.create',
  'assemblies.edit',
  'parts.view',
  'parts.create',
  'parts.edit',
  
  // Bill of Materials
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
  'meters.read',
  
  // Tools
  'tools.view',
  'tools.create',
  'tools.manage',
  
  // Visualization
  'assets.visualization.view'
];
```

**Frontend Routes:**
```
/assets/                    # Asset list
/assets/machines/           # Machines
/assets/equipment/          # Equipment
/assets/assemblies/         # Assemblies
/assets/parts/              # Parts
/assets/bom/                # Bill of Materials
/assets/hierarchy/          # Asset hierarchy
/assets/facilities/         # Facilities
/assets/meters/             # Meters
/assets/tools/              # Tools
```

---

### 2. RWOP - Repair & Work Order Processing (Maintenance Management)
**Controllers:** `Modules/RWOP/`
**Purpose:** Corrective maintenance, work orders, scheduling, execution

**Permissions:**
```typescript
const RWOP_PERMISSIONS = [
  // Work Orders
  'work_orders.view',
  'work_orders.view_own',
  'work_orders.view_all',
  'work_orders.create',
  'work_orders.edit',
  'work_orders.edit_own',
  'work_orders.delete',
  'work_orders.assign',
  'work_orders.complete',
  'work_orders.close',
  'work_orders.approve',
  'work_orders.export',
  
  // Work Order Templates
  'work_order_templates.view',
  'work_order_templates.create',
  'work_order_templates.edit',
  
  // Recurring Work Orders
  'recurring_work_orders.view',
  'recurring_work_orders.create',
  'recurring_work_orders.manage',
  
  // Maintenance Requests
  'maintenance_requests.view',
  'maintenance_requests.create',
  'maintenance_requests.approve',
  'maintenance_requests.reject',
  'maintenance_requests.convert',
  
  // Maintenance Orders
  'maintenance_orders.view',
  'maintenance_orders.create',
  'maintenance_orders.manage',
  
  // Approvals
  'approvals.view',
  'approvals.approve',
  'approvals.reject',
  
  // Material Requests
  'material_requests.view',
  'material_requests.create',
  'material_requests.approve',
  
  // Tool Requests
  'tool_requests.view',
  'tool_requests.create',
  'tool_requests.approve',
  'tool_requests.issue',
  
  // Tool Management
  'tools.audit',
  'tools.maintenance',
  'tools.transfer',
  'tools.statistics',
  'tools.qr',
  
  // Failure Analysis
  'failure_codes.view',
  'failure_codes.manage',
  'rca.view',
  'rca.create',
  'rca.manage',
  
  // SLA
  'sla.view',
  'sla.manage',
  
  // Verifications
  'verifications.view',
  'verifications.create',
  
  // Work Execution
  'work_execution.view',
  'work_execution.manage',
  
  // Analytics
  'work_order_analytics.view',
  'maintenance_analytics.view',
  'completion_analytics.view'
];
```

**Frontend Routes:**
```
/work-orders/                      # Work orders list
/work-orders/create/               # Create work order
/work-orders/[id]/                 # Work order details
/work-orders/templates/            # Work order templates
/work-orders/recurring/            # Recurring work orders
/maintenance/requests/             # Maintenance requests
/maintenance/orders/               # Maintenance orders
/maintenance/approvals/            # Approvals
/maintenance/material-requests/    # Material requests
/maintenance/tool-requests/        # Tool requests
/maintenance/tools/                # Tool management
/maintenance/failure-analysis/     # Failure analysis & RCA
/maintenance/verifications/        # Verifications
/maintenance/analytics/            # Maintenance analytics
```

---

### 3. MRMP - Maintenance Reliability & Management Program (PM System)
**Controllers:** `Modules/MRMP/`
**Purpose:** Preventive & predictive maintenance, PM schedules, calibration

**Permissions:**
```typescript
const MRMP_PERMISSIONS = [
  // PM Schedules
  'pm_schedules.view',
  'pm_schedules.create',
  'pm_schedules.edit',
  'pm_schedules.delete',
  'pm_schedules.activate',
  'pm_schedules.deactivate',
  
  // PM Templates
  'pm_templates.view',
  'pm_templates.create',
  'pm_templates.edit',
  
  // PM Checklists
  'pm_checklists.view',
  'pm_checklists.create',
  'pm_checklists.edit',
  
  // PM Work Orders
  'pm_work_orders.view',
  'pm_work_orders.execute',
  'pm_work_orders.complete',
  
  // PM Triggers
  'pm_triggers.view',
  'pm_triggers.manage',
  
  // Usage-Based PM
  'usage_based_pm.view',
  'usage_based_pm.manage',
  
  // PM Runs
  'pm_runs.view',
  'pm_runs.manage',
  
  // PM Notifications
  'pm_notifications.view',
  'pm_notifications.manage',
  
  // PM Analytics
  'pm_analytics.view',
  'pm_analytics.export',
  
  // Calibration
  'calibration.view',
  'calibration.create',
  'calibration.manage',
  'calibration.schedule',
  
  // Asset Health
  'asset_health.view',
  'asset_health.monitor',
  
  // Meters (PM-related)
  'pm_meters.view',
  'pm_meters.read'
];
```

**Frontend Routes:**
```
/pm/schedules/              # PM schedules
/pm/templates/              # PM templates
/pm/checklists/             # PM checklists
/pm/work-orders/            # PM work orders
/pm/triggers/               # PM triggers
/pm/usage-based/            # Usage-based PM
/pm/calendar/               # PM calendar
/pm/analytics/              # PM analytics
/maintenance/calibration/   # Calibration management
/maintenance/asset-health/  # Asset health monitoring
```

---

### 4. MPMP - Manufacturing Production Management Program
**Controllers:** `Modules/MPMP/`
**Purpose:** Production monitoring, OEE, quality, downtime tracking

**Permissions:**
```typescript
const MPMP_PERMISSIONS = [
  // Production
  'production.view',
  'production.create',
  'production.edit',
  'production.manage',
  
  // Production Surveys
  'production_surveys.view',
  'production_surveys.create',
  'production_surveys.edit',
  'production_surveys.approve',
  
  // Production Targets
  'production_targets.view',
  'production_targets.create',
  'production_targets.manage',
  
  // Production Runs
  'production_runs.view',
  'production_runs.create',
  'production_runs.manage',
  
  // Production Data
  'production_data.view',
  'production_data.enter',
  'production_data.edit',
  
  // Work Centers
  'work_centers.view',
  'work_centers.create',
  'work_centers.manage',
  
  // OEE
  'oee.view',
  'oee.monitor',
  'oee.export',
  
  // Downtime
  'downtime.view',
  'downtime.record',
  'downtime.analyze',
  
  // Quality
  'quality.view',
  'quality.record',
  'quality.manage',
  
  // Energy
  'energy.view',
  'energy.monitor',
  
  // Meter Readings
  'meter_readings.view',
  'meter_readings.create',
  
  // Shift Management
  'shifts.view',
  'shifts.assign',
  'shift_handover.view',
  'shift_handover.create',
  
  // Checklists
  'checklists.view',
  'checklists.create',
  'checklists.complete',
  
  // Alerts
  'production_alerts.view',
  'production_alerts.manage',
  
  // Batch Management
  'batches.view',
  'batches.create',
  'batches.manage',
  
  // Analytics
  'production_analytics.view'
];
```

**Frontend Routes:**
```
/production/                    # Production overview
/production/surveys/            # Production surveys
/production/targets/            # Production targets
/production/runs/               # Production runs
/production/data/               # Production data entry
/production/work-centers/       # Work centers
/production/oee/                # OEE dashboard
/production/downtime/           # Downtime tracking
/production/quality/            # Quality management
/production/energy/             # Energy monitoring
/production/meter-readings/     # Meter readings
/production/shifts/             # Shift management
/production/shift-handover/     # Shift handover
/production/checklists/         # Production checklists
/production/batches/            # Batch management
/production/analytics/          # Production analytics
```

---

### 5. IMS - Inventory Management System
**Controllers:** `Modules/IMS/`
**Purpose:** Spare parts inventory, stock management, material requisition

**Permissions:**
```typescript
const IMS_PERMISSIONS = [
  // Inventory
  'inventory.view',
  'inventory.create',
  'inventory.edit',
  'inventory.delete',
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
  'parts.delete',
  
  // Parts Categories
  'parts_categories.view',
  'parts_categories.manage',
  
  // Sub-Parts
  'sub_parts.view',
  'sub_parts.manage',
  
  // Equipment Parts
  'equipment_parts.view',
  'equipment_parts.manage',
  
  // Material Requisition
  'material_requisition.view',
  'material_requisition.create',
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
  
  // Part PM Tasks
  'part_pm_tasks.view',
  'part_pm_tasks.manage'
];
```

**Frontend Routes:**
```
/inventory/                     # Inventory overview
/inventory/items/               # Inventory items
/inventory/parts/               # Parts management
/inventory/categories/          # Parts categories
/inventory/adjustments/         # Stock adjustments
/inventory/transfers/           # Stock transfers
/inventory/receiving/           # Receiving
/inventory/requests/            # Material requisitions
/inventory/transactions/        # Stock transactions
/inventory/forecast/            # Inventory forecast
/inventory/vendors/             # Vendors
```

---

### 6. HRMS - Human Resource Management System
**Controllers:** `Modules/HRMS/`
**Purpose:** Workforce management, skills, training, scheduling

**Permissions:**
```typescript
const HRMS_PERMISSIONS = [
  // Users
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  'users.manage',
  
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
  
  // Resource Management
  'resources.view',
  'resources.manage',
  'resource_availability.view',
  
  // Groups
  'operator_groups.view',
  'operator_groups.manage',
  'technician_groups.view',
  'technician_groups.manage',
  
  // Trades
  'trades.view',
  'trades.manage'
];
```

**Frontend Routes:**
```
/hrms/users/                # User management
/hrms/departments/          # Departments
/hrms/assignments/          # Assignments
/hrms/skills/               # Skills management
/hrms/skill-categories/     # Skill categories
/hrms/training/             # Training management
/hrms/training-records/     # Training records
/hrms/shifts/               # Shift management
/hrms/scheduler/            # Scheduler
/hrms/resources/            # Resource management
/hrms/groups/               # Groups management
```

---

### 7. IOT - IoT & Predictive Maintenance
**Controllers:** `Modules/IOT/`
**Purpose:** IoT device management, sensor data, predictive analytics

**Permissions:**
```typescript
const IOT_PERMISSIONS = [
  // IoT Devices
  'iot_devices.view',
  'iot_devices.create',
  'iot_devices.manage',
  
  // IoT Data
  'iot_data.view',
  'iot_data.export',
  
  // IoT Rules
  'iot_rules.view',
  'iot_rules.create',
  'iot_rules.manage',
  
  // Predictive Maintenance
  'predictive.view',
  'predictive.analyze',
  'predictive.manage'
];
```

**Frontend Routes:**
```
/iot/devices/               # IoT devices
/iot/monitoring/            # Real-time monitoring
/iot/rules/                 # Alert rules
/iot/predictive/            # Predictive maintenance
```

---

### 8. DIGITAL_TWIN - Digital Twin & 3D Visualization
**Controllers:** `Modules/DIGITAL_TWIN/`
**Purpose:** 3D models, digital twin, hotspots, visualization

**Permissions:**
```typescript
const DIGITAL_TWIN_PERMISSIONS = [
  // Digital Twin
  'digital_twin.view',
  'digital_twin.manage',
  
  // 3D Models
  'models_3d.view',
  'models_3d.upload',
  'models_3d.manage',
  
  // Model Viewer
  'model_viewer.view',
  'model_viewer.interact',
  
  // Hotspots
  'hotspots.view',
  'hotspots.create',
  'hotspots.manage'
];
```

**Frontend Routes:**
```
/digital-twin/              # Digital twin dashboard
/digital-twin/models/       # 3D models
/digital-twin/viewer/       # Model viewer
/digital-twin/hotspots/     # Hotspots management
```

---

### 9. TRAC - Safety, Compliance & Risk Management
**Controllers:** `Modules/TRAC/`
**Purpose:** LOTO, permits, risk assessment, safety compliance

**Permissions:**
```typescript
const TRAC_PERMISSIONS = [
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
  
  // Permit to Work
  'permit_to_work.view',
  'permit_to_work.create',
  'permit_to_work.approve',
  
  // Risk Assessment
  'risk_assessment.view',
  'risk_assessment.create',
  'risk_assessment.manage',
  
  // Safety Tools
  'safety_tools.view',
  'safety_tools.manage'
];
```

**Frontend Routes:**
```
/safety/loto/               # LOTO management
/safety/permits/            # Permit management
/safety/permit-to-work/     # Permit to work
/safety/risk-assessment/    # Risk assessment
/safety/tools/              # Safety tools
```

---

### 10. REPORTS - Analytics & Reporting
**Controllers:** `Modules/REPORTS/`
**Purpose:** Reports, analytics, dashboards, KPIs

**Permissions:**
```typescript
const REPORTS_PERMISSIONS = [
  // Reports
  'reports.view',
  'reports.create',
  'reports.export',
  'reports.schedule',
  
  // Analytics
  'analytics.view',
  'analytics.export',
  
  // Production Reports
  'production_reports.view',
  'production_reports.export',
  
  // Work Order Reports
  'work_order_reports.view',
  'work_order_reports.export',
  
  // Stock Reports
  'stock_reports.view',
  'stock_reports.export',
  
  // Custom Reports
  'custom_reports.view',
  'custom_reports.create'
];
```

**Frontend Routes:**
```
/reports/                   # Reports hub
/reports/production/        # Production reports
/reports/work-orders/       # Work order reports
/reports/inventory/         # Inventory reports
/reports/custom/            # Custom reports
/analytics/                 # Analytics dashboard
/analytics/kpi/             # KPI dashboard
```

---

### 11. Core - System Core
**Controllers:** `Modules/Core/`
**Purpose:** Authentication, RBAC, settings, notifications, system management

**Permissions:**
```typescript
const CORE_PERMISSIONS = [
  // Authentication
  'auth.login',
  'auth.logout',
  
  // RBAC
  'roles.view',
  'roles.create',
  'roles.edit',
  'roles.delete',
  'permissions.view',
  'permissions.assign',
  
  // Settings
  'settings.view',
  'settings.edit',
  'system_settings.view',
  'system_settings.edit',
  'module_settings.view',
  'module_settings.edit',
  
  // Notifications
  'notifications.view',
  'notifications.manage',
  
  // Audit Logs
  'audit_logs.view',
  'audit_logs.export',
  
  // Documents
  'documents.view',
  'documents.upload',
  'documents.manage',
  
  // Comments
  'comments.view',
  'comments.create',
  
  // Attachments
  'attachments.view',
  'attachments.upload',
  
  // Dashboard
  'dashboard.view',
  'dashboard.customize',
  
  // Modules
  'modules.view',
  'modules.activate',
  'modules.deactivate',
  
  // Plants
  'plants.view',
  'plants.create',
  'plants.manage',
  
  // System Health
  'system_health.view',
  'system_health.monitor',
  
  // ERP Integration
  'erp_integration.view',
  'erp_integration.manage',
  'erp_mapping.view',
  'erp_mapping.manage',
  
  // AI Assistant
  'ai_assistant.use',
  
  // Mobile
  'mobile.access',
  
  // Search
  'search.use',
  
  // Bulk Operations
  'bulk_operations.execute'
];
```

**Frontend Routes:**
```
/dashboard/                 # Main dashboard
/settings/                  # Settings
/settings/roles/            # Role management
/settings/permissions/      # Permission management
/settings/users/            # User management
/settings/system/           # System settings
/settings/modules/          # Module management
/settings/plants/           # Plant management
/notifications/             # Notifications
/audit-logs/                # Audit logs
/documents/                 # Documents
/system-health/             # System health
/erp-integration/           # ERP integration
```

---

## Summary: Complete Permission List

### Total Permissions: 300+

**By Module:**
- ASSET: 30 permissions
- RWOP: 50 permissions
- MRMP: 35 permissions
- MPMP: 40 permissions
- IMS: 25 permissions
- HRMS: 30 permissions
- IOT: 10 permissions
- DIGITAL_TWIN: 10 permissions
- TRAC: 15 permissions
- REPORTS: 15 permissions
- Core: 40 permissions

---

## Next: Role Permission Bundles

See `ROLE_PERMISSION_BUNDLES.md` for complete role definitions with these permissions.
