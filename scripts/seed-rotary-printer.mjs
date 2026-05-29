#!/usr/bin/env node
/**
 * ============================================================================
 * Seed Script Part 1: Rotary Screen Printing Machine — GTP Ghana
 * ============================================================================
 * Creates:
 *   1. Asset categories (PM → RSP / FLAT under existing ME)
 *   2. Main asset RSP-001 (Rotary Screen Printing Machine)
 *   3. Complete asset hierarchy (31 child assets across 8 sections)
 *   4. 17 inventory items (13 spare parts + 4 consumables)
 *   5. Bill of Materials linking parent → child assets
 *
 * Prerequisites:
 *   - Plant TEM-001, departments, users, and base categories (RE/EL/ME/IN)
 *     must already exist on the VPS.
 *
 * Usage:
 *   node scripts/seed-rotary-printer.mjs
 *   bun  scripts/seed-rotary-printer.mjs
 * ============================================================================
 */

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

// ─── Helper: truncate description to fit VARCHAR(191) ────────────────────────
const desc = (text, max = 190) =>
  text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '\u2026';

// ─── Helper: upsert asset by assetTag (idempotent on re-runs) ────────────────
const createAsset = async ({ data }) => {
  const { assetTag, ...rest } = data;
  return db.asset.upsert({
    where: { assetTag },
    update: {},
    create: { assetTag, ...rest },
  });
};

// ─── Hardcoded Existing IDs (do NOT recreate) ─────────────────────────────────
const IDS = {
  plant_TEM001:          'cmpq4a4x3016m0osiwfb138qf',
  dept_MAINT:           'cmpq4a4xz016p0osi08h2y7q8',
  dept_PROD:            'cmpq4a4y7016q0osierq1c5mf',
  dept_ENG:             'cmpq4a4yr016s0osi9vgnv4rk',
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  SEED PART 1 — Rotary Screen Printing Machine (RSP-001)');
  console.log('  GTP Ghana · Tema Factory');
  console.log('════════════════════════════════════════════════════════════════\n');

  // ── 0. Resolve existing "ME" category ─────────────────────────────────────
  console.log('━ [0] Resolving existing ME (Mechanical) category …');
  const meCategory = await db.assetCategory.findUnique({ where: { code: 'ME' } });
  if (!meCategory) {
    throw new Error('ME (Mechanical) category not found — seed base data first');
  }
  console.log(`   ✓ ME category found: id=${meCategory.id}`);

  // Also resolve EL (Electrical) for the ELC sub-asset
  const elCategory = await db.assetCategory.findUnique({ where: { code: 'EL' } });
  if (!elCategory) throw new Error('EL (Electrical) category not found');
  console.log(`   ✓ EL category found: id=${elCategory.id}\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1: ASSET CATEGORIES
  // ══════════════════════════════════════════════════════════════════════════
  console.log('━ [1] CREATING ASSET CATEGORIES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const catPM = await db.assetCategory.upsert({
    where: { code: 'PM' },
    update: {},
    create: {
      code: 'PM',
      name: 'Printing Machines',
      description: 'All printing machinery used in textile production — rotary, flatbed, digital, and specialty printers.',
      parentId: meCategory.id,
      isActive: true,
    },
  });
  console.log(`   ✓ PM  — Printing Machines       (id: ${catPM.id})`);

  const catRSP = await db.assetCategory.upsert({
    where: { code: 'RSP' },
    update: {},
    create: {
      code: 'RSP',
      name: 'Rotary Screen Printing',
      description: 'Rotary screen printing machines for high-speed continuous textile printing using rotary nickel screens.',
      parentId: catPM.id,
      isActive: true,
    },
  });
  console.log(`   ✓ RSP — Rotary Screen Printing   (id: ${catRSP.id})`);

  const catFLAT = await db.assetCategory.upsert({
    where: { code: 'FLAT' },
    update: {},
    create: {
      code: 'FLAT',
      name: 'Flat Screen Printing',
      description: 'Flat bed / flat screen printing machines for piece-good and specialty textile printing.',
      parentId: catPM.id,
      isActive: true,
    },
  });
  console.log(`   ✓ FLAT— Flat Screen Printing     (id: ${catFLAT.id})`);
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2: MAIN ASSET — RSP-001
  // ══════════════════════════════════════════════════════════════════════════
  console.log('━ [2] CREATING MAIN ASSET RSP-001 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const mainAssetSpec = JSON.stringify({
    machineType: 'Rotary Screen Printing Machine',
    manufacturer: 'Stork Prints (now SPGPrints)',
    model: 'R/SMP 12-Color',
    numberOfColorStations: 12,
    maxFabricWidth: '1850 mm',
    printingWidth: '1850 mm',
    speedRange: { min: 5, max: 120, unit: 'm/min' },
    screenDiameter: '268 mm (standard)',
    screenRepeatLengths: '640 – 1018 mm',
    squeegeeType: 'Magnetic rod & blade',
    driveSystem: 'Individual AC servo per color station',
    registerSystem: 'Electronic camera-based register',
    pasteApplication: 'Pump-fed circulation system',
    dryingSystem: 'Multi-zone IR + hot-air flotation',
    controlSystem: 'Siemens S7-1500 PLC with HMI',
    powerRequirement: '400V / 50Hz / 3-phase, ~250 kW installed',
    compressedAirRequirement: '6 bar, 120 NL/min',
    coolingWaterRequirement: '~15 m³/h',
    machineLength: '~42 m (including dryer)',
    machineWeight: '~28,000 kg (dry)',
    fabricTypes: ['Woven cotton', 'Woven polyester', 'Knitted cotton', 'Knitted polyester', 'Blends'],
  }, null, 2);

  // Upsert main asset so script is idempotent on re-runs
  const mainAsset = await createAsset({
    data: {
      assetTag: 'RSP-001',
      name: 'Rotary Screen Printing Machine - Line 1',
      description: desc(
        'Stork RSMP Rotary Screen Printing Machine, 12-color, 1850 mm width. ' +
        'Primary textile printing line at GTP Ghana Tema Factory for woven and knitted fabrics.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints',
      model: 'R/SMP 12-Color',
      serialNumber: 'STK-RSMP-2019-GTP001',
      yearManufactured: 2019,
      condition: 'good',
      status: 'operational',
      criticality: 'critical',
      location: 'Printing Hall A, Bay 3',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      purchaseDate: new Date('2019-03-15'),
      purchaseCost: 2850000,
      warrantyExpiry: new Date('2022-03-15'),
      installedDate: new Date('2019-06-01'),
      expectedLifeYears: 20,
      currentValue: 2280000,
      depreciationRate: 5.0,
      specification: mainAssetSpec,
      assignedToId: IDS.user_operator1,
      createdById: IDS.user_admin,
      isActive: true,
    },
  });
  console.log(`   ✓ RSP-001  id: ${mainAsset.id}`);
  console.log(`             name: ${mainAsset.name}`);
  console.log(`             criticality: ${mainAsset.criticality}`);
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3: ASSET HIERARCHY — Sub-components
  // ══════════════════════════════════════════════════════════════════════════
  console.log('━ [3] CREATING ASSET HIERARCHY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const bomEntries = []; // collect for BOM creation later
  const assetMap = {};   // tag → id lookup

  // ── 3a. Entry Section ─────────────────────────────────────────────────────
  console.log('   ┌─ 3a. Entry Section');

  const entrySection = await createAsset({
    data: {
      assetTag: 'RSP-001-ENT',
      name: 'Entry Section',
      description: desc(
        'Fabric unwinding and preparation section with motorized unwinder, pneumatic tension control, ' +
        'edge guide sensor, and fabric spreader for wrinkle removal.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints',
      model: 'Entry Unit R/SMP',
      criticality: 'high',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Entry End',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: mainAsset.id,
      createdById: IDS.user_admin,
      assignedToId: IDS.user_operator1,
      specification: JSON.stringify({
        subComponents: [
          { name: 'Unwinding Unit', type: 'Motorized beam unwinder', quantity: 1, maxRollDiameter: '1800 mm' },
          { name: 'Tension Control System', type: 'Pneumatic dancer roll + load cells', quantity: 1, controlRange: '20–600 N' },
          { name: 'Edge Guide Sensor', type: 'Ultrasonic / photoelectric', quantity: 2, accuracy: '±0.5 mm' },
          { name: 'Fabric Spreader', type: 'Expander roller with bowed rollers', quantity: 1, maxWidth: '1900 mm' },
        ],
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-ENT'] = entrySection.id;
  bomEntries.push({ parentId: mainAsset.id, childAssetId: entrySection.id, qty: 1, unit: 'set', note: 'Entry section assembly' });
  console.log('   │   ✓ RSP-001-ENT   Entry Section');

  // ── 3b. Printing Section ──────────────────────────────────────────────────
  console.log('   ├─ 3b. Printing Section (MOST CRITICAL)');

  const printSection = await createAsset({
    data: {
      assetTag: 'RSP-001-PRT',
      name: 'Printing Section',
      description: desc(
        'Core 12-color rotary screen printing section with independent AC servo drives, ' +
        'magnetic squeegees, electronic register control, and pump-fed paste circulation.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints',
      model: 'R/SMP Printing Section 12-Color',
      criticality: 'critical',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Print Zone',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: mainAsset.id,
      createdById: IDS.user_admin,
      assignedToId: IDS.user_tech1,
      specification: JSON.stringify({
        numberOfStations: 12,
        driveType: 'Individual AC servo per station',
        squeegeeType: 'Magnetic rod + profile blade',
        registerSystem: 'Electronic camera-based with laser alignment',
        pasteSystem: 'Pump-fed circulation',
        screenLift: 'Pneumatic, automatic on stop',
        washingSystem: 'Integrated automatic screen washing',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-PRT'] = printSection.id;
  bomEntries.push({ parentId: mainAsset.id, childAssetId: printSection.id, qty: 1, unit: 'set', note: '12-color printing section assembly' });
  console.log('   │   ✓ RSP-001-PRT   Printing Section');

  // 12x Rotary Screen Heads
  console.log('   │      ├─ Rotary Screen Heads (×12)');
  const colorNames = [
    'Color 1 (White Base)', 'Color 2', 'Color 3', 'Color 4', 'Color 5', 'Color 6',
    'Color 7', 'Color 8', 'Color 9', 'Color 10', 'Color 11', 'Color 12 (Dark/Pigment)',
  ];

  for (let i = 1; i <= 12; i++) {
    const headNum = String(i).padStart(2, '0');
    const tag = `RSP-001-PRT-SH${headNum}`;
    const head = await createAsset({
      data: {
        assetTag: tag,
        name: `Rotary Screen Head — ${colorNames[i - 1]}`,
        description: desc(`Station ${i} rotary screen head: nickel screen, squeegee assembly, paste trough, end-ring seal. Servo-driven electronic lateral and longitudinal register.`),
        categoryId: catRSP.id,
        plantId: IDS.plant_TEM001,
        departmentId: IDS.dept_PROD,
        manufacturer: 'Stork Prints',
        model: 'R/SMP Screen Head Unit',
        criticality: 'critical',
        status: 'operational',
        condition: 'good',
        location: `Printing Hall A, Bay 3 — Station ${i}`,
        building: 'Main Production Building',
        floor: 'Ground Floor',
        parentId: printSection.id,
        createdById: IDS.user_admin,
        assignedToId: IDS.user_tech1,
        specification: JSON.stringify({
          stationNumber: i,
          colorName: colorNames[i - 1],
          screenDiameter: '268 mm',
          maxScreenWidth: '2660 mm',
          repeatLengthRange: '640–1018 mm',
          driveType: 'AC servo, 3.7 kW',
          squeegeeType: 'Magnetic rod (Ø10–25 mm) + blade profile',
          lateralRegister: '±10 mm, servo-controlled',
          longitudinalRegister: '±2 mm, servo-controlled',
          pasteTrough: 'Stainless steel, dual-chamber',
          liftMechanism: 'Pneumatic, auto-lift on machine stop',
        }, null, 2),
        isActive: true,
      },
    });
    assetMap[tag] = head.id;
    bomEntries.push({ parentId: printSection.id, childAssetId: head.id, qty: 1, unit: 'each', note: `Station ${i} screen head` });
  }
  console.log('   │      │   ✓ SH01 through SH12 created');

  // Squeegee System
  const squeegeeSystem = await createAsset({
    data: {
      assetTag: 'RSP-001-PRT-SQG',
      name: 'Squeegee System — All Stations',
      description: desc(
        'Central squeegee system with magnetic rods and profile blades for all 12 stations. ' +
        'Includes grinding station, storage rack, and per-station pressure adjustment.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints / Kiya',
      criticality: 'high',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Print Zone',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: printSection.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        squeegeeTypes: ['Magnetic rod Ø10 mm', 'Magnetic rod Ø15 mm', 'Magnetic rod Ø20 mm', 'Magnetic rod Ø25 mm', 'Profile blade 40×10 mm', 'Profile blade 50×12 mm'],
        magneticForceControl: 'Electromagnetic, adjustable 0–100%',
        perStationPressureAdjustment: true,
        grindingStationIncluded: true,
        totalSqueegeeInventory: 48,
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-PRT-SQG'] = squeegeeSystem.id;
  bomEntries.push({ parentId: printSection.id, childAssetId: squeegeeSystem.id, qty: 1, unit: 'set', note: 'Squeegee system for all 12 stations' });

  // Paste Circulation System
  const pasteCirc = await createAsset({
    data: {
      assetTag: 'RSP-001-PRT-PSC',
      name: 'Paste Circulation System',
      description: desc(
        'Pump-fed paste circulation for 12 stations with progressive cavity pumps, ' +
        'stainless steel piping, CIP capability, flow meters, and pressure sensors.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints',
      model: 'R/SMP Paste Circulation',
      criticality: 'high',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Below Print Zone',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: printSection.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        pumpType: 'Progressive cavity (peristaltic backup)',
        pumpsPerStation: 1,
        totalPumps: 12,
        pipeMaterial: 'Stainless steel 316L, DN25',
        flowRatePerStation: '0.5–5 L/min (adjustable)',
        pressureRange: '0.5–3 bar',
        cipCapability: true,
        filterMeshAtInlet: '80–120 mesh',
        levelSensors: 'Ultrasonic, per trough',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-PRT-PSC'] = pasteCirc.id;
  bomEntries.push({ parentId: printSection.id, childAssetId: pasteCirc.id, qty: 1, unit: 'set', note: 'Paste circulation for 12 stations' });

  // Screen Register System
  const registerSystem = await createAsset({
    data: {
      assetTag: 'RSP-001-PRT-REG',
      name: 'Screen Register System',
      description: desc(
        'Camera-based register control for pattern alignment across 12 stations. ' +
        'CCD cameras, laser markers, servo-driven lateral and longitudinal adjustment.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_ENG,
      manufacturer: 'Stork Prints / BST eltromat',
      model: 'Register Control R/CAM',
      criticality: 'critical',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Print Zone',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: printSection.id,
      createdById: IDS.user_admin,
      assignedToId: IDS.user_tech1,
      specification: JSON.stringify({
        controlType: 'Camera-based with laser alignment',
        camerasPerStation: 1,
        totalCameras: 12,
        cameraResolution: 'High-resolution CCD',
        lateralRegisterRange: '±10 mm',
        longitudinalRegisterRange: '±2 mm',
        registerSpeed: '< 0.5 s correction time',
        laserAlignment: true,
        autoSetupFromJobFile: true,
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-PRT-REG'] = registerSystem.id;
  bomEntries.push({ parentId: printSection.id, childAssetId: registerSystem.id, qty: 1, unit: 'set', note: 'Electronic register control system' });
  console.log('   │      ├─ ✓ SQG  Squeegee System');
  console.log('   │      ├─ ✓ PSC  Paste Circulation System');
  console.log('   │      └─ ✓ REG  Screen Register System');

  // ── 3c. Drying Section ────────────────────────────────────────────────────
  console.log('   ├─ 3c. Drying Section');

  const drySection = await createAsset({
    data: {
      assetTag: 'RSP-001-DRY',
      name: 'Drying Section',
      description: desc(
        'Multi-zone drying with IR pre-dry and hot-air flotation. Includes conveyor, ' +
        'per-zone temperature control, exhaust system, and heat recovery.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints / Brückner',
      model: 'R/SMP Dryer Module',
      criticality: 'high',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Dryer Zone',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: mainAsset.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        totalLength: '~18 m',
        numberOfZones: 6,
        dryingMethod: 'IR pre-dry + hot-air flotation',
        maxDryingTemperature: '150 °C',
        conveyorType: 'PTFE-coated mesh belt',
        exhaustSystem: 'Per-zone extraction with heat recovery',
        throughputCapacity: 'Up to 120 m/min',
        fuelType: 'Natural gas / thermal oil',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-DRY'] = drySection.id;
  bomEntries.push({ parentId: mainAsset.id, childAssetId: drySection.id, qty: 1, unit: 'set', note: 'Drying section assembly' });
  console.log('   │   ✓ RSP-001-DRY   Drying Section');

  // Conveyor System
  const conveyor = await createAsset({
    data: {
      assetTag: 'RSP-001-DRY-CNV',
      name: 'Dryer Conveyor System',
      description: desc(
        'PTFE-coated mesh belt conveyor for dryer. Variable speed, belt tracking, ' +
        'tension control, and integrated belt washing station.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Habasit / Stork',
      criticality: 'high',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Dryer Zone',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: drySection.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        beltType: 'PTFE-coated fiberglass mesh',
        beltWidth: '2000 mm',
        beltLength: '~36 m (total loop)',
        driveMotor: 'AC, 2.2 kW with VFD',
        speedRange: '5–120 m/min',
        trackingSystem: 'Automatic ultrasonic edge sensor',
        tensionControl: 'Pneumatic with load cell feedback',
        beltWashing: 'Integrated spray bar + scraper',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-DRY-CNV'] = conveyor.id;
  bomEntries.push({ parentId: drySection.id, childAssetId: conveyor.id, qty: 1, unit: 'set', note: 'Dryer conveyor belt system' });

  // IR Pre-dryer
  const irDryer = await createAsset({
    data: {
      assetTag: 'RSP-001-DRY-IRD',
      name: 'IR Pre-Dryer',
      description: desc(
        'IR pre-drying zone after last print station. Medium-wave emitters for ' +
        'rapid surface setting to prevent smudging before flotation dryer.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints / Heraeus',
      model: 'IR Pre-Dry Module',
      criticality: 'high',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Dryer Zone Entry',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: drySection.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        zoneLength: '~3 m',
        emitterType: 'Medium-wave infrared (quartz tungsten)',
        numberOfEmitters: 24,
        emitterPower: '2 kW each (48 kW total)',
        wavelength: '2.4–3.0 µm',
        temperatureControl: 'Zone-level PID with IR pyrometer feedback',
        fabricClearance: '50 mm (adjustable)',
        coolingSystem: 'Forced air on emitter backs',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-DRY-IRD'] = irDryer.id;
  bomEntries.push({ parentId: drySection.id, childAssetId: irDryer.id, qty: 1, unit: 'set', note: 'IR pre-drying zone' });

  // Hot Air Dryer
  const hotAirDryer = await createAsset({
    data: {
      assetTag: 'RSP-001-DRY-HAD',
      name: 'Hot Air Flotation Dryer',
      description: desc(
        '5-zone hot-air flotation dryer for moisture evaporation and print fixation. ' +
        'NOx-reduced gas burners, per-zone temperature control, heat recovery.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Brückner / Stork',
      model: 'Flotation Dryer R/SMP',
      criticality: 'high',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Dryer Zone Main',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: drySection.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        numberOfZones: 5,
        totalLength: '~12 m',
        dryingMethod: 'Floatation (nozzle bars above + below)',
        maxTemperature: '150 °C per zone',
        airVolume: '~25,000 m³/h',
        heatingSource: 'Natural gas (NOx-reduced burners)',
        heatRecovery: 'Cross-flow heat exchanger, ~30% recovery',
        humidityControl: 'Exhaust damper + fresh air intake per zone',
        insulationThickness: '100 mm mineral wool',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-DRY-HAD'] = hotAirDryer.id;
  bomEntries.push({ parentId: drySection.id, childAssetId: hotAirDryer.id, qty: 1, unit: 'set', note: '5-zone hot air flotation dryer' });

  // Exhaust System
  const exhaustSystem = await createAsset({
    data: {
      assetTag: 'RSP-001-DRY-EXH',
      name: 'Dryer Exhaust System',
      description: desc(
        'Dryer exhaust with per-zone extraction hoods, 15 kW centrifugal fan, ' +
        'heat recovery, emission monitoring, and particulate filtration.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_MAINT,
      manufacturer: 'Stork / TROX',
      criticality: 'medium',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Dryer Roof Zone',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: drySection.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        extractionZones: 6,
        mainExhaustFan: 'Centrifugal, 15 kW, ~30,000 m³/h',
        ductMaterial: 'Stainless steel 304, insulated',
        heatExchanger: 'Cross-flow plate type',
        stackHeight: '~12 m above roof level',
        emissionMonitoring: 'Continuous VOC sensor',
        filterType: 'Mesh pre-filter + particulate filter',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-DRY-EXH'] = exhaustSystem.id;
  bomEntries.push({ parentId: drySection.id, childAssetId: exhaustSystem.id, qty: 1, unit: 'set', note: 'Exhaust + heat recovery system' });
  console.log('   │      ├─ ✓ CNV  Conveyor System');
  console.log('   │      ├─ ✓ IRD  IR Pre-Dryer');
  console.log('   │      ├─ ✓ HAD  Hot Air Dryer');
  console.log('   │      └─ ✓ EXH  Exhaust System');

  // ── 3d. Exit Section ──────────────────────────────────────────────────────
  console.log('   ├─ 3d. Exit Section');

  const exitSection = await createAsset({
    data: {
      assetTag: 'RSP-001-EXT',
      name: 'Exit Section',
      description: desc(
        'Fabric cooling, winding, and plaiting at delivery end. Cooling cylinders, ' +
        'motorized A/B winder, and plaiting unit for trolley accumulation.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints',
      model: 'R/SMP Exit Unit',
      criticality: 'medium',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Exit End',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: mainAsset.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        coolingMethod: 'Chilled water cylinders + ambient air',
        windingMode: 'Single roll / double roll (A+B winder)',
        plaitingHeight: 'Up to 2 m on trolley',
        maxRollDiameter: '1500 mm',
        fabricWidth: '1850 mm',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-EXT'] = exitSection.id;
  bomEntries.push({ parentId: mainAsset.id, childAssetId: exitSection.id, qty: 1, unit: 'set', note: 'Exit section assembly' });
  console.log('   │   ✓ RSP-001-EXT   Exit Section');

  // Cooling Cylinders
  const coolingCyl = await createAsset({
    data: {
      assetTag: 'RSP-001-EXT-CLG',
      name: 'Cooling Cylinders',
      description: desc(
        '6 chilled-water stainless steel cooling cylinders reducing fabric from ' +
        '~120°C dryer exit to ~35°C ambient for safe winding.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints',
      criticality: 'medium',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Exit End',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: exitSection.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        numberOfCylinders: 6,
        cylinderDiameter: '500 mm',
        cylinderFace: '2000 mm',
        material: 'Stainless steel 316L, mirror-finished',
        coolingMedium: 'Chilled water (12–15 °C inlet)',
        waterFlowRate: '~8 m³/h',
        temperatureDrop: '~80–120 °C → ~35 °C',
        drive: 'Driven by fabric tension (free-rolling)',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-EXT-CLG'] = coolingCyl.id;
  bomEntries.push({ parentId: exitSection.id, childAssetId: coolingCyl.id, qty: 1, unit: 'set', note: '6-cylinder cooling unit' });

  // Fabric Winder
  const winder = await createAsset({
    data: {
      assetTag: 'RSP-001-EXT-WND',
      name: 'Fabric Winder — A/B Double Winder',
      description: desc(
        'Motorized A/B double-station winder for continuous operation. ' +
        'PLC-controlled tension, speed sync, automatic length counting.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints',
      model: 'R/SMP A/B Winder',
      criticality: 'high',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Exit End',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: exitSection.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        type: 'A/B double station',
        driveMotor: 'AC, 5.5 kW with VFD',
        maxRollDiameter: '1500 mm',
        maxRollWeight: '1500 kg',
        windingSpeed: 'Synchronized, 5–120 m/min',
        tensionControl: 'PLC-controlled, load cell feedback',
        lengthCounter: 'Electronic, resettable',
        doffingMethod: 'Manual with pneumatic roll lift',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-EXT-WND'] = winder.id;
  bomEntries.push({ parentId: exitSection.id, childAssetId: winder.id, qty: 1, unit: 'set', note: 'A/B double winder' });

  // Plaiting Unit
  const plaiting = await createAsset({
    data: {
      assetTag: 'RSP-001-EXT-PLT',
      name: 'Plaiting Unit (Batching Down)',
      description: desc(
        'Fabric plaiting unit for zigzag accumulation on trolleys. ' +
        'Used for batch processing (steaming, washing) instead of roll winding.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints',
      criticality: 'low',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Exit End',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: exitSection.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        plaitingHeight: 'Up to 2 m',
        trolleyWidth: '2000 mm',
        traverseSpeed: 'Synchronized with line speed',
        fabricClamp: 'Pneumatic clamp at start/end',
        trolleyType: 'Mobile, 4-wheel swivel casters',
        maxFabricWidth: '1850 mm',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-EXT-PLT'] = plaiting.id;
  bomEntries.push({ parentId: exitSection.id, childAssetId: plaiting.id, qty: 1, unit: 'set', note: 'Plaiting/batching unit' });
  console.log('   │      ├─ ✓ CLG  Cooling Cylinders');
  console.log('   │      ├─ ✓ WND  Fabric Winder');
  console.log('   │      └─ ✓ PLT  Plaiting Unit');

  // ── 3e. Paste Kitchen ─────────────────────────────────────────────────────
  console.log('   ├─ 3e. Paste Kitchen');

  const pasteKitchen = await createAsset({
    data: {
      assetTag: 'RSP-001-PKS',
      name: 'Paste Kitchen',
      description: desc(
        'Paste prep and storage for RSP-001: 4 mixing tanks (500L), 8 storage tanks (1000L), ' +
        '4 paste pumps, central multi-stage filtration system.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_PROD,
      manufacturer: 'Stork Prints / Various',
      criticality: 'high',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Paste Kitchen Room',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: mainAsset.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        subComponents: [
          { name: 'Color Mixing Tanks', quantity: 4, capacity: '500 L each', material: 'Stainless steel 316L', agitator: 'Variable speed, pneumatic' },
          { name: 'Paste Storage Tanks', quantity: 8, capacity: '1000 L each', material: 'Stainless steel 316L', features: 'Heated jackets, level sensors, agitators' },
          { name: 'Paste Pumps', quantity: 4, type: 'Progressive cavity / pneumatic diaphragm', capacity: '20 L/min', material: 'Food-grade' },
          { name: 'Filtration System', quantity: 1, type: 'Multi-stage (coarse 40 mesh → fine 120 mesh)', flowRate: '30 L/min', autoBackwash: true },
        ],
        floorArea: '~80 m²',
        environmentalControls: ['Temperature 20–25 °C', 'Humidity 50–60%', 'Floor drainage', 'Ventilation exhaust'],
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-PKS'] = pasteKitchen.id;
  bomEntries.push({ parentId: mainAsset.id, childAssetId: pasteKitchen.id, qty: 1, unit: 'set', note: 'Paste preparation & storage area' });
  console.log('   │   ✓ RSP-001-PKS   Paste Kitchen (4 mixing tanks, 8 storage tanks, 4 pumps, filtration)');

  // ── 3f. Electrical & Control System ───────────────────────────────────────
  console.log('   ├─ 3f. Electrical & Control System');

  const elecSystem = await createAsset({
    data: {
      assetTag: 'RSP-001-ELC',
      name: 'Electrical & Control System',
      description: desc(
        'Electrical and automation: 75kW main motor, Siemens S7-1500 PLC, 6 VFDs, ' +
        '3 HMI panels, safety interlocks, and power distribution board.'
      ),
      categoryId: elCategory.id, // Electrical category
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_ENG,
      manufacturer: 'Siemens / ABB / Stork',
      criticality: 'critical',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Electrical Room',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: mainAsset.id,
      createdById: IDS.user_admin,
      assignedToId: IDS.user_tech1,
      specification: JSON.stringify({
        subComponents: [
          { name: 'Main Drive Motor', quantity: 1, rating: '75 kW, 400V, 3-phase, 1475 RPM', manufacturer: 'ABB / Siemens', type: 'AC induction, IP55' },
          { name: 'PLC Control Panel', quantity: 1, model: 'Siemens S7-1500 CPU 1517F-3 PN/DP', iopoints: '~1200 I/O', safety: 'Failsafe integrated' },
          { name: 'Variable Frequency Drives', quantity: 6, model: 'Siemens G120 / Sinamics', ratings: ['75 kW (main drive)', '5.5 kW (winder)', '2.2 kW (conveyor)', '3× 3.7 kW (auxiliary)'] },
          { name: 'HMI Touch Panels', quantity: 3, model: 'Siemens KTP1200 / KTP1500', locations: ['Operator desk (entry)', 'Operator desk (exit)', 'Paste kitchen'] },
          { name: 'Safety Interlock System', quantity: 1, type: 'Siemens F-CPU + safety relays', features: 'E-stop, guard interlocks, light curtains, safety mats' },
          { name: 'Power Distribution Board', quantity: 1, rating: '400A main breaker, MCC with motor protection', compartments: '12 motor circuits + PLC power + UPS' },
        ],
        upsBackup: '10 kVA, 15 min runtime for PLC + HMIs',
        network: 'PROFINET + PROFIBUS DP',
        totalInstalledPower: '~250 kW',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-ELC'] = elecSystem.id;
  bomEntries.push({ parentId: mainAsset.id, childAssetId: elecSystem.id, qty: 1, unit: 'set', note: 'Complete electrical & control system' });
  console.log('   │   ✓ RSP-001-ELC   Electrical & Control System (75kW motor, S7-1500 PLC, 6 VFDs, 3 HMIs)');

  // ── 3g. Pneumatic System ──────────────────────────────────────────────────
  console.log('   ├─ 3g. Pneumatic System');

  const pneuSystem = await createAsset({
    data: {
      assetTag: 'RSP-001-PNU',
      name: 'Pneumatic System',
      description: desc(
        'Pneumatic system: FRL unit, 24 Festo solenoid valves, 12 ISO pneumatic cylinders. ' +
        'Supplied from factory compressor at 6 bar via DN25 main line.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_MAINT,
      manufacturer: 'Festo / SMC / Stork',
      criticality: 'high',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Distributed',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: mainAsset.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        subComponents: [
          { name: 'Main Compressor Connection', quantity: 1, supplyPressure: '6–7 bar', connectionSize: 'DN25', includesShutOffValve: true },
          { name: 'Air Treatment Unit (FRL)', quantity: 1, brand: 'Festo', filterRating: '5 µm', regulatorRange: '4–6 bar', lubricatorCapacity: '500 cc' },
          { name: 'Pneumatic Solenoid Valves', quantity: 24, brand: 'Festo', type: '5/2 mono-stable + bi-stable', voltage: '24 VDC', manifoldMounted: true },
          { name: 'Pneumatic Cylinders', quantity: 12, brand: 'Festo ISO 15552', boreSizes: ['32 mm (×6)', '50 mm (×4)', '80 mm (×2)'], strokeVariants: '50–200 mm' },
        ],
        mainAirLine: 'Stainless steel pipe, DN25',
        distributionLines: 'Copper + PU tubing, 8–12 mm OD',
        totalAirConsumption: '~120 NL/min (average), ~400 NL/min (peak)',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-PNU'] = pneuSystem.id;
  bomEntries.push({ parentId: mainAsset.id, childAssetId: pneuSystem.id, qty: 1, unit: 'set', note: 'Pneumatic supply & actuation system' });
  console.log('   │   ✓ RSP-001-PNU   Pneumatic System (FRL, 24 valves, 12 cylinders)');

  // ── 3h. Lubrication System ────────────────────────────────────────────────
  console.log('   └─ 3h. Lubrication System');

  const lubSystem = await createAsset({
    data: {
      assetTag: 'RSP-001-LUB',
      name: 'Lubrication System',
      description: desc(
        'Dual lubrication: centralized automatic grease system (84 points) for bearings and guides; ' +
        'forced oil circulation (50L reservoir) for gear drives.'
      ),
      categoryId: catRSP.id,
      plantId: IDS.plant_TEM001,
      departmentId: IDS.dept_MAINT,
      manufacturer: 'SKF / Lincoln / Dropsa',
      criticality: 'medium',
      status: 'operational',
      condition: 'good',
      location: 'Printing Hall A, Bay 3 — Distributed',
      building: 'Main Production Building',
      floor: 'Ground Floor',
      parentId: mainAsset.id,
      createdById: IDS.user_admin,
      specification: JSON.stringify({
        subComponents: [
          { name: 'Centralized Grease Lubrication System', type: 'Progressive block distributor system', reservoir: '20 L grease cartridge', greaseType: 'SKF LGMT 2 / LGHP 2', lubricationPoints: 84, cycleTime: 'Every 4 hours (adjustable)' },
          { name: 'Oil Circulation System', type: 'Forced circulation with filter and cooler', oilType: 'ISO VG 220 gear oil', reservoirCapacity: '50 L', pumpType: 'Gear pump, 1.5 kW', coolingMethod: 'Air-oil heat exchanger', oilFilter: '10 µm return line filter' },
        ],
        monitoring: 'Pressure switches on all distribution lines, low-level alarms on reservoirs',
        totalLubricationPoints: '~120 (grease + oil)',
      }, null, 2),
      isActive: true,
    },
  });
  assetMap['RSP-001-LUB'] = lubSystem.id;
  bomEntries.push({ parentId: mainAsset.id, childAssetId: lubSystem.id, qty: 1, unit: 'set', note: 'Centralized lubrication system' });
  console.log('       ✓ RSP-001-LUB   Lubrication System (grease + oil circulation)');

  const totalChildAssets = Object.keys(assetMap).length;
  console.log(`\n   ✓ Total child assets created: ${totalChildAssets}`);
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4: INVENTORY ITEMS — Spare Parts & Consumables
  // ══════════════════════════════════════════════════════════════════════════
  console.log('━ [4] CREATING INVENTORY ITEMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   ├─ Spare Parts (×13)');
  console.log('   └─ Consumables (×4)\n');

  const sparePartsData = [
    {
      itemCode: 'SP-RSP-SCREEN-001',
      name: 'Rotary Screen — Nickel Mesh 60 mesh',
      description: 'Rotary nickel screen for coarse pigment prints. 60 mesh count, 268 mm diameter, standard end rings.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 8,
      minStockLevel: 4,
      maxStockLevel: 20,
      reorderQuantity: 8,
      unitCost: 350,
      supplier: 'SPGPrints',
      supplierPartNumber: 'RS-60-268-STD',
      binLocation: 'A-01-01',
      specification: JSON.stringify({ meshCount: 60, diameter: '268 mm', length: '2660 mm', material: 'Electroformed nickel', endRings: 'Standard aluminum' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-SCREEN-002',
      name: 'Rotary Screen — Nickel Mesh 80 mesh',
      description: 'Rotary nickel screen for medium-detail prints. 80 mesh count, 268 mm diameter.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 12,
      minStockLevel: 6,
      maxStockLevel: 30,
      reorderQuantity: 10,
      unitCost: 380,
      supplier: 'SPGPrints',
      supplierPartNumber: 'RS-80-268-STD',
      binLocation: 'A-01-02',
      specification: JSON.stringify({ meshCount: 80, diameter: '268 mm', length: '2660 mm', material: 'Electroformed nickel', endRings: 'Standard aluminum' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-SCREEN-003',
      name: 'Rotary Screen — Nickel Mesh 105 mesh',
      description: 'Rotary nickel screen for fine-detail prints. 105 mesh count, 268 mm diameter.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 10,
      minStockLevel: 6,
      maxStockLevel: 25,
      reorderQuantity: 10,
      unitCost: 420,
      supplier: 'SPGPrints',
      supplierPartNumber: 'RS-105-268-STD',
      binLocation: 'A-01-03',
      specification: JSON.stringify({ meshCount: 105, diameter: '268 mm', length: '2660 mm', material: 'Electroformed nickel', endRings: 'Standard aluminum' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-SCREEN-004',
      name: 'Rotary Screen — Nickel Mesh 125 mesh',
      description: 'Rotary nickel screen for high-detail fine line prints. 125 mesh count, 268 mm diameter.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 6,
      minStockLevel: 4,
      maxStockLevel: 15,
      reorderQuantity: 6,
      unitCost: 480,
      supplier: 'SPGPrints',
      supplierPartNumber: 'RS-125-268-STD',
      binLocation: 'A-01-04',
      specification: JSON.stringify({ meshCount: 125, diameter: '268 mm', length: '2660 mm', material: 'Electroformed nickel', endRings: 'Standard aluminum' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-SQUEEGEE-001',
      name: 'Squeegee Blade — Polyurethane 40×10 mm (Hard)',
      description: 'Hard polyurethane squeegee blade (Shore A 80) for high-coverage printing. 40×10 mm profile.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 24,
      minStockLevel: 12,
      maxStockLevel: 60,
      reorderQuantity: 24,
      unitCost: 28,
      supplier: 'Kiya / Stork',
      supplierPartNumber: 'SQ-4010-H80',
      binLocation: 'A-02-01',
      specification: JSON.stringify({ width: '40 mm', thickness: '10 mm', material: 'Polyurethane', hardness: 'Shore A 80', color: 'Orange' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-SQUEEGEE-002',
      name: 'Squeegee Blade — Polyurethane 50×12 mm (Medium)',
      description: 'Medium polyurethane squeegee blade (Shore A 65) for general-purpose printing. 50×12 mm profile.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 24,
      minStockLevel: 12,
      maxStockLevel: 60,
      reorderQuantity: 24,
      unitCost: 32,
      supplier: 'Kiya / Stork',
      supplierPartNumber: 'SQ-5012-M65',
      binLocation: 'A-02-02',
      specification: JSON.stringify({ width: '50 mm', thickness: '12 mm', material: 'Polyurethane', hardness: 'Shore A 65', color: 'Green' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-SQUEEGEE-003',
      name: 'Magnetic Squeegee Rod — Ø15 mm',
      description: 'Magnetic squeegee rod Ø15 mm for standard coverage. Hardened steel core with polyurethane coating.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 12,
      minStockLevel: 6,
      maxStockLevel: 24,
      reorderQuantity: 12,
      unitCost: 65,
      supplier: 'Stork Prints',
      supplierPartNumber: 'MR-15-STD',
      binLocation: 'A-02-03',
      specification: JSON.stringify({ diameter: '15 mm', length: '2680 mm', coreMaterial: 'Hardened steel', coating: 'Polyurethane', magnetic: true }, null, 2),
    },
    {
      itemCode: 'SP-RSP-BRG-001',
      name: 'Deep Groove Ball Bearing — SKF 6205-2Z',
      description: 'Deep groove ball bearing SKF 6205-2Z (25×52×15 mm, double shielded). Used in drive rollers and guide rollers.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 16,
      minStockLevel: 8,
      maxStockLevel: 40,
      reorderQuantity: 16,
      unitCost: 18.50,
      supplier: 'SKF Authorized Distributor',
      supplierPartNumber: '6205-2Z',
      binLocation: 'B-01-01',
      specification: JSON.stringify({ brand: 'SKF', model: '6205-2Z', bore: 25, outerDiameter: 52, width: 15, shield: 'Double metal shield (2Z)', loadRating: { dynamic: '14.8 kN', static: '8.2 kN' }, speedLimit: '11000 rpm (grease)' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-BRG-002',
      name: 'Deep Groove Ball Bearing — SKF 6208-2RS',
      description: 'Deep groove ball bearing SKF 6208-2RS (40×80×18 mm, double rubber sealed). Used in main drive and conveyor drums.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 12,
      minStockLevel: 6,
      maxStockLevel: 24,
      reorderQuantity: 8,
      unitCost: 32,
      supplier: 'SKF Authorized Distributor',
      supplierPartNumber: '6208-2RS1',
      binLocation: 'B-01-02',
      specification: JSON.stringify({ brand: 'SKF', model: '6208-2RS1', bore: 40, outerDiameter: 80, width: 18, seal: 'Double rubber seal (2RS)', loadRating: { dynamic: '29.1 kN', static: '18.0 kN' }, speedLimit: '7000 rpm (grease)' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-BRG-003',
      name: 'Deep Groove Ball Bearing — SKF 6210-2RS',
      description: 'Deep groove ball bearing SKF 6210-2RS (50×90×20 mm, double rubber sealed). Used in main winder shaft and heavy-duty rollers.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 8,
      minStockLevel: 4,
      maxStockLevel: 16,
      reorderQuantity: 8,
      unitCost: 48,
      supplier: 'SKF Authorized Distributor',
      supplierPartNumber: '6210-2RS1',
      binLocation: 'B-01-03',
      specification: JSON.stringify({ brand: 'SKF', model: '6210-2RS1', bore: 50, outerDiameter: 90, width: 20, seal: 'Double rubber seal (2RS)', loadRating: { dynamic: '37.1 kN', static: '23.2 kN' }, speedLimit: '6000 rpm (grease)' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-BELT-001',
      name: 'Timing Belt — HTD 8M-30-1725 (Drive)',
      description: 'HTD timing belt 8M pitch, 30 mm width, 1725 mm pitch length. Used for main drive synchronization.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 4,
      minStockLevel: 2,
      maxStockLevel: 8,
      reorderQuantity: 4,
      unitCost: 145,
      supplier: 'Gates / Optibelt',
      supplierPartNumber: '8M-30-1725',
      binLocation: 'B-02-01',
      specification: JSON.stringify({ type: 'HTD (High Torque Drive)', pitch: '8 mm', width: '30 mm', pitchLength: '1725 mm', teeth: '216', material: 'Glass-fiber reinforced neoprene', operatingTempRange: '-20 to +80 °C' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-BELT-002',
      name: 'Conveyor Belt — PTFE-Coated Mesh 2000×36000 mm',
      description: 'PTFE-coated fiberglass mesh conveyor belt for the dryer section. Full-loop replacement.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 1,
      minStockLevel: 1,
      maxStockLevel: 2,
      reorderQuantity: 1,
      unitCost: 4200,
      supplier: 'Habasit / Stork',
      supplierPartNumber: 'PTFE-M2000-L36000',
      binLocation: 'C-01-01',
      specification: JSON.stringify({ type: 'PTFE-coated fiberglass mesh', width: '2000 mm', loopLength: '36000 mm', meshOpenArea: '~50%', maxTemp: '260 °C', thickness: '0.8 mm', joint: 'Spiral pin splice' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-MTR-001',
      name: 'Electric Motor — AC Servo 3.7 kW',
      description: 'AC servo motor 3.7 kW for screen head drive. Siemens 1FK7044-2AF71-1LA0 or equivalent.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 2,
      minStockLevel: 1,
      maxStockLevel: 4,
      reorderQuantity: 2,
      unitCost: 2800,
      supplier: 'Siemens',
      supplierPartNumber: '1FK7044-2AF71-1LA0',
      binLocation: 'C-02-01',
      specification: JSON.stringify({ type: 'AC Servo', power: '3.7 kW', voltage: '400V', speed: '3000 rpm', torque: '12 Nm', protection: 'IP65', encoder: 'Absolute, 20-bit', brake: 'None (external)', shaft: 'Smooth, Ø28 mm' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-MTR-002',
      name: 'Electric Motor — AC 5.5 kW (Winder)',
      description: 'AC induction motor 5.5 kW for fabric winder drive. ABB M3BP 200 MLA 4 or equivalent.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 1,
      minStockLevel: 1,
      maxStockLevel: 2,
      reorderQuantity: 1,
      unitCost: 1800,
      supplier: 'ABB / Siemens',
      supplierPartNumber: 'M3BP200MLA4',
      binLocation: 'C-02-02',
      specification: JSON.stringify({ type: 'AC Induction', power: '5.5 kW', voltage: '400V, 3-phase', speed: '1475 RPM (50 Hz)', mounting: 'B3 foot-mounted', protection: 'IP55', insulation: 'Class F', frame: '132M' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-CYL-001',
      name: 'Pneumatic Cylinder — Festo DSBC-50-200-PPVA-N3',
      description: 'Festo ISO 15552 pneumatic cylinder, 50 mm bore, 200 mm stroke, with adjustable cushioning.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 4,
      minStockLevel: 2,
      maxStockLevel: 8,
      reorderQuantity: 4,
      unitCost: 280,
      supplier: 'Festo',
      supplierPartNumber: 'DSBC-50-200-PPVA-N3',
      binLocation: 'D-01-01',
      specification: JSON.stringify({ brand: 'Festo', series: 'DSBC', bore: 50, stroke: 200, isoStandard: 'ISO 15552', cushioning: 'Adjustable pneumatic end-position cushioning', rodThread: 'M16×1.5', ports: 'G1/4', operatingPressure: '1–10 bar' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-SEN-001',
      name: 'Photoelectric Sensor — Baumer O500.D0P',
      description: 'Diffuse reflective photoelectric sensor for fabric edge detection and presence sensing. Baumer O500 series.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 6,
      minStockLevel: 4,
      maxStockLevel: 12,
      reorderQuantity: 6,
      unitCost: 95,
      supplier: 'Baumer',
      supplierPartNumber: 'O500.D0P-WQ01',
      binLocation: 'D-02-01',
      specification: JSON.stringify({ type: 'Photoelectric, diffuse reflective', sensingRange: '10–300 mm', output: 'PNP NO/NC selectable', supply: '10–30 VDC', connection: 'M12, 4-pin', protection: 'IP67', responseTime: '< 1 ms' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-SEN-002',
      name: 'Proximity Sensor — Pepperl+Fuchs NBN15-30GM50-E2',
      description: 'Inductive proximity sensor for metal position detection. Pepperl+Fuchs NBN15 series.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 8,
      minStockLevel: 4,
      maxStockLevel: 16,
      reorderQuantity: 8,
      unitCost: 42,
      supplier: 'Pepperl+Fuchs',
      supplierPartNumber: 'NBN15-30GM50-E2',
      binLocation: 'D-02-02',
      specification: JSON.stringify({ type: 'Inductive proximity', sensingRange: '15 mm (Sn)', output: 'PNP NO', supply: '10–30 VDC', connection: 'M12, 3-pin', protection: 'IP67', housing: 'Nickel-plated brass M30', switchingFrequency: '500 Hz' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-HEAT-001',
      name: 'IR Heating Element — Medium Wave 2 kW',
      description: 'Medium-wave infrared quartz heating element for the IR pre-dryer. 2 kW, 230V, with ceramic reflector.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 12,
      minStockLevel: 6,
      maxStockLevel: 24,
      reorderQuantity: 12,
      unitCost: 125,
      supplier: 'Heraeus / Stork',
      supplierPartNumber: 'IR-MW-2KW-230V-STD',
      binLocation: 'E-01-01',
      specification: JSON.stringify({ type: 'Medium-wave infrared', power: '2 kW', voltage: '230V single-phase', wavelength: '2.4–3.0 µm', emitter: 'Quartz tungsten halogen tube', reflector: 'Aluminum ceramic-coated', activeLength: '1200 mm', totalLength: '1500 mm', sheathMaterial: 'Quartz glass' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-TC-001',
      name: 'Thermocouple — Type K Probe 200 mm',
      description: 'Type K mineral-insulated thermocouple probe for dryer temperature measurement. 200 mm insertion length.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 10,
      minStockLevel: 6,
      maxStockLevel: 20,
      reorderQuantity: 10,
      unitCost: 35,
      supplier: 'Endress+Hauser / Omega',
      supplierPartNumber: 'TC-K-MI-200-SS',
      binLocation: 'E-02-01',
      specification: JSON.stringify({ type: 'Type K (NiCr-Ni)', class: 'Class 1 (±1.5 °C)', probeDiameter: '6 mm', insertionLength: '200 mm', sheathMaterial: 'Stainless steel 316', insulation: 'Mineral insulated (MgO)', connection: 'DIN Form B, ceramic terminal block', temperatureRange: '-40 to +1100 °C' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-PLC-001',
      name: 'PLC I/O Module — Siemens DI16 (Digital Input 16-ch)',
      description: 'Siemens SIMATIC ET 200SP digital input module, 16-channel, 24VDC. Spare for S7-1500 I/O station.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 2,
      minStockLevel: 1,
      maxStockLevel: 4,
      reorderQuantity: 2,
      unitCost: 220,
      supplier: 'Siemens',
      supplierPartNumber: '6ES7131-6BF01-0BA0',
      binLocation: 'F-01-01',
      specification: JSON.stringify({ brand: 'Siemens', family: 'ET 200SP', type: 'Digital Input', channels: 16, inputVoltage: '24 VDC', inputCurrent: '7 mA typical', responseTime: '3.5 ms', isNammable: true, diagnostics: 'Channel-level diagnostics' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-PLC-002',
      name: 'PLC I/O Module — Siemens DO16 (Digital Output 16-ch)',
      description: 'Siemens SIMATIC ET 200SP digital output module, 16-channel, 24VDC, 0.5A. Spare for S7-1500 I/O station.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 2,
      minStockLevel: 1,
      maxStockLevel: 4,
      reorderQuantity: 2,
      unitCost: 240,
      supplier: 'Siemens',
      supplierPartNumber: '6ES7132-6BF01-0BA0',
      binLocation: 'F-01-02',
      specification: JSON.stringify({ brand: 'Siemens', family: 'ET 200SP', type: 'Digital Output', channels: 16, outputVoltage: '24 VDC', outputCurrent: '0.5 A per channel', protection: 'Short-circuit and overload', isNammable: true, diagnostics: 'Channel-level diagnostics' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-VFD-001',
      name: 'VFD Module — Siemens G120 3.7 kW',
      description: 'Siemens SINAMICS G120 variable frequency drive, 3.7 kW, 400V, frame A. Spare for screen head drives.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 1,
      minStockLevel: 1,
      maxStockLevel: 2,
      reorderQuantity: 1,
      unitCost: 1850,
      supplier: 'Siemens',
      supplierPartNumber: '6SL3210-1PB13-2AL1',
      binLocation: 'F-02-01',
      specification: JSON.stringify({ brand: 'Siemens', family: 'SINAMICS G120', power: '3.7 kW', voltage: '380–480V 3-phase', current: '9.6 A', frame: 'Frame A', controlType: 'V/f + vector (SLVC)', communication: 'PROFINET (integrated)', filter: 'Class A (B optional)', operatingTemp: '-10 to +50 °C' }, null, 2),
    },
    {
      itemCode: 'SP-RSP-VFD-002',
      name: 'VFD Module — Siemens G120 75 kW',
      description: 'Siemens SINAMICS G120 variable frequency drive, 75 kW, 400V, frame F. Spare for main drive motor.',
      category: 'spare_part',
      unitOfMeasure: 'each',
      currentStock: 1,
      minStockLevel: 1,
      maxStockLevel: 2,
      reorderQuantity: 1,
      unitCost: 8500,
      supplier: 'Siemens',
      supplierPartNumber: '6SL3210-1PE23-8AL1',
      binLocation: 'F-02-02',
      specification: JSON.stringify({ brand: 'Siemens', family: 'SINAMICS G120', power: '75 kW', voltage: '380–480V 3-phase', current: '140 A', frame: 'Frame F', controlType: 'Vector (closed-loop with encoder)', communication: 'PROFINET (integrated)', braking: 'Integrated brake chopper', inputFilter: 'Class B line filter', operatingTemp: '0 to +50 °C' }, null, 2),
    },
  ];

  const consumablesData = [
    {
      itemCode: 'CN-RSP-FILT-001',
      name: 'Hydraulic / Pneumatic Filter Element — 10 µm',
      description: 'Replacement filter element for lubrication and pneumatic systems. 10 µm rating, stainless steel mesh.',
      category: 'consumable',
      unitOfMeasure: 'each',
      currentStock: 20,
      minStockLevel: 10,
      maxStockLevel: 40,
      reorderQuantity: 20,
      unitCost: 12,
      supplier: 'HYDAC / Parker',
      supplierPartNumber: '0030R010BN4HC',
      binLocation: 'G-01-01',
      specification: JSON.stringify({ rating: '10 µm', material: 'Stainless steel mesh', diameter: '48 mm', height: '115 mm', maxFlow: '80 L/min', maxPressure: '25 bar', temperatureRange: '-25 to +100 °C' }, null, 2),
    },
    {
      itemCode: 'CN-RSP-GREASE-001',
      name: 'Lubricating Grease — SKF LGMT 2 (18 kg)',
      description: 'Multi-purpose lithium soap grease with mineral base oil. General-purpose bearing and gear lubrication.',
      category: 'consumable',
      unitOfMeasure: 'kg',
      currentStock: 36,
      minStockLevel: 18,
      maxStockLevel: 72,
      reorderQuantity: 18,
      unitCost: 8.50,
      supplier: 'SKF',
      supplierPartNumber: 'LGMT 2/18',
      binLocation: 'G-02-01',
      specification: JSON.stringify({ brand: 'SKF', grade: 'LGMT 2', baseOil: 'Mineral', thickener: 'Lithium soap', nlgiGrade: 2, consistency: '265–295 (1/10 mm)', droppingPoint: '185 °C', operatingTemp: '-30 to +120 °C', speedFactor: '300,000 mm/min', containerSize: '18 kg pail' }, null, 2),
    },
    {
      itemCode: 'CN-RSP-TAPE-001',
      name: 'Screen Adhesive Tape — 50 mm × 100 m',
      description: 'Pressure-sensitive adhesive tape for rotary screen end-ring sealing and repair. Heat-resistant, solvent-resistant.',
      category: 'consumable',
      unitOfMeasure: 'roll',
      currentStock: 30,
      minStockLevel: 15,
      maxStockLevel: 60,
      reorderQuantity: 30,
      unitCost: 4.50,
      supplier: 'Kiya / Stork',
      supplierPartNumber: 'SAT-50-100',
      binLocation: 'G-03-01',
      specification: JSON.stringify({ width: '50 mm', length: '100 m', material: 'PET film + acrylic adhesive', thickness: '0.12 mm', adhesion: '12 N/25 mm', temperatureResistance: 'Up to 150 °C', color: 'Translucent' }, null, 2),
    },
    {
      itemCode: 'CN-RSP-SOLV-001',
      name: 'Screen Cleaning Solvent — 20 L',
      description: 'Specialized solvent for rotary screen cleaning and paste removal. Low toxicity, biodegradable. 20 L drum.',
      category: 'consumable',
      unitOfMeasure: 'liter',
      currentStock: 60,
      minStockLevel: 40,
      maxStockLevel: 120,
      reorderQuantity: 40,
      unitCost: 6.80,
      supplier: 'Stork / CHT',
      supplierPartNumber: 'SOLV-SCR-20L',
      binLocation: 'G-04-01',
      specification: JSON.stringify({ type: 'Specialized screen cleaning solvent', volume: '20 L per drum', flashPoint: '>65 °C', biodegradable: true, volatileOrganicCompounds: '<150 g/L', color: 'Colorless to pale yellow', density: '0.85 kg/L', shelfLife: '24 months' }, null, 2),
    },
  ];

  const inventoryItemIds = {};
  let spCount = 0;
  let cnCount = 0;

  for (const item of sparePartsData) {
    const inv = await db.inventoryItem.upsert({
      where: { itemCode: item.itemCode },
      update: {},
      create: {
        ...item,
        plantId: IDS.plant_TEM001,
        createdById: IDS.user_store1,
        imageUrls: '[]',
        isActive: true,
      },
    });
    inventoryItemIds[item.itemCode] = inv.id;
    spCount++;
  }
  console.log(`   ✓ ${spCount} spare parts created/upserted`);

  for (const item of consumablesData) {
    const inv = await db.inventoryItem.upsert({
      where: { itemCode: item.itemCode },
      update: {},
      create: {
        ...item,
        plantId: IDS.plant_TEM001,
        createdById: IDS.user_store1,
        imageUrls: '[]',
        isActive: true,
      },
    });
    inventoryItemIds[item.itemCode] = inv.id;
    cnCount++;
  }
  console.log(`   ✓ ${cnCount} consumables created/upserted`);
  console.log(`   ✓ Total inventory items: ${spCount + cnCount}`);
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5: BILL OF MATERIALS — Asset Hierarchy Links
  // ══════════════════════════════════════════════════════════════════════════
  console.log('━ [5] CREATING BILL OF MATERIALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let bomCount = 0;
  for (const entry of bomEntries) {
    try {
      await db.billOfMaterial.create({
        data: {
          parentId: entry.parentId,
          childAssetId: entry.childAssetId,
          quantity: entry.qty,
          unit: entry.unit,
          notes: entry.note,
          status: 'active',
          revision: 'A',
        },
      });
      bomCount++;
    } catch (err) {
      if (err.code === 'P2002') {
        // Unique constraint violation — BOM entry already exists, skip
        console.log(`   ⏭  Skipping duplicate BOM: parent→child (${entry.note})`);
      } else {
        throw err;
      }
    }
  }
  console.log(`   ✓ ${bomCount} BOM entries created`);
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  SEED PART 1 — COMPLETE SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Asset Categories Created : 3  (PM, RSP, FLAT)`);
  console.log(`  Main Asset               : 1  (RSP-001)`);
  console.log(`    id                      : ${mainAsset.id}`);
  console.log(`  Child Assets Created     : ${totalChildAssets}`);
  console.log(`    Entry Section          : 1  asset`);
  console.log(`    Printing Section       : 17 assets (section + 12 heads + SQG + PSC + REG)`);
  console.log(`    Drying Section         : 5  assets (section + CNV + IRD + HAD + EXH)`);
  console.log(`    Exit Section           : 4  assets (section + CLG + WND + PLT)`);
  console.log(`    Paste Kitchen          : 1  asset`);
  console.log(`    Electrical & Control   : 1  asset`);
  console.log(`    Pneumatic System       : 1  asset`);
  console.log(`    Lubrication System     : 1  asset`);
  console.log(`  Inventory Items Created  : ${spCount + cnCount}  (${spCount} spare parts + ${cnCount} consumables)`);
  console.log(`  BOM Entries Created      : ${bomCount}`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  Part 2 (PM Schedules, Work Orders, Maintenance Requests)');
  console.log('  can now be appended to this script.');
  console.log('════════════════════════════════════════════════════════════════\n');

  await db.$disconnect();
}

// ─── Run & Error Handling ─────────────────────────────────────────────────────

main().catch((err) => {
  console.error('\n✖ SEED FAILED:');
  console.error(err);
  db.$disconnect();
  process.exit(1);
});
