import { db } from '../src/lib/db'

async function hashPwd(p: string): Promise<string> {
  const bcryptjs = await import('bcryptjs')
  return bcryptjs.default.hash(p, 10)
}

async function seed() {
  console.log('🌱 Seeding database...')

  const tables = [
    'wo_comments', 'wo_materials', 'wo_time_logs', 'wo_team_members',
    'work_orders', 'maintenance_requests', 'status_transitions', 'audit_logs',
    'company_modules', 'system_modules', 'user_plants', 'departments',
    'plants', 'user_permissions', 'role_permissions', 'user_roles',
    'permissions', 'roles', 'users'
  ]
  for (const t of tables) {
    try { await db.$executeRawUnsafe(`DELETE FROM ${t}`) } catch (e) { /* ok */ }
  }

  const roles = await Promise.all([
    db.role.create({ data: { name: 'System Administrator', slug: 'admin', level: 10, isSystem: true, description: 'Full system access' } }),
    db.role.create({ data: { name: 'Plant Manager', slug: 'manager', level: 8, isSystem: true, description: 'Plant management' } }),
    db.role.create({ data: { name: 'Maintenance Planner', slug: 'planner', level: 6, isSystem: true, description: 'Plan maintenance' } }),
    db.role.create({ data: { name: 'Supervisor', slug: 'supervisor', level: 5, isSystem: true, description: 'Supervise teams' } }),
    db.role.create({ data: { name: 'Technician', slug: 'technician', level: 3, isSystem: true, description: 'Execute work orders' } }),
    db.role.create({ data: { name: 'Operator', slug: 'operator', level: 2, isSystem: true, description: 'Machine operator' } }),
    db.role.create({ data: { name: 'Shop Attendant', slug: 'shop_attendant', level: 4, isSystem: true, description: 'Manage inventory' } }),
  ])
  const roleMap = Object.fromEntries(roles.map(r => [r.slug, r.id]))

  const permDefs = [
    { slug: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view' },
    { slug: 'work_orders.view', name: 'View Work Orders', module: 'work_orders', action: 'view' },
    { slug: 'work_orders.create', name: 'Create Work Orders', module: 'work_orders', action: 'create' },
    { slug: 'work_orders.update', name: 'Update Work Orders', module: 'work_orders', action: 'update' },
    { slug: 'work_orders.delete', name: 'Delete Work Orders', module: 'work_orders', action: 'delete' },
    { slug: 'work_orders.assign', name: 'Assign Work Orders', module: 'work_orders', action: 'assign' },
    { slug: 'work_orders.approve', name: 'Approve Work Orders', module: 'work_orders', action: 'approve' },
    { slug: 'work_orders.execute', name: 'Execute Work Orders', module: 'work_orders', action: 'execute' },
    { slug: 'work_orders.complete', name: 'Complete Work Orders', module: 'work_orders', action: 'complete' },
    { slug: 'work_orders.verify', name: 'Verify Work Orders', module: 'work_orders', action: 'verify' },
    { slug: 'work_orders.close', name: 'Close Work Orders', module: 'work_orders', action: 'close' },
    { slug: 'maintenance_requests.view', name: 'View Requests', module: 'maintenance_requests', action: 'view' },
    { slug: 'maintenance_requests.create', name: 'Create Requests', module: 'maintenance_requests', action: 'create' },
    { slug: 'maintenance_requests.update', name: 'Update Requests', module: 'maintenance_requests', action: 'update' },
    { slug: 'maintenance_requests.delete', name: 'Delete Requests', module: 'maintenance_requests', action: 'delete' },
    { slug: 'maintenance_requests.approve', name: 'Approve Requests', module: 'maintenance_requests', action: 'approve' },
    { slug: 'maintenance_requests.reject', name: 'Reject Requests', module: 'maintenance_requests', action: 'reject' },
    { slug: 'maintenance_requests.convert', name: 'Convert to WO', module: 'maintenance_requests', action: 'convert' },
    { slug: 'assets.view', name: 'View Assets', module: 'assets', action: 'view' },
    { slug: 'assets.create', name: 'Create Assets', module: 'assets', action: 'create' },
    { slug: 'assets.update', name: 'Update Assets', module: 'assets', action: 'update' },
    { slug: 'assets.delete', name: 'Delete Assets', module: 'assets', action: 'delete' },
    { slug: 'inventory.view', name: 'View Inventory', module: 'inventory', action: 'view' },
    { slug: 'inventory.create', name: 'Create Items', module: 'inventory', action: 'create' },
    { slug: 'inventory.update', name: 'Update Items', module: 'inventory', action: 'update' },
    { slug: 'inventory.issue', name: 'Issue Items', module: 'inventory', action: 'issue' },
    { slug: 'reports.view', name: 'View Reports', module: 'reports', action: 'view' },
    { slug: 'analytics.view', name: 'View Analytics', module: 'analytics', action: 'view' },
    { slug: 'settings.view', name: 'View Settings', module: 'settings', action: 'view' },
    { slug: 'settings.update', name: 'Update Settings', module: 'settings', action: 'update' },
    { slug: 'users.view', name: 'View Users', module: 'users', action: 'view' },
    { slug: 'users.create', name: 'Create Users', module: 'users', action: 'create' },
    { slug: 'users.update', name: 'Update Users', module: 'users', action: 'update' },
    { slug: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete' },
    { slug: 'modules.manage', name: 'Manage Modules', module: 'modules', action: 'manage' },
    { slug: 'modules.activate', name: 'Activate Modules', module: 'modules', action: 'activate' },
    { slug: 'roles.view', name: 'View Roles', module: 'roles', action: 'view' },
    { slug: 'permissions.view', name: 'View Permissions', module: 'permissions', action: 'view' },
  ]
  const perms = await Promise.all(permDefs.map(p => db.permission.create({ data: p })))
  const permMap = Object.fromEntries(perms.map(p => [p.slug, p.id]))

  const rp: Record<string, string[]> = {
    admin: perms.map(p => p.slug),
    manager: ['dashboard.view','work_orders.view','work_orders.approve','maintenance_requests.view','maintenance_requests.approve','maintenance_requests.create','assets.view','inventory.view','reports.view','analytics.view','users.view','roles.view','permissions.view','modules.manage'],
    planner: ['dashboard.view','work_orders.view','work_orders.create','work_orders.assign','work_orders.update','maintenance_requests.view','maintenance_requests.approve','maintenance_requests.convert','maintenance_requests.create','assets.view','inventory.view','reports.view'],
    supervisor: ['dashboard.view','work_orders.view','work_orders.assign','work_orders.approve','work_orders.verify','maintenance_requests.view','maintenance_requests.approve','maintenance_requests.create','assets.view','inventory.view','users.view','reports.view'],
    technician: ['dashboard.view','work_orders.view','work_orders.execute','work_orders.complete','maintenance_requests.view','maintenance_requests.create','assets.view','inventory.view'],
    operator: ['dashboard.view','maintenance_requests.view','maintenance_requests.create','assets.view','inventory.view'],
    shop_attendant: ['dashboard.view','inventory.view','inventory.create','inventory.issue','inventory.update','work_orders.view','assets.view'],
  }
  for (const [roleSlug, permSlugs] of Object.entries(rp)) {
    for (const pid of permSlugs) {
      if (!permMap[pid]) continue
      await db.rolePermission.create({ data: { roleId: roleMap[roleSlug], permissionId: permMap[pid] } }).catch(() => {})
    }
  }

  const temaPlant = await db.plant.create({ data: { name: 'Tema Factory', code: 'TEMA', location: 'Tema, Greater Accra, Ghana', country: 'Ghana', city: 'Tema' } })
  const takoradiPlant = await db.plant.create({ data: { name: 'Takoradi Factory', code: 'TAK', location: 'Takoradi, Western Region, Ghana', country: 'Ghana', city: 'Takoradi' } })
  const maint = await db.department.create({ data: { name: 'Maintenance', code: 'MAINT', plantId: temaPlant.id } })
  const prod = await db.department.create({ data: { name: 'Production', code: 'PROD', plantId: temaPlant.id } })
  const eng = await db.department.create({ data: { name: 'Engineering', code: 'ENG', plantId: temaPlant.id } })
  await db.department.create({ data: { name: 'Stores & Inventory', code: 'STORES', plantId: temaPlant.id } })

  const mods = await Promise.all([
    db.systemModule.create({ data: { code: 'CORE', name: 'Core Platform', description: 'Authentication, dashboard, settings', version: '1.0.0', isCore: true, isSystemLicensed: true } }),
    db.systemModule.create({ data: { code: 'RWOP', name: 'Repairs & Work Orders', description: 'Maintenance requests and work order management', version: '1.0.0', isSystemLicensed: true } }),
    db.systemModule.create({ data: { code: 'ASSET', name: 'Asset Management', description: 'Machines, assemblies, parts management', version: '1.0.0', isSystemLicensed: true } }),
    db.systemModule.create({ data: { code: 'IMS', name: 'Inventory Management', description: 'Stock, transactions, requisitions', version: '1.0.0', isSystemLicensed: true } }),
    db.systemModule.create({ data: { code: 'MRMP', name: 'Preventive Maintenance', description: 'PM schedules, calibration, meters', version: '1.0.0', isSystemLicensed: false } }),
    db.systemModule.create({ data: { code: 'MPMP', name: 'Production & OEE', description: 'Production tracking, OEE, downtime', version: '1.0.0', isSystemLicensed: false } }),
    db.systemModule.create({ data: { code: 'HRMS', name: 'Human Resources', description: 'Shifts, skills, training', version: '1.0.0', isSystemLicensed: false } }),
    db.systemModule.create({ data: { code: 'TRAC', name: 'Tools & Safety', description: 'LOTO, permits, risk assessment', version: '1.0.0', isSystemLicensed: false } }),
    db.systemModule.create({ data: { code: 'REPORTS', name: 'Reports & Analytics', description: 'KPIs, dashboards', version: '1.0.0', isSystemLicensed: true } }),
  ])
  for (const m of mods) {
    await db.companyModule.create({ data: { systemModuleId: m.id, isEnabled: m.isCore || m.isSystemLicensed, activatedAt: m.isCore || m.isSystemLicensed ? new Date() : null } })
  }

  const users = await Promise.all([
    db.user.create({ data: { username: 'admin', email: 'admin@gtp.com.gh', passwordHash: await hashPwd('admin123'), fullName: 'System Administrator', department: 'Administration', status: 'active' } }),
    db.user.create({ data: { username: 'kwame.asante', email: 'kwame@gtp.com.gh', passwordHash: await hashPwd('password123'), fullName: 'Kwame Asante', department: 'Production', status: 'active' } }),
    db.user.create({ data: { username: 'ama.mensah', email: 'ama@gtp.com.gh', passwordHash: await hashPwd('password123'), fullName: 'Ama Mensah', department: 'Maintenance', status: 'active' } }),
    db.user.create({ data: { username: 'kojo.boateng', email: 'kojo@gtp.com.gh', passwordHash: await hashPwd('password123'), fullName: 'Kojo Boateng', department: 'Engineering', status: 'active' } }),
    db.user.create({ data: { username: 'efua.darko', email: 'efua@gtp.com.gh', passwordHash: await hashPwd('password123'), fullName: 'Efua Darko', department: 'Maintenance', status: 'active' } }),
    db.user.create({ data: { username: 'kofi.owusu', email: 'kofi@gtp.com.gh', passwordHash: await hashPwd('password123'), fullName: 'Kofi Owusu', department: 'Production', status: 'active' } }),
    db.user.create({ data: { username: 'abena.ampofo', email: 'abena@gtp.com.gh', passwordHash: await hashPwd('password123'), fullName: 'Abena Ampofo', department: 'Stores & Inventory', status: 'active' } }),
  ])
  await db.department.update({ where: { id: eng.id }, data: { supervisorId: users[3].id } })
  await db.department.update({ where: { id: maint.id }, data: { supervisorId: users[3].id } })
  await Promise.all([
    db.userRole.create({ data: { userId: users[0].id, roleId: roleMap.admin } }),
    db.userRole.create({ data: { userId: users[1].id, roleId: roleMap.manager } }),
    db.userRole.create({ data: { userId: users[2].id, roleId: roleMap.planner } }),
    db.userRole.create({ data: { userId: users[3].id, roleId: roleMap.supervisor } }),
    db.userRole.create({ data: { userId: users[4].id, roleId: roleMap.technician } }),
    db.userRole.create({ data: { userId: users[5].id, roleId: roleMap.operator } }),
    db.userRole.create({ data: { userId: users[6].id, roleId: roleMap.shop_attendant } }),
  ])
  await Promise.all([
    db.userPlant.create({ data: { userId: users[0].id, plantId: temaPlant.id, accessLevel: 'admin', isPrimary: true } }),
    db.userPlant.create({ data: { userId: users[0].id, plantId: takoradiPlant.id, accessLevel: 'admin', isPrimary: false } }),
    db.userPlant.create({ data: { userId: users[1].id, plantId: temaPlant.id, accessLevel: 'write', isPrimary: true } }),
    db.userPlant.create({ data: { userId: users[2].id, plantId: temaPlant.id, accessLevel: 'write', isPrimary: true } }),
    db.userPlant.create({ data: { userId: users[3].id, plantId: temaPlant.id, accessLevel: 'write', isPrimary: true } }),
    db.userPlant.create({ data: { userId: users[4].id, plantId: temaPlant.id, accessLevel: 'write', isPrimary: true } }),
    db.userPlant.create({ data: { userId: users[5].id, plantId: temaPlant.id, accessLevel: 'read', isPrimary: true } }),
    db.userPlant.create({ data: { userId: users[6].id, plantId: temaPlant.id, accessLevel: 'write', isPrimary: true } }),
  ])

  // Sample data
  const mr1 = await db.maintenanceRequest.create({
    data: {
      requestNumber: 'MR-2026-001', title: 'Bearing replacement on Conveyor Belt B3',
      description: 'Unusual vibration detected on main drive bearing. Temperature running 15°C above normal.',
      priority: 'high', machineDownStatus: false, category: 'mechanical',
      status: 'approved', workflowStatus: 'assigned_to_planner',
      requestedBy: users[5].id, supervisorId: users[3].id, approvedBy: users[3].id,
      assignedPlannerId: users[2].id, departmentId: prod.id, plantId: temaPlant.id,
      plannedStart: new Date('2026-04-10T08:00:00'), estimatedHours: 4, slaHours: 24,
    }
  })
  await db.maintenanceRequest.create({
    data: {
      requestNumber: 'MR-2026-002', title: 'Emergency stop button not responding',
      description: 'Emergency stop button on Filling Machine F1 is not responding. Safety critical.',
      priority: 'urgent', machineDownStatus: true, category: 'electrical',
      status: 'pending', workflowStatus: 'pending',
      requestedBy: users[5].id, supervisorId: users[3].id,
      departmentId: prod.id, plantId: temaPlant.id, slaHours: 4,
    }
  })
  await db.maintenanceRequest.create({
    data: {
      requestNumber: 'MR-2026-003', title: 'Monthly PM check - Boiler System',
      description: 'Scheduled monthly preventive maintenance check for the main boiler.',
      priority: 'medium', machineDownStatus: false, category: 'mechanical',
      status: 'approved', workflowStatus: 'approved',
      requestedBy: users[2].id, supervisorId: users[1].id, approvedBy: users[1].id,
      departmentId: maint.id, plantId: temaPlant.id, estimatedHours: 8, slaHours: 48,
    }
  })
  const wo = await db.workOrder.create({
    data: {
      woNumber: 'WO-2026-001', title: 'Replace main drive bearing - Conveyor B3',
      description: 'Remove existing bearing and replace. Check alignment.',
      type: 'corrective', priority: 'high', status: 'assigned',
      maintenanceRequestId: mr1.id, assetName: 'Conveyor Belt B3',
      departmentId: maint.id, plantId: temaPlant.id,
      assignedTo: users[4].id, teamLeaderId: users[4].id,
      assignedBy: users[2].id, plannerId: users[2].id,
      assignmentType: 'direct', estimatedHours: 4,
      plannedStart: new Date('2026-04-10T08:00:00'), slaHours: 24,
    }
  })
  await db.maintenanceRequest.update({ where: { id: mr1.id }, data: { workOrderId: wo.id, workflowStatus: 'work_order_created' } })
  await db.woTeamMember.create({ data: { workOrderId: wo.id, userId: users[4].id, role: 'team_leader' } })

  console.log('✅ Seed completed!')
  console.log('  Admin:     admin / admin123')
  console.log('  Others:   <username> / password123')
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
