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
    'iot',
    'production',
    'quality',
    'safety',
    'operations',
  ];
  const actions = ['view', 'create', 'update', 'delete', 'approve', 'assign', 'execute', 'export', 'manage', 'activate'];

  const permissionMap: Record<string, string> = {};
  for (const mod of modules) {
    for (const action of actions) {
      // Some modules don't need all actions
      if (mod === 'dashboard' && !['view'].includes(action)) continue;
      if (mod === 'settings' && !['view', 'update'].includes(action)) continue;
      if (mod === 'modules' && !['view', 'update', 'activate', 'manage'].includes(action)) continue;
      if (mod === 'reports' && !['view', 'manage', 'export'].includes(action)) continue;
      if (mod === 'iot' && !['view', 'manage'].includes(action)) continue;
      if (mod === 'production' && !['view', 'manage'].includes(action)) continue;
      if (mod === 'quality' && !['view', 'manage'].includes(action)) continue;
      if (mod === 'safety' && !['view', 'manage'].includes(action)) continue;
      if (mod === 'operations' && !['view', 'manage'].includes(action)) continue;

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

  // 3. Assign ALL permissions to admin role
  const allPermIds = Object.values(permissionMap);
  for (const pid of allPermIds) {
    await db.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: pid },
    });
  }
  console.log(`✅ Assigned ${allPermIds.length} permissions to admin role`);

  // 3b. Assign permissions to other roles (non-admin)
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

  // 8. Create System Modules (35 comprehensive EAM modules)
  const systemModules = [
    // Core modules (always active)
    { code: 'core', name: 'Core Platform', description: 'Core EAM platform with authentication, navigation, and base functionality', isCore: true, version: '2.0.0', licensed: true },
    { code: 'assets', name: 'Asset Management', description: 'Complete asset registry, hierarchy, tracking, and lifecycle management', isCore: true, version: '2.0.0', licensed: true },
    { code: 'maintenance_requests', name: 'Maintenance Requests', description: 'Submit, review, approve, and convert maintenance requests with full workflow', isCore: true, version: '2.0.0', licensed: true },
    { code: 'work_orders', name: 'Work Orders', description: 'Plan, assign, execute, and track maintenance work orders with SLA management', isCore: true, version: '2.0.0', licensed: true },
    { code: 'inventory', name: 'Inventory & Spare Parts', description: 'Manage spare parts inventory, stock levels, locations, and replenishment', isCore: true, version: '2.0.0', licensed: true },
    // Optional modules - licensed by default in demo
    { code: 'pm_schedules', name: 'PM Schedules', description: 'Preventive maintenance scheduling with auto work order generation', isCore: false, version: '2.0.0', licensed: true },
    { code: 'analytics', name: 'Analytics & KPI', description: 'Advanced analytics, dashboards, and KPI monitoring', isCore: false, version: '1.5.0', licensed: true },
    { code: 'production', name: 'Production Management', description: 'Work centers, resource planning, scheduling, and capacity management', isCore: false, version: '1.5.0', licensed: true },
    { code: 'quality', name: 'Quality Management', description: 'Inspections, NCR, audits, SPC, CAPA, and quality control plans', isCore: false, version: '1.5.0', licensed: true },
    { code: 'safety', name: 'Safety Management', description: 'Incidents, safety inspections, training, equipment, and permits', isCore: false, version: '1.5.0', licensed: true },
    { code: 'iot_sensors', name: 'IoT Sensors', description: 'IoT device management, real-time monitoring, and threshold-based alerts', isCore: false, version: '1.3.0', licensed: true },
    { code: 'calibration', name: 'Calibration', description: 'Instrument calibration schedules, tracking, and compliance records', isCore: false, version: '1.2.0', licensed: true },
    { code: 'downtime', name: 'Downtime Tracking', description: 'Machine downtime logging, root cause analysis, and MTBF/MTTR analytics', isCore: false, version: '1.2.0', licensed: true },
    { code: 'meter_readings', name: 'Meter Readings', description: 'Equipment meter readings, meter-based PM triggers, and trending', isCore: false, version: '1.1.0', licensed: true },
    { code: 'training', name: 'Training Management', description: 'Training programs, certifications, skills tracking, and competency management', isCore: false, version: '1.1.0', licensed: false },
    { code: 'risk_assessment', name: 'Risk Assessment', description: 'Risk identification, assessment matrices, mitigation planning, and monitoring', isCore: false, version: '1.2.0', licensed: false },
    { code: 'condition_monitoring', name: 'Condition Monitoring', description: 'Vibration, temperature, and other condition monitoring with trending', isCore: false, version: '1.3.0', licensed: false },
    { code: 'digital_twin', name: 'Digital Twin', description: '3D asset visualization, digital twin modeling, and real-time state mirroring', isCore: false, version: '1.0.0', licensed: false },
    { code: 'bom', name: 'Bill of Materials', description: 'Equipment BOM management, spare part lists, and component relationships', isCore: false, version: '1.1.0', licensed: true },
    { code: 'failure_analysis', name: 'Failure Analysis', description: 'Failure modes, effects analysis, and failure pattern recognition', isCore: false, version: '1.0.0', licensed: false },
    { code: 'rca_analysis', name: 'Root Cause Analysis', description: '5-Why analysis, fishbone diagrams, and RCA documentation workflows', isCore: false, version: '1.0.0', licensed: false },
    { code: 'capa', name: 'CAPA Management', description: 'Corrective and preventive actions tracking and verification', isCore: false, version: '1.0.0', licensed: false },
    { code: 'reports', name: 'Reports & Dashboards', description: 'Custom report builder, scheduled reports, and multi-format export', isCore: false, version: '2.0.0', licensed: true },
    { code: 'vendors', name: 'Vendor Management', description: 'Supplier management, vendor evaluation, and procurement workflows', isCore: false, version: '1.1.0', licensed: true },
    { code: 'tools', name: 'Tool Management', description: 'Tool inventory, calibration tracking, assignment, and availability', isCore: false, version: '1.0.0', licensed: false },
    { code: 'notifications', name: 'Notifications', description: 'In-app notifications, email alerts, and notification preferences', isCore: false, version: '1.5.0', licensed: true },
    { code: 'documents', name: 'Document Management', description: 'Document storage, versioning, approvals, and file organization', isCore: false, version: '1.2.0', licensed: true },
    { code: 'modules', name: 'Module Management', description: 'System module licensing, activation, and feature management', isCore: true, version: '2.0.0', licensed: true },
    { code: 'kpi_dashboard', name: 'KPI Dashboard', description: 'Customizable KPI dashboards with real-time data widgets', isCore: false, version: '1.3.0', licensed: true },
    { code: 'predictive', name: 'Predictive Maintenance', description: 'ML-based predictive analytics for maintenance planning', isCore: false, version: '1.0.0', licensed: false },
    { code: 'oee', name: 'OEE Tracking', description: 'Overall Equipment Effectiveness tracking, analysis, and improvement', isCore: false, version: '1.2.0', licensed: false },
    { code: 'energy', name: 'Energy Management', description: 'Energy consumption monitoring, optimization, and cost tracking', isCore: false, version: '1.1.0', licensed: false },
    { code: 'shift_management', name: 'Shift Management', description: 'Shift scheduling, handover logs, and workforce planning', isCore: false, version: '1.1.0', licensed: false },
    { code: 'erp_integration', name: 'ERP Integration', description: 'Integration with external ERP systems via API connectors', isCore: false, version: '1.0.0', licensed: false },
    { code: 'forecasting', name: 'Demand Forecasting', description: 'AI-powered demand forecasting for spare parts and resources', isCore: false, version: '1.0.0', licensed: false },
  ];

  for (const mod of systemModules) {
    const validFrom = mod.licensed ? new Date('2024-01-01') : null;
    const validUntil = mod.licensed ? new Date('2026-12-31') : null;

    const sysMod = await db.systemModule.create({
      data: {
        code: mod.code,
        name: mod.name,
        description: mod.description,
        isCore: mod.isCore,
        version: mod.version,
        isSystemLicensed: mod.licensed,
        validFrom,
        validUntil,
      },
    });

    // Auto-activate core modules; for optional modules, set isActive if licensed
    if (mod.isCore || mod.licensed) {
      await db.companyModule.create({
        data: {
          systemModuleId: sysMod.id,
          isActive: mod.isCore || mod.licensed,
          isEnabled: mod.isCore || mod.licensed,
          licensedAt: mod.isCore ? new Date('2024-01-01') : mod.licensed ? new Date('2024-01-15') : null,
          licensedBy: admin.id,
          activatedAt: mod.isCore ? new Date('2024-01-01') : mod.licensed ? new Date('2024-01-20') : null,
          activatedBy: admin.id,
        },
      });
    }
  }

  console.log(`✅ Created ${systemModules.length} system modules`);

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

    // 11. Create sample assets
    const assetCategories = await Promise.all([
      db.assetCategory.create({ data: { name: 'Rotating Equipment', code: 'RE', isActive: true } }),
      db.assetCategory.create({ data: { name: 'Electrical', code: 'EL', isActive: true } }),
      db.assetCategory.create({ data: { name: 'Mechanical', code: 'ME', isActive: true } }),
      db.assetCategory.create({ data: { name: 'Instrumentation', code: 'IN', isActive: true } }),
      db.assetCategory.create({ data: { name: 'HVAC', code: 'HV', isActive: true } }),
    ]);

    const assetsData = [
      { name: 'Compressor C-101', assetTag: 'AST-001', category: 0, condition: 'good', status: 'operational', criticality: 'high', location: 'Building A', manufacturer: 'Atlas Copco', model: 'GA55+', serialNumber: 'SN-COMP-001', yearManufactured: 2021, purchaseCost: 45000, expectedLifeYears: 15 },
      { name: 'Hydraulic Pump P-205', assetTag: 'AST-002', category: 2, condition: 'fair', status: 'under_maintenance', criticality: 'critical', location: 'Building A', manufacturer: 'Parker', model: 'PVP-50', serialNumber: 'SN-PUMP-002', yearManufactured: 2019, purchaseCost: 12000, expectedLifeYears: 10 },
      { name: 'Electric Motor M-302', assetTag: 'AST-003', category: 1, condition: 'good', status: 'operational', criticality: 'medium', location: 'Building B', manufacturer: 'Siemens', model: 'SIMO-75', serialNumber: 'SN-MOT-003', yearManufactured: 2022, purchaseCost: 8500, expectedLifeYears: 12 },
      { name: 'Conveyor CV-401', assetTag: 'AST-004', category: 2, condition: 'good', status: 'operational', criticality: 'high', location: 'Building C', manufacturer: 'Dorner', model: '2200 Series', serialNumber: 'SN-CONV-004', yearManufactured: 2020, purchaseCost: 28000, expectedLifeYears: 15 },
      { name: 'Control Panel CP-108', assetTag: 'AST-005', category: 3, condition: 'new', status: 'operational', criticality: 'medium', location: 'Building B', manufacturer: 'ABB', model: 'ACS880', serialNumber: 'SN-CTRL-005', yearManufactured: 2023, purchaseCost: 15000, expectedLifeYears: 10 },
      { name: 'Chiller Unit CH-201', assetTag: 'AST-006', category: 4, condition: 'fair', status: 'standby', criticality: 'medium', location: 'Building A', manufacturer: 'Carrier', model: '30XA-252', serialNumber: 'SN-CHIL-006', yearManufactured: 2018, purchaseCost: 65000, expectedLifeYears: 20 },
      { name: 'Air Compressor AC-301', assetTag: 'AST-007', category: 0, condition: 'good', status: 'operational', criticality: 'high', location: 'Utility Room', manufacturer: 'Ingersoll Rand', model: 'R110i', serialNumber: 'SN-AIRC-007', yearManufactured: 2021, purchaseCost: 32000, expectedLifeYears: 15 },
      { name: 'Press Line PL-3', assetTag: 'AST-008', category: 2, condition: 'poor', status: 'under_maintenance', criticality: 'critical', location: 'Building A', manufacturer: 'Komatsu', model: 'H2F-500', serialNumber: 'SN-PRESS-008', yearManufactured: 2017, purchaseCost: 180000, expectedLifeYears: 20 },
      { name: 'Generator Gen-401', assetTag: 'AST-009', category: 1, condition: 'good', status: 'operational', criticality: 'critical', location: 'Power House', manufacturer: 'Caterpillar', model: 'C18', serialNumber: 'SN-GEN-009', yearManufactured: 2020, purchaseCost: 95000, expectedLifeYears: 25 },
      { name: 'Transformer TR-501', assetTag: 'AST-010', category: 1, condition: 'new', status: 'operational', criticality: 'high', location: 'Substation', manufacturer: 'ABB', model: 'RESIBLOC', serialNumber: 'SN-TRANS-010', yearManufactured: 2023, purchaseCost: 120000, expectedLifeYears: 30 },
    ];

    const createdAssets = [];
    for (const a of assetsData) {
      const asset = await db.asset.create({
        data: {
          name: a.name,
          assetTag: a.assetTag,
          categoryId: assetCategories[a.category].id,
          condition: a.condition,
          status: a.status,
          criticality: a.criticality,
          location: a.location,
          plantId: plant.id,
          departmentId: dept.id,
          manufacturer: a.manufacturer,
          model: a.model,
          serialNumber: a.serialNumber,
          yearManufactured: a.yearManufactured,
          purchaseCost: a.purchaseCost,
          expectedLifeYears: a.expectedLifeYears,
          installedDate: new Date(a.yearManufactured, 5, 1),
          createdById: admin.id,
          currentValue: a.purchaseCost * (1 - (new Date().getFullYear() - a.yearManufactured) / a.expectedLifeYears * 0.7),
          specification: '{}',
        },
      });
      createdAssets.push(asset);
    }

    console.log('✅ Created sample assets');

    // 12. Create sample inventory items
    const inventoryItems = [
      { itemCode: 'SP-001', name: 'Bearing SKF 6205', category: 'spare_part', unitOfMeasure: 'each', currentStock: 25, minStockLevel: 10, unitCost: 45, supplier: 'SKF Distributors' },
      { itemCode: 'SP-002', name: 'Hydraulic Seal Kit', category: 'spare_part', unitOfMeasure: 'set', currentStock: 8, minStockLevel: 5, unitCost: 120, supplier: 'Parker Hannifin' },
      { itemCode: 'SP-003', name: 'Drive Belt A68', category: 'spare_part', unitOfMeasure: 'each', currentStock: 15, minStockLevel: 8, unitCost: 35, supplier: 'Gates Corporation' },
      { itemCode: 'SP-004', name: 'Contactor LC1D25', category: 'spare_part', unitOfMeasure: 'each', currentStock: 3, minStockLevel: 5, unitCost: 85, supplier: 'Schneider Electric' },
      { itemCode: 'CN-001', name: 'Hydraulic Oil ISO 46', category: 'consumable', unitOfMeasure: 'liter', currentStock: 200, minStockLevel: 50, unitCost: 8.5, supplier: 'Shell Lubricants' },
      { itemCode: 'CN-002', name: 'Grease EP2', category: 'consumable', unitOfMeasure: 'kg', currentStock: 45, minStockLevel: 20, unitCost: 12, supplier: 'Mobil' },
      { itemCode: 'CN-003', name: 'Welding Rods E7018', category: 'consumable', unitOfMeasure: 'kg', currentStock: 30, minStockLevel: 15, unitCost: 18, supplier: 'Lincoln Electric' },
      { itemCode: 'TL-001', name: 'Multimeter Fluke 87V', category: 'tool', unitOfMeasure: 'each', currentStock: 4, minStockLevel: 2, unitCost: 450, supplier: 'Fluke Corp' },
      { itemCode: 'TL-002', name: 'Torque Wrench Set', category: 'tool', unitOfMeasure: 'set', currentStock: 2, minStockLevel: 1, unitCost: 280, supplier: 'Snap-on Tools' },
      { itemCode: 'SP-005', name: 'Air Filter Element', category: 'spare_part', unitOfMeasure: 'each', currentStock: 12, minStockLevel: 6, unitCost: 65, supplier: 'Donaldson' },
      { itemCode: 'SP-006', name: 'V-Belt Set B68', category: 'spare_part', unitOfMeasure: 'set', currentStock: 6, minStockLevel: 4, unitCost: 55, supplier: 'Gates Corporation' },
      { itemCode: 'SP-007', name: 'Thermocouple Type K', category: 'spare_part', unitOfMeasure: 'each', currentStock: 2, minStockLevel: 10, unitCost: 25, supplier: 'Omega Engineering' },
    ];

    for (const item of inventoryItems) {
      await db.inventoryItem.create({
        data: {
          ...item,
          plantId: plant.id,
          createdById: admin.id,
          location: 'Main Store',
          binLocation: `A-${Math.ceil(Math.random() * 5)}-${Math.ceil(Math.random() * 10)}`,
          specification: '{}',
          imageUrls: '[]',
        },
      });
    }

    console.log('✅ Created sample inventory items');

    // 13. Create sample work orders
    const techUser = await db.user.findUnique({ where: { username: 'tech1' } });
    const plannerUser = await db.user.findUnique({ where: { username: 'planner1' } });

    const woStatuses = ['completed', 'completed', 'completed', 'in_progress', 'assigned', 'approved', 'draft', 'closed', 'closed'];
    const woTypes = ['corrective', 'preventive', 'corrective', 'emergency', 'preventive', 'corrective', 'predictive', 'inspection', 'corrective'];
    const woPriorities = ['high', 'medium', 'medium', 'critical', 'low', 'high', 'medium', 'low', 'high'];

    for (let i = 0; i < 9; i++) {
      const asset = createdAssets[i];
      const count = await db.workOrder.count();
      const now = new Date();
      const prefix = `WO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const daysAgo = 30 - i * 3;
      const createdAt = new Date(now.getTime() - daysAgo * 86400000);

      const status = woStatuses[i];
      const isComplete = status === 'completed' || status === 'closed';

      const wo = await db.workOrder.create({
        data: {
          woNumber: `${prefix}-${String(count + 1).padStart(4, '0')}`,
          title: `${['Replace bearings', 'PM inspection', 'Fix oil leak', 'Emergency repair', 'Lubrication service', 'Alignment check', 'Vibration analysis', 'Safety inspection', 'Overhaul repair'][i]} - ${asset.name}`,
          type: woTypes[i],
          priority: woPriorities[i],
          status,
          description: `Maintenance work order for ${asset.name}. ${['Bearing replacement due to excessive vibration readings.', 'Scheduled preventive maintenance inspection.', 'Oil leak detected on main shaft seal.', 'Emergency breakdown repair required.', 'Scheduled lubrication and grease service.', 'Laser alignment check and correction.', 'Predictive maintenance based on vibration trends.', 'Routine safety inspection and testing.', 'Major overhaul and reconditioning.'][i]}`,
          assetId: asset.id,
          assetName: asset.name,
          departmentId: dept.id,
          plantId: plant.id,
          assignedTo: techUser?.id ?? null,
          plannerId: plannerUser?.id ?? null,
          assignedSupervisorId: sv?.id ?? null,
          estimatedHours: [4, 2, 6, 3, 1.5, 3, 2, 4, 16][i],
          actualHours: isComplete ? [3.5, 2, 5.5, 2.5, 1.5, 0, 0, 4, 14][i] : null,
          plannedStart: new Date(createdAt.getTime() + 86400000),
          plannedEnd: new Date(createdAt.getTime() + 86400000 * 3),
          actualStart: isComplete ? new Date(createdAt.getTime() + 86400000 * 1.5) : null,
          actualEnd: isComplete ? new Date(createdAt.getTime() + 86400000 * 2.5) : null,
          totalCost: isComplete ? [850, 120, 2200, 1800, 45, 0, 0, 350, 4500][i] : 0,
          laborCost: isComplete ? [350, 120, 400, 500, 45, 0, 0, 200, 2800][i] : 0,
          partsCost: isComplete ? [500, 0, 1800, 1300, 0, 0, 0, 150, 1700][i] : 0,
          createdAt,
        },
      });

      // Create status history for completed WOs
      if (isComplete) {
        await db.workOrderStatusHistory.createMany({
          data: [
            { workOrderId: wo.id, toStatus: 'draft', performedById: admin.id, createdAt },
            { workOrderId: wo.id, fromStatus: 'draft', toStatus: 'approved', performedById: plannerUser?.id || admin.id, createdAt: new Date(createdAt.getTime() + 3600000) },
            { workOrderId: wo.id, fromStatus: 'approved', toStatus: 'assigned', performedById: plannerUser?.id || admin.id, createdAt: new Date(createdAt.getTime() + 86400000) },
            { workOrderId: wo.id, fromStatus: 'assigned', toStatus: 'in_progress', performedById: techUser?.id || admin.id, createdAt: new Date(createdAt.getTime() + 86400000 * 1.5) },
            { workOrderId: wo.id, fromStatus: 'in_progress', toStatus: 'completed', performedById: techUser?.id || admin.id, createdAt: new Date(createdAt.getTime() + 86400000 * 2.5) },
          ],
        });
      }
    }

    console.log('✅ Created sample work orders');

    // 14. Create PM Schedules
    for (let i = 0; i < 5; i++) {
      const asset = createdAssets[i];
      await db.pmSchedule.create({
        data: {
          title: `PM Schedule - ${asset.name}`,
          description: `Regular maintenance schedule for ${asset.name}`,
          assetId: asset.id,
          frequencyType: ['monthly', 'weekly', 'quarterly', 'monthly', 'biweekly'][i],
          frequencyValue: [1, 1, 1, 1, 2][i],
          lastCompletedDate: new Date(new Date().getTime() - 15 * 86400000),
          nextDueDate: new Date(new Date().getTime() + [15, 5, 45, 10, 10][i] * 86400000),
          estimatedDuration: [4, 1, 8, 2, 1.5][i],
          priority: ['high', 'medium', 'medium', 'low', 'medium'][i],
          assignedToId: techUser?.id,
          departmentId: dept.id,
          isActive: true,
          autoGenerateWO: true,
          leadDays: 3,
          createdById: admin.id,
        },
      });
    }

    console.log('✅ Created PM schedules');

    // 15. Create sample notifications
    const notifTypes = [
      { type: 'wo_assigned', title: 'Work Order Assigned', message: 'You have been assigned WO for Compressor C-101 bearing replacement.', entityType: 'work_order', userId: techUser?.id || admin.id },
      { type: 'mr_assigned', title: 'New Maintenance Request', message: 'A new maintenance request has been submitted for Press Line 3.', entityType: 'maintenance_request', userId: sv?.id || admin.id },
      { type: 'wo_completed', title: 'Work Order Completed', message: 'WO for Conveyor CV-401 alignment check has been completed.', entityType: 'work_order', userId: plannerUser?.id || admin.id },
      { type: 'system', title: 'System Update', message: 'iAssetsPro has been updated to version 2.0 with new analytics features.', userId: admin.id },
      { type: 'info', title: 'PM Schedule Due', message: 'PM schedule for Hydraulic Pump P-205 is due in 3 days.', entityType: 'pm_schedule', userId: plannerUser?.id || admin.id },
    ];

    for (const n of notifTypes) {
      await db.notification.create({
        data: {
          ...n,
          isRead: n.type === 'system',
        },
      });
    }

    console.log('✅ Created sample notifications');
  }

  // Create company profile
  await db.companyProfile.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'Demo Industries Ltd.',
      tradingName: 'Demo Industries',
      address: '123 Industrial Boulevard',
      city: 'Houston',
      region: 'Texas',
      country: 'US',
      postalCode: '77001',
      phone: '+1 (555) 123-4567',
      email: 'info@demoinustries.com',
      website: 'www.demoinustries.com',
      industry: 'manufacturing',
      employeeCount: '100-500',
      currency: 'USD',
      timezone: 'America/Chicago',
    },
  });

  console.log('✅ Created company profile');

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
