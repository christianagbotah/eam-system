/**
 * Built-in Geometry Library for common industrial machine types.
 * Used as fallback when LLM is unavailable (e.g., on VPS outside Z.ai network).
 * Each template defines geometric primitives that approximate the machine's appearance.
 */

import type { GeometrySpec } from './programmatic-generator'

// Re-export the type to avoid circular imports
type BuiltinGeometrySpec = GeometrySpec

// ============================================================================
// HELPER — Create a machine from parts
// ============================================================================

function machine(name: string, description: string, parts: GeometrySpec['parts']): GeometrySpec {
  return { machineName: name, description, scale: 1.0, parts }
}

const I = (n: string, type: any, position: number[], rotation: number[], props: Record<string, any>): any => ({
  name: n, type, position, rotation, color: '#666666', metalness: 0.6, roughness: 0.4, ...props
})

// ============================================================================
// MACHINE TEMPLATES
// ============================================================================

const templates: Record<string, () => GeometrySpec> = {
  // --- PUMPS ---
  pump: () => machine('Centrifugal Pump', 'Industrial centrifugal pump with motor and volute casing', [
    I('Base Plate', 'box', [0, 0.05, 0], [0, 0, 0], { size: [0.8, 0.1, 0.6], color: '#4a5568' }),
    I('Pump Body', 'cylinder', [0, 0.35, 0], [1.5708, 0, 0], { radiusTop: 0.25, radiusBottom: 0.25, height: 0.4, color: '#2d6a4f' }),
    I('Motor Housing', 'cylinder', [0, 0.35, -0.35], [1.5708, 0, 0], { radiusTop: 0.2, radiusBottom: 0.2, height: 0.5, color: '#2d3748' }),
    I('Coupling', 'cylinder', [0, 0.35, -0.1], [1.5708, 0, 0], { radiusTop: 0.08, radiusBottom: 0.08, height: 0.1, color: '#a0aec0' }),
    I('Inlet Pipe', 'cylinder', [0, 0.25, 0.4], [1.5708, 0, 0], { radiusTop: 0.08, radiusBottom: 0.08, height: 0.15, color: '#a0aec0' }),
    I('Outlet Pipe', 'cylinder', [0, 0.55, 0], [0, 0, 1.5708], { radiusTop: 0.06, radiusBottom: 0.06, height: 0.15, color: '#a0aec0' }),
  ]),

  // --- MOTORS ---
  motor: () => machine('Electric Motor', 'Three-phase electric motor with cooling fins', [
    I('Base', 'box', [0, 0.05, 0], [0, 0, 0], { size: [0.5, 0.1, 0.4], color: '#4a5568' }),
    I('Stator Housing', 'cylinder', [0, 0.3, 0], [1.5708, 0, 0], { radiusTop: 0.2, radiusBottom: 0.2, height: 0.5, color: '#2d3748' }),
    I('End Bell', 'cylinder', [0, 0.3, 0.3], [1.5708, 0, 0], { radiusTop: 0.22, radiusBottom: 0.2, height: 0.05, color: '#4a5568' }),
    I('End Bell Rear', 'cylinder', [0, 0.3, -0.3], [1.5708, 0, 0], { radiusTop: 0.2, radiusBottom: 0.22, height: 0.05, color: '#4a5568' }),
    I('Shaft', 'cylinder', [0, 0.3, 0.55], [1.5708, 0, 0], { radiusTop: 0.04, radiusBottom: 0.04, height: 0.3, color: '#a0aec0' }),
    I('Cooling Fins', 'box', [0, 0.5, 0], [0, 0, 0], { size: [0.42, 0.02, 0.42], color: '#718096' }),
    I('Terminal Box', 'box', [0.15, 0.5, -0.1], [0, 0, 0], { size: [0.1, 0.08, 0.08], color: '#2d3748' }),
    I('Fan Cover', 'cylinder', [0, 0.3, -0.5], [1.5708, 0, 0], { radiusTop: 0.18, radiusBottom: 0.18, height: 0.08, color: '#a0aec0', metalness: 0.3 }),
  ]),

  // --- COMPRESSORS ---
  compressor: () => machine('Air Compressor', 'Reciprocating air compressor with tank', [
    I('Base Frame', 'box', [0, 0.05, 0], [0, 0, 0], { size: [1.2, 0.1, 0.5], color: '#4a5568' }),
    I('Compressor Head', 'box', [-0.3, 0.35, 0], [0, 0, 0], { size: [0.4, 0.4, 0.35], color: '#2d3748' }),
    I('Cylinder', 'cylinder', [-0.3, 0.6, 0], [1.5708, 0, 0], { radiusTop: 0.12, radiusBottom: 0.12, height: 0.15, color: '#4a5568' }),
    I('Motor', 'cylinder', [-0.3, 0.35, -0.25], [1.5708, 0, 0], { radiusTop: 0.12, radiusBottom: 0.12, height: 0.3, color: '#2d6a4f' }),
    I('Pressure Tank', 'cylinder', [0.35, 0.35, 0], [1.5708, 0, 0], { radiusTop: 0.2, radiusBottom: 0.2, height: 0.8, color: '#e53e3e' }),
    I('Tank End Cap', 'sphere', [0.35, 0.75, 0], [0, 0, 0], { radius: 0.2, color: '#e53e3e' }),
    I('Tank Bottom Cap', 'sphere', [0.35, -0.05, 0], [0, 0, 0], { radius: 0.2, color: '#e53e3e' }),
    I('Pressure Gauge', 'cylinder', [0.35, 0.6, 0.22], [0, 0, 0], { radiusTop: 0.04, radiusBottom: 0.04, height: 0.08, color: '#ecc94b' }),
    I('Control Panel', 'box', [0.35, 0.45, 0.25], [0, 0, 0], { size: [0.15, 0.1, 0.05], color: '#1a202c' }),
  ]),

  // --- GENERATORS ---
  generator: () => machine('Diesel Generator', 'Diesel generator set with enclosure', [
    I('Base Frame', 'box', [0, 0.05, 0], [0, 0, 0], { size: [1.8, 0.1, 0.8], color: '#4a5568' }),
    I('Engine Block', 'box', [-0.2, 0.35, 0], [0, 0, 0], { size: [0.8, 0.4, 0.5], color: '#2d3748' }),
    I('Generator Body', 'cylinder', [0.5, 0.35, 0], [1.5708, 0, 0], { radiusTop: 0.25, radiusBottom: 0.25, height: 0.5, color: '#2d6a4f' }),
    I('Radiator', 'box', [-0.7, 0.35, 0], [0, 0, 0], { size: [0.1, 0.5, 0.5], color: '#a0aec0' }),
    I('Exhaust', 'cylinder', [-0.2, 0.7, -0.2], [0, 0, 0], { radiusTop: 0.04, radiusBottom: 0.04, height: 0.4, color: '#718096' }),
    I('Control Panel', 'box', [0.5, 0.65, 0.3], [0, 0, 0], { size: [0.3, 0.15, 0.05], color: '#1a202c' }),
    I('Fuel Tank', 'box', [-0.2, 0.6, 0.3], [0, 0, 0], { size: [0.4, 0.08, 0.15], color: '#4a5568' }),
    I('Battery', 'box', [0.8, 0.2, -0.2], [0, 0, 0], { size: [0.2, 0.15, 0.15], color: '#2d3748' }),
  ]),

  // --- TURBINES ---
  turbine: () => machine('Steam Turbine', 'Industrial steam turbine with casing', [
    I('Base', 'box', [0, 0.05, 0], [0, 0, 0], { size: [1.4, 0.1, 0.7], color: '#4a5568' }),
    I('Turbine Casing', 'cylinder', [0, 0.4, 0], [1.5708, 0, 0], { radiusTop: 0.3, radiusBottom: 0.3, height: 0.6, color: '#718096' }),
    I('Front Bearing', 'cylinder', [0, 0.4, 0.35], [1.5708, 0, 0], { radiusTop: 0.15, radiusBottom: 0.15, height: 0.1, color: '#4a5568' }),
    I('Rear Bearing', 'cylinder', [0, 0.4, -0.35], [1.5708, 0, 0], { radiusTop: 0.15, radiusBottom: 0.15, height: 0.1, color: '#4a5568' }),
    I('Inlet Flange', 'cylinder', [0, 0.55, 0.2], [0, 0, 1.5708], { radiusTop: 0.1, radiusBottom: 0.1, height: 0.15, color: '#e53e3e' }),
    I('Exhaust', 'cylinder', [0, 0.55, -0.2], [0, 0, 1.5708], { radiusTop: 0.12, radiusBottom: 0.12, height: 0.15, color: '#a0aec0' }),
    I('Governor', 'box', [0, 0.7, 0.1], [0, 0, 0], { size: [0.12, 0.15, 0.1], color: '#2d3748' }),
    I('Coupling', 'cylinder', [0, 0.4, -0.45], [1.5708, 0, 0], { radiusTop: 0.1, radiusBottom: 0.1, height: 0.08, color: '#a0aec0' }),
  ]),

  // --- BOILERS ---
  boiler: () => machine('Industrial Boiler', 'Fire tube industrial boiler vessel', [
    I('Base Frame', 'box', [0, 0.05, 0], [0, 0, 0], { size: [1.5, 0.1, 0.6], color: '#4a5568' }),
    I('Boiler Shell', 'cylinder', [0, 0.45, 0], [1.5708, 0, 0], { radiusTop: 0.3, radiusBottom: 0.3, height: 0.8, color: '#718096' }),
    I('Front Door', 'cylinder', [0, 0.45, 0.45], [1.5708, 0, 0], { radiusTop: 0.3, radiusBottom: 0.3, height: 0.05, color: '#4a5568' }),
    I('Chimney', 'cylinder', [0, 1.0, 0], [0, 0, 0], { radiusTop: 0.08, radiusBottom: 0.12, height: 0.4, color: '#a0aec0' }),
    I('Burner', 'box', [0, 0.2, 0.5], [0, 0, 0], { size: [0.15, 0.15, 0.1], color: '#2d3748' }),
    I('Steam Outlet', 'cylinder', [0, 0.9, 0], [0, 0, 1.5708], { radiusTop: 0.08, radiusBottom: 0.08, height: 0.2, color: '#a0aec0' }),
    I('Feed Water Inlet', 'cylinder', [0.3, 0.3, 0.3], [0, 0, 0], { radiusTop: 0.05, radiusBottom: 0.05, height: 0.15, color: '#3182ce' }),
    I('Pressure Gauge', 'cylinder', [0, 0.65, 0.32], [0, 0, 0], { radiusTop: 0.04, radiusBottom: 0.04, height: 0.08, color: '#ecc94b' }),
    I('Safety Valve', 'box', [-0.2, 0.8, 0], [0, 0, 0], { size: [0.08, 0.12, 0.06], color: '#e53e3e' }),
  ]),

  // --- CONVEYORS ---
  conveyor: () => machine('Belt Conveyor', 'Industrial belt conveyor system', [
    I('Left Leg', 'box', [-1.5, 0.3, 0], [0, 0, 0], { size: [0.08, 0.6, 0.3], color: '#4a5568' }),
    I('Right Leg', 'box', [1.5, 0.3, 0], [0, 0, 0], { size: [0.08, 0.6, 0.3], color: '#4a5568' }),
    I('Left Drum', 'cylinder', [-1.5, 0.65, 0], [1.5708, 0, 0], { radiusTop: 0.1, radiusBottom: 0.1, height: 0.5, color: '#2d3748' }),
    I('Right Drum', 'cylinder', [1.5, 0.65, 0], [1.5708, 0, 0], { radiusTop: 0.1, radiusBottom: 0.1, height: 0.5, color: '#2d3748' }),
    I('Belt Top', 'box', [0, 0.68, 0], [0, 0, 0], { size: [3.0, 0.02, 0.45], color: '#2d3748', metalness: 0.2 }),
    I('Belt Bottom', 'box', [0, 0.62, 0], [0, 0, 0], { size: [3.0, 0.02, 0.45], color: '#2d3748', metalness: 0.2 }),
    I('Side Rail L', 'box', [0, 0.7, 0.22], [0, 0, 0], { size: [3.0, 0.04, 0.02], color: '#a0aec0' }),
    I('Side Rail R', 'box', [0, 0.7, -0.22], [0, 0, 0], { size: [3.0, 0.04, 0.02], color: '#a0aec0' }),
    I('Motor', 'cylinder', [1.5, 0.5, 0.3], [1.5708, 0, 0], { radiusTop: 0.08, radiusBottom: 0.08, height: 0.2, color: '#2d6a4f' }),
    I('Support Cross', 'box', [0, 0.3, 0], [0, 0, 0], { size: [0.04, 0.04, 0.5], color: '#718096' }),
  ]),

  // --- FANS ---
  fan: () => machine('Industrial Fan', 'Large industrial ventilation fan', [
    I('Base', 'box', [0, 0.05, 0], [0, 0, 0], { size: [0.6, 0.1, 0.4], color: '#4a5568' }),
    I('Motor Housing', 'cylinder', [0, 0.35, -0.2], [1.5708, 0, 0], { radiusTop: 0.15, radiusBottom: 0.15, height: 0.35, color: '#2d3748' }),
    I('Fan Hub', 'cylinder', [0, 0.35, 0.1], [1.5708, 0, 0], { radiusTop: 0.08, radiusBottom: 0.08, height: 0.15, color: '#a0aec0' }),
    I('Blade 1', 'box', [0, 0.35, 0.25], [0, 0.7854, 0], { size: [0.6, 0.03, 0.08], color: '#718096' }),
    I('Blade 2', 'box', [0, 0.35, 0.25], [0, 2.3562, 0], { size: [0.6, 0.03, 0.08], color: '#718096' }),
    I('Blade 3', 'box', [0, 0.35, 0.25], [0, 3.927, 0], { size: [0.6, 0.03, 0.08], color: '#718096' }),
    I('Blade 4', 'box', [0, 0.35, 0.25], [0, 5.4978, 0], { size: [0.6, 0.03, 0.08], color: '#718096' }),
    I('Housing Ring', 'torus', [0, 0.35, 0.1], [0, 0, 0], { torusRadius: 0.35, tube: 0.02, color: '#4a5568' }),
  ]),

  // --- HEAT EXCHANGERS ---
  'heat exchanger': () => machine('Heat Exchanger', 'Shell and tube heat exchanger', [
    I('Base', 'box', [0, 0.05, 0], [0, 0, 0], { size: [1.2, 0.1, 0.5], color: '#4a5568' }),
    I('Shell', 'cylinder', [0, 0.4, 0], [1.5708, 0, 0], { radiusTop: 0.25, radiusBottom: 0.25, height: 0.8, color: '#e53e3e' }),
    I('Tube Sheet L', 'cylinder', [-0.4, 0.4, 0], [1.5708, 0, 0], { radiusTop: 0.25, radiusBottom: 0.25, height: 0.03, color: '#a0aec0' }),
    I('Tube Sheet R', 'cylinder', [0.4, 0.4, 0], [1.5708, 0, 0], { radiusTop: 0.25, radiusBottom: 0.25, height: 0.03, color: '#a0aec0' }),
    I('Inlet Nozzle', 'cylinder', [-0.5, 0.5, 0], [0, 0, 1.5708], { radiusTop: 0.06, radiusBottom: 0.06, height: 0.15, color: '#2d3748' }),
    I('Outlet Nozzle', 'cylinder', [0.5, 0.5, 0], [0, 0, 1.5708], { radiusTop: 0.06, radiusBottom: 0.06, height: 0.15, color: '#2d3748' }),
    I('Support Leg L', 'box', [-0.4, 0.3, 0], [0, 0, 0], { size: [0.05, 0.5, 0.05], color: '#4a5568' }),
    I('Support Leg R', 'box', [0.4, 0.3, 0], [0, 0, 0], { size: [0.05, 0.5, 0.05], color: '#4a5568' }),
  ]),

  // --- CHILLERS ---
  chiller: () => machine('Chiller Unit', 'Industrial water chiller system', [
    I('Base', 'box', [0, 0.05, 0], [0, 0, 0], { size: [1.4, 0.1, 0.8], color: '#4a5568' }),
    I('Compressor', 'box', [-0.4, 0.35, 0], [0, 0, 0], { size: [0.4, 0.35, 0.35], color: '#2d3748' }),
    I('Condenser', 'box', [0.3, 0.35, 0], [0, 0, 0], { size: [0.6, 0.4, 0.35], color: '#3182ce' }),
    I('Expansion Valve', 'cylinder', [0.65, 0.25, 0.2], [1.5708, 0, 0], { radiusTop: 0.05, radiusBottom: 0.05, height: 0.1, color: '#a0aec0' }),
    I('Evaporator', 'box', [0.3, 0.35, -0.35], [0, 0, 0], { size: [0.6, 0.4, 0.25], color: '#2d6a4f' }),
    I('Control Panel', 'box', [0.7, 0.55, 0], [0, 0, 0], { size: [0.2, 0.2, 0.05], color: '#1a202c' }),
    I('Refrigerant Lines', 'cylinder', [0.1, 0.6, 0.1], [0, 0, 0], { radiusTop: 0.02, radiusBottom: 0.02, height: 0.5, color: '#ecc94b' }),
    I('Fan Motor', 'cylinder', [0.3, 0.6, 0], [1.5708, 0, 0], { radiusTop: 0.08, radiusBottom: 0.08, height: 0.15, color: '#2d3748' }),
  ]),

  // --- TANKS ---
  tank: () => machine('Storage Tank', 'Industrial cylindrical storage tank', [
    I('Foundation', 'box', [0, 0.05, 0], [0, 0, 0], { size: [1.2, 0.1, 1.2], color: '#4a5568' }),
    I('Tank Body', 'cylinder', [0, 0.6, 0], [0, 0, 0], { radiusTop: 0.4, radiusBottom: 0.4, height: 1.0, color: '#a0aec0' }),
    I('Tank Roof', 'cone', [0, 1.15, 0], [0, 0, 0], { radiusBottom: 0.42, height: 0.15, color: '#718096' }),
    I('Ladder', 'box', [0.45, 0.6, 0], [0, 0, 0], { size: [0.04, 1.0, 0.04], color: '#4a5568' }),
    I('Ladder Rails', 'box', [0.47, 0.6, 0], [0, 0, 0], { size: [0.02, 1.0, 0.12], color: '#4a5568' }),
    I('Inlet Nozzle', 'cylinder', [0, 0.8, 0.42], [0, 0, 1.5708], { radiusTop: 0.05, radiusBottom: 0.05, height: 0.12, color: '#2d3748' }),
    I('Outlet Nozzle', 'cylinder', [0, 0.2, 0.42], [0, 0, 1.5708], { radiusTop: 0.05, radiusBottom: 0.05, height: 0.12, color: '#2d3748' }),
    I('Vent', 'cylinder', [0, 1.25, 0], [0, 0, 0], { radiusTop: 0.04, radiusBottom: 0.04, height: 0.15, color: '#718096' }),
  ]),

  // --- GENERIC MACHINE (fallback for unknown types) ---
  generic: () => machine('Industrial Machine', 'Generic industrial machine', [
    I('Base Plate', 'box', [0, 0.05, 0], [0, 0, 0], { size: [1.0, 0.1, 0.7], color: '#4a5568' }),
    I('Main Body', 'box', [0, 0.4, 0], [0, 0, 0], { size: [0.7, 0.5, 0.5], color: '#2d3748' }),
    I('Control Panel', 'box', [0.45, 0.5, 0], [0, 0, 0], { size: [0.15, 0.2, 0.05], color: '#1a202c' }),
    I('Motor', 'cylinder', [-0.4, 0.4, 0], [1.5708, 0, 0], { radiusTop: 0.12, radiusBottom: 0.12, height: 0.25, color: '#2d6a4f' }),
    I('Shaft', 'cylinder', [-0.4, 0.4, 0.2], [1.5708, 0, 0], { radiusTop: 0.04, radiusBottom: 0.04, height: 0.2, color: '#a0aec0' }),
    I('Hopper', 'cone', [0, 0.75, 0], [0, 0, 0], { radiusBottom: 0.2, height: 0.25, color: '#718096' }),
    I('Support Leg L', 'box', [-0.3, 0.2, 0.25], [0, 0, 0], { size: [0.05, 0.3, 0.05], color: '#4a5568' }),
    I('Support Leg R', 'box', [0.3, 0.2, 0.25], [0, 0, 0], { size: [0.05, 0.3, 0.05], color: '#4a5568' }),
    I('Safety Guard', 'box', [0, 0.5, 0.3], [0, 0, 0], { size: [0.5, 0.3, 0.02], color: '#ecc94b', metalness: 0.3, roughness: 0.7 }),
  ]),
}

// ============================================================================
// KEYWORD MATCHING
// ============================================================================

const machineKeywords: Record<string, string[]> = {
  pump: ['pump', 'centrifugal', 'submersible', 'water pump', 'hydraulic pump'],
  motor: ['motor', 'electric motor', 'servo motor', 'induction motor', 'dc motor'],
  compressor: ['compressor', 'air compressor', 'screw compressor', 'reciprocating compressor'],
  generator: ['generator', 'genset', 'diesel generator', 'alternator', 'power generator'],
  turbine: ['turbine', 'steam turbine', 'gas turbine', 'wind turbine', 'turbo'],
  boiler: ['boiler', 'furnace', 'heater', 'calorifier', 'water heater'],
  conveyor: ['conveyor', 'belt conveyor', 'roller conveyor', 'bucket elevator'],
  fan: ['fan', 'blower', 'ventilator', 'exhaust fan', 'axial fan', 'centrifugal fan'],
  'heat exchanger': ['heat exchanger', 'exchanger', 'cooler', 'radiator', 'condenser'],
  chiller: ['chiller', 'refrigeration', 'cooling unit', 'hvac', 'air conditioner'],
  tank: ['tank', 'vessel', 'reactor', 'silo', 'reservoir', 'storage'],
}

/**
 * Find the best matching template for a given machine name.
 * Returns 'generic' if no match is found.
 */
export function matchTemplate(machineName: string): string {
  const lower = machineName.toLowerCase()

  // Check direct template name
  if (templates[lower]) return lower

  // Check keyword matches
  for (const [templateKey, keywords] of Object.entries(machineKeywords)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return templateKey
    }
  }

  return 'generic'
}

/**
 * Get a built-in geometry spec for a machine name.
 * Returns null if no template is available (shouldn't happen since 'generic' always exists).
 */
export function getBuiltinGeometrySpec(machineName: string): GeometrySpec {
  const templateKey = matchTemplate(machineName)
  const templateFn = templates[templateKey]
  if (!templateFn) {
    return templates.generic()
  }
  return templateFn()
}
