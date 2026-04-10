import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create Permissions
  const modules = [
    'dashboard',
    'maintenance_requests',
    'work_orders',
    'assets',
    'inventory',
    'reports',
    'users',
    'roles',
    'modules',
    'settings',
  ];
  const actions = ['view', 'create', 'update', 'delete', 'approve', 'assign', 'execute', 'export'];

  const permissionMap: Record<string, string> = {};
  for (const mod of modules) {
    for (const action of actions) {
      // Some modules don't need all actions
      if (mod === 'dashboard' && !['view'].includes(action)) continue;
      if (mod === 'settings' && !['view', 'update'].includes(action)) continue;
      if (mod === 'modules' && !['view', 'update'].includes(action)) continue;

      const perm = await db.permission.create({
        data: {
          slug: `${mod}.${action}`,
          name: `${mod.charAt(0).toUpperCase() + mod.slice(1)} - ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          module: mod,
          action,
        },
      });
      permissionMap[perm.slug] = perm.id;
    }
  }
  console.log(`✅ Created ${Object.keys(permissionMap).length} permissions`);

  // 2. Create Roles
  const adminRole = await db.role.create({
    data: {
      name: 'Administrator',
      slug: 'admin',
      description: 'Full system access with all permissions',
      level: 100,
      isSystem: true,
    },
  });

  const plannerRole = await db.role.create({
    data: {
      name: 'Maintenance Planner',
      slug: 'planner',
      description: 'Plans and schedules maintenance work orders',
      level: 80,
      isSystem: true,
    },
  });

  const supervisorRole = await db.role.create({
    data: {
      name: 'Supervisor',
      slug: 'supervisor',
      description: 'Reviews and approves maintenance requests',
      level: 60,
      isSystem: true,
    },
  });

  const technicianRole = await db.role.create({
    data: {
      name: 'Technician',
      slug: 'technician',
      description: 'Executes maintenance work orders',
      level: 40,
      isSystem: true,
    },
  });

  const operatorRole = await db.role.create({
    data: {
      name: 'Operator',
      slug: 'operator',
      description: 'Submits maintenance requests',
      level: 20,
      isSystem: true,
    },
  });

  console.log('✅ Created 5 roles');

  // 3. Assign permissions to roles (except admin - gets all dynamically)
  // Supervisor permissions
  const supervisorPerms = [
    'dashboard.view',
    'maintenance_requests.view', 'maintenance_requests.approve',
    'work_orders.view',
    'reports.view',
  ];
  for (const slug of supervisorPerms) {
    const pid = permissionMap[slug];
    if (pid) {
      await db.rolePermission.create({
        data: { roleId: supervisorRole.id, permissionId: pid },
      });
    }
  }

  // Planner permissions
  const plannerPerms = [
    'dashboard.view',
    'maintenance_requests.view', 'maintenance_requests.create', 'maintenance_requests.update', 'maintenance_requests.approve',
    'work_orders.view', 'work_orders.create', 'work_orders.update', 'work_orders.assign',
    'assets.view',
    'inventory.view',
    'reports.view', 'reports.export',
  ];
  for (const slug of plannerPerms) {
    const pid = permissionMap[slug];
    if (pid) {
      await db.rolePermission.create({
        data: { roleId: plannerRole.id, permissionId: pid },
      });
    }
  }

  // Technician permissions
  const technicianPerms = [
    'dashboard.view',
    'work_orders.view', 'work_orders.execute',
    'inventory.view',
  ];
  for (const slug of technicianPerms) {
    const pid = permissionMap[slug];
    if (pid) {
      await db.rolePermission.create({
        data: { roleId: technicianRole.id, permissionId: pid },
      });
    }
  }

  // Operator permissions
  const operatorPerms = [
    'dashboard.view',
    'maintenance_requests.view', 'maintenance_requests.create', 'maintenance_requests.update',
  ];
  for (const slug of operatorPerms) {
    const pid = permissionMap[slug];
    if (pid) {
      await db.rolePermission.create({
        data: { roleId: operatorRole.id, permissionId: pid },
      });
    }
  }

  console.log('✅ Assigned permissions to roles');

  // 4. Create default plant
  const plant = await db.plant.create({
    data: {
      name: 'Main Plant',
      code: 'MP-001',
      location: 'Industrial Zone A',
      country: 'US',
      city: 'Houston',
      isActive: true,
    },
  });

  console.log('✅ Created default plant');

  // 5. Create default department
  const dept = await db.department.create({
    data: {
      name: 'Maintenance',
      code: 'MAINT',
      plantId: plant.id,
    },
  });

  console.log('✅ Created default department');

  // 6. Create default admin user
  const adminPassword = await hash('admin123', 10);
  const admin = await db.user.create({
    data: {
      username: 'admin',
      email: 'admin@eam.local',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      staffId: 'ADM-001',
      department: 'Maintenance',
      status: 'active',
      userRoles: { create: { roleId: adminRole.id } },
      plantAccess: { create: { plantId: plant.id, accessLevel: 'admin', isPrimary: true } },
    },
  });

  console.log('✅ Created admin user (admin / admin123)');

  // 7. Create demo users
  const demoUsers = [
    { username: 'planner1', email: 'planner@eam.local', fullName: 'John Planner', staffId: 'PLN-001', role: plannerRole, department: 'Maintenance' },
    { username: 'supervisor1', email: 'supervisor@eam.local', fullName: 'Jane Supervisor', staffId: 'SUP-001', role: supervisorRole, department: 'Production', supervisorDept: dept.id },
    { username: 'tech1', email: 'tech@eam.local', fullName: 'Bob Technician', staffId: 'TEC-001', role: technicianRole, department: 'Maintenance' },
    { username: 'operator1', email: 'operator@eam.local', fullName: 'Alice Operator', staffId: 'OPR-001', role: operatorRole, department: 'Production' },
  ];

  for (const u of demoUsers) {
    const pw = await hash('password123', 10);
    await db.user.create({
      data: {
        username: u.username,
        email: u.email,
        passwordHash: pw,
        fullName: u.fullName,
        staffId: u.staffId,
        department: u.department,
        status: 'active',
        userRoles: { create: { roleId: u.role.id } },
        plantAccess: { create: { plantId: plant.id, accessLevel: 'write', isPrimary: false } },
      },
    });
  }

  // Set supervisor for department
  const supervisorUser = await db.user.findUnique({ where: { username: 'supervisor1' } });
  if (supervisorUser) {
    await db.department.update({
      where: { id: dept.id },
      data: { supervisorId: supervisorUser.id },
    });
  }

  console.log('✅ Created demo users');

  // 8. Create System Modules
  const systemModules = [
    { code: 'core', name: 'Core Module', description: 'Core EAM functionality', isCore: true, version: '1.0.0' },
    { code: 'work_orders', name: 'Work Orders', description: 'Work order management', isCore: true, version: '1.0.0' },
    { code: 'maintenance_requests', name: 'Maintenance Requests', description: 'Request management workflow', isCore: true, version: '1.0.0' },
    { code: 'assets', name: 'Asset Management', description: 'Asset registry and tracking', isCore: false, version: '1.0.0' },
    { code: 'inventory', name: 'Inventory / Spare Parts', description: 'Spare parts and materials management', isCore: false, version: '1.0.0' },
    { code: 'preventive', name: 'Preventive Maintenance', description: 'PM scheduling and planning', isCore: false, version: '1.0.0' },
    { code: 'reports', name: 'Reports & Analytics', description: 'Custom reports and KPI dashboards', isCore: false, version: '1.0.0' },
    { code: 'purchasing', name: 'Purchasing', description: 'Purchase requisitions and orders', isCore: false, version: '1.0.0' },
    { code: 'contractors', name: 'Contractor Management', description: 'External contractor tracking', isCore: false, version: '1.0.0' },
    { code: 'documents', name: 'Document Management', description: 'Attach and manage documents', isCore: false, version: '1.0.0' },
  ];

  for (const mod of systemModules) {
    const sysMod = await db.systemModule.create({
      data: {
        code: mod.code,
        name: mod.name,
        description: mod.description,
        isCore: mod.isCore,
        version: mod.version,
      },
    });

    // Auto-activate core modules
    if (mod.isCore) {
      await db.companyModule.create({
        data: {
          systemModuleId: sysMod.id,
          isActive: true,
          isEnabled: true,
          activatedAt: new Date(),
        },
      });
    }
  }

  console.log('✅ Created system modules');

  // 9. Create Status Transitions
  // Maintenance Request transitions
  const mrTransitions = [
    { fromStatus: null, toStatus: 'pending', allowedRoleSlugs: JSON.stringify(['operator', 'supervisor', 'planner', 'admin']) },
    { fromStatus: 'pending', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['supervisor', 'admin']) },
    { fromStatus: 'pending', toStatus: 'approved', allowedRoleSlugs: JSON.stringify(['supervisor', 'planner', 'admin']) },
    { fromStatus: 'pending', toStatus: 'rejected', allowedRoleSlugs: JSON.stringify(['supervisor', 'planner', 'admin']), requiresReason: true },
    { fromStatus: 'approved', toStatus: 'converted', allowedRoleSlugs: JSON.stringify(['planner', 'admin']) },
  ];

  for (const t of mrTransitions) {
    await db.statusTransition.create({
      data: {
        entityType: 'maintenance_request',
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        allowedRoleSlugs: t.allowedRoleSlugs,
        requiresReason: t.requiresReason || false,
      },
    });
  }

  // Work Order transitions
  const woTransitions = [
    { fromStatus: null, toStatus: 'draft', allowedRoleSlugs: JSON.stringify(['planner', 'admin']) },
    { fromStatus: 'draft', toStatus: 'requested', allowedRoleSlugs: JSON.stringify(['planner', 'admin']) },
    { fromStatus: 'draft', toStatus: 'approved', allowedRoleSlugs: JSON.stringify(['planner', 'admin']) },
    { fromStatus: 'approved', toStatus: 'planned', allowedRoleSlugs: JSON.stringify(['planner', 'admin']) },
    { fromStatus: 'planned', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin']) },
    { fromStatus: 'assigned', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['technician', 'admin']) },
    { fromStatus: 'in_progress', toStatus: 'waiting_parts', allowedRoleSlugs: JSON.stringify(['technician', 'planner', 'admin']) },
    { fromStatus: 'in_progress', toStatus: 'completed', allowedRoleSlugs: JSON.stringify(['technician', 'admin']) },
    { fromStatus: 'waiting_parts', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['technician', 'planner', 'admin']) },
    { fromStatus: 'completed', toStatus: 'closed', allowedRoleSlugs: JSON.stringify(['supervisor', 'planner', 'admin']) },
    { fromStatus: 'draft', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner', 'admin']), requiresReason: true },
    { fromStatus: 'requested', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner', 'admin']), requiresReason: true },
  ];

  for (const t of woTransitions) {
    await db.statusTransition.create({
      data: {
        entityType: 'work_order',
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        allowedRoleSlugs: t.allowedRoleSlugs,
        requiresReason: t.requiresReason || false,
      },
    });
  }

  console.log('✅ Created status transitions');

  // 10. Create sample maintenance requests
  const requester = await db.user.findUnique({ where: { username: 'operator1' } });
  const sv = await db.user.findUnique({ where: { username: 'supervisor1' } });

  if (requester) {
    const sampleMRs = [
      { title: 'Leaking hydraulic pump on Press Line 3', priority: 'high', category: 'mechanical', machineDownStatus: true, estimatedHours: 4 },
      { title: 'Electrical panel inspection - Building B', priority: 'medium', category: 'electrical', machineDownStatus: false, estimatedHours: 2 },
      { title: 'Conveyor belt alignment check', priority: 'low', category: 'mechanical', machineDownStatus: false, estimatedHours: 1 },
      { title: 'Emergency stop button not responding', priority: 'urgent', category: 'electrical', machineDownStatus: true, estimatedHours: 1 },
      { title: 'Air compressor routine maintenance', priority: 'medium', category: 'mechanical', machineDownStatus: false, estimatedHours: 3 },
    ];

    for (const mr of sampleMRs) {
      const count = await db.maintenanceRequest.count();
      const now = new Date();
      const prefix = `MR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

      await db.maintenanceRequest.create({
        data: {
          requestNumber: `${prefix}-${String(count + 1).padStart(4, '0')}`,
          title: mr.title,
          priority: mr.priority,
          category: mr.category,
          machineDownStatus: mr.machineDownStatus,
          estimatedHours: mr.estimatedHours,
          requestedBy: requester.id,
          supervisorId: sv?.id ?? null,
          departmentId: dept.id,
          plantId: plant.id,
          status: mr.priority === 'urgent' ? 'in_progress' : mr.priority === 'high' ? 'pending' : 'pending',
        },
      });
    }

    console.log('✅ Created sample maintenance requests');
  }

  console.log('\n🎉 Seeding complete!');
  console.log('\nDefault users:');
  console.log('  Admin:      admin / admin123');
  console.log('  Planner:    planner1 / password123');
  console.log('  Supervisor: supervisor1 / password123');
  console.log('  Technician: tech1 / password123');
  console.log('  Operator:   operator1 / password123');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
