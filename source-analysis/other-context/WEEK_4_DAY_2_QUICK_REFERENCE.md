# 🚀 Week 4 Day 2 - Quick Reference Guide

## Roles Management (`/settings/roles`)

### Access Requirements
```typescript
permissions.view    // View roles page
permissions.create  // Show "Add Role" button
permissions.update  // Show "Edit" button
permissions.delete  // Show "Delete" button
```

### Key Features
1. **Stats Dashboard** - 4 cards showing Total, System, Custom, Active roles
2. **Search** - Real-time filtering across name, display name, description
3. **Pagination** - 9 roles per page
4. **Export** - CSV export with all role data
5. **Create/Edit** - Modal form with validation
6. **Delete** - With confirmation (system roles protected)
7. **Hierarchy Levels** - Color-coded badges (0-100)
8. **User & Permission Counts** - Shows usage metrics

### UI Components
- Gradient header (purple-to-pink)
- 4 stats cards with border-left accents
- Search bar with icon
- Role cards in grid layout
- Modal form for create/edit
- Pagination controls
- Export button

### API Endpoints
```typescript
GET    /api/v1/eam/roles           // Fetch all roles
POST   /api/v1/eam/roles           // Create new role
PUT    /api/v1/eam/roles/{id}      // Update role
DELETE /api/v1/eam/roles/{id}      // Delete role
```

### Data Structure
```typescript
interface Role {
  id: number;
  name: string;                    // Slug (e.g., "admin")
  display_name: string;            // Display name (e.g., "Administrator")
  description: string;             // Role description
  hierarchy_level: number;         // 0-100 (higher = more authority)
  is_system_role: boolean;         // System roles cannot be edited/deleted
  is_active: boolean;              // Active status
  user_count?: number;             // Number of users with this role
  permission_count?: number;       // Number of permissions assigned
  created_at: string;              // Creation timestamp
}
```

### Hierarchy Level Colors
- **90-100**: Purple (Admin, Super Admin)
- **70-89**: Blue (Manager, Director)
- **50-69**: Green (Supervisor, Lead)
- **30-49**: Yellow (Technician, Specialist)
- **0-29**: Gray (Operator, Basic User)

### System Role Protection
- System roles have `is_system_role: true`
- Edit and Delete buttons are disabled for system roles
- Attempting to delete shows alert: "Cannot delete system roles"

---

## Permissions Management (`/settings/permissions`)

### Access Requirements
```typescript
permissions.view    // View permissions page
```

### Key Features
1. **Stats Dashboard** - 4 cards showing Total, Modules, System, Custom permissions
2. **Search** - Real-time filtering across name, display name, description
3. **Module Filter** - Dropdown to filter by module (11+ modules)
4. **Export** - CSV export with all permission data
5. **Collapsible Modules** - Expand/collapse module sections
6. **Detailed View** - Name, display name, description, type
7. **System/Custom Badges** - Visual distinction
8. **Permission Count** - Shows count per module

### UI Components
- Gradient header (indigo-to-purple)
- 4 stats cards with border-left accents
- Search bar with icon
- Module filter dropdown
- Collapsible module sections
- Permission table with hover effects
- Export button

### API Endpoints
```typescript
GET /api/v1/eam/permissions        // Fetch all permissions
```

### Data Structure
```typescript
interface Permission {
  id: number;
  name: string;                    // Permission slug (e.g., "assets.view")
  display_name: string;            // Display name (e.g., "View Assets")
  description: string;             // Permission description
  module: string;                  // Module name (e.g., "ASSET", "RWOP")
  category?: string;               // Optional category
  is_system: boolean;              // System vs Custom permission
}
```

### Module List (11 modules)
1. **ASSET** - Assets, Hierarchy, BOM, Locations, Categories, Documents, History
2. **RWOP** - Work Orders, Maintenance Requests, Downtime, Failure Analysis, RCA
3. **MRMP** - PM Schedules, Calibration, Risk Assessment, Meter Readings, Checklists
4. **MPMP** - Production, Surveys, OEE, Work Centers, Resource Planning
5. **IMS** - Inventory, Spare Parts, Tools, Warehouses, Purchase Orders, Vendors
6. **HRMS** - Users, Teams, Training, Certifications, Departments, Skills
7. **IOT** - IoT Devices, Sensors, Alerts, Predictive Maintenance
8. **DIGITAL_TWIN** - Digital Twin, 3D Models
9. **TRAC** - Safety, Incidents, Compliance
10. **REPORTS** - Reports, Analytics, KPIs
11. **CORE** - Dashboard, Settings, Roles, Permissions, Audit Logs, Notifications

### Permission Naming Convention
```
{module}.{action}
{module}.{resource}.{action}

Examples:
- assets.view
- assets.create
- assets.update
- assets.delete
- work_orders.view_all
- work_orders.view_own
- pm_schedules.execute
```

---

## Common Operations

### Roles Management

#### Create New Role
1. Click "Add Role" button (requires `roles.create`)
2. Fill in form:
   - Role Name (slug): e.g., "custom_role"
   - Display Name: e.g., "Custom Role"
   - Description: Role purpose
   - Hierarchy Level: 0-100
   - Active: checkbox
3. Click "Create"

#### Edit Role
1. Click "Edit" button on role card (requires `roles.update`)
2. Modify fields (cannot edit system roles)
3. Click "Update"

#### Delete Role
1. Click "Delete" button on role card (requires `roles.delete`)
2. Confirm deletion (cannot delete system roles)

#### Export Roles
1. Click "Export" button in header
2. CSV file downloads with all role data

#### Search Roles
1. Type in search bar
2. Results filter in real-time

### Permissions Management

#### View All Permissions
1. Navigate to `/settings/permissions`
2. All 279 permissions displayed grouped by module

#### Search Permissions
1. Type in search bar
2. Results filter across name, display name, description

#### Filter by Module
1. Select module from dropdown
2. Only permissions from that module shown

#### Expand/Collapse Module
1. Click on module header
2. Section expands/collapses

#### Export Permissions
1. Click "Export" button in header
2. CSV file downloads with all permission data

---

## Troubleshooting

### Roles Management

**Issue**: Cannot see "Add Role" button
- **Solution**: User needs `roles.create` permission

**Issue**: Cannot edit role
- **Solution**: Check if role is system role (cannot edit) or user needs `roles.update` permission

**Issue**: Cannot delete role
- **Solution**: Check if role is system role (cannot delete) or user needs `roles.delete` permission

**Issue**: No roles showing
- **Solution**: Check API connection, verify `/roles` endpoint is working

### Permissions Management

**Issue**: Cannot see permissions page
- **Solution**: User needs `permissions.view` permission

**Issue**: No permissions showing
- **Solution**: Check API connection, verify `/permissions` endpoint is working

**Issue**: Search not working
- **Solution**: Clear search term, refresh page

**Issue**: Module filter not working
- **Solution**: Select "All Modules" to reset filter

---

## Best Practices

### Roles Management
1. ✅ Use descriptive role names (e.g., "maintenance_supervisor")
2. ✅ Set appropriate hierarchy levels (Admin: 100, Manager: 80, Operator: 30)
3. ✅ Never delete system roles
4. ✅ Keep role descriptions clear and concise
5. ✅ Regularly review user counts per role
6. ✅ Export roles before making bulk changes

### Permissions Management
1. ✅ Use search to find specific permissions
2. ✅ Filter by module for focused review
3. ✅ Understand permission naming convention
4. ✅ Review system permissions before creating custom ones
5. ✅ Export permissions for documentation
6. ✅ Collapse unused modules for cleaner view

---

## Integration with Other Modules

### Roles → Users
- Users are assigned roles
- Roles determine user permissions
- User count shown on role cards

### Roles → Permissions
- Roles have multiple permissions
- Permission count shown on role cards
- Permissions define what roles can do

### Permissions → All Modules
- Every module uses permissions
- Permissions control access to features
- 279 permissions across 11 modules

---

## Performance Tips

### Roles Management
- Search is client-side (instant)
- Pagination reduces DOM elements
- Export is instant (client-side CSV generation)
- API calls only on load and CRUD operations

### Permissions Management
- Search is client-side (instant)
- Module filter is client-side (instant)
- Collapsible sections reduce DOM elements
- Export is instant (client-side CSV generation)
- API call only on load

---

## Security Notes

### Roles Management
- System roles are protected from modification
- Permission-based access control
- Hierarchy levels enforce authority
- Form validation prevents invalid data

### Permissions Management
- Read-only interface (no modifications)
- Permission-based access control
- System/Custom distinction
- Secure API integration

---

## Quick Links

- **Roles Page**: `/settings/roles`
- **Permissions Page**: `/settings/permissions`
- **API Docs**: See `API_DOCUMENTATION.md`
- **Complete Permissions List**: See `COMPLETE_PERMISSIONS_LIST.md`
- **Week 4 Day 2 Completion**: See `WEEK_4_DAY_2_COMPLETION.md`
- **Before/After Comparison**: See `WEEK_4_DAY_2_BEFORE_AFTER.md`

---

**Version**: 2.0.0  
**Week 4 Day 2**: COMPLETED ✅  
**Status**: Production Ready ✅
