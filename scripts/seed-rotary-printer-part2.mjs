// ============================================================================
// SEED SCRIPT — Rotary Screen Printing Machine (Part 2)
// PM Templates, PM Schedules, Maintenance Requests, Work Orders,
// Digital Twin, System Diagram, and Work Instructions
// ============================================================================

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// ─── Database Connection ──────────────────────────────────────────────────────
const adapter = new PrismaMariaDb({
  host: 'vps.lightworldtech.com',
  port: 3306,
  user: 'ifleetpro_user',
  password: 'myjesus4mE2018',
  database: 'ifleetpro_eam_system',
});
const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient({ adapter });

// ─── Hardcoded Existing IDs (same as Part 1) ──────────────────────────────
const IDS = {
  plant_TEM001:          'cmpq4a4x3016m0osiwfb138qf',
  dept_MAINT:           'cmpq4a4xz016p0osi08h2y7q8',
  dept_PROD:            'cmpq4a4y7016q0osierq1c5mf',
  dept_ENG:             'cmpq4a4yr0osi9vgnv4rk',
  dept_WH:              'cmpq4a4z0016u0osivft3zhxa',
  user_admin:           'cmpq4a54t01700osibm1xd7kn',
  user_planner1:        'cmpq4a58s01750osi8bqaik2x',
  user_supervisor1:     'cmpq4a59i01780osiyl25z61h',
  user_tech1:           'cmpq4a5a0017b0osiq44bmwiq',
  user_operator1:       'cmpq4a5aj017e0osig17zo57o',
  user_maint_mgr1:      'cmpq4a5bf017k0osix5sylc8d',
  user_tech2:           'cmpq4a5bp017n0osi04csm873',
  user_store1:          'cmpq4a5de017z0osihhip8gy7',
};

// Resolve main asset and build assetMap
const mainAsset = await db.asset.findUnique({ where: { assetTag: 'RSP-001' } });
if (!mainAsset) throw new Error('RSP-001 not found — run Part 1 first');
const allChildAssets = await db.asset.findMany({ where: { parentId: mainAsset.id } });
const assetMap = { 'RSP-001': mainAsset.id };
for (const a of allChildAssets) assetMap[a.assetTag] = a.id;
console.log(`✅ Connected. RSP-001 id=${mainAsset.id}, ${allChildAssets.length} child assets loaded\n`);

// ── User & department stubs ───────────────────────────────────────────────
const admin      = { id: IDS.user_admin };
const planner1   = { id: IDS.user_planner1 };
const supervisor1 = { id: IDS.user_supervisor1 };
const tech1      = { id: IDS.user_tech1 };
const tech2      = { id: IDS.user_tech2 };
const maint_mgr1 = { id: IDS.user_maint_mgr1 };
const operator1  = { id: IDS.user_operator1 };
const store1     = { id: IDS.user_store1 };
const deptMaint  = { id: IDS.dept_MAINT };

// Helper: today / relative dates
const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * 86400000);
const daysFromNow = (d) => new Date(now.getTime() + d * 86400000);

console.log("\n📦 [Part 2] Seeding PM Templates, Schedules, MRs, WOs, Digital Twin, System Diagram & Work Instructions...\n");

// ============================================================================
// 1. PM TEMPLATES + PM TEMPLATE TASKS
// ============================================================================

console.log("📋 Creating PM Templates & Tasks...");

// --- Template 1: RSP Daily Inspection ---
const dailyTemplate = await db.pmTemplate.create({
  data: {
    title: "RSP Daily Inspection",
    description: "Daily inspection checklist for the Rotary Screen Printing Machine. Covers screen tension, squeegee condition, paste circulation, fabric tracking, dryer operation, and safety observations.",
    type: "inspection",
    category: "mechanical",
    estimatedDuration: 1.0,
    priority: "medium",
    requiredSkills: JSON.stringify(["mechanical_inspection", "printing_machine_operation"]),
    requiredTools: JSON.stringify([
      "Tension meter",
      "Durometer gauge",
      "Thermometer (IR)",
      "Cleaning cloth"
    ]),
    isActive: true,
    createdById: planner1.id,
  },
});

const dailyTemplateTasks = [
  { taskNumber: 1,  description: "Inspect rotary screen tension on all 12 heads",                           taskType: "inspect",  estimatedMinutes: 15 },
  { taskNumber: 2,  description: "Check squeegee pressure and condition",                                  taskType: "check",    estimatedMinutes: 10 },
  { taskNumber: 3,  description: "Verify paste circulation pumps are running",                              taskType: "check",    estimatedMinutes: 5  },
  { taskNumber: 4,  description: "Clean paste feed pipes and nozzles",                                     taskType: "replace",  estimatedMinutes: 10 },
  { taskNumber: 5,  description: "Check fabric tension and tracking",                                      taskType: "check",    estimatedMinutes: 5  },
  { taskNumber: 6,  description: "Inspect edge guide sensor alignment",                                    taskType: "inspect",  estimatedMinutes: 5  },
  { taskNumber: 7,  description: "Check dryer temperature readings",                                       taskType: "record",   estimatedMinutes: 5  },
  { taskNumber: 8,  description: "Verify exhaust fan operation",                                           taskType: "check",    estimatedMinutes: 3  },
  { taskNumber: 9,  description: "Report any unusual noise or vibration",                                 taskType: "record",   estimatedMinutes: 2  },
];

await db.pmTemplateTask.createMany({
  data: dailyTemplateTasks.map((t) => ({
    templateId: dailyTemplate.id,
    ...t,
    sortOrder: t.taskNumber,
    isActive: true,
  })),
});

console.log("  ✅ Template: RSP Daily Inspection (RSP-PM-DAY) — 9 tasks");

// --- Template 2: RSP Weekly Maintenance ---
const weeklyTemplate = await db.pmTemplate.create({
  data: {
    title: "RSP Weekly Maintenance",
    description: "Weekly maintenance routine covering lubrication, drive system checks, pneumatic inspection, VFD verification, safety system testing, and paste kitchen cleaning.",
    type: "preventive",
    category: "mechanical",
    estimatedDuration: 3.0,
    priority: "medium",
    requiredSkills: JSON.stringify(["lubrication", "belt_maintenance", "pneumatic_systems", "vfd_troubleshooting"]),
    requiredTools: JSON.stringify([
      "Grease gun",
      "Tension gauge (belt)",
      "Leak detection spray (Ultrasonic)",
      "VFD parameter reader",
      "Multimeter",
      "Cleaning supplies"
    ]),
    isActive: true,
    createdById: planner1.id,
  },
});

const weeklyTemplateTasks = [
  { taskNumber: 1,  description: "Lubricate all bearing points (per lubrication chart)",                    taskType: "lubricate", estimatedMinutes: 20 },
  { taskNumber: 2,  description: "Inspect and clean conveyor belts",                                        taskType: "inspect",   estimatedMinutes: 15 },
  { taskNumber: 3,  description: "Check drive belt tension on all drives",                                   taskType: "check",     estimatedMinutes: 15 },
  { taskNumber: 4,  description: "Inspect pneumatic connections for leaks",                                  taskType: "inspect",   estimatedMinutes: 15 },
  { taskNumber: 5,  description: "Clean air filters in pneumatic system",                                   taskType: "replace",   estimatedMinutes: 10 },
  { taskNumber: 6,  description: "Verify VFD parameters and error logs",                                     taskType: "check",     estimatedMinutes: 15 },
  { taskNumber: 7,  description: "Test safety interlocks and emergency stops",                               taskType: "check",     estimatedMinutes: 20 },
  { taskNumber: 8,  description: "Check paste kitchen mixing tanks cleanliness",                             taskType: "inspect",   estimatedMinutes: 10 },
  { taskNumber: 9,  description: "Calibrate fabric tension sensors",                                        taskType: "check",     estimatedMinutes: 15 },
  { taskNumber: 10, description: "Inspect IR dryer elements for damage",                                     taskType: "inspect",   estimatedMinutes: 10 },
];

await db.pmTemplateTask.createMany({
  data: weeklyTemplateTasks.map((t) => ({
    templateId: weeklyTemplate.id,
    ...t,
    sortOrder: t.taskNumber,
    isActive: true,
  })),
});

console.log("  ✅ Template: RSP Weekly Maintenance (RSP-PM-WK) — 10 tasks");

// --- Template 3: RSP Monthly Maintenance ---
const monthlyTemplate = await db.pmTemplate.create({
  data: {
    title: "RSP Monthly Maintenance",
    description: "Monthly comprehensive maintenance covering screen inspection, squeegee replacement, motor checks, gearbox oil, PLC I/O testing, register calibration, hydraulic system, and electrical thermal scanning.",
    type: "preventive",
    category: "mechanical",
    estimatedDuration: 6.0,
    priority: "medium",
    requiredSkills: JSON.stringify([
      "mechanical_maintenance",
      "electrical_inspection",
      "plc_troubleshooting",
      "hydraulic_systems",
      "screen_printing"
    ]),
    requiredTools: JSON.stringify([
      "Durometer gauge (Shore A)",
      "Clamp meter",
      "PLC diagnostic software",
      "Thermal imaging camera",
      "Oil sampling kit",
      "Screen inspection light box",
      "Pinhole detection lamp"
    ]),
    isActive: true,
    createdById: planner1.id,
  },
});

const monthlyTemplateTasks = [
  { taskNumber: 1,  description: "Inspect all rotary screens for pinholes/damage",                           taskType: "inspect",  estimatedMinutes: 30 },
  { taskNumber: 2,  description: "Replace squeegee blades showing wear (check durometer)",                    taskType: "replace",  estimatedMinutes: 30 },
  { taskNumber: 3,  description: "Check motor current draw on all drives",                                   taskType: "check",    estimatedMinutes: 20 },
  { taskNumber: 4,  description: "Inspect gearbox oil levels and condition",                                  taskType: "inspect",  estimatedMinutes: 15 },
  { taskNumber: 5,  description: "Test PLC I/O points for proper operation",                                 taskType: "check",    estimatedMinutes: 25 },
  { taskNumber: 6,  description: "Verify screen register system calibration",                                taskType: "check",    estimatedMinutes: 20 },
  { taskNumber: 7,  description: "Clean and inspect paste circulation filters",                              taskType: "replace",  estimatedMinutes: 15 },
  { taskNumber: 8,  description: "Check hydraulic system pressure and filters",                              taskType: "check",    estimatedMinutes: 15 },
  { taskNumber: 9,  description: "Inspect electrical connections in main panel (thermal scan)",               taskType: "inspect",  estimatedMinutes: 20 },
  { taskNumber: 10, description: "Review maintenance log for recurring issues",                              taskType: "record",   estimatedMinutes: 10 },
];

await db.pmTemplateTask.createMany({
  data: monthlyTemplateTasks.map((t) => ({
    templateId: monthlyTemplate.id,
    ...t,
    sortOrder: t.taskNumber,
    isActive: true,
  })),
});

console.log("  ✅ Template: RSP Monthly Maintenance (RSP-PM-MON) — 10 tasks");

// --- Template 4: RSP Quarterly Overhaul ---
const quarterlyTemplate = await db.pmTemplate.create({
  data: {
    title: "RSP Quarterly Overhaul",
    description: "Quarterly major overhaul covering bearing replacement, drive belt overhaul, electrical insulation testing, sensor calibration, pneumatic valve service, deep cleaning of paste system, head realignment, dryer element replacement, gearbox oil change, and full safety certification.",
    type: "preventive",
    category: "mechanical",
    estimatedDuration: 16.0,
    priority: "high",
    requiredSkills: JSON.stringify([
      "mechanical_overhaul",
      "electrical_testing",
      "calibration",
      "safety_certification",
      "vibration_analysis"
    ]),
    requiredTools: JSON.stringify([
      "Vibration analyzer",
      "Megger (insulation tester)",
      "Thermocouple calibrator",
      "Bearing puller set",
      "Torque wrench set",
      "Alignment laser system",
      "Pressure test kit"
    ]),
    isActive: true,
    createdById: planner1.id,
  },
});

const quarterlyTemplateTasks = [
  { taskNumber: 1,  description: "Replace all bearings showing vibration above threshold",                   taskType: "replace",   estimatedMinutes: 60 },
  { taskNumber: 2,  description: "Inspect and replace worn drive belts",                                      taskType: "replace",   estimatedMinutes: 45 },
  { taskNumber: 3,  description: "Full electrical insulation resistance test",                               taskType: "check",     estimatedMinutes: 60 },
  { taskNumber: 4,  description: "Calibrate all temperature sensors (thermocouples)",                         taskType: "check",     estimatedMinutes: 45 },
  { taskNumber: 5,  description: "Replace pneumatic valve seals as needed",                                   taskType: "replace",   estimatedMinutes: 30 },
  { taskNumber: 6,  description: "Deep clean paste circulation system",                                      taskType: "replace",   estimatedMinutes: 60 },
  { taskNumber: 7,  description: "Inspect and realign all printing heads",                                   taskType: "inspect",   estimatedMinutes: 90 },
  { taskNumber: 8,  description: "Replace damaged IR dryer elements",                                        taskType: "replace",   estimatedMinutes: 45 },
  { taskNumber: 9,  description: "Lubricate gearboxes with fresh oil",                                       taskType: "lubricate", estimatedMinutes: 30 },
  { taskNumber: 10, description: "Full safety system test and certification",                                taskType: "check",     estimatedMinutes: 60 },
];

await db.pmTemplateTask.createMany({
  data: quarterlyTemplateTasks.map((t) => ({
    templateId: quarterlyTemplate.id,
    ...t,
    sortOrder: t.taskNumber,
    isActive: true,
  })),
});

console.log("  ✅ Template: RSP Quarterly Overhaul (RSP-PM-QTR) — 10 tasks\n");

// ============================================================================
// 2. PM SCHEDULES
// ============================================================================

console.log("📅 Creating PM Schedules...");

const dailySchedule = await db.pmSchedule.create({
  data: {
    title: "RSP Daily Inspection Schedule",
    description: "Daily inspection of the Rotary Screen Printing Machine — screens, squeegees, paste circulation, fabric tracking, dryers, and safety observations.",
    assetId: mainAsset.id,
    frequencyType: "daily",
    frequencyValue: 1,
    lastCompletedDate: daysAgo(1),
    nextDueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0),
    estimatedDuration: 1.0,
    priority: "low",
    assignedToId: tech1.id,
    departmentId: deptMaint.id,
    isActive: true,
    autoGenerateWO: true,
    leadDays: 0,
    createdById: planner1.id,
    templateId: dailyTemplate.id,
  },
});

const weeklySchedule = await db.pmSchedule.create({
  data: {
    title: "RSP Weekly Maintenance Schedule",
    description: "Weekly preventive maintenance covering lubrication, belt checks, pneumatic inspection, VFD verification, safety testing, and paste kitchen cleaning.",
    assetId: mainAsset.id,
    frequencyType: "weekly",
    frequencyValue: 7,
    lastCompletedDate: daysAgo(5),
    nextDueDate: daysFromNow(2),
    estimatedDuration: 3.0,
    priority: "medium",
    assignedToId: tech2.id,
    departmentId: deptMaint.id,
    isActive: true,
    autoGenerateWO: true,
    leadDays: 1,
    createdById: planner1.id,
    templateId: weeklyTemplate.id,
  },
});

const monthlySchedule = await db.pmSchedule.create({
  data: {
    title: "RSP Monthly Maintenance Schedule",
    description: "Monthly comprehensive maintenance including screen inspection, squeegee replacement, motor checks, PLC testing, hydraulic inspection, and thermal scanning.",
    assetId: mainAsset.id,
    frequencyType: "monthly",
    frequencyValue: 30,
    lastCompletedDate: daysAgo(25),
    nextDueDate: daysFromNow(5),
    estimatedDuration: 6.0,
    priority: "medium",
    assignedToId: tech1.id,
    departmentId: deptMaint.id,
    isActive: true,
    autoGenerateWO: true,
    leadDays: 3,
    createdById: planner1.id,
    templateId: monthlyTemplate.id,
  },
});

const quarterlySchedule = await db.pmSchedule.create({
  data: {
    title: "RSP Quarterly Overhaul Schedule",
    description: "Quarterly major overhaul — bearing replacement, electrical testing, sensor calibration, paste system deep clean, head realignment, and safety certification.",
    assetId: mainAsset.id,
    frequencyType: "quarterly",
    frequencyValue: 90,
    lastCompletedDate: daysAgo(80),
    nextDueDate: daysFromNow(10),
    estimatedDuration: 16.0,
    priority: "high",
    assignedToId: maint_mgr1.id,
    departmentId: deptMaint.id,
    isActive: true,
    autoGenerateWO: true,
    leadDays: 7,
    createdById: planner1.id,
    templateId: quarterlyTemplate.id,
  },
});

console.log("  ✅ Schedule: Daily — every 1 day, assigned to tech1");
console.log("  ✅ Schedule: Weekly — every 7 days, assigned to tech2");
console.log("  ✅ Schedule: Monthly — every 30 days, assigned to tech1");
console.log("  ✅ Schedule: Quarterly — every 90 days, assigned to maint_mgr1\n");

// ============================================================================
// 3. MAINTENANCE REQUESTS
// ============================================================================

console.log("🔧 Creating Maintenance Requests...");

// Resolve child asset IDs
const childAssets = new Map(Object.entries(assetMap));
const dryingSectionAsset = childAssets.get("RSP-001-DRY");
const electricalControlAsset = childAssets.get("RSP-001-ELC");

// MR 1: Replace worn squeegee on Station 3
const mr1 = await db.maintenanceRequest.create({
  data: {
    requestNumber: `MR-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-0001`,
    title: "Replace worn squeegee on Station 3",
    description: "Squeegee blade on Station 3 showing significant wear. Print quality degradation noticed on 3-color repeat patterns. Durometer reading below acceptable range.",
    priority: "medium",
    category: "mechanical",
    status: "approved",
    workflowStatus: "approved",
    machineDownStatus: false,
    assetId: mainAsset.id,
    departmentId: mainAsset.departmentId,
    requestedBy: operator1.id,
    supervisorId: supervisor1.id,
    approvedBy: supervisor1.id,
    plantId: mainAsset.plantId,
    estimatedHours: 2.0,
    slaHours: 24,
    notes: "Spare squeegee blades available in stores — item code RSP-SB-001",
  },
});

// MR 2: IR Dryer temperature fluctuation
const mr2 = await db.maintenanceRequest.create({
  data: {
    requestNumber: `MR-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-0002`,
    title: "IR Dryer temperature fluctuation",
    description: "IR Pre-dryer showing 15°C temperature variation. Quality impact on printed fabric. Temperature readings fluctuate between 145°C and 160°C instead of steady 150°C target. Needs immediate investigation.",
    priority: "high",
    category: "electrical",
    status: "in_progress",
    workflowStatus: "assigned_to_planner",
    machineDownStatus: false,
    assetId: dryingSectionAsset ? dryingSectionAsset.id : mainAsset.id,
    departmentId: mainAsset.departmentId,
    requestedBy: operator1.id,
    supervisorId: supervisor1.id,
    assignedPlannerId: planner1.id,
    plantId: mainAsset.plantId,
    estimatedHours: 4.0,
    slaHours: 8,
    notes: "May require thermocouple replacement or PID controller tuning",
  },
});

// MR 3: Unusual vibration on Main Drive
const mr3 = await db.maintenanceRequest.create({
  data: {
    requestNumber: `MR-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-0003`,
    title: "Unusual vibration on Main Drive",
    description: "Excessive vibration detected on main drive motor during startup. Possible bearing failure. Vibration amplitude measured at 12mm/s RMS — well above the 4.5mm/s alarm threshold. Immediate attention required to prevent catastrophic failure.",
    priority: "urgent",
    category: "mechanical",
    status: "pending",
    workflowStatus: "pending",
    machineDownStatus: true,
    assetId: electricalControlAsset ? electricalControlAsset.id : mainAsset.id,
    departmentId: mainAsset.departmentId,
    requestedBy: operator1.id,
    supervisorId: supervisor1.id,
    plantId: mainAsset.plantId,
    estimatedHours: 6.0,
    slaHours: 4,
    escalationLevel: 1,
    lastEscalatedAt: daysAgo(0),
    notes: "EMERGENCY: Machine may need to be shut down if vibration worsens. Spare bearing kit RSP-BR-MDR ordered.",
  },
});

console.log("  ✅ MR-1: Replace worn squeegee on Station 3 (medium / approved)");
console.log("  ✅ MR-2: IR Dryer temperature fluctuation (high / in_progress)");
console.log("  ✅ MR-3: Unusual vibration on Main Drive (urgent / pending)\n");

// ============================================================================
// 4. WORK ORDERS
// ============================================================================

console.log("🔨 Creating Work Orders...");

// WO 1: Corrective — Replace Screen Head 5 Bearings
const wo1 = await db.workOrder.create({
  data: {
    woNumber: `WO-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-0001`,
    title: "Corrective - Replace Screen Head 5 Bearings",
    description: "Replace worn bearings on rotary screen printing head Station 5. Bearings showing excessive play causing registration issues. Replacement with FAG 6205-2RS deep groove ball bearings per OEM specification.",
    type: "corrective",
    priority: "medium",
    status: "assigned",
    maintenanceRequestId: mr1.id,
    assetId: mainAsset.id,
    assetName: mainAsset.name,
    departmentId: mainAsset.departmentId,
    assignedTo: tech1.id,
    teamLeaderId: tech2.id,
    assignedSupervisorId: supervisor1.id,
    plannerId: planner1.id,
    estimatedHours: 3.0,
    plannedStart: daysFromNow(1),
    plannedEnd: daysFromNow(1),
    plantId: mainAsset.plantId,
    tradeActivity: "mechanical",
    safetyNotes: "LOTO required. Ensure paste circulation is isolated before starting work. Wear chemical-resistant gloves when handling paste residues.",
    ppeRequired: "Safety glasses, chemical-resistant gloves, steel-toe boots, hearing protection",
    failureDescription: "Bearing wear causing lateral play in screen head 5, resulting in print registration drift of 0.3mm per meter",
    causeDescription: "Normal wear — bearings have exceeded expected service life of 18 months under continuous operation",
    actionDescription: "Replace bearings with new FAG 6205-2RS units, check shaft alignment, verify end-play, test run at reduced speed",
  },
});

// WO 2: Preventive — Daily Inspection
const wo2 = await db.workOrder.create({
  data: {
    woNumber: `WO-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-0002`,
    title: "Preventive - Daily Inspection",
    description: "Auto-generated work order from daily PM schedule. Perform full daily inspection of the Rotary Screen Printing Machine per RSP-PM-DAY template.",
    type: "preventive",
    priority: "low",
    status: "in_progress",
    pmScheduleId: dailySchedule.id,
    assetId: mainAsset.id,
    assetName: mainAsset.name,
    departmentId: mainAsset.departmentId,
    assignedTo: tech1.id,
    estimatedHours: 1.0,
    actualStart: new Date(),
    plantId: mainAsset.plantId,
    tradeActivity: "mechanical",
    safetyNotes: "Standard machine guarding must remain in place. Do not reach into moving parts.",
    ppeRequired: "Safety glasses, hearing protection",
  },
});

// WO 3: Emergency — Main Drive Motor Bearing Failure
const wo3 = await db.workOrder.create({
  data: {
    woNumber: `WO-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-0003`,
    title: "Emergency - Main Drive Motor Bearing Failure",
    description: "Emergency work order for main drive motor bearing failure. Vibration at 12mm/s RMS measured. Machine shutdown imminent. Replace motor bearings (SKF 6310-2RS) and check coupling alignment. VFD fault log to be reviewed.",
    type: "emergency",
    priority: "critical",
    status: "approved",
    maintenanceRequestId: mr3.id,
    assetId: electricalControlAsset ? electricalControlAsset.id : mainAsset.id,
    assetName: electricalControlAsset ? electricalControlAsset.name : mainAsset.name,
    departmentId: mainAsset.departmentId,
    assignedTo: tech2.id,
    assignedSupervisorId: maint_mgr1.id,
    plannerId: planner1.id,
    estimatedHours: 6.0,
    plannedStart: new Date(),
    plannedEnd: daysFromNow(1),
    plantId: mainAsset.plantId,
    tradeActivity: "mechanical",
    safetyNotes: "EMERGENCY LOTO required. Disconnect main power, verify zero energy state. Crane required for motor removal. Minimum 2 technicians for bearing replacement.",
    ppeRequired: "Full PPE — hard hat, safety glasses, chemical-resistant gloves, steel-toe boots, arc-flash rated clothing for electrical panel work",
    failureDescription: "Main drive motor DE bearing failure — vibration 12mm/s RMS, temperature 95°C (normal 55°C), audible grinding noise",
    causeDescription: "Bearing fatigue failure — likely due to lubrication contamination or prolonged operation above rated load",
    actionDescription: "1) LOTO & power isolation 2) Remove motor coupling & belts 3) Extract motor 4) Replace DE & NDE bearings 5) Check shaft runout 6) Reinstall & align 7) VFD parameter check 8) Test run & vibration verification",
  },
});

// WO 4: Corrective — IR Dryer Element Replacement
const wo4 = await db.workOrder.create({
  data: {
    woNumber: `WO-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-0004`,
    title: "Corrective - IR Dryer Element Replacement",
    description: "Corrective work order for IR Pre-dryer temperature fluctuation. Investigate and replace faulty IR heating elements. Check thermocouple sensors and PID controller calibration. Verify uniform temperature distribution across drying chamber.",
    type: "corrective",
    priority: "high",
    status: "planned",
    maintenanceRequestId: mr2.id,
    assetId: dryingSectionAsset ? dryingSectionAsset.id : mainAsset.id,
    assetName: dryingSectionAsset ? dryingSectionAsset.name : mainAsset.name,
    departmentId: mainAsset.departmentId,
    assignedTo: tech1.id,
    plannerId: planner1.id,
    estimatedHours: 4.0,
    plannedStart: daysFromNow(2),
    plannedEnd: daysFromNow(2),
    plantId: mainAsset.plantId,
    tradeActivity: "electrical",
    safetyNotes: "Electrical LOTO required. IR elements remain hot for 30+ minutes after shutdown. Allow cooling before handling. Check for cracked elements before energizing.",
    ppeRequired: "Safety glasses, heat-resistant gloves, electrical insulated gloves, arc-flash rated clothing",
    failureDescription: "IR Pre-dryer zone 2 temperature fluctuation of ±15°C around setpoint. Likely caused by degraded IR element or faulty thermocouple.",
    causeDescription: "Element degradation after ~12000 operating hours. Thermocouple may also need recalibration.",
    actionDescription: "1) LOTO power to dryer section 2) Allow cooling period 3) Remove dryer cover panels 4) Inspect IR elements for damage/discoloration 5) Test thermocouples with calibrator 6) Replace faulty elements (Heraeus NIR) 7) Calibrate PID loop 8) Test run & verify temperature uniformity",
  },
});

console.log("  ✅ WO-1: Corrective - Replace Screen Head 5 Bearings (assigned → tech1)");
console.log("  ✅ WO-2: Preventive - Daily Inspection (in_progress → tech1)");
console.log("  ✅ WO-3: Emergency - Main Drive Motor Bearing Failure (approved → tech2)");
console.log("  ✅ WO-4: Corrective - IR Dryer Element Replacement (planned → tech1)\n");

// ============================================================================
// 5. DIGITAL TWIN
// ============================================================================

console.log("🌐 Creating Digital Twin...");

const digitalTwin = await db.digitalTwin.create({
  data: {
    name: "Rotary Screen Printing Machine - Digital Twin",
    assetId: mainAsset.id,
    description: "Digital twin for real-time monitoring and predictive maintenance of the RSP printing line. Integrates vibration, temperature, current, and pressure sensor data from all 12 printing heads, drive motors, paste circulation system, and IR dryer sections.",
    type: "other",
    parameters: JSON.stringify({
      machineType: "Rotary Screen Printing",
      numHeads: 12,
      maxSpeed: 80, // meters/min
      maxWidth: 3200, // mm
      pasteTypes: ["pigment", "reactive", "discharge", "plastisol"],
      monitoredParams: [
        "vibration_rms",
        "bearing_temperature",
        "motor_current",
        "paste_pressure",
        "dryer_temperature",
        "fabric_tension",
        "screen_tension",
        "squeegee_pressure"
      ],
      alertThresholds: {
        vibration_alarm: 4.5, // mm/s RMS
        vibration_trip: 7.1,
        bearing_temp_alarm: 80, // °C
        motor_current_alarm: 1.15, // × FLA
        dryer_temp_deviation: 5, // °C from setpoint
      },
    }),
    connections: JSON.stringify({
      printingHeads: Array.from({ length: 12 }, (_, i) => ({
        id: `head-${i + 1}`,
        type: "printing_station",
        sensors: ["vibration", "temperature", "current", "squeegee_pressure"],
      })),
      pasteSystem: {
        circulationPumps: 12,
        mixingTanks: 4,
        sensors: ["flow_rate", "pressure", "viscosity"],
      },
      dryerSections: [
        { id: "pre-dryer", type: "ir_dryer", elements: 24, sensors: ["temperature", "current"] },
        { id: "main-dryer", type: "steam_dryer", zones: 6, sensors: ["temperature", "steam_pressure"] },
      ],
      driveSystem: {
        mainDrive: { power_kW: 45, sensors: ["vibration", "temperature", "current"] },
        conveyorDrives: 3,
      },
    }),
    specification: JSON.stringify({
      oem: "Stork / Zimmer",
      model: "Rotascreen RSP-12",
      yearInstalled: 2019,
      printingWidth_mm: 3200,
      designSpeed_mpm: 80,
      numColors: 12,
      dryerType: "IR Pre-dryer + Steam Main Dryer",
      controlSystem: "Siemens S7-1500 PLC",
      vfd: "Siemens G120 series",
    }),
    healthScore: 78,
    syncInterval: "5min",
    lastSynced: new Date(),
    isActive: true,
    createdById: admin.id,
  },
});

console.log("  ✅ Digital Twin created — health score: 78\n");

// ============================================================================
// 6. SYSTEM DIAGRAM
// ============================================================================

console.log("📊 Creating System Diagram...");

const systemDiagram = await db.systemDiagram.create({
  data: {
    name: "RSP-001 System Architecture",
    plantId: mainAsset.plantId,
    description: "Complete system diagram showing all subsystems and their interconnections for the Rotary Screen Printing Machine. Covers paste preparation, printing heads, conveyor system, drying sections, and electrical control architecture.",
    type: "process",
    nodes: JSON.stringify([
      // Paste Kitchen
      { id: "paste-kitchen",      type: "process",    label: "Paste Kitchen",          x: 50,   y: 200,  subsystem: "paste" },
      { id: "mix-tank-1",         type: "tank",       label: "Mixing Tank 1",          x: 150,  y: 160,  subsystem: "paste" },
      { id: "mix-tank-2",         type: "tank",       label: "Mixing Tank 2",          x: 150,  y: 240,  subsystem: "paste" },
      { id: "paste-store",        type: "storage",    label: "Paste Storage",           x: 250,  y: 200,  subsystem: "paste" },
      // Paste Circulation
      { id: "circ-pump-bank",     type: "equipment",  label: "Circulation Pumps (×12)", x: 350,  y: 200,  subsystem: "paste" },
      // Printing Section
      { id: "entry-guide",        type: "process",    label: "Fabric Entry Guide",      x: 450,  y: 100,  subsystem: "printing" },
      { id: "head-1-6",           type: "process",    label: "Print Heads 1–6",        x: 550,  y: 100,  subsystem: "printing" },
      { id: "head-7-12",          type: "process",    label: "Print Heads 7–12",       x: 650,  y: 100,  subsystem: "printing" },
      { id: "register-system",    type: "instrument", label: "Register Camera System",  x: 600,  y: 40,   subsystem: "printing" },
      { id: "squeegee-system",    type: "equipment",  label: "Squeegee System (×12)",   x: 600,  y: 180,  subsystem: "printing" },
      // Conveyor
      { id: "main-conveyor",      type: "transport",  label: "Main Conveyor Belt",      x: 750,  y: 100,  subsystem: "conveyor" },
      { id: "edge-guide",         type: "instrument", label: "Edge Guide Sensor",       x: 750,  y: 180,  subsystem: "conveyor" },
      // Drying
      { id: "pre-dryer",          type: "equipment",  label: "IR Pre-Dryer",            x: 850,  y: 80,   subsystem: "drying" },
      { id: "main-dryer",         type: "equipment",  label: "Steam Main Dryer",        x: 950,  y: 80,   subsystem: "drying" },
      { id: "cooling-section",    type: "process",    label: "Cooling Section",         x: 1050, y: 80,   subsystem: "drying" },
      // Drive System
      { id: "main-drive-motor",   type: "equipment",  label: "Main Drive Motor (45kW)", x: 600,  y: 280,  subsystem: "drive" },
      { id: "gearbox",            type: "equipment",  label: "Main Gearbox",            x: 600,  y: 340,  subsystem: "drive" },
      // Pneumatic
      { id: "air-compressor",     type: "equipment",  label: "Air Compressor",          x: 400,  y: 340,  subsystem: "pneumatic" },
      { id: "air-dryer-filter",   type: "equipment",  label: "Air Dryer & FRL Unit",    x: 500,  y: 340,  subsystem: "pneumatic" },
      // Electrical / Control
      { id: "main-panel",         type: "equipment",  label: "Main Electrical Panel",   x: 800,  y: 280,  subsystem: "electrical" },
      { id: "plc-cabinet",        type: "equipment",  label: "PLC Cabinet (S7-1500)",   x: 900,  y: 280,  subsystem: "electrical" },
      { id: "vfd-panels",         type: "equipment",  label: "VFD Panels (G120)",       x: 1000, y: 280,  subsystem: "electrical" },
      { id: "hmi-panel",          type: "instrument", label: "HMI Operator Panel",      x: 1100, y: 200,  subsystem: "electrical" },
      // Output
      { id: "fabric-exit",        type: "process",    label: "Fabric Exit / Plaiter",    x: 1150, y: 80,   subsystem: "output" },
      // Exhaust
      { id: "exhaust-system",     type: "equipment",  label: "Exhaust Fan System",      x: 1000, y: 40,   subsystem: "drying" },
    ]),
    edges: JSON.stringify([
      // Paste flow
      { id: "e1",  source: "paste-kitchen",    target: "mix-tank-1",     label: "Paste Feed" },
      { id: "e2",  source: "paste-kitchen",    target: "mix-tank-2",     label: "Paste Feed" },
      { id: "e3",  source: "mix-tank-1",       target: "paste-store",    label: "Mixed Paste" },
      { id: "e4",  source: "mix-tank-2",       target: "paste-store",    label: "Mixed Paste" },
      { id: "e5",  source: "paste-store",      target: "circ-pump-bank", label: "Supply" },
      { id: "e6",  source: "circ-pump-bank",   target: "head-1-6",       label: "Circulation" },
      { id: "e7",  source: "circ-pump-bank",   target: "head-7-12",      label: "Circulation" },
      // Fabric flow
      { id: "e8",  source: "entry-guide",      target: "head-1-6",       label: "Fabric" },
      { id: "e9",  source: "head-1-6",         target: "head-7-12",      label: "Fabric" },
      { id: "e10", source: "head-7-12",        target: "main-conveyor",  label: "Printed Fabric" },
      { id: "e11", source: "main-conveyor",    target: "pre-dryer",      label: "Wet Fabric" },
      { id: "e12", source: "pre-dryer",        target: "main-dryer",     label: "Pre-dried" },
      { id: "e13", source: "main-dryer",       target: "cooling-section",label: "Dried" },
      { id: "e14", source: "cooling-section",  target: "fabric-exit",    label: "Finished" },
      // Drive
      { id: "e15", source: "main-drive-motor", target: "gearbox",        label: "Coupling" },
      { id: "e16", source: "gearbox",          target: "main-conveyor",  label: "Drive" },
      // Pneumatic
      { id: "e17", source: "air-compressor",   target: "air-dryer-filter", label: "Compressed Air" },
      { id: "e18", source: "air-dryer-filter", target: "squeegee-system", label: "Pneumatic" },
      // Electrical
      { id: "e19", source: "main-panel",       target: "plc-cabinet",    label: "Power & Signals" },
      { id: "e20", source: "plc-cabinet",      target: "vfd-panels",     label: "Control" },
      { id: "e21", source: "vfd-panels",       target: "main-drive-motor", label: "Motor Power" },
      { id: "e22", source: "plc-cabinet",      target: "hmi-panel",      label: "Ethernet" },
      { id: "e23", source: "plc-cabinet",      target: "register-system", label: "Vision Link" },
      // Exhaust
      { id: "e24", source: "pre-dryer",        target: "exhaust-system", label: "Exhaust Air" },
      { id: "e25", source: "main-dryer",       target: "exhaust-system", label: "Exhaust Air" },
    ]),
    viewport: JSON.stringify({ x: 0, y: 0, zoom: 0.65 }),
    version: 1,
    isTemplate: false,
    isActive: true,
    createdById: admin.id,
    updatedById: admin.id,
  },
});

console.log("  ✅ System Diagram created — 22 nodes, 25 edges\n");

// ============================================================================
// 7. WORK INSTRUCTIONS
// ============================================================================

console.log("📘 Creating Work Instructions...");

// Find the asset to use for componentId (use mainAsset for both componentId and assetId)
const wiAssetId = mainAsset.id;
const wiComponentId = mainAsset.id;

// --- WI 1: Rotary Screen Replacement Procedure ---
await db.workInstruction.create({
  data: {
    title: "Rotary Screen Replacement Procedure",
    description: "Detailed step-by-step procedure for replacing a rotary screen on the RSP printing machine. Covers preparation, LOTO, screen removal, new screen installation, tensioning, registration, and test print verification.",
    componentId: wiComponentId,
    assetId: wiAssetId,
    maintenanceType: "corrective",
    estimatedDuration: 45,
    difficulty: "advanced",
    safetyLevel: "high",
    requiresLockout: true,
    requiresPermit: true,
    prerequisites: JSON.stringify([]),
    steps: JSON.stringify([
      {
        id: "step-1",
        order: 1,
        title: "Prepare Tools and Materials",
        description: "Gather all required tools: screen lift tool, Allen key set (4mm, 5mm, 6mm), torque wrench, tension meter, new rotary screen (verified correct mesh count and pattern), cleaning cloths, IPA solvent, and screen alignment jig.",
        safetyNotes: "Ensure all PPE is donned before entering machine area.",
        estimatedMinutes: 5,
      },
      {
        id: "step-2",
        order: 2,
        title: "Lock Out / Tag Out (LOTO)",
        description: "Follow LOTO procedure: 1) Notify operator of intended work. 2) Press emergency stop. 3) Switch main disconnect to OFF and apply padlock + tag. 4) Verify zero energy — attempt to jog the machine. 5) Isolate paste feed to affected head. 6) Close paste valves.",
        safetyNotes: "NEVER skip LOTO. Verify zero energy before proceeding. This is a confined space entry — buddy system required.",
        estimatedMinutes: 10,
      },
      {
        id: "step-3",
        order: 3,
        title: "Drain Paste from Head",
        description: "Open drain valve on the affected print head. Collect residual paste in approved container for reclamation. Flush paste feed pipe with clean water. Wipe down the head interior with damp cloth.",
        safetyNotes: "Wear chemical-resistant gloves. Some paste formulations may be irritants.",
        estimatedMinutes: 5,
      },
      {
        id: "step-4",
        order: 4,
        title: "Remove End Rings and Squeegee",
        description: "Using Allen keys, loosen the end ring clamping bolts on both sides. Carefully slide end rings off the screen mandrel. Remove squeegee blade and squeegee holder. Set aside on clean surface.",
        safetyNotes: "End rings are heavy (~5 kg each). Use proper lifting technique.",
        estimatedMinutes: 10,
      },
      {
        id: "step-5",
        order: 5,
        title: "Remove Damaged Screen",
        description: "Using the screen lift tool, carefully slide the old rotary screen off the mandrel. Support the screen to prevent damage to adjacent heads. Place old screen on inspection table for damage analysis.",
        safetyNotes: "Damaged screens may have sharp edges. Handle with cut-resistant gloves.",
        estimatedMinutes: 5,
      },
      {
        id: "step-6",
        order: 6,
        title: "Clean Mandrel and Head Interior",
        description: "Thoroughly clean the screen mandrel with IPA solvent and lint-free cloth. Inspect for rust spots, burrs, or paste buildup. Clean the head interior, paste trough, and magnetic rod if applicable.",
        safetyNotes: "IPA is flammable. No open flames or hot work in the area. Ensure adequate ventilation.",
        estimatedMinutes: 5,
      },
      {
        id: "step-7",
        order: 7,
        title: "Install New Screen",
        description: "Carefully slide the new rotary screen onto the mandrel. Ensure the screen is seated against the shoulder. Align the pattern direction correctly (check the arrow marking on the screen). Ensure the screen seam runs in the correct circumferential direction.",
        safetyNotes: "Handle new screens with extreme care — the mesh is fragile. Never touch the image area with bare hands.",
        estimatedMinutes: 5,
      },
      {
        id: "step-8",
        order: 8,
        title: "Install End Rings and Apply Tension",
        description: "Slide end rings onto the mandrel. Finger-tighten clamping bolts in a star pattern. Using torque wrench, tighten bolts to OEM specification (12 Nm) in star pattern. Apply initial tension by expanding end rings per manufacturer procedure. Measure tension with tension meter — target 8–10 N/mm.",
        safetyNotes: "Uneven tension will cause registration issues. Always torque in star pattern.",
        estimatedMinutes: 10,
      },
      {
        id: "step-9",
        order: 9,
        title: "Install Squeegee and Reconnect Paste",
        description: "Install squeegee holder with new or inspected squeegee blade. Set initial squeegee pressure to 0.5 bar. Reconnect paste feed pipe to the head. Open paste supply valve. Prime the paste circulation until flow is steady and bubble-free.",
        safetyNotes: "Check for paste leaks at all connections before proceeding.",
        estimatedMinutes: 5,
      },
      {
        id: "step-10",
        order: 10,
        title: "Register and Test Print",
        description: "Remove LOTO and restore power. Run machine at minimum speed (5 m/min) with all other heads lifted. Lower the new screen and adjust lateral and circumferential register using the register camera system. Once registered, perform a test print on scrap fabric at 20 m/min. Check for pinholes, streaks, or registration errors.",
        safetyNotes: "Keep hands clear of all moving parts during test run. Emergency stop must be accessible.",
        estimatedMinutes: 15,
      },
      {
        id: "step-11",
        order: 11,
        title: "Final Checks and Handover",
        description: "Inspect test print quality against approved sample. Verify paste pressure is within operating range. Confirm no leaks, abnormal noise, or vibration. Log all work performed in CMMS. Return tools to stores. Remove LOTO lock. Notify operator that machine is ready for production.",
        safetyNotes: "Complete all documentation before removing LOTO.",
        estimatedMinutes: 5,
      },
    ]),
    requiredTools: JSON.stringify([
      { toolName: "Screen lift tool", toolCode: "RSP-TL-001", required: true },
      { toolName: "Allen key set (4/5/6mm)", toolCode: "GEN-TL-010", required: true },
      { toolName: "Torque wrench (10–25 Nm)", toolCode: "GEN-TL-020", required: true },
      { toolName: "Tension meter", toolCode: "RSP-TL-002", required: true },
      { toolName: "Screen alignment jig", toolCode: "RSP-TL-003", required: true },
      { toolName: "Lint-free cleaning cloths", toolCode: "GEN-CL-001", required: true },
      { toolName: "IPA solvent", toolCode: "GEN-SL-002", required: true },
    ]),
    requiredParts: JSON.stringify([
      { partName: "Rotary screen (assorted mesh)", partCode: "RSP-SCR-ASSY", quantity: 1, unit: "piece" },
      { partName: "Squeegee blade (Shore A 65)", partCode: "RSP-SB-001", quantity: 1, unit: "piece" },
      { partName: "End ring clamp bolts (M8)", partCode: "RSP-FH-005", quantity: 8, unit: "piece" },
    ]),
    safetyCheckpoints: JSON.stringify([
      { id: "sc-1", order: 1, description: "LOTO applied and verified — zero energy confirmed", type: "critical" },
      { id: "sc-2", order: 2, description: "Paste supply isolated and drained", type: "critical" },
      { id: "sc-3", order: 3, description: "PPE verified — safety glasses, gloves, steel-toe boots", type: "mandatory" },
      { id: "sc-4", order: 4, description: "Confined space entry permit obtained (if required)", type: "mandatory" },
      { id: "sc-5", order: 5, description: "No open flames — IPA solvent in use", type: "critical" },
      { id: "sc-6", order: 6, description: "Emergency stop accessible during test run", type: "mandatory" },
    ]),
    version: 1,
    isActive: true,
    createdById: planner1.id,
  },
});

console.log("  ✅ Work Instruction: Rotary Screen Replacement Procedure (11 steps)");

// --- WI 2: Squeegee Blade Change Procedure ---
await db.workInstruction.create({
  data: {
    title: "Squeegee Blade Change Procedure",
    description: "Step-by-step procedure for inspecting and replacing squeegee blades on the Rotary Screen Printing Machine. Covers blade inspection criteria, removal, installation, pressure setting, and print quality verification.",
    componentId: wiComponentId,
    assetId: wiAssetId,
    maintenanceType: "corrective",
    estimatedDuration: 25,
    difficulty: "intermediate",
    safetyLevel: "medium",
    requiresLockout: true,
    requiresPermit: false,
    prerequisites: JSON.stringify([]),
    steps: JSON.stringify([
      {
        id: "sstep-1",
        order: 1,
        title: "Gather Tools and Replacement Blade",
        description: "Obtain: Allen key set (4mm, 5mm), durometer gauge, straight edge (300mm), new squeegee blade (correct width and durometer — verify with material specification), lint-free cloths, and IPA solvent.",
        safetyNotes: "Standard machine shop PPE required.",
        estimatedMinutes: 3,
      },
      {
        id: "sstep-2",
        order: 2,
        title: "Stop Head and Apply LOTO",
        description: "Raise the affected print head to the up position using the HMI or manual lift. Press emergency stop for that head zone. Apply LOTO to the head-specific disconnect switch. Verify the squeegee is stationary and accessible.",
        safetyNotes: "Only lock out the affected head zone if the machine has zone-based isolation. Otherwise, full machine LOTO is required.",
        estimatedMinutes: 5,
      },
      {
        id: "sstep-3",
        order: 3,
        title: "Remove Squeegee Holder",
        description: "Loosen the squeegee holder clamping bolts (typically 2× M6 per side). Slide the squeegee holder assembly out of the mounting bracket. Place on a clean work surface.",
        safetyNotes: "Squeegee holders can be slippery when coated with paste residue. Use both hands.",
        estimatedMinutes: 3,
      },
      {
        id: "sstep-4",
        order: 4,
        title: "Inspect Existing Blade",
        description: "Remove the old squeegee blade from the holder. Inspect for: edge wear (rounded or chipped edge), nicks or cuts in the blade face, durometer change (measure with durometer gauge — compare to spec), excessive bowing or deformation. Record inspection findings.",
        safetyNotes: "Worn blades may have sharp edges. Handle with care.",
        estimatedMinutes: 3,
      },
      {
        id: "sstep-5",
        order: 5,
        title: "Clean Squeegee Holder",
        description: "Thoroughly clean the squeegee holder channel with IPA solvent and lint-free cloth. Remove all paste residue. Inspect the holder for damage, corrosion, or deformation. Ensure the clamping lip is not bent.",
        safetyNotes: "IPA is flammable — no hot work nearby.",
        estimatedMinutes: 2,
      },
      {
        id: "sstep-6",
        order: 6,
        title: "Install New Squeegee Blade",
        description: "Insert the new blade into the holder channel. Ensure it is fully seated and the edge is flush with the holder lip. Verify blade orientation — sharp edge should face the screen (downward in print position). Finger-tighten the clamping screws evenly from center outward.",
        safetyNotes: "The blade edge is sharp. Handle with cut-resistant gloves.",
        estimatedMinutes: 2,
      },
      {
        id: "sstep-7",
        order: 7,
        title: "Check Blade Straightness",
        description: "Place the squeegee holder on a flat surface. Run a straight edge along the blade length. Verify no gaps exceed 0.05mm over the full blade width. If blade has a crown (intentional bow), verify it matches the specification for the screen type.",
        safetyNotes: "N/A",
        estimatedMinutes: 2,
      },
      {
        id: "sstep-8",
        order: 8,
        title: "Reinstall Squeegee Holder",
        description: "Slide the squeegee holder back into the mounting bracket. Tighten clamping bolts to OEM specification (typically 8 Nm) in alternating pattern. Verify the holder moves freely in the adjustment range.",
        safetyNotes: "Do not over-torque — this can warp the holder and cause uneven print.",
        estimatedMinutes: 2,
      },
      {
        id: "sstep-9",
        order: 9,
        title: "Set Squeegee Pressure",
        description: "Set initial squeegee pressure to 0.4 bar using the pneumatic regulator on the head. Lower the head to print position slowly. Verify the blade contacts the screen evenly across the full width by running a dry (no paste) rotation at 5 m/min and observing contact marks on the underside of the screen.",
        safetyNotes: "Keep hands clear during dry rotation test.",
        estimatedMinutes: 3,
      },
      {
        id: "sstep-10",
        order: 10,
        title: "Test Print and Final Verification",
        description: "Remove LOTO. Restore paste supply to the head. Run a test print on scrap fabric at 15 m/min. Inspect print quality: check for streaks, uneven edges, color bleeding, or poor penetration. Adjust squeegee pressure in 0.1 bar increments if needed. Once satisfied, log the replacement in CMMS.",
        safetyNotes: "Confirm all guards are in place before production run.",
        estimatedMinutes: 5,
      },
    ]),
    requiredTools: JSON.stringify([
      { toolName: "Allen key set (4/5mm)", toolCode: "GEN-TL-010", required: true },
      { toolName: "Durometer gauge (Shore A)", toolCode: "RSP-TL-004", required: true },
      { toolName: "Straight edge 300mm", toolCode: "GEN-TL-030", required: true },
      { toolName: "Lint-free cleaning cloths", toolCode: "GEN-CL-001", required: true },
      { toolName: "IPA solvent", toolCode: "GEN-SL-002", required: true },
    ]),
    requiredParts: JSON.stringify([
      { partName: "Squeegee blade — Shore A 65 (standard)", partCode: "RSP-SB-001", quantity: 1, unit: "piece" },
      { partName: "Squeegee blade — Shore A 55 (delicate)", partCode: "RSP-SB-002", quantity: 1, unit: "piece" },
      { partName: "Squeegee blade — Shore A 75 (heavy)", partCode: "RSP-SB-003", quantity: 1, unit: "piece" },
    ]),
    safetyCheckpoints: JSON.stringify([
      { id: "ssc-1", order: 1, description: "LOTO applied — head zone isolated", type: "critical" },
      { id: "ssc-2", order: 2, description: "PPE verified — safety glasses, cut-resistant gloves", type: "mandatory" },
      { id: "ssc-3", order: 3, description: "Old blade edge inspected and findings recorded", type: "mandatory" },
      { id: "ssc-4", order: 4, description: "New blade durometer verified against specification", type: "mandatory" },
      { id: "ssc-5", order: 5, description: "Blade straightness verified — no gaps > 0.05mm", type: "mandatory" },
      { id: "ssc-6", order: 6, description: "Test print quality accepted by supervisor or QA", type: "mandatory" },
    ]),
    version: 1,
    isActive: true,
    createdById: planner1.id,
  },
});

console.log("  ✅ Work Instruction: Squeegee Blade Change Procedure (10 steps)\n");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("═══════════════════════════════════════════════════════════════════");
console.log("  PART 2 SEED SUMMARY");
console.log("═══════════════════════════════════════════════════════════════════");
console.log("  PM Templates:          4");
console.log("  PM Template Tasks:     39 (9 + 10 + 10 + 10)");
console.log("  PM Schedules:          4 (daily, weekly, monthly, quarterly)");
console.log("  Maintenance Requests:  3");
console.log("  Work Orders:           4");
console.log("  Digital Twin:          1");
console.log("  System Diagram:        1");
console.log("  Work Instructions:     2 (11 steps + 10 steps)");
console.log("═══════════════════════════════════════════════════════════════════\n");

console.log("\n✅ Part 2 complete!");
console.log("Shutting down...");
await db.$disconnect();
