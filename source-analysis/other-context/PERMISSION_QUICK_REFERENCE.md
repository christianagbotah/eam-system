# 🚀 Quick Reference: Permission System

## Import Components

```tsx
import PermissionGuard from '@/components/guards/PermissionGuard';
import PermissionSection from '@/components/guards/PermissionSection';
import { usePermissions } from '@/hooks/usePermissions';
```

## Page-Level Protection

```tsx
// Wrap entire page - redirects if unauthorized
<PermissionGuard requiredPermission="work_orders.view">
  <YourPage />
</PermissionGuard>

// Multiple permissions (ANY)
<PermissionGuard requiredPermissions={['assets.view', 'assets.create']}>
  <YourPage />
</PermissionGuard>

// Multiple permissions (ALL)
<PermissionGuard 
  requiredPermissions={['assets.view', 'assets.create']}
  requireAll={true}
>
  <YourPage />
</PermissionGuard>

// Role + Permission
<PermissionGuard 
  requiredRole="admin"
  requiredPermission="settings.view"
>
  <YourPage />
</PermissionGuard>
```

## Section-Level Protection

```tsx
// Hide section if no permission
<PermissionSection requiredPermission="assets.create">
  <CreateAssetButton />
</PermissionSection>

// Show fallback if no permission
<PermissionSection 
  requiredPermission="assets.create"
  fallback={<p>You cannot create assets</p>}
>
  <CreateAssetButton />
</PermissionSection>

// Multiple permissions (ANY)
<PermissionSection requiredPermissions={['reports.view', 'analytics.view']}>
  <ReportsSection />
</PermissionSection>

// Multiple permissions (ALL)
<PermissionSection 
  requiredPermissions={['assets.view', 'assets.edit']}
  requireAll={true}
>
  <EditAssetForm />
</PermissionSection>
```

## Conditional Rendering

```tsx
const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

// Single permission
{hasPermission('work_orders.create') && <CreateButton />}

// Any permission
{hasAnyPermission(['assets.view', 'assets.create']) && <AssetSection />}

// All permissions
{hasAllPermissions(['assets.view', 'assets.edit']) && <EditForm />}

// In conditions
if (hasPermission('work_orders.delete')) {
  // Show delete option
}
```

## Common Patterns

### Pattern 1: Dashboard with Sections
```tsx
export default function Dashboard() {
  return (
    <div>
      <PermissionSection requiredPermission="assets.view">
        <AssetKPIs />
      </PermissionSection>
      
      <PermissionSection requiredPermission="work_orders.view">
        <WorkOrderKPIs />
      </PermissionSection>
      
      <PermissionSection requiredPermission="analytics.view">
        <AnalyticsCharts />
      </PermissionSection>
    </div>
  );
}
```

### Pattern 2: Action Buttons
```tsx
const { hasPermission } = usePermissions();

<div className="flex gap-2">
  {hasPermission('work_orders.edit') && <EditButton />}
  {hasPermission('work_orders.delete') && <DeleteButton />}
  {hasPermission('work_orders.complete') && <CompleteButton />}
</div>
```

### Pattern 3: Table Actions
```tsx
<PermissionSection requiredPermission="assets.create">
  <button>+ Create Asset</button>
</PermissionSection>

<table>
  {assets.map(asset => (
    <tr key={asset.id}>
      <td>{asset.name}</td>
      <td>
        <PermissionSection requiredPermission="assets.edit">
          <EditIcon />
        </PermissionSection>
        <PermissionSection requiredPermission="assets.delete">
          <DeleteIcon />
        </PermissionSection>
      </td>
    </tr>
  ))}
</table>
```

### Pattern 4: Form Fields
```tsx
<form>
  <input name="name" />
  
  <PermissionSection requiredPermission="assets.advanced">
    <input name="advancedField" />
  </PermissionSection>
  
  <PermissionSection requiredPermission="assets.create">
    <button type="submit">Create</button>
  </PermissionSection>
</form>
```

## Permission Naming

```
module.action
```

Examples:
- `assets.view`
- `assets.create`
- `assets.edit`
- `assets.delete`
- `work_orders.view`
- `work_orders.create`
- `work_orders.complete`
- `maintenance.execute`
- `pm_schedules.view`
- `production.plan`
- `surveys.create`
- `tools.request`
- `parts.request`
- `inventory.adjust`
- `reports.view`
- `analytics.view`
- `settings.view`
- `users.manage`

## Hook Methods

```tsx
const {
  hasPermission,        // Check single permission
  hasAnyPermission,     // Check if has ANY of permissions
  hasAllPermissions,    // Check if has ALL permissions
  hasRole,              // Check user role
  hasAnyRole,           // Check if has any of roles
  userRole,             // Current user role
  userPermissions,      // Array of user permissions
  loading               // Loading state
} = usePermissions();
```

## Tips

1. **Use PermissionSection for UI elements** - Cleaner than conditional rendering
2. **Use hasPermission for logic** - Better for complex conditions
3. **Admin bypass** - Admin role automatically has all permissions
4. **Fallback logic** - If checking `module.view`, system checks related permissions
5. **No breaking changes** - Wrap existing code, don't rewrite

## Quick Start

1. Import `PermissionSection`
2. Wrap sections that need protection
3. Test with different permissions
4. Done!

```tsx
// Before
<CreateButton />

// After
<PermissionSection requiredPermission="module.create">
  <CreateButton />
</PermissionSection>
```
