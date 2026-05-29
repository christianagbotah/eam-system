/**
 * Seed Script: Rotary Screen Printing Machine
 * 
 * Creates a complete asset record for a Rotary Screen Printing Machine 
 * as used at GTP Ghana (Ghana Textile Printing Company).
 * 
 * Includes:
 * - Main asset with full specifications
 * - Asset hierarchy (6 major sub-systems, 20+ components)
 * - Bill of Materials (BOM)
 * - Component Registry with detailed specs
 * - PM Templates + Schedules for preventive maintenance
 * - Inventory items (spare parts)
 * - Digital Twin configuration
 * - System Diagram
 * - Work Instructions
 * - Historical failure records for testing
 * - Sample maintenance requests and work orders
 * 
 * Usage:
 *   DATABASE_URL="mysql://..." npx tsx prisma/seed-rotary-printer.ts
 */

import { PrismaClient } from '@prisma/client';

// ── Database Connection (adapter-free, more reliable for seed scripts) ──
console.log('🔧 Connecting to database...');

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('mysql://')) {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'ifleetpro_eam_system';
  process.env.DATABASE_URL = `mysql://${user}:${password}@${host}:${port}/${database}`;
  console.log(`  📡 Built DATABASE_URL from individual env vars -> ${host}/${database}`);
} else {
  console.log(`  📡 Using DATABASE_URL -> ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
}

const db = new PrismaClient({
  log: ['warn', 'error'],
});

// ══════════════════════════════════════════════════════════════════════════
// MACHINE DATA DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * Rotary Screen Printing Machine - Machine Specifications
 * 
 * Typical rotary screen printing machine used in textile printing:
 * - 8-12 color printing stations
 * - Max fabric width: 1850mm / 2400mm / 3200mm
 * - Print speed: 10-80 meters/minute
 * - Uses rotary screens (nickel mesh) with paste circulation
 * - Infrared drying system
 * - PLC-based control system (Siemens / Mitsubishi)
 * - Automatic registration correction
 */

const MACHINE_SPECS = {
  name: 'Rotary Screen Printing Machine',
  tag: 'RSPM-001',
  serial: 'GTP-RSPM-2021-001',
  manufacturer: 'Stork Prints (-now SPGPrints)',
  model: 'RD-I Plus 1850',
  year: 2021,
  description: 'Rotary screen printing machine for textile fabric printing. 8-color IR drying, auto registration, paste circulation. Primary production at GTP Ghana Tema.',
  criticality: 'critical',
  location: 'Printing Hall A',
  building: 'Main Production Building',
  area: 'Zone 1 - Printing Line 1',
  purchaseCost: 850000,
  purchaseDate: '2021-03-15',
  warrantyExpiry: '2024-03-15',
  expectedLifeYears: 20,
  specification: JSON.stringify({
    printWidth: '1850mm',
    colors: 8,
    maxSpeed: '80 m/min',
    minSpeed: '10 m/min',
    screenDiameter: '254mm (10 inch)',
    screenLength: '2650mm max',
    fabricWeight: '50-350 g/m²',
    pasteVolume: '8-12 color stations × 2.5L',
    dryingSystem: 'Infrared (IR)',
    dryingLength: '3 × 3m drying chambers',
    dryingTemp: '100-180°C',
    registrationType: 'Camera-based automatic',
    driveSystem: 'AC servo main drive + AC inverter per station',
    controlSystem: 'Siemens S7-1500 PLC',
    hmi: 'Siemens Touch Panel 15"',
    pneumatics: 'Festo, 6 bar supply',
    power: '380V 3-phase, 50Hz, ~120kW installed',
    compressedAir: '6 bar, 0.5 m³/min',
    waterCooling: 'Required for IR lamps and gearboxes',
    dimensions: 'L 28m × W 4.5m × H 3.2m',
    weight: '~18,000 kg',
    floorLoad: '>20 kN/m²',
  }),
};

const SUBSYSTEMS = [
  // ── 1. UNWIND / FEED SECTION ──
  {
    name: 'Unwind & Fabric Feed Section',
    tag: 'RSPM-001-UF',
    description: 'Fabric unwinding unit with automatic tension control, edge guiding system, and fabric spreader. Feeds fabric into the printing blanket.',
    criticality: 'high',
    children: [
      { name: 'Unwind Stand Frame', tag: 'RSPM-001-UF-FR', description: 'Heavy-duty steel frame supporting the unwinding roll. Includes mechanical braking system and roll lifting jack.', criticality: 'medium' },
      { name: 'Fabric Tension Control Unit', tag: 'RSPM-001-UF-TC', description: 'Pneumatic dancer roller system with load cells for maintaining consistent fabric tension (20-80 N). Includes ultrasonic sensor.', criticality: 'high' },
      { name: 'Edge Guide System (EPC)', tag: 'RSPM-001-UF-EG', description: 'Electro-hydraulic edge position controller with ultrasonic sensors. Maintains fabric alignment within ±1mm tolerance.', criticality: 'high' },
      { name: 'Fabric Spreader Roller', tag: 'RSPM-001-UF-SR', description: 'Bowed rubber spreader roller preventing fabric edge curl and wrinkles before entering the blanket.', criticality: 'low' },
      { name: 'Infeed Roller Assembly', tag: 'RSPM-001-UF-IR', description: 'Rubber-coated nip roller pair that transfers fabric from unwinder to the continuous printing blanket. Driven by AC motor.', criticality: 'medium' },
    ],
  },
  // ── 2. PRINTING SECTION ──
  {
    name: 'Printing Section',
    tag: 'RSPM-001-PS',
    description: 'Main printing section with 8 rotary screen stations, each containing a screen drive, squeegee system, and paste circulation.',
    criticality: 'critical',
    children: [
      { name: 'Printing Blanket (Endless Belt)', tag: 'RSPM-001-PS-BL', description: 'Endless rubber blanket (3mm thick) that carries the fabric through all print stations. Runs on precision tracking rollers.', criticality: 'critical' },
      { name: 'Rotary Screen Drive Unit (×8)', tag: 'RSPM-001-PS-SD', description: 'AC servo motor and gear reducer for each rotary screen. Provides independent speed control and phase adjustment per color station.', criticality: 'critical' },
      { name: 'Magnetic Squeegee System (×8)', tag: 'RSPM-001-PS-SQ', description: 'Magnetic rod squeegee system inside each rotary screen. Electromagnetic force adjustable per station. Rod diameter 10-25mm.', criticality: 'high' },
      { name: 'Paste Circulation System (×8)', tag: 'RSPM-001-PS-PC', description: 'Peristaltic pump and piping for continuous paste circulation in each screen. Includes level sensor, filter (80 mesh), and return valve.', criticality: 'high' },
      { name: 'Screen Lifting & Engagement Mechanism', tag: 'RSPM-001-PS-LM', description: 'Pneumatic cylinder system for raising/lowering each print station. Allows quick screen change and lifting during threading.', criticality: 'medium' },
      { name: 'Registration Camera System', tag: 'RSPM-001-PS-RC', description: 'High-resolution CCD camera system scanning reference marks on fabric. Real-time correction via servo drives. Accuracy ±0.1mm.', criticality: 'critical' },
    ],
  },
  // ── 3. DRYING SECTION ──
  {
    name: 'Infrared Drying Section',
    tag: 'RSPM-001-DS',
    description: 'Three-chamber infrared drying system with exhaust fans. Removes moisture and fixes the print paste onto the fabric.',
    criticality: 'high',
    children: [
      { name: 'IR Drying Chamber 1', tag: 'RSPM-001-DS-DC1', description: 'First IR drying chamber with 18 infrared emitters (medium-wave, 2.4kW each). Zone temperature control 100-150°C.', criticality: 'high' },
      { name: 'IR Drying Chamber 2', tag: 'RSPM-001-DS-DC2', description: 'Second IR drying chamber with 18 emitters. Intermediate drying zone at 130-170°C.', criticality: 'high' },
      { name: 'IR Drying Chamber 3', tag: 'RSPM-001-DS-DC3', description: 'Final IR drying chamber with 18 emitters. Final fixation zone at 150-180°C. Includes moisture sensor at exit.', criticality: 'high' },
      { name: 'Exhaust Fan System', tag: 'RSPM-001-DS-EF', description: '3 exhaust fans (2.2kW each) with variable speed drives for removing steam and volatile compounds. Includes heat recovery.', criticality: 'medium' },
      { name: 'Fabric Transport Web', tag: 'RSPM-001-DS-TW', description: 'Stainless steel wire mesh conveyor belt carrying fabric through drying chambers. Driven by separate AC motor with speed sync.', criticality: 'medium' },
    ],
  },
  // ── 4. WIND-UP / OUTPUT SECTION ──
  {
    name: 'Wind-Up & Output Section',
    tag: 'RSPM-001-WU',
    description: 'Fabric winding unit with automatic tension and alignment control. Batch length counting and doffing mechanism.',
    criticality: 'high',
    children: [
      { name: 'Wind-Up Roll Stand', tag: 'RSPM-001-WU-WS', description: 'Motorized winding unit with 3-roll cantilever design. Automatic roll build control for uniform winding.', criticality: 'medium' },
      { name: 'Output Tension Control', tag: 'RSPM-001-WU-TC', description: 'Load cell-based tension controller maintaining constant fabric tension during winding. Range 20-100 N.', criticality: 'high' },
      { name: 'Batch Length Counter', tag: 'RSPM-001-WU-BL', description: 'Encoder-based length counter with preset batch lengths. Automatic machine stop at target length.', criticality: 'low' },
      { name: 'Cooling Cylinder', tag: 'RSPM-001-WU-CC', description: 'Water-cooled chrome roller that cools fabric before winding. Diameter 500mm, water flow 15 L/min.', criticality: 'medium' },
    ],
  },
  // ── 5. DRIVE & POWER SYSTEM ──
  {
    name: 'Main Drive & Power System',
    tag: 'RSPM-001-DP',
    description: 'Central drive system with main motor, line shaft, and power distribution. Supplies motive power to all sections.',
    criticality: 'critical',
    children: [
      { name: 'Main Drive Motor', tag: 'RSPM-001-DP-MM', description: 'AC servo motor 37kW, 380V, 1470 RPM with absolute encoder. Drives blanket and all synced sections via line shaft.', criticality: 'critical' },
      { name: 'Main Gear Reducer', tag: 'RSPM-001-DP-GR', description: 'Helical-bevel gear reducer, ratio 25:1. Oil-lubricated with forced cooling. Input: servo motor, Output: blanket drive roller.', criticality: 'critical' },
      { name: 'Main Electrical Panel (MCC)', tag: 'RSPM-001-DP-EP', description: 'Motor Control Center housing all VFDs, breakers, and power distribution. Siemens Sinamics drives per section.', criticality: 'critical' },
      { name: 'PLC Control Cabinet', tag: 'RSPM-001-DP-PL', description: 'Siemens S7-1500 PLC with ET200SP remote I/O. Includes safety PLC (F-CPU) for emergency stops.', criticality: 'critical' },
      { name: 'UPS / Power Backup', tag: 'RSPM-001-DP-UP', description: '10kVA online UPS maintaining control power during mains failure. 15-min runtime for orderly shutdown.', criticality: 'high' },
    ],
  },
  // ── 6. PNEUMATIC & AUXILIARY SYSTEMS ──
  {
    name: 'Pneumatic & Auxiliary Systems',
    tag: 'RSPM-001-PA',
    description: 'Compressed air system, water cooling, lubrication, and safety systems supporting machine operation.',
    criticality: 'medium',
    children: [
      { name: 'Air Filtration & Regulation Unit (FRL)', tag: 'RSPM-001-PA-AR', description: 'Main air treatment unit with 5µm filter, pressure regulator (6 bar), and lubricator. Auto-drain filter.', criticality: 'medium' },
      { name: 'Central Lubrication System', tag: 'RSPM-001-PA-CL', description: 'Automatic grease lubrication system for all bearings and sliding parts. Progressive distributor with 30 lube points.', criticality: 'medium' },
      { name: 'Water Cooling Skid', tag: 'RSPM-001-PA-WC', description: 'Closed-loop water cooling system with pump, heat exchanger, and expansion tank. Cools IR lamps, gearboxes, and PLC cabinet.', criticality: 'high' },
      { name: 'Safety Interlock System', tag: 'RSPM-001-PA-SI', description: 'Machine safety system with 12 emergency stops, safety interlocks on all guards, and safety light curtains at infeed/outfeed.', criticality: 'critical' },
      { name: 'Paste Preparation & Supply Unit', tag: 'RSPM-001-PA-PP', description: 'Stirring and filtration unit for print paste preparation. Includes 2 × 200L stainless steel tanks with agitators.', criticality: 'medium' },
    ],
  },
];

// PM Templates for the Rotary Screen Printing Machine
const PM_TEMPLATES = [
  {
    title: 'Daily Operator Inspection - Rotary Screen Printer',
    type: 'inspection',
    category: 'mechanical',
    estimatedDuration: 0.5,
    priority: 'medium',
    tasks: [
      { description: 'Inspect blanket surface for cuts, marks, or foreign objects', taskType: 'inspect', estimatedMinutes: 5 },
      { description: 'Check all 8 squeegee rods for wear and straightness', taskType: 'inspect', estimatedMinutes: 8 },
      { description: 'Verify paste circulation - check all 8 stations for blockages', taskType: 'check', estimatedMinutes: 5 },
      { description: 'Inspect edge guide sensor alignment and function', taskType: 'inspect', estimatedMinutes: 3 },
      { description: 'Check fabric tension readout matches setpoint (40N ± 5N)', taskType: 'measure', estimatedMinutes: 2 },
      { description: 'Verify registration camera lens is clean and focused', taskType: 'inspect', estimatedMinutes: 3 },
      { description: 'Check all 8 print stations for paste leakage', taskType: 'check', estimatedMinutes: 5 },
      { description: 'Inspect drying chambers for fabric debris buildup', taskType: 'inspect', estimatedMinutes: 5 },
      { description: 'Record main drive motor running hours and current draw', taskType: 'record', estimatedMinutes: 2 },
      { description: 'Check emergency stop buttons function on all stations', taskType: 'check', estimatedMinutes: 3 },
    ],
  },
  {
    title: 'Weekly Maintenance - Rotary Screen Printer',
    type: 'preventive',
    category: 'mechanical',
    estimatedDuration: 2,
    priority: 'high',
    requiredSkills: ['mechanical', 'textile_machinery'],
    tasks: [
      { description: 'Grease all main bearings per lubrication chart (30 points)', taskType: 'lubricate', estimatedMinutes: 20, requiredParts: [{ partName: 'Lithium Grease EP2', quantity: 1, unit: 'kg' }] },
      { description: 'Inspect and clean all paste circulation pump filters (×8)', taskType: 'inspect', estimatedMinutes: 15 },
      { description: 'Check blanket tracking rollers - clean and inspect bearing play', taskType: 'inspect', estimatedMinutes: 15 },
      { description: 'Inspect main gear reducer oil level and condition', taskType: 'check', estimatedMinutes: 5, requiredParts: [{ partName: 'Gear Oil ISO 220', quantity: 2, unit: 'litre' }] },
      { description: 'Clean IR emitter reflectors in all 3 drying chambers', taskType: 'inspect', estimatedMinutes: 20 },
      { description: 'Check and clean air FRL unit - drain condensate, check oil level', taskType: 'inspect', estimatedMinutes: 5 },
      { description: 'Verify VFD cooling fans running and clean air filters', taskType: 'inspect', estimatedMinutes: 10 },
      { description: 'Test all safety interlock switches and E-stops', taskType: 'check', estimatedMinutes: 10 },
      { description: 'Inspect screen engagement pneumatic cylinders for air leaks', taskType: 'inspect', estimatedMinutes: 10 },
      { description: 'Check water cooling system - flow rate, temperature, coolant level', taskType: 'measure', estimatedMinutes: 5 },
    ],
  },
  {
    title: 'Monthly Maintenance - Rotary Screen Printer',
    type: 'preventive',
    category: 'mechanical',
    estimatedDuration: 4,
    priority: 'high',
    requiredSkills: ['mechanical', 'electrical'],
    tasks: [
      { description: 'Replace paste circulation pump tubing (peristaltic) - all 8 stations', taskType: 'replace', estimatedMinutes: 30, requiredParts: [{ partName: 'Peristaltic Pump Tube (Viton)', quantity: 8, unit: 'each' }] },
      { description: 'Inspect blanket for edge wear and measure thickness at 5 points', taskType: 'measure', estimatedMinutes: 15 },
      { description: 'Check and adjust all print station belt tensions', taskType: 'check', estimatedMinutes: 20 },
      { description: 'Inspect main drive motor coupling alignment', taskType: 'inspect', estimatedMinutes: 15 },
      { description: 'Test and record insulation resistance of main drive motor', taskType: 'measure', estimatedMinutes: 10 },
      { description: 'Clean PLC cabinet and check for fault codes in all VFDs', taskType: 'inspect', estimatedMinutes: 15 },
      { description: 'Inspect cooling cylinder bearing and water seal', taskType: 'inspect', estimatedMinutes: 10 },
      { description: 'Calibrate fabric tension load cells (both infeed and outfeed)', taskType: 'measure', estimatedMinutes: 15 },
      { description: 'Inspect unwind and wind-up roll mandrels for wear', taskType: 'inspect', estimatedMinutes: 10 },
      { description: 'Check exhaust fan belt condition and tension', taskType: 'inspect', estimatedMinutes: 5 },
      { description: 'Inspect and clean registration camera optics and lighting', taskType: 'inspect', estimatedMinutes: 10 },
      { description: 'Test UPS battery backup - runtime under load', taskType: 'check', estimatedMinutes: 15 },
    ],
  },
  {
    title: 'Quarterly Maintenance - Rotary Screen Printer',
    type: 'preventive',
    category: 'mechanical',
    estimatedDuration: 8,
    priority: 'high',
    requiredSkills: ['mechanical', 'electrical', 'textile_machinery'],
    tasks: [
      { description: 'Change main gear reducer oil - full drain and refill (20L)', taskType: 'replace', estimatedMinutes: 30, requiredParts: [{ partName: 'Gear Oil ISO 220', quantity: 20, unit: 'litre' }] },
      { description: 'Inspect and replace worn squeegee magnetic rods if needed', taskType: 'replace', estimatedMinutes: 30, requiredParts: [{ partName: 'Magnetic Squeegee Rod 15mm', quantity: 4, unit: 'each' }] },
      { description: 'Full thermographic inspection of all electrical connections', taskType: 'inspect', estimatedMinutes: 45 },
      { description: 'Vibration analysis on main drive motor, gear reducer, and all station drives', taskType: 'measure', estimatedMinutes: 60 },
      { description: 'Replace air filters on all FRL units and VFD cabinets', taskType: 'replace', estimatedMinutes: 15, requiredParts: [{ partName: 'Air Filter Element 5µm', quantity: 4, unit: 'each' }] },
      { description: 'Check and adjust blanket tracking system - roller alignment', taskType: 'check', estimatedMinutes: 30 },
      { description: 'Inspect and clean all IR emitter reflectors (54 total) + test elements', taskType: 'inspect', estimatedMinutes: 45 },
      { description: 'Full PLC backup and check program version', taskType: 'check', estimatedMinutes: 20 },
      { description: 'Inspect pneumatic cylinders on all screen lift mechanisms (×8)', taskType: 'inspect', estimatedMinutes: 20 },
      { description: 'Test all overload relays and motor protection settings', taskType: 'check', estimatedMinutes: 20 },
    ],
  },
  {
    title: 'Annual Overhaul - Rotary Screen Printer',
    type: 'preventive',
    category: 'mechanical',
    estimatedDuration: 40,
    priority: 'critical',
    requiredSkills: ['mechanical', 'electrical', 'textile_machinery', 'instrumentation'],
    tasks: [
      { description: 'Full machine alignment check - all print stations, blanket, and dryer', taskType: 'measure', estimatedMinutes: 120 },
      { description: 'Replace main blanket - remove old, install and track new blanket', taskType: 'replace', estimatedMinutes: 240, requiredParts: [{ partName: 'Endless Printing Blanket 1850mm', quantity: 1, unit: 'each' }] },
      { description: 'Replace all paste circulation pump assemblies (×8)', taskType: 'replace', estimatedMinutes: 120, requiredParts: [{ partName: 'Paste Circulation Pump Assembly', quantity: 8, unit: 'each' }] },
      { description: 'Full electrical system test - insulation, grounding, surge protection', taskType: 'measure', estimatedMinutes: 120 },
      { description: 'Replace all pneumatic seals and air lines', taskType: 'replace', estimatedMinutes: 180, requiredParts: [{ partName: 'Pneumatic Seal Kit', quantity: 8, unit: 'each' }] },
      { description: 'Replace water cooling pump mechanical seals', taskType: 'replace', estimatedMinutes: 60, requiredParts: [{ partName: 'Mechanical Seal Kit DN40', quantity: 2, unit: 'each' }] },
      { description: 'Full calibration of registration system - cameras, servos, sensors', taskType: 'measure', estimatedMinutes: 240 },
      { description: 'Replace all VFD cooling fans and control cabinet fans', taskType: 'replace', estimatedMinutes: 60, requiredParts: [{ partName: 'Cooling Fan 230V', quantity: 12, unit: 'each' }] },
      { description: 'Overhaul all station gear reducers - oil change, bearing check', taskType: 'replace', estimatedMinutes: 480, requiredParts: [{ partName: 'Gear Oil ISO 68', quantity: 16, unit: 'litre' }] },
      { description: 'Repaint machine guards and safety markings', taskType: 'check', estimatedMinutes: 120 },
    ],
  },
  {
    title: 'Predictive Condition Monitoring - Rotary Screen Printer',
    type: 'predictive',
    category: 'mechanical',
    estimatedDuration: 3,
    priority: 'high',
    requiredSkills: ['condition_monitoring', 'vibration_analysis'],
    tasks: [
      { description: 'Vibration analysis - main drive motor DE and NDE bearings', taskType: 'measure', estimatedMinutes: 15 },
      { description: 'Vibration analysis - main gear reducer input and output shafts', taskType: 'measure', estimatedMinutes: 15 },
      { description: 'Vibration analysis - all 8 station screen drives', taskType: 'measure', estimatedMinutes: 30 },
      { description: 'Thermographic scan - main electrical panel and all VFDs', taskType: 'measure', estimatedMinutes: 20 },
      { description: 'Thermographic scan - all IR drying chambers (hotspot detection)', taskType: 'measure', estimatedMinutes: 15 },
      { description: 'Oil analysis sampling - main gear reducer', taskType: 'measure', estimatedMinutes: 10 },
      { description: 'Oil analysis sampling - all 8 station gear reducers', taskType: 'measure', estimatedMinutes: 20 },
      { description: 'Current signature analysis - main drive motor', taskType: 'measure', estimatedMinutes: 15 },
      { description: 'Ultrasonic inspection - pneumatic valve leaks', taskType: 'inspect', estimatedMinutes: 15 },
      { description: 'Record and trend all measurements against baselines', taskType: 'record', estimatedMinutes: 15 },
    ],
  },
];

// Spare parts / Inventory items for the machine
const INVENTORY_ITEMS = [
  // Critical spares
  { code: 'SP-RSPM-001', name: 'Endless Printing Blanket 1850mm', category: 'spare_part', unit: 'each', minStock: 1, maxStock: 2, unitCost: 8500, supplier: 'Stork/SPGPrints', location: 'Main Store', specification: JSON.stringify({ material: 'Nitrile rubber compound', thickness: '3mm', width: '1850mm', length: 'endless (machine-specific)', maxTemp: '180°C' }) },
  { code: 'SP-RSPM-002', name: 'Rotary Screen (Nickel) 254mm diameter', category: 'spare_part', unit: 'each', minStock: 4, maxStock: 12, unitCost: 350, supplier: 'SPGPrints', location: 'Screen Store', specification: JSON.stringify({ material: 'Electroformed nickel', mesh: '60-125 mesh', diameter: '254mm', maxRepeat: '2650mm' }) },
  { code: 'SP-RSPM-003', name: 'Magnetic Squeegee Rod 15mm', category: 'spare_part', unit: 'each', minStock: 10, maxStock: 24, unitCost: 85, supplier: 'SPGPrints', location: 'Squeegee Rack', specification: JSON.stringify({ material: 'Hardened steel with magnetic core', diameter: '15mm', length: '1900mm', coating: 'Chrome-plated' }) },
  { code: 'SP-RSPM-004', name: 'Magnetic Squeegee Rod 20mm', category: 'spare_part', unit: 'each', minStock: 8, maxStock: 16, unitCost: 95, supplier: 'SPGPrints', location: 'Squeegee Rack', specification: JSON.stringify({ material: 'Hardened steel with magnetic core', diameter: '20mm', length: '1900mm', coating: 'Chrome-plated' }) },
  { code: 'SP-RSPM-005', name: 'Peristaltic Pump Tube (Viton)', category: 'spare_part', unit: 'each', minStock: 16, maxStock: 40, unitCost: 28, supplier: 'Watson-Marlow', location: 'Pump Parts Shelf', specification: JSON.stringify({ material: 'Viton fluoroelastomer', bore: '9.6mm', wall: '3.2mm', maxPressure: '2 bar', maxTemp: '200°C' }) },
  { code: 'SP-RSPM-006', name: 'Paste Circulation Pump Assembly', category: 'spare_part', unit: 'each', minStock: 2, maxStock: 4, unitCost: 1200, supplier: 'Watson-Marlow', location: 'Pump Parts Shelf', specification: JSON.stringify({ type: 'Peristaltic', flowRate: '0.5-10 L/min', motor: '0.37kW', connection: 'DN25' }) },
  // Electrical spares
  { code: 'SP-RSPM-007', name: 'IR Emitter Lamp 2.4kW Medium Wave', category: 'spare_part', unit: 'each', minStock: 6, maxStock: 18, unitCost: 185, supplier: 'Heraeus', location: 'Electrical Store', specification: JSON.stringify({ power: '2.4kW', type: 'Medium wave infrared', voltage: '380V', length: '1200mm', maxTemp: '800°C surface' }) },
  { code: 'SP-RSPM-008', name: 'VFD Module 37kW (Main Drive)', category: 'spare_part', unit: 'each', minStock: 1, maxStock: 1, unitCost: 3200, supplier: 'Siemens', location: 'Electrical Store', specification: JSON.stringify({ model: 'Siemens Sinamics G120 37kW', input: '380V 3Ph 50Hz', output: '37kW / 75A', features: 'STO safety function' }) },
  { code: 'SP-RSPM-009', name: 'Servo Motor 1.5kW (Screen Drive)', category: 'spare_part', unit: 'each', minStock: 2, maxStock: 4, unitCost: 1800, supplier: 'Siemens', location: 'Electrical Store', specification: JSON.stringify({ power: '1.5kW', voltage: '380V', speed: '3000 RPM', encoder: 'absolute multi-turn', inertia: 'Low inertia' }) },
  { code: 'SP-RSPM-010', name: 'PLC I/O Module ET200SP', category: 'spare_part', unit: 'each', minStock: 2, maxStock: 4, unitCost: 450, supplier: 'Siemens', location: 'Electrical Store', specification: JSON.stringify({ type: 'Digital Input 16-ch', protocol: 'PROFINET', model: '6ES7131-6BF01-0BA0' }) },
  { code: 'SP-RSPM-011', name: 'Emergency Stop Button Complete', category: 'spare_part', unit: 'each', minStock: 4, maxStock: 8, unitCost: 45, supplier: 'Siemens', location: 'Electrical Store', specification: JSON.stringify({ type: 'Twist-release mushroom head', IP: 'IP67', contact: '1NC + 1NO', color: 'Red' }) },
  // Mechanical spares
  { code: 'SP-RSPM-012', name: 'Gear Oil ISO 220', category: 'consumable', unit: 'litre', minStock: 20, maxStock: 50, unitCost: 8.5, supplier: 'Shell', location: 'Lube Store', specification: JSON.stringify({ brand: 'Shell Omala S2 G 220', viscosity: 'ISO VG 220', type: 'EP gear oil', packSize: '20L drum' }) },
  { code: 'SP-RSPM-013', name: 'Gear Oil ISO 68', category: 'consumable', unit: 'litre', minStock: 20, maxStock: 50, unitCost: 7.2, supplier: 'Shell', location: 'Lube Store', specification: JSON.stringify({ brand: 'Shell Omala S2 G 68', viscosity: 'ISO VG 68', type: 'EP gear oil', packSize: '20L drum' }) },
  { code: 'SP-RSPM-014', name: 'Lithium Grease EP2', category: 'consumable', unit: 'kg', minStock: 5, maxStock: 15, unitCost: 12, supplier: 'Shell', location: 'Lube Store', specification: JSON.stringify({ brand: 'Shell Retinax EP2', type: 'Lithium 12-hydroxystearate', NLGI: '2', dropPoint: '190°C' }) },
  { code: 'SP-RSPM-015', name: 'Pneumatic Seal Kit (Cylinder)', category: 'spare_part', unit: 'each', minStock: 4, maxStock: 12, unitCost: 35, supplier: 'Festo', location: 'Pneumatic Parts', specification: JSON.stringify({ bore: '50mm', stroke: '100mm', material: 'NBR/Polyurethane', type: 'Rod + piston seal set' }) },
  { code: 'SP-RSPM-016', name: 'Mechanical Seal Kit DN40', category: 'spare_part', unit: 'each', minStock: 2, maxStock: 4, unitCost: 120, supplier: 'John Crane', location: 'Pump Parts Shelf', specification: JSON.stringify({ size: 'DN40', material: 'Silicon carbide / carbon', type: 'Cartridge seal', maxPressure: '10 bar' }) },
  { code: 'SP-RSPM-017', name: 'Cooling Fan 230V (VFD/Panel)', category: 'spare_part', unit: 'each', minStock: 6, maxStock: 12, unitCost: 28, supplier: 'ebm-papst', location: 'Electrical Store', specification: JSON.stringify({ voltage: '230V', power: '25W', speed: '2800 RPM', size: '120×120mm', IP: 'IP54' }) },
  { code: 'SP-RSPM-018', name: 'Air Filter Element 5µm', category: 'spare_part', unit: 'each', minStock: 4, maxStock: 8, unitCost: 18, supplier: 'Festo', location: 'Pneumatic Parts', specification: JSON.stringify({ rating: '5µm', type: 'Spin-on compressed air filter', connection: 'G1/2"', autoDrain: true }) },
  { code: 'SP-RSPM-019', name: 'Load Cell 200kg (Tension)', category: 'spare_part', unit: 'each', minStock: 2, maxStock: 4, unitCost: 280, supplier: 'HBM', location: 'Instrumentation Store', specification: JSON.stringify({ capacity: '200kg', type: 'Single point', excitation: '10V', output: '2mV/V', IP: 'IP67' }) },
  { code: 'SP-RSPM-020', name: 'Cooling Cylinder Bearing', category: 'spare_part', unit: 'each', minStock: 2, maxStock: 4, unitCost: 95, supplier: 'SKF', location: 'Bearing Store', specification: JSON.stringify({ type: 'Spherical roller bearing', model: '22316 EK', bore: '80mm', OD: '170mm', width: '58mm' }) },
  { code: 'SP-RSPM-021', name: 'Belt for Exhaust Fan (A68)', category: 'spare_part', unit: 'each', minStock: 3, maxStock: 6, unitCost: 12, supplier: 'Gates', location: 'Belt Store', specification: JSON.stringify({ type: 'Wrapped V-belt', section: 'A', length: '1727mm (68 inch)', quantity: '1 per fan' }) },
  { code: 'SP-RSPM-022', name: 'Water Pump Mechanical Seal DN32', category: 'spare_part', unit: 'each', minStock: 2, maxStock: 4, unitCost: 85, supplier: 'John Crane', location: 'Pump Parts Shelf', specification: JSON.stringify({ size: 'DN32', material: 'Silicon carbide / carbon', type: 'Component seal' }) },
];

// Digital Twin parameters
const DIGITAL_TWIN_CONFIG = {
  name: 'RSPM-001 Digital Twin',
  description: 'Real-time digital twin of Rotary Screen Printing Machine RSPM-001 at GTP Ghana Tema Factory. Monitors 6 sub-systems with 8 printing stations, drying system, and drive system.',
  type: 'other',
  parameters: JSON.stringify({
    machineSpeed: { unit: 'm/min', min: 0, max: 80, normal: 40, alarmHigh: 75 },
    blanketTension: { unit: 'N', min: 0, max: 100, normal: 50, alarmHigh: 80 },
    fabricTensionInfeed: { unit: 'N', min: 0, max: 100, normal: 40, alarmHigh: 70 },
    fabricTensionOutfeed: { unit: 'N', min: 0, max: 100, normal: 40, alarmHigh: 70 },
    dryingTemp1: { unit: '°C', min: 0, max: 200, normal: 130, alarmHigh: 175 },
    dryingTemp2: { unit: '°C', min: 0, max: 200, normal: 150, alarmHigh: 180 },
    dryingTemp3: { unit: '°C', min: 0, max: 200, normal: 165, alarmHigh: 185 },
    mainMotorCurrent: { unit: 'A', min: 0, max: 80, normal: 45, alarmHigh: 70 },
    mainMotorTemp: { unit: '°C', min: 0, max: 120, normal: 55, alarmHigh: 85 },
    mainMotorVibration: { unit: 'mm/s', min: 0, max: 20, normal: 2.5, alarmHigh: 7.1 },
    gearReducerVibration: { unit: 'mm/s', min: 0, max: 20, normal: 3.0, alarmHigh: 7.1 },
    gearReducerOilTemp: { unit: '°C', min: 0, max: 100, normal: 55, alarmHigh: 80 },
    airSupplyPressure: { unit: 'bar', min: 0, max: 10, normal: 6, alarmLow: 4.5 },
    coolingWaterTemp: { unit: '°C', min: 0, max: 40, normal: 25, alarmHigh: 35 },
    coolingWaterFlow: { unit: 'L/min', min: 0, max: 50, normal: 30, alarmLow: 15 },
    pasteLevel: { unit: '%', min: 0, max: 100, normal: 70, alarmLow: 20, channels: 8 },
    registrationError: { unit: 'mm', min: 0, max: 2, normal: 0.05, alarmHigh: 0.3 },
  }),
  connections: JSON.stringify([
    { from: 'UF', to: 'PS', type: 'fabric_flow', description: 'Fabric from unwinder to print section' },
    { from: 'PS', to: 'DS', type: 'fabric_flow', description: 'Printed fabric to drying section' },
    { from: 'DS', to: 'WU', type: 'fabric_flow', description: 'Dried fabric to wind-up' },
    { from: 'DP', to: 'PS', type: 'power', description: 'Main drive power to printing section' },
    { from: 'DP', to: 'DS', type: 'power', description: 'Drive power to drying transport' },
    { from: 'PA', to: 'PS', type: 'pneumatic', description: 'Compressed air to screen lifts' },
    { from: 'PA', to: 'DP', type: 'cooling', description: 'Water cooling to PLC cabinet' },
  ]),
  healthScore: 78,
};

// System Diagram data for the machine
const SYSTEM_DIAGRAM = {
  name: 'Rotary Screen Printing Machine - Process Flow Diagram',
  description: 'Complete process flow diagram of RSPM-001 showing fabric path, paste circulation, drying, and drive systems.',
  type: 'process',
  nodes: JSON.stringify([
    // Fabric path
    { id: 'unwind', label: 'Unwind\nRoll', x: 50, y: 300, type: 'process' },
    { id: 'spreader', label: 'Spreader\nRoller', x: 150, y: 300, type: 'equipment' },
    { id: 'eopc', label: 'Edge Guide\n(EPC)', x: 250, y: 300, type: 'instrument' },
    { id: 'blanket', label: 'Printing\nBlanket', x: 800, y: 300, type: 'equipment', width: 600 },
    { id: 'cooling', label: 'Cooling\nCylinder', x: 1450, y: 300, type: 'equipment' },
    { id: 'windup', label: 'Wind-Up\nRoll', x: 1600, y: 300, type: 'process' },
    // Print stations (inside blanket)
    { id: 's1', label: 'Color 1', x: 520, y: 220, type: 'process' },
    { id: 's2', label: 'Color 2', x: 620, y: 220, type: 'process' },
    { id: 's3', label: 'Color 3', x: 720, y: 220, type: 'process' },
    { id: 's4', label: 'Color 4', x: 820, y: 220, type: 'process' },
    { id: 's5', label: 'Color 5', x: 920, y: 220, type: 'process' },
    { id: 's6', label: 'Color 6', x: 1020, y: 220, type: 'process' },
    { id: 's7', label: 'Color 7', x: 1120, y: 220, type: 'process' },
    { id: 's8', label: 'Color 8', x: 1220, y: 220, type: 'process' },
    // Drying
    { id: 'dry1', label: 'IR Dryer 1', x: 1650, y: 200, type: 'equipment' },
    { id: 'dry2', label: 'IR Dryer 2', x: 1800, y: 200, type: 'equipment' },
    { id: 'dry3', label: 'IR Dryer 3', x: 1950, y: 200, type: 'equipment' },
    // Drive
    { id: 'mainmotor', label: 'Main Drive\nMotor 37kW', x: 600, y: 480, type: 'equipment' },
    { id: 'gearbox', label: 'Gear\nReducer', x: 750, y: 480, type: 'equipment' },
    { id: 'plc', label: 'PLC\nS7-1500', x: 900, y: 480, type: 'instrument' },
    { id: 'mcc', label: 'MCC\nPanel', x: 1050, y: 480, type: 'equipment' },
    // Paste
    { id: 'pastetank', label: 'Paste\nTanks', x: 400, y: 120, type: 'tank' },
    // Aux
    { id: 'air', label: 'Compressed\nAir 6 bar', x: 1200, y: 480, type: 'utility' },
    { id: 'cooling', label: 'Water\nCooling', x: 1350, y: 480, type: 'utility' },
  ]),
  edges: JSON.stringify([
    { id: 'e1', from: 'unwind', to: 'spreader', label: 'Fabric' },
    { id: 'e2', from: 'spreader', to: 'eopc', label: '' },
    { id: 'e3', from: 'eopc', to: 's1', label: '' },
    { id: 'e4', from: 's1', to: 's2', label: '' },
    { id: 'e5', from: 's2', to: 's3', label: '' },
    { id: 'e6', from: 's3', to: 's4', label: '' },
    { id: 'e7', from: 's4', to: 's5', label: '' },
    { id: 'e8', from: 's5', to: 's6', label: '' },
    { id: 'e9', from: 's6', to: 's7', label: '' },
    { id: 'e10', from: 's7', to: 's8', label: '' },
    { id: 'e11', from: 's8', to: 'cooling', label: 'Printed fabric' },
    { id: 'e12', from: 'cooling', to: 'dry1', label: '' },
    { id: 'e13', from: 'dry1', to: 'dry2', label: '' },
    { id: 'e14', from: 'dry2', to: 'dry3', label: '' },
    { id: 'e15', from: 'dry3', to: 'windup', label: 'Dried fabric' },
    { id: 'e16', from: 'pastetank', to: 's1', label: 'Paste', type: 'dashed' },
    { id: 'e17', from: 'pastetank', to: 's4', label: '', type: 'dashed' },
    { id: 'e18', from: 'pastetank', to: 's8', label: '', type: 'dashed' },
    { id: 'e19', from: 'mainmotor', to: 'gearbox', label: 'Drive' },
    { id: 'e20', from: 'gearbox', to: 'blanket', label: 'Line shaft', type: 'dashed' },
    { id: 'e21', from: 'plc', to: 'mcc', label: 'Control' },
    { id: 'e22', from: 'plc', to: 'blanket', label: 'PROFINET', type: 'dashed' },
    { id: 'e23', from: 'mcc', to: 'mainmotor', label: 'Power', type: 'dashed' },
    { id: 'e24', from: 'air', to: 'blanket', label: 'Air', type: 'dashed' },
    { id: 'e25', from: 'cooling', to: 'gearbox', label: 'Water', type: 'dashed' },
  ]),
};

// ══════════════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ══════════════════════════════════════════════════════════════════════════

async function seedRotaryPrinter() {
  console.log('🏭 ═══════════════════════════════════════════════════════════════');
  console.log('   ROTARY SCREEN PRINTING MACHINE - COMPREHENSIVE SEED');
  console.log('   Target: GTP Ghana Tema Factory');
  console.log('════════════════════════════════════════════════════════════════\n');

  // ── 1. Find or create prerequisites ──
  console.log('🔍 Step 1: Finding prerequisites (Plant, User, Category)...');

  // Find the admin user
  const admin = await db.user.findFirst({ where: { username: 'admin' } });
  if (!admin) {
    throw new Error('Admin user not found. Run seed.ts first to create base data.');
  }
  console.log(`  ✅ Admin user found: ${admin.fullName} (${admin.id})`);

  // Find Tema Factory
  let plant = await db.plant.findFirst({ where: { code: 'TEM-001' } });
  if (!plant) {
    console.log('  ⚠️  Tema Factory not found, creating...');
    plant = await db.plant.create({
      data: {
        name: 'Tema Factory',
        code: 'TEM-001',
        location: 'Tema Heavy Industrial Area',
        country: 'Ghana',
        city: 'Tema',
        isActive: true,
      },
    });
  }
  console.log(`  ✅ Plant: ${plant.name} (${plant.id})`);

  // Find or create asset category
  let category = await db.assetCategory.findFirst({ where: { name: 'Printing Equipment' } });
  if (!category) {
    // Create parent categories if needed
    let parentCat = await db.assetCategory.findFirst({ where: { name: 'Production Equipment' } });
    if (!parentCat) {
      parentCat = await db.assetCategory.create({
        data: { name: 'Production Equipment', code: 'PROD-EQ', description: 'Production and manufacturing equipment' },
      });
    }
    category = await db.assetCategory.create({
      data: {
        name: 'Printing Equipment',
        code: 'PRINT-EQ',
        description: 'Textile printing machines and related equipment',
        parentId: parentCat.id,
      },
    });
  }
  console.log(`  ✅ Category: ${category.name} (${category.id})`);

  // Find Maintenance department
  const dept = await db.department.findFirst({ where: { code: 'MAINT', plantId: plant.id } });
  console.log(`  ✅ Department: ${dept?.name || 'Maintenance'} (${dept?.id || 'N/A'})`);

  // ── 2. Check if machine already exists ──
  console.log('\n🔍 Step 2: Checking for existing machine...');
  const existing = await db.asset.findUnique({ where: { assetTag: MACHINE_SPECS.tag } });
  if (existing) {
    console.log(`  ⚠️  Machine ${MACHINE_SPECS.tag} already exists (ID: ${existing.id})`);
    console.log('  ❌ Skipping seed to avoid duplicate data.');
    console.log('  💡 To re-seed, delete the asset and its children first.');
    return;
  }

  // ── 3. Create main asset ──
  console.log('\n📦 Step 3: Creating main asset...');
  const mainAsset = await db.asset.create({
    data: {
      name: MACHINE_SPECS.name,
      assetTag: MACHINE_SPECS.tag,
      serialNumber: MACHINE_SPECS.serial,
      description: MACHINE_SPECS.description,
      manufacturer: MACHINE_SPECS.manufacturer,
      model: MACHINE_SPECS.model,
      yearManufactured: MACHINE_SPECS.year,
      condition: 'good',
      status: 'operational',
      criticality: MACHINE_SPECS.criticality,
      location: MACHINE_SPECS.location,
      building: MACHINE_SPECS.building,
      area: MACHINE_SPECS.area,
      plantId: plant.id,
      departmentId: dept?.id,
      categoryId: category.id,
      purchaseDate: new Date(MACHINE_SPECS.purchaseDate),
      purchaseCost: MACHINE_SPECS.purchaseCost,
      warrantyExpiry: new Date(MACHINE_SPECS.warrantyExpiry),
      expectedLifeYears: MACHINE_SPECS.expectedLifeYears,
      currentValue: MACHINE_SPECS.purchaseCost * 0.82,
      depreciationRate: 0.09,
      specification: MACHINE_SPECS.specification,
      createdById: admin.id,
      assignedToId: admin.id,
      imageUrl: '/assets/images/rspm-001.jpg',
    },
  });
  console.log(`  ✅ Main asset created: ${mainAsset.name} (ID: ${mainAsset.id})`);

  // ── 4. Create sub-system hierarchy ──
  console.log('\n📐 Step 4: Creating asset hierarchy (sub-systems & components)...');
  const subsystemAssets: Record<string, any> = {};
  let totalComponents = 0;

  for (const subsystem of SUBSYSTEMS) {
    const ssAsset = await db.asset.create({
      data: {
        name: subsystem.name,
        assetTag: subsystem.tag,
        description: subsystem.description,
        condition: 'good',
        status: 'operational',
        criticality: subsystem.criticality,
        location: MACHINE_SPECS.location,
        plantId: plant.id,
        departmentId: dept?.id,
        parentId: mainAsset.id,
        createdById: admin.id,
        categoryId: category.id,
        specification: '{}',
      },
    });
    subsystemAssets[subsystem.tag] = ssAsset;
    console.log(`  ✅ Sub-system: ${subsystem.name}`);

    // Create child components
    if (subsystem.children) {
      for (const child of subsystem.children) {
        const childAsset = await db.asset.create({
          data: {
            name: child.name,
            assetTag: child.tag,
            description: child.description,
            condition: 'good',
            status: 'operational',
            criticality: child.criticality,
            location: MACHINE_SPECS.location,
            plantId: plant.id,
            departmentId: dept?.id,
            parentId: ssAsset.id,
            createdById: admin.id,
            categoryId: category.id,
            specification: '{}',
          },
        });
        subsystemAssets[child.tag] = childAsset;
        totalComponents++;
      }
      console.log(`     └─ ${subsystem.children.length} components created`);
    }
  }
  console.log(`  ✅ Total: ${SUBSYSTEMS.length} sub-systems, ${totalComponents} components`);

  // ── 5. Create Bill of Materials ──
  console.log('\n📋 Step 5: Creating Bill of Materials...');
  let bomCount = 0;

  for (const subsystem of SUBSYSTEMS) {
    const ssAsset = subsystemAssets[subsystem.tag];
    if (!ssAsset) continue;

    // Sub-system → Main asset BOM entry
    await db.billOfMaterial.create({
      data: {
        parentId: mainAsset.id,
        childAssetId: ssAsset.id,
        partNumber: subsystem.tag,
        quantity: 1,
        unit: 'set',
        specification: subsystem.description,
        status: 'active',
        revision: 'A',
      },
    });
    bomCount++;

    // Components → Sub-system BOM entries
    if (subsystem.children) {
      for (const child of subsystem.children) {
        const childAsset = subsystemAssets[child.tag];
        if (!childAsset) continue;

        await db.billOfMaterial.create({
          data: {
            parentId: ssAsset.id,
            childAssetId: childAsset.id,
            partNumber: child.tag,
            quantity: child.tag.includes('×') ? parseInt(child.tag.match(/×(\d+)/)?.[1] || '1') : 1,
            unit: 'each',
            specification: child.description,
            status: 'active',
            revision: 'A',
          },
        });
        bomCount++;
      }
    }
  }
  console.log(`  ✅ Created ${bomCount} BOM entries`);

  // ── 6. Create Component Registry ──
  console.log('\n🔬 Step 6: Creating Component Registry entries...');
  const componentRegistryEntries: Record<string, any> = {};
  let regCount = 0;

  for (const subsystem of SUBSYSTEMS) {
    for (const child of subsystem.children || []) {
      const asset = subsystemAssets[child.tag];
      if (!asset) continue;

      const componentCode = child.tag.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
      const regEntry = await db.componentRegistry.upsert({
        where: { componentCode },
        update: {},
        create: {
          componentCode,
          name: child.name,
          description: child.description,
          componentType: 'component',
          criticality: child.criticality,
          lifecycleStatus: 'operational',
          installedDate: new Date(MACHINE_SPECS.purchaseDate),
          expectedLifeHours: child.criticality === 'critical' ? 40000 : child.criticality === 'high' ? 30000 : 50000,
          operatingHours: Math.floor(Math.random() * 15000) + 5000,
          healthScore: Math.floor(Math.random() * 20) + 80,
          assetId: mainAsset.id,
          sortOrder: regCount,
        },
      });
      componentRegistryEntries[child.tag] = regEntry;
      regCount++;
    }
  }
  console.log(`  ✅ Created ${regCount} component registry entries`);

  // ── 7. Create PM Templates and Schedules ──
  console.log('\n📅 Step 7: Creating PM Templates and Schedules...');
  let templateCount = 0;
  let scheduleCount = 0;

  for (const tmpl of PM_TEMPLATES) {
    const pmTemplate = await db.pmTemplate.create({
      data: {
        title: tmpl.title,
        description: `Preventive/predictive maintenance template for ${MACHINE_SPECS.name} - ${tmpl.category}`,
        type: tmpl.type,
        category: tmpl.category,
        estimatedDuration: tmpl.estimatedDuration,
        priority: tmpl.priority,
        requiredSkills: tmpl.requiredSkills ? JSON.stringify(tmpl.requiredSkills) : undefined,
        requiredTools: tmpl.category === 'mechanical' ? JSON.stringify(['Torque wrench', 'Vibration analyzer', 'Multimeter', 'Grease gun', 'Allen key set', 'Feeler gauge']) : undefined,
        createdById: admin.id,
      },
    });
    templateCount++;

    // Create template tasks
    for (let i = 0; i < tmpl.tasks.length; i++) {
      const task = tmpl.tasks[i];
      await db.pmTemplateTask.create({
        data: {
          templateId: pmTemplate.id,
          taskNumber: i + 1,
          description: task.description,
          taskType: task.taskType,
          requiredParts: task.requiredParts ? JSON.stringify(task.requiredParts) : undefined,
          estimatedMinutes: task.estimatedMinutes,
          sortOrder: i + 1,
          isActive: true,
        },
      });
    }

    // Create schedule from template
    let freqType: string;
    let freqValue: number;
    switch (tmpl.type) {
      case 'inspection':
        freqType = 'daily';
        freqValue = 1;
        break;
      case 'preventive':
        if (tmpl.title.includes('Weekly')) { freqType = 'weekly'; freqValue = 1; }
        else if (tmpl.title.includes('Monthly')) { freqType = 'monthly'; freqValue = 1; }
        else if (tmpl.title.includes('Quarterly')) { freqType = 'quarterly'; freqValue = 1; }
        else if (tmpl.title.includes('Annual')) { freqType = 'annual'; freqValue = 1; }
        else { freqType = 'monthly'; freqValue = 1; }
        break;
      case 'predictive':
        freqType = 'monthly';
        freqValue = 3; // every 3 months
        break;
      default:
        freqType = 'monthly';
        freqValue = 1;
    }

    // Calculate next due date
    const now = new Date();
    const nextDue = new Date(now);
    switch (freqType) {
      case 'daily':
        nextDue.setDate(nextDue.getDate() + 1);
        break;
      case 'weekly':
        nextDue.setDate(nextDue.getDate() + 7);
        break;
      case 'monthly':
        nextDue.setDate(nextDue.getDate() + 30);
        break;
      case 'quarterly':
        nextDue.setDate(nextDue.getDate() + 90);
        break;
      case 'annual':
        nextDue.setDate(nextDue.getDate() + 365);
        break;
    }

    await db.pmSchedule.create({
      data: {
        title: tmpl.title,
        description: tmpl.title,
        assetId: mainAsset.id,
        frequencyType: freqType,
        frequencyValue: freqValue,
        lastCompletedDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // completed a week ago
        nextDueDate: nextDue,
        estimatedDuration: tmpl.estimatedDuration,
        priority: tmpl.priority,
        assignedToId: admin.id,
        departmentId: dept?.id,
        isActive: true,
        autoGenerateWO: tmpl.type !== 'predictive',
        leadDays: tmpl.type === 'predictive' ? 7 : 3,
        templateId: pmTemplate.id,
        createdById: admin.id,
      },
    });
    scheduleCount++;
  }
  console.log(`  ✅ Created ${templateCount} PM templates with tasks`);
  console.log(`  ✅ Created ${scheduleCount} PM schedules`);

  // ── 8. Create Inventory Items (Spare Parts) ──
  console.log('\n🔧 Step 8: Creating inventory items (spare parts)...');
  let invCount = 0;

  for (const item of INVENTORY_ITEMS) {
    const existingItem = await db.inventoryItem.findUnique({ where: { itemCode: item.code } });
    if (existingItem) {
      console.log(`  ⏭️  Skipping existing: ${item.name}`);
      continue;
    }

    await db.inventoryItem.create({
      data: {
        itemCode: item.code,
        name: item.name,
        description: `Spare part for ${MACHINE_SPECS.name} (${MACHINE_SPECS.tag})`,
        category: item.category,
        unitOfMeasure: item.unit,
        currentStock: Math.floor(Math.random() * item.maxStock) + item.minStock,
        minStockLevel: item.minStock,
        maxStockLevel: item.maxStock,
        unitCost: item.unitCost,
        supplier: item.supplier,
        location: item.location,
        plantId: plant.id,
        specification: item.specification,
        imageUrls: '[]',
        createdById: admin.id,
        isActive: true,
      },
    });
    invCount++;
  }
  console.log(`  ✅ Created ${invCount} inventory items`);

  // ── 9. Create Digital Twin ──
  console.log('\n🌐 Step 9: Creating Digital Twin...');
  const existingTwin = await db.digitalTwin.findFirst({ where: { assetId: mainAsset.id } });
  if (!existingTwin) {
    await db.digitalTwin.create({
      data: {
        assetId: mainAsset.id,
        name: DIGITAL_TWIN_CONFIG.name,
        description: DIGITAL_TWIN_CONFIG.description,
        type: DIGITAL_TWIN_CONFIG.type,
        parameters: DIGITAL_TWIN_CONFIG.parameters,
        connections: DIGITAL_TWIN_CONFIG.connections,
        healthScore: DIGITAL_TWIN_CONFIG.healthScore,
        syncInterval: '5min',
        lastSynced: new Date(),
        isActive: true,
        createdById: admin.id,
      },
    });
    console.log('  ✅ Digital Twin created');
  } else {
    console.log('  ⏭️  Digital Twin already exists, skipping');
  }

  // ── 10. Create System Diagram ──
  console.log('\n📊 Step 10: Creating System Diagram...');
  const existingDiagram = await db.systemDiagram.findFirst({
    where: { name: SYSTEM_DIAGRAM.name },
  });
  if (!existingDiagram) {
    await db.systemDiagram.create({
      data: {
        plantId: plant.id,
        name: SYSTEM_DIAGRAM.name,
        description: SYSTEM_DIAGRAM.description,
        type: SYSTEM_DIAGRAM.type,
        nodes: SYSTEM_DIAGRAM.nodes,
        edges: SYSTEM_DIAGRAM.edges,
        viewport: JSON.stringify({ x: 0, y: 0, zoom: 0.7 }),
        version: 1,
        isTemplate: false,
        isActive: true,
        createdById: admin.id,
      },
    });
    console.log('  ✅ System Diagram created');
  } else {
    console.log('  ⏭️  System Diagram already exists, skipping');
  }

  // ── 11. Create Work Instructions ──
  console.log('\n📖 Step 11: Creating Work Instructions...');
  const workInstructions = [
    {
      title: 'Screen Change Procedure - Rotary Screen Printer',
      description: 'Step-by-step procedure for changing a rotary screen at any print station. Covers screen removal, cleaning, new screen installation, registration setup, and paste filling.',
      maintenanceType: 'preventive' as const,
      difficulty: 'intermediate',
      safetyLevel: 'medium',
      requiresLockout: false,
      requiresPermit: false,
      estimatedDuration: 45,
      componentTag: 'RSPM-001-PS-SD',
      steps: [
        { stepNumber: 1, instruction: 'Press the STATION LIFT button on the HMI for the station requiring screen change', safetyNote: 'Ensure machine speed is at ZERO before lifting station' },
        { stepNumber: 2, instruction: 'Wait for the pneumatic cylinder to fully raise the screen head (confirm green indicator)', safetyNote: 'Do not reach under the raised station head' },
        { stepNumber: 3, instruction: 'Loosen the screen clamping rings at both ends using the special spanner', safetyNote: 'Use cut-resistant gloves - screen edges are sharp' },
        { stepNumber: 4, instruction: 'Slide out the old screen carefully, place on the screen storage rack' },
        { stepNumber: 5, instruction: 'Clean the paste trough and magnetic rod with damp cloth' },
        { stepNumber: 6, instruction: 'Insert the new screen - ensure the arrow on the screen end ring points in the fabric travel direction' },
        { stepNumber: 7, instruction: 'Tighten clamping rings evenly (torque 15Nm ± 2Nm)' },
        { stepNumber: 8, instruction: 'Lower the station head using HMI STATION DOWN button' },
        { stepNumber: 9, instruction: 'Run REGISTRATION AUTO-SET sequence from HMI' },
        { stepNumber: 10, instruction: 'Start paste circulation pump and verify flow', safetyNote: 'Check for paste leaks at all connections' },
        { stepNumber: 11, instruction: 'Run a test print on waste fabric and verify registration accuracy' },
        { stepNumber: 12, instruction: 'If registration is within ±0.2mm, proceed with production' },
      ],
      requiredTools: [
        { name: 'Screen clamping spanner', required: true },
        { name: 'Allen key set (metric)', required: true },
        { name: 'Cut-resistant gloves', required: true },
        { name: 'Cleaning cloth', required: true },
      ],
      requiredParts: [
        { name: 'Rotary Screen (Nickel) 254mm', quantity: 1 },
        { name: 'Peristaltic Pump Tube (Viton)', quantity: 1 },
      ],
    },
    {
      title: 'Emergency Stop Recovery Procedure',
      description: 'Procedure to safely restart the machine after an emergency stop event. Covers fault identification, reset sequence, and return to production.',
      maintenanceType: 'corrective' as const,
      difficulty: 'basic',
      safetyLevel: 'critical',
      requiresLockout: true,
      requiresPermit: false,
      estimatedDuration: 15,
      componentTag: 'RSPM-001-PA-SI',
      steps: [
        { stepNumber: 1, instruction: 'Identify which E-stop was activated from the HMI alarm page', safetyNote: 'Do not reset E-stop until cause is identified' },
        { stepNumber: 2, instruction: 'Inspect the machine area for the cause of the E-stop (safety guard open, personnel in danger zone, etc.)', safetyNote: 'Wear all required PPE: safety glasses, steel-toe boots, hearing protection' },
        { stepNumber: 3, instruction: 'Resolve the cause of the emergency stop' },
        { stepNumber: 4, instruction: 'Clear all alarms from the HMI alarm page' },
        { stepNumber: 5, instruction: 'Pull out and twist to release the E-stop button' },
        { stepNumber: 6, instruction: 'Press the RESET button on the main control panel', safetyNote: 'Machine will not restart until all safety interlocks are satisfied' },
        { stepNumber: 7, instruction: 'Verify all safety guards are closed and interlocks are green' },
        { stepNumber: 8, instruction: 'Set machine speed to MINIMUM (10 m/min)' },
        { stepNumber: 9, instruction: 'Press START and slowly ramp speed to production setting' },
      ],
      requiredTools: [
        { name: 'Multimeter (for electrical checks)', required: false },
      ],
      requiredParts: [],
    },
    {
      title: 'Blanket Replacement Procedure',
      description: 'Complete procedure for replacing the endless printing blanket on the rotary screen printing machine. This is a major maintenance task requiring 4-6 hours.',
      maintenanceType: 'overhaul' as const,
      difficulty: 'advanced',
      safetyLevel: 'high',
      requiresLockout: true,
      requiresPermit: true,
      estimatedDuration: 360,
      componentTag: 'RSPM-001-PS-BL',
      steps: [
        { stepNumber: 1, instruction: 'Raise ALL print stations using the GROUP LIFT function on HMI', safetyNote: 'Lock out main drive before accessing blanket area' },
        { stepNumber: 2, instruction: 'Remove blanket tracking rollers at both ends' },
        { stepNumber: 3, instruction: 'Release blanket tension on the tensioning roller' },
        { stepNumber: 4, instruction: 'Carefully slide the old blanket off the rollers - may require 2 technicians' },
        { stepNumber: 5, instruction: 'Clean all blanket tracking rollers and idler rollers' },
        { stepNumber: 6, instruction: 'Inspect all rollers for bearing wear, flat spots, or damage' },
        { stepNumber: 7, instruction: 'Install new blanket - ensure correct direction of travel (arrow marked on blanket)' },
        { stepNumber: 8, instruction: 'Apply even tension on the tensioning roller (follow manufacturer spec: 2kN)' },
        { stepNumber: 9, instruction: 'Reinstall blanket tracking rollers' },
        { stepNumber: 10, instruction: 'Run blanket tracking AUTO-SET procedure from HMI' },
        { stepNumber: 11, instruction: 'Run blanket at minimum speed for 15 minutes to seat the blanket' },
        { stepNumber: 12, instruction: 'Lower all print stations and check for proper contact' },
        { stepNumber: 13, instruction: 'Run test prints and verify print quality across full width', safetyNote: 'Keep hands clear of blanket nip points during test run' },
      ],
      requiredTools: [
        { name: 'Blanket handling bars (×2)', required: true },
        { name: 'Torque wrench 30-100Nm', required: true },
        { name: 'Spirit level', required: true },
        { name: 'Straight edge 2000mm', required: true },
        { name: 'Allen key set (metric)', required: true },
      ],
      requiredParts: [
        { name: 'Endless Printing Blanket 1850mm', quantity: 1 },
        { name: 'Blanket tracking roller bearings', quantity: 4 },
      ],
    },
  ];

  let wiCount = 0;
  for (const wi of workInstructions) {
    const existingWI = await db.workInstruction.findFirst({ where: { title: wi.title } });
    if (existingWI) {
      console.log(`  ⏭️  Skipping existing: ${wi.title}`);
      wiCount++;
      continue;
    }

    // Find the component registry entry for this work instruction
    const compReg = componentRegistryEntries[wi.componentTag];
    const compId = compReg ? compReg.id : componentRegistryEntries[Object.keys(componentRegistryEntries)[0]]?.id;
    if (!compId) {
      console.log(`  ⚠️  No component found for ${wi.title}, skipping`);
      continue;
    }

    await db.workInstruction.create({
      data: {
        title: wi.title,
        description: wi.description,
        componentId: compId,
        assetId: mainAsset.id,
        maintenanceType: wi.maintenanceType,
        estimatedDuration: wi.estimatedDuration,
        difficulty: wi.difficulty,
        safetyLevel: wi.safetyLevel,
        requiresLockout: wi.requiresLockout,
        requiresPermit: wi.requiresPermit,
        steps: JSON.stringify(wi.steps),
        requiredTools: JSON.stringify(wi.requiredTools),
        requiredParts: JSON.stringify(wi.requiredParts),
        isActive: true,
        createdById: admin.id,
      },
    });
    wiCount++;
    console.log(`  ✅ Created: ${wi.title}`);
  }
  console.log(`  ✅ Work Instructions: ${wiCount}`);

  // ── 12. Create Sample Failure Records (for testing/ML data) ──
  console.log('\n⚠️  Step 12: Creating sample failure records...');
  const sampleFailures = [
    {
      componentTag: 'RSPM-001-PS-SQ',
      failureMode: 'wear',
      cause: 'Magnetic squeegee rod worn after 8000 operating hours. Print quality degradation noticed as uneven paste deposit.',
      severity: 'medium',
      symptoms: JSON.stringify(['Uneven print deposit', 'Streaky prints on Color 3', 'Paste leakage at squeegee contact point']),
      downtime: 120,
      cost: 340,
      rootCause: 'Normal wear - squeegee rod replacement interval exceeded',
      correctiveAction: 'Replaced magnetic squeegee rod with new 15mm rod. Updated replacement interval to 6000 hours.',
      detectedAt: new Date('2025-01-15'),
      resolvedAt: new Date('2025-01-15'),
    },
    {
      componentTag: 'RSPM-001-DS-DC1',
      failureMode: 'electrical',
      cause: 'IR emitter element failure in Drying Chamber 1 position 7. Open circuit detected by thermocouple.',
      severity: 'high',
      symptoms: JSON.stringify(['Uneven drying on fabric left side', 'Moisture sensor alarm at dryer exit', 'Dryer 1 temperature below setpoint']),
      downtime: 180,
      cost: 520,
      rootCause: 'Thermal cycling fatigue - emitter reached end of life (12000 hours)',
      correctiveAction: 'Replaced IR emitter element 2.4kW. Inspected all other elements in DC1 and DC2. Recommended quarterly IR inspection.',
      detectedAt: new Date('2025-02-08'),
      resolvedAt: new Date('2025-02-08'),
    },
    {
      componentTag: 'RSPM-001-UF-EG',
      failureMode: 'mechanical',
      cause: 'Edge guide ultrasonic sensor contaminated with paste residue. Fabric tracking off by 3mm causing selvedge printing errors.',
      severity: 'medium',
      symptoms: JSON.stringify(['Fabric running off-center', 'Selvedge pattern misalignment', 'Edge guide indicator flashing amber']),
      downtime: 60,
      cost: 85,
      rootCause: 'Lack of regular sensor cleaning in weekly maintenance',
      correctiveAction: 'Cleaned ultrasonic sensor with IPA solvent. Added sensor cleaning to daily operator checklist.',
      detectedAt: new Date('2025-03-02'),
      resolvedAt: new Date('2025-03-02'),
    },
    {
      componentTag: 'RSPM-001-DP-GR',
      failureMode: 'mechanical',
      cause: 'Main gear reducer running hot (82°C). Oil analysis showed elevated iron particles (150 ppm vs normal <50 ppm). Bearing wear suspected.',
      severity: 'high',
      symptoms: JSON.stringify(['Unusual noise from gear reducer', 'Gear reducer surface temperature 82°C', 'Elevated vibration readings 5.2mm/s']),
      downtime: 480,
      cost: 2800,
      rootCause: 'Input shaft bearing degradation due to alignment drift',
      correctiveAction: 'Opened gear reducer, replaced input shaft bearing (SKF 22316 EK), changed oil, realigned motor coupling. Vibration returned to 2.8mm/s.',
      detectedAt: new Date('2025-03-20'),
      resolvedAt: new Date('2025-03-22'),
    },
    {
      componentTag: 'RSPM-001-PS-PC',
      failureMode: 'wear',
      cause: 'Peristaltic pump tube burst on Color 5 station, causing paste spillage on blanket.',
      severity: 'medium',
      symptoms: JSON.stringify(['Paste leakage at Color 5', 'Low paste level alarm', 'Paste on blanket surface']),
      downtime: 90,
      cost: 150,
      rootCause: 'Pump tube exceeded recommended replacement interval of 3 months (was 4.5 months old)',
      correctiveAction: 'Replaced all 8 peristaltic pump tubes as preventive measure. Updated tube replacement to strict 3-month PM schedule.',
      detectedAt: new Date('2025-04-10'),
      resolvedAt: new Date('2025-04-10'),
    },
  ];

  let failCount = 0;
  for (const fail of sampleFailures) {
    const comp = componentRegistryEntries[fail.componentTag];
    if (!comp) continue;

    await db.failureRecord.create({
      data: {
        componentId: comp.id,
        assetId: mainAsset.id,
        failureMode: fail.failureMode,
        failureCause: fail.cause,
        failureSeverity: fail.severity,
        symptoms: fail.symptoms,
        detectedAt: fail.detectedAt,
        resolvedAt: fail.resolvedAt,
        downtimeMinutes: fail.downtime,
        repairCost: fail.cost,
        rootCause: fail.rootCause,
        correctiveAction: fail.correctiveAction,
      },
    });
    failCount++;
  }
  console.log(`  ✅ Created ${failCount} sample failure records`);

  // ── Summary ──
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  ✅ ROTARY SCREEN PRINTING MACHINE SEED COMPLETE');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  📦 Main Asset:        ${MACHINE_SPECS.tag} - ${MACHINE_SPECS.name}`);
  console.log(`  📐 Sub-systems:       ${SUBSYSTEMS.length}`);
  console.log(`  🔩 Components:        ${totalComponents}`);
  console.log(`  📋 BOM Entries:        ${bomCount}`);
  console.log(`  🔬 Component Registry: ${regCount}`);
  console.log(`  📅 PM Templates:      ${templateCount}`);
  console.log(`  📅 PM Schedules:      ${scheduleCount}`);
  console.log(`  🔧 Inventory Items:   ${invCount}`);
  console.log(`  🌐 Digital Twin:      1`);
  console.log(`  📊 System Diagram:    1`);
  console.log(`  ⚠️  Failure Records:   ${failCount}`);
  console.log(`  📖 Work Instructions: ${wiCount}`);
  console.log('════════════════════════════════════════════════════════════════\n');
}

// ── Run ──
seedRotaryPrinter()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
