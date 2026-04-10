import { db } from '../src/lib/db'
import { hash } from 'bcryptjs'

async function seed() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  const tables = [
    'wo_status_history', 'wo_comments', 'wo_materials', 'wo_time_logs',
    'wo_team_members', 'work_orders', 'mr_status_history', 'mr_comments',
    'maintenance_requests', 'user_permissions', 'role_permissions',
    'user_roles', 'user_plants', 'audit_logs', 'company_modules',
    'modules', 'departments', 'plants', 'permissions', 'roles', 'users'
  ]

  for (const table of tables) {
    try {
      await db.$executeRawUnsafe(`DELETE FROM ${table}`)
    } catch (e) {
      // table might not exist yet
    }
  }

  // ============================================================================
  // 1. ROLES
  // ============================================================================
  const roles = await Promise.all([
    db.role.create({ data: { name: 'System Administrator', slug: 'admin', level: 10, isSystem: true, color: '#ef4444', description: 'Full system access' } }),
    db.role.create({ data: { name: 'Plant Manager', slug: 'manager', level: 8, isSystem: true, color: '#f97316', description: 'Plant management oversight' } }),
    db.role.create({ data: { name: 'Maintenance Planner', slug: 'planner', level: 6, isSystem: true, color: '#8b5cf6', description: 'Plan and schedule maintenance work' } }),
    db.role.create({ data: { name: 'Supervisor', slug: 'supervisor', level: 5, isSystem: true, color: '#3b82f6', description: 'Supervise teams and approve requests' } }),
    db.role.create({ data: { name: 'Technician', slug: 'technician', level: 3, isSystem: true, color: '#22c55e', description: 'Execute maintenance work orders' } }),
    db.role.create({ data: { name: 'Operator', slug: 'operator', level: 2, isSystem: true, color: '#06b6d4', description: 'Machine operator - can create requests' } }),
    db.role.create({ data: { name: 'Shop Attendant', slug: 'shop_attendant', level: 4, isSystem: true, color: '#eab308', description: 'Manage inventory and issue materials' } }),
  ])

  const roleMap = Object.fromEntries(roles.map(r => [r.slug, r.id]))

  // ============================================================================
  // 2. PERMISSIONS (organized by module)
  // ============================================================================
  const permissionDefs = [
    // Dashboard
    { slug: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view' },
    // Work Orders
    { slug: 'work_orders.view', name: 'View Work Orders', module: 'work_orders', action: 'view' },
    { slug: 'work_orders.view_all', name: 'View All Work Orders', module: 'work_orders', action: 'view_all' },
    { slug: 'work_orders.view_own', name: 'View Own Work Orders', module: 'work_orders', action: 'view_own' },
    { slug: 'work_orders.create', name: 'Create Work Orders', module: 'work_orders', action: 'create' },
    { slug: 'work_orders.update', name: 'Update Work Orders', module: 'work_orders', action: 'update' },
    { slug: 'work_orders.delete', name: 'Delete Work Orders', module: 'work_orders', action: 'delete' },
    { slug: 'work_orders.assign', name: 'Assign Work Orders', module: 'work_orders', action: 'assign' },
    { slug: 'work_orders.approve', name: 'Approve Work Orders', module: 'work_orders', action: 'approve' },
    { slug: 'work_orders.execute', name: 'Execute Work Orders', module: 'work_orders', action: 'execute' },
    { slug: 'work_orders.complete', name: 'Complete Work Orders', module: 'work_orders', action: 'complete' },
    { slug: 'work_orders.verify', name: 'Verify Work Orders', module: 'work_orders', action: 'verify' },
    { slug: 'work_orders.close', name: 'Close Work Orders', module: 'work_orders', action: 'close' },
    { slug: 'work_orders.export', name: 'Export Work Orders', module: 'work_orders', action: 'export' },
    // Maintenance Requests
    { slug: 'maintenance_requests.view', name: 'View Maintenance Requests', module: 'maintenance_requests', action: 'view' },
    { slug: 'maintenance_requests.view_all', name: 'View All Requests', module: 'maintenance_requests', action: 'view_all' },
    { slug: 'maintenance_requests.create', name: 'Create Requests', module: 'maintenance_requests', action: 'create' },
    { slug: 'maintenance_requests.update', name: 'Update Requests', module: 'maintenance_requests', action: 'update' },
    { slug: 'maintenance_requests.delete', name: 'Delete Requests', module: 'maintenance_requests', action: 'delete' },
    { slug: 'maintenance_requests.approve', name: 'Approve Requests', module: 'maintenance_requests', action: 'approve' },
    { slug: 'maintenance_requests.reject', name: 'Reject Requests', module: 'maintenance_requests', action: 'reject' },
    { slug: 'maintenance_requests.triage', name: 'Triage Requests', module: 'maintenance_requests', action: 'triage' },
    { slug: 'maintenance_requests.convert', name: 'Convert to Work Order', module: 'maintenance_requests', action: 'convert' },
    // Assets
    { slug: 'assets.view', name: 'View Assets', module: 'assets', action: 'view' },
    { slug: 'assets.create', name: 'Create Assets', module: 'assets', action: 'create' },
    { slug: 'assets.update', name: 'Update Assets', module: 'assets', action: 'update' },
    { slug: 'assets.delete', name: 'Delete Assets', module: 'assets', action: 'delete' },
    { slug: 'assets.export', name: 'Export Assets', module: 'assets', action: 'export' },
    // Inventory
    { slug: 'inventory.view', name: 'View Inventory', module: 'inventory', action: 'view' },
    { slug: 'inventory.create', name: 'Create Items', module: 'inventory', action: 'create' },
    { slug: 'inventory.update', name: 'Update Items', module: 'inventory', action: 'update' },
    { slug: 'inventory.delete', name: 'Delete Items', module: 'inventory', action: 'delete' },
    { slug: 'inventory.adjust', name: 'Adjust Stock', module: 'inventory', action: 'adjust' },
    { slug: 'inventory.issue', name: 'Issue Items', module: 'inventory', action: 'issue' },
    { slug: 'inventory.receive', name: 'Receive Items', module: 'inventory', action: 'receive' },
    // Settings & Admin
    { slug: 'settings.view', name: 'View Settings', module: 'settings', action: 'view' },
    { slug: 'settings.update', name: 'Update Settings', module: 'settings', action: 'update' },
    { slug: 'users.view', name: 'View Users', module: 'users', action: 'view' },
    { slug: 'users.create', name: 'Create Users', module: 'users', action: 'create' },
    { slug: 'users.update', name: 'Update Users', module: 'users', action: 'update' },
    { slug: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete' },
    { slug: 'roles.view', name: 'View Roles', module: 'roles', action: 'view' },
    { slug: 'roles.create', name: 'Create Roles', module: 'roles', action: 'create' },
    { slug: 'roles.update', name: 'Update Roles', module: 'roles', action: 'update' },
    { slug: 'roles.delete', name: 'Delete Roles', module: 'roles', action: 'delete' },
    { slug: 'roles.assign', name: 'Assign Roles', module: 'roles', action: 'assign' },
    { slug: 'permissions.view', name: 'View Permissions', module: 'permissions', action: 'view' },
    { slug: 'permissions.manage', name: 'Manage Permissions', module: 'permissions', action: 'manage' },
    { slug: 'modules.manage', name: 'Manage Modules', module: 'modules', action: 'manage' },
    { slug: 'modules.activate', name: 'Activate Modules', module: 'modules', action: 'activate' },
    { slug: 'reports.view', name: 'View Reports', module: 'reports', action: 'view' },
    { slug: 'reports.create', name: 'Create Reports', module: 'reports', action: 'create' },
    { slug: 'reports.export', name: 'Export Reports', module: 'reports', action: 'export' },
    { slug: 'analytics.view', name: 'View Analytics', module: 'analytics', action: 'view' },
  ]

  const permissions = await Promise.all(
    permissionDefs.map(p => db.permission.create({ data: p }))
  )
  const permMap = Object.fromEntries(permissions.map(p => [p.slug, p.id]))

  // ============================================================================
  // 3. ROLE-PERMISSION ASSIGNMENTS
  // ============================================================================
  const rolePerms: Record<string, string[]> = {
    admin: permissions.map(p => p.slug), // ALL permissions
    manager: [
      'dashboard.view', 'work_orders.*', 'maintenance_requests.*', 'assets.*',
      'inventory.*', 'reports.*', 'analytics.*', 'users.view', 'roles.view',
      'permissions.view', 'modules.view'
    ],
    planner: [
      'dashboard.view', 'work_orders.view', 'work_orders.view_all', 'work_orders.create',
      'work_orders.update', 'work_orders.assign', 'work_orders.export',
      'maintenance_requests.view', 'maintenance_requests.view_all', 'maintenance_requests.approve',
      'maintenance_requests.triage', 'maintenance_requests.convert',
      'assets.view', 'inventory.view', 'reports.view', 'analytics.view'
    ],
    supervisor: [
      'dashboard.view', 'work_orders.view', 'work_orders.view_all', 'work_orders.create',
      'work_orders.assign', 'work_orders.approve', 'work_orders.verify',
      'maintenance_requests.view', 'maintenance_requests.view_all', 'maintenance_requests.approve',
      'maintenance_requests.create',
      'assets.view', 'inventory.view', 'users.view', 'reports.view'
    ],
    technician: [
      'dashboard.view', 'work_orders.view', 'work_orders.view_own', 'work_orders.execute',
      'work_orders.complete', 'maintenance_requests.view', 'maintenance_requests.create',
      'assets.view', 'inventory.view', 'inventory.request'
    ],
    operator: [
      'dashboard.view', 'maintenance_requests.view', 'maintenance_requests.create',
      'assets.view', 'inventory.view'
    ],
    shop_attendant: [
      'dashboard.view', 'inventory.view', 'inventory.create', 'inventory.update',
      'inventory.adjust', 'inventory.issue', 'inventory.receive',
      'work_orders.view', 'assets.view'
    ],
  }

  for (const [roleSlug, permSlugs] of Object.entries(rolePerms)) {
    const roleId = roleMap[roleSlug]
    if (!roleId) continue

    const resolvedPerms = permSlugs.flatMap(slug => {
      if (slug.endsWith('.*')) {
        const module = slug.replace('.*', '')
        return permissions.filter(p => p.module === module).map(p => p.id)
      }
      return permMap[slug] ? [permMap[slug]] : []
    })

    for (const permId of resolvedPerms) {
      await db.rolePermission.create({
        data: { roleId, permissionId: permId }
      }).catch(() => {}) // ignore duplicates
    }
  }

  // ============================================================================
  // 4. PLANTS
  // ============================================================================
  const temaPlant = await db.plant.create({
    data: { code: 'TEMA', name: 'Tema Factory', location: 'Tema, Greater Accra, Ghana' }
  })
  const takoradiPlant = await db.plant.create({
    data: { code: 'TAK', name: 'Takoradi Factory', location: 'Takoradi, Western Region, Ghana' }
  })

  // ============================================================================
  // 5. DEPARTMENTS
  // ============================================================================
  const deptMaintenance = await db.department.create({ data: { name: 'Maintenance', code: 'MAINT', level: 1 } })
  const deptProduction = await db.department.create({ data: { name: 'Production', code: 'PROD', level: 1 } })
  const deptEngineering = await db.department.create({ data: { name: 'Engineering', code: 'ENG', level: 1 } })
  const deptQuality = await db.department.create({ data: { name: 'Quality Control', code: 'QC', level: 1 } })
  const deptStores = await db.department.create({ data: { name: 'Stores & Inventory', code: 'STORES', level: 1 } })
  const deptHR = await db.department.create({ data: { name: 'Human Resources', code: 'HR', level: 1 } })

  // ============================================================================
  // 6. MODULES (subscription system)
  // ============================================================================
  const modules = await Promise.all([
    db.module.create({ data: { code: 'CORE', name: 'Core Platform', description: 'Authentication, dashboard, settings', icon: 'Settings', isCore: true, isActive: true, sortOrder: 0, routePath: '/dashboard' } }),
    db.module.create({ data: { code: 'RWOP', name: 'Repairs & Work Orders', description: 'Maintenance requests, work orders, team management', icon: 'Wrench', isCore: false, isActive: true, sortOrder: 1, routePath: '/work-orders' } }),
    db.module.create({ data: { code: 'ASSET', name: 'Asset Management', description: 'Machines, assemblies, parts, hierarchy', icon: 'Factory', isCore: false, isActive: true, sortOrder: 2, routePath: '/assets' } }),
    db.module.create({ data: { code: 'IMS', name: 'Inventory Management', description: 'Stock items, transactions, requisitions', icon: 'Package', isCore: false, isActive: true, sortOrder: 3, routePath: '/inventory' } }),
    db.module.create({ data: { code: 'MRMP', name: 'Preventive Maintenance', description: 'PM schedules, calibration, meters', icon: 'CalendarClock', isCore: false, isActive: false, sortOrder: 4, routePath: '/pm' } }),
    db.module.create({ data: { code: 'MPMP', name: 'Production & OEE', description: 'Production tracking, OEE, downtime', icon: 'BarChart3', isCore: false, isActive: false, sortOrder: 5, routePath: '/production' } }),
    db.module.create({ data: { code: 'HRMS', name: 'Human Resources', description: 'Shifts, skills, training, rosters', icon: 'Users', isCore: false, isActive: false, sortOrder: 6, routePath: '/hr' } }),
    db.module.create({ data: { code: 'TRAC', name: 'Tools & Safety', description: 'LOTO, permits, risk assessment, tools', icon: 'Shield', isCore: false, isActive: false, sortOrder: 7, routePath: '/safety' } }),
    db.module.create({ data: { code: 'IOT', name: 'IoT & Predictive', description: 'IoT sensors, predictive maintenance', icon: 'Radio', isCore: false, isActive: false, sortOrder: 8, routePath: '/iot' } }),
    db.module.create({ data: { code: 'REPORTS', name: 'Reports & Analytics', description: 'KPIs, dashboards, custom reports', icon: 'FileBarChart', isCore: false, isActive: true, sortOrder: 9, routePath: '/reports' } }),
  ])

  // Auto-activate core and licensed modules at company level
  for (const mod of modules) {
    await db.companyModule.create({
      data: {
        moduleId: mod.id,
        isEnabled: mod.isCore || mod.isActive,
        activatedAt: mod.isCore || mod.isActive ? new Date() : null,
      }
    })
  }

  // ============================================================================
  // 7. USERS
  // ============================================================================
  const adminPass = await hash('admin123')
  const userPass = await hash('password123')

  const users = await Promise.all([
    db.user.create({
      data: {
        username: 'admin', email: 'admin@gtp.com.gh', password: adminPass,
        fullName: 'System Administrator', departmentId: deptMaintenance.id,
        plantId: temaPlant.id, status: 'active'
      }
    }),
    db.user.create({
      data: {
        username: 'kwame.asante', email: 'kwame@gtp.com.gh', password: userPass,
        fullName: 'Kwame Asante', departmentId: deptProduction.id,
        supervisorId: null, plantId: temaPlant.id, status: 'active'
      }
    }),
    db.user.create({
      data: {
        username: 'ama.mensah', email: 'ama@gtp.com.gh', password: userPass,
        fullName: 'Ama Mensah', departmentId: deptMaintenance.id,
        plantId: temaPlant.id, status: 'active'
      }
    }),
    db.user.create({
      data: {
        username: 'kojo.boateng', email: 'kojo@gtp.com.gh', password: userPass,
        fullName: 'Kojo Boateng', departmentId: deptEngineering.id,
        plantId: temaPlant.id, status: 'active'
      }
    }),
    db.user.create({
      data: {
        username: 'efua.darko', email: 'efua@gtp.com.gh', password: userPass,
        fullName: 'Efua Darko', departmentId: deptMaintenance.id,
        plantId: temaPlant.id, status: 'active'
      }
    }),
    db.user.create({
      data: {
        username: 'kofi.owusu', email: 'kofi@gtp.com.gh', password: userPass,
        fullName: 'Kofi Owusu', departmentId: deptProduction.id,
        plantId: temaPlant.id, status: 'active'
      }
    }),
    db.user.create({
      data: {
        username: 'abena.ampofo', email: 'abena@gtp.com.gh', password: userPass,
        fullName: 'Abena Ampofo', departmentId: deptStores.id,
        plantId: temaPlant.id, status: 'active'
      }
    }),
  ])

  // Set supervisor relationships
  await db.user.update({ where: { id: users[1].id }, data: { supervisorId: users[3].id } }) // Kwame -> Kojo (Supervisor)
  await db.user.update({ where: { id: users[4].id }, data: { supervisorId: users[3].id } }) // Efua -> Kojo (Supervisor)

  // Assign roles
  const userRoles = [
    { userId: users[0].id, roleId: roleMap.admin },
    { userId: users[1].id, roleId: roleMap.manager },
    { userId: users[2].id, roleId: roleMap.planner },
    { userId: users[3].id, roleId: roleMap.supervisor },
    { userId: users[4].id, roleId: roleMap.technician },
    { userId: users[5].id, roleId: roleMap.operator },
    { userId: users[6].id, roleId: roleMap.shop_attendant },
  ]

  await Promise.all(
    userRoles.map(ur => db.userRole.create({ data: ur }))
  )

  // Assign plant access
  await Promise.all([
    db.userPlant.create({ data: { userId: users[0].id, plantId: temaPlant.id, isPrimary: true, accessLevel: 'admin' } }),
    db.userPlant.create({ data: { userId: users[0].id, plantId: takoradiPlant.id, isPrimary: false, accessLevel: 'admin' } }),
    db.userPlant.create({ data: { userId: users[1].id, plantId: temaPlant.id, isPrimary: true, accessLevel: 'write' } }),
    db.userPlant.create({ data: { userId: users[2].id, plantId: temaPlant.id, isPrimary: true, accessLevel: 'write' } }),
    db.userPlant.create({ data: { userId: users[3].id, plantId: temaPlant.id, isPrimary: true, accessLevel: 'write' } }),
    db.userPlant.create({ data: { userId: users[4].id, plantId: temaPlant.id, isPrimary: true, accessLevel: 'write' } }),
    db.userPlant.create({ data: { userId: users[5].id, plantId: temaPlant.id, isPrimary: true, accessLevel: 'read' } }),
    db.userPlant.create({ data: { userId: users[6].id, plantId: temaPlant.id, isPrimary: true, accessLevel: 'write' } }),
  ])

  // ============================================================================
  // 8. SAMPLE DATA
  // ============================================================================

  // Sample maintenance requests
  const mr1 = await db.maintenanceRequest.create({
    data: {
      requestNumber: 'MR-2026-001',
      title: 'Bearing replacement on Conveyor Belt B3',
      description: 'Unusual vibration detected on main drive bearing. Temperature running 15°C above normal. Needs urgent inspection and probable replacement.',
      priority: 'high', machineDown: false, assetName: 'Conveyor Belt B3', location: 'Production Line 2 - Packaging',
      status: 'approved', workflowStatus: 'assigned_to_planner',
      requestedById: users[5].id, supervisorId: users[3].id, approvedById: users[3].id,
      approvedAt: new Date('2026-04-09T08:30:00'),
      category: 'mechanical', plannerId: users[2].id
    }
  })

  const mr2 = await db.maintenanceRequest.create({
    data: {
      requestNumber: 'MR-2026-002',
      title: 'Emergency stop button not responding',
      description: 'The emergency stop button on Filling Machine F1 is not responding. This is a safety critical issue that needs immediate attention.',
      priority: 'urgent', machineDown: true, assetName: 'Filling Machine F1', location: 'Production Line 1 - Filling',
      status: 'pending', workflowStatus: 'pending',
      requestedById: users[5].id, supervisorId: users[3].id,
      category: 'electrical'
    }
  })

  const mr3 = await db.maintenanceRequest.create({
    data: {
      requestNumber: 'MR-2026-003',
      title: 'Monthly PM check - Boiler System',
      description: 'Scheduled monthly preventive maintenance check for the main boiler system including safety valves, pressure gauges, and fuel system.',
      priority: 'medium', machineDown: false, assetName: 'Main Boiler System', location: 'Utilities Building',
      status: 'approved', workflowStatus: 'approved',
      requestedById: users[2].id, supervisorId: users[1].id, approvedById: users[1].id,
      approvedAt: new Date('2026-04-08T14:00:00'),
      category: 'mechanical', plannerId: users[2].id
    }
  })

  // Sample work orders
  const wo1 = await db.workOrder.create({
    data: {
      woNumber: 'WO-2026-001',
      title: 'Replace main drive bearing - Conveyor B3',
      description: 'Remove existing SKF 6310-2RS bearing and replace with new unit. Check alignment and lubricate housing.',
      type: 'corrective', priority: 'high',
      status: 'assigned', assetName: 'Conveyor Belt B3', requestId: mr1.id,
      assignedToId: users[4].id, assignedToName: 'Efua Darko',
      supervisorId: users[3].id, plannerId: users[2].id, assignedById: users[2].id,
      assignedAt: new Date('2026-04-09T10:00:00'), assignmentType: 'direct',
      estimatedHours: 4, plannedStart: new Date('2026-04-10T08:00:00'),
      slaHours: 24, slaStartedAt: new Date('2026-04-09T08:30:00'),
      createdById: users[2].id, departmentId: deptMaintenance.id
    }
  })

  await db.maintenanceRequest.update({
    where: { id: mr1.id },
    data: { workOrderId: wo1.id, workflowStatus: 'work_order_created' }
  })

  await db.woTeamMember.create({
    data: { workOrderId: wo1.id, userId: users[4].id, userName: 'Efua Darko', role: 'leader' }
  })

  // Status histories
  await db.woStatusHistory.createMany({
    data: [
      { workOrderId: wo1.id, toStatus: 'draft', reason: 'Work order created from maintenance request' },
      { workOrderId: wo1.id, fromStatus: 'draft', toStatus: 'approved', changedById: users[2].id, reason: 'Approved by planner' },
      { workOrderId: wo1.id, fromStatus: 'approved', toStatus: 'assigned', changedById: users[2].id, reason: 'Assigned to Efua Darko' },
    ]
  })

  console.log('✅ Seed completed!')
  console.log('')
  console.log('📋 Test Accounts:')
  console.log('  Admin:     admin / admin123')
  console.log('  Manager:   kwame.asante / password123')
  console.log('  Planner:   ama.mensah / password123')
  console.log('  Supervisor: kojo.boateng / password123')
  console.log('  Technician: efua.darko / password123')
  console.log('  Operator:  kofi.owusu / password123')
  console.log('  Shop:      abena.ampofo / password123')
}

seed()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await db.$disconnect()
    process.exit(1)
  })
