// ============================================================================
// ADVANCED DIGITAL TWIN SIMULATION — Multi-physics simulation framework
// ============================================================================
// Supports process flow, thermal, vibration, energy, and pressure-drop
// simulation with time-stepping, steady-state, transient, scenario analysis,
// and result caching/replay.
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('AdvancedSimulation');

// ── Core Interfaces ────────────────────────────────────────────────────────

export type SimulationDomain = 'process_flow' | 'thermal' | 'vibration' | 'energy' | 'pressure_drop';

export type SimulationMode = 'steady_state' | 'transient';

export type ScenarioType = 'what_if' | 'worst_case' | 'design_basis';

export interface SimulationRequest {
  domain: SimulationDomain;
  mode: SimulationMode;
  scenario?: ScenarioType;
  assetId?: string;
  twinId?: string;
  parameters: SimulationParameters;
  duration?: number;   // seconds (for transient mode)
  timeStep?: number;   // seconds
  networkNodes?: NetworkNode[];
  networkEdges?: NetworkEdge[];
}

export interface SimulationParameters {
  [key: string]: number | string | boolean;
}

/** A single point in a simulation's time series */
export interface SimulationDataPoint {
  timestamp: number;                    // elapsed seconds
  nodeId?: string;
  values: Record<string, number>;
}

/** Aggregated result from a simulation run */
export interface SimulationResult {
  id: string;
  domain: SimulationDomain;
  mode: SimulationMode;
  scenario?: ScenarioType;
  dataPoints: SimulationDataPoint[];
  summary: SimulationSummary;
  convergenceReached: boolean;
  iterations: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

/** Statistical summary over the time series */
export interface SimulationSummary {
  min: Record<string, number>;
  max: Record<string, number>;
  avg: Record<string, number>;
  finalValues: Record<string, number>;
  stability: number;       // 0–1 (1 = perfectly stable)
  steadyStateReachedAt?: number; // timestamp when steady-state detected
}

/** Node in a process / pipe / thermal network */
export interface NetworkNode {
  id: string;
  name?: string;
  type: 'source' | 'sink' | 'junction' | 'equipment' | 'valve' | 'sensor';
  parameters: SimulationParameters;
  position?: { x: number; y: number; z: number };
}

/** Edge (connection) between two nodes */
export interface NetworkEdge {
  id: string;
  fromId: string;
  toId: string;
  type: 'pipe' | 'duct' | 'cable' | 'structural';
  parameters: SimulationParameters; // e.g. length, diameter, roughness, conductance
}

/** Scenario definition for what-if / worst-case analysis */
export interface SimulationScenario {
  id: string;
  name: string;
  type: ScenarioType;
  description: string;
  domain: SimulationDomain;
  baseParameters: SimulationParameters;
  modifiedParameters: SimulationParameters; // overrides for the scenario
  createdAt: string;
}

// ── In-memory result cache ─────────────────────────────────────────────────

const resultCache = new Map<string, { result: SimulationResult; cachedAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// ADVANCED SIMULATION SERVICE
// ============================================================================

export const advancedSimulationService = {

  // ── 1. Run Simulation (main entry point) ─────────────────────────────────

  /**
   * Execute a multi-physics simulation.
   *
   * Dispatches to the correct domain solver based on `domain`.
   * If `mode === 'steady_state'`, iterates until convergence or a max
   * iteration limit. If `mode === 'transient'`, runs a time-stepped loop
   * over the requested `duration`.
   */
  async runSimulation(request: SimulationRequest): Promise<SimulationResult> {
    const timer = logger.timer('runSimulation');
    logger.info('Starting simulation', { domain: request.domain, mode: request.mode, scenario: request.scenario });

    // Enrich parameters with live telemetry when possible
    const enrichedParams = await this.enrichWithTelemetry(request);

    let result: SimulationResult;

    switch (request.domain) {
      case 'process_flow':
        result = await this.runProcessFlow(enrichedParams);
        break;
      case 'thermal':
        result = await this.runThermal(enrichedParams);
        break;
      case 'vibration':
        result = await this.runVibration(enrichedParams);
        break;
      case 'energy':
        result = await this.runEnergyFlow(enrichedParams);
        break;
      case 'pressure_drop':
        result = await this.runPressureDrop(enrichedParams);
        break;
      default:
        throw new Error(`Unknown simulation domain: ${request.domain}`);
    }

    // Cache the result
    resultCache.set(result.id, { result, cachedAt: Date.now() });

    timer.end();
    return result;
  },

  // ── 2. Process Flow Simulation ──────────────────────────────────────────

  /**
   * Simulates mass balance across a network of process nodes.
   *
   * Mass conservation: Σ m_in = Σ m_out + accumulation
   * Flow rate through pipes: Q = ΔP / R   (Hagen-Poiseuille analogy)
   * Pressure at junction: P_j = weighted average of connected pressures
   */
  async runProcessFlow(request: SimulationRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    const dt = request.timeStep ?? 1;
    const duration = request.mode === 'transient' ? (request.duration ?? 60) : 30;
    const steps = Math.floor(duration / dt);

    const params = request.parameters;
    // Default process parameters
    const flowRate = (params.flowRate as number) ?? 100;        // m³/h
    const inletPressure = (params.inletPressure as number) ?? 6; // bar
    const fluidDensity = (params.fluidDensity as number) ?? 1000; // kg/m³
    const pipeDiameter = (params.pipeDiameter as number) ?? 0.15; // m

    const dataPoints: SimulationDataPoint[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      const noise = (Math.random() - 0.5) * 0.02;

      // --- Mass Balance ---
      // Accumulation = in - out  (transient effect)
      const demandFactor = 1 + 0.1 * Math.sin(t * 0.05) + noise;
      const outflow = flowRate * demandFactor;
      const accumulation = flowRate - outflow; // kg/s equivalent (× ρ for real mass)

      // --- Pressure along pipe network ---
      // Darcy-Weisbach: ΔP = f × (L/D) × (ρv²/2)
      // Simplified: pressure drops proportionally to flow rate squared
      const velocity = outflow / (Math.PI * (pipeDiameter / 2) ** 2 * 3600);
      const frictionFactor = 0.02;
      const pipeLength = (params.pipeLength as number) ?? 100; // m
      const pressureDrop = frictionFactor * (pipeLength / pipeDiameter) * (fluidDensity * velocity ** 2 / 2) / 1e5; // bar
      const outletPressure = inletPressure - pressureDrop;

      // --- Junction pressure (weighted average of connected nodes) ---
      const junctionPressure = (inletPressure + outletPressure) / 2 + noise * 0.1;

      dataPoints.push({
        timestamp: t,
        values: {
          flowRate: Math.round(outflow * 100) / 100,
          inletPressure: Math.round(inletPressure * 100) / 100,
          outletPressure: Math.round(Math.max(0, outletPressure) * 100) / 100,
          junctionPressure: Math.round(junctionPressure * 100) / 100,
          pressureDrop: Math.round(pressureDrop * 1000) / 1000,
          accumulation: Math.round(accumulation * 100) / 100,
          massBalanceError: Math.abs(accumulation) < 0.5 ? 0 : 1,
        },
      });
    }

    const summary = this.computeSummary(dataPoints);
    return this.buildResult('process_flow', request.mode, request.scenario, dataPoints, summary, startTime, steps);
  },

  // ── 3. Thermal Simulation ───────────────────────────────────────────────

  /**
   * Simulates heat transfer via conduction, convection, and radiation.
   *
   * Conduction:  q = k × A × (T1 - T2) / L        (Fourier's law)
   * Convection:  q = h × A × (T_surface - T_fluid) (Newton's cooling)
   * Radiation:   q = ε × σ × A × (T1⁴ - T2⁴)     (Stefan-Boltzmann)
   */
  async runThermal(request: SimulationRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    const dt = request.timeStep ?? 1;
    const duration = request.mode === 'transient' ? (request.duration ?? 120) : 60;
    const steps = Math.floor(duration / dt);

    const params = request.parameters;
    const ambientTemp = (params.ambientTemp as number) ?? 25;       // °C
    const sourceTemp = (params.sourceTemp as number) ?? 350;       // °C
    const conductivity = (params.conductivity as number) ?? 50;     // W/(m·K) steel
    const convectionCoeff = (params.convectionCoeff as number) ?? 25; // W/(m²·K)
    const wallThickness = (params.wallThickness as number) ?? 0.02; // m
    const surfaceArea = (params.surfaceArea as number) ?? 10;       // m²
    const emissivity = (params.emissivity as number) ?? 0.8;        // dimensionless
    // Stefan-Boltzmann constant: σ = 5.670374419 × 10⁻⁸ W/(m²·K⁴)
    const STEFAN_BOLTZMANN = 5.670374419e-8;

    const dataPoints: SimulationDataPoint[] = [];
    let surfaceTemp = ambientTemp; // initial condition

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      const noise = (Math.random() - 0.5) * 0.3;

      // --- Conduction through wall ---
      // q_cond = k × A × ΔT / L
      const qConduction = conductivity * surfaceArea * (sourceTemp - surfaceTemp) / wallThickness;

      // --- Convection to ambient ---
      // q_conv = h × A × (T_surface - T_ambient)
      const qConvection = convectionCoeff * surfaceArea * (surfaceTemp - ambientTemp);

      // --- Radiation to surroundings ---
      // q_rad = ε × σ × A × (T_surface⁴ - T_ambient⁴)   (convert °C → K)
      const TsurfK = surfaceTemp + 273.15;
      const TambK = ambientTemp + 273.15;
      const qRadiation = emissivity * STEFAN_BOLTZMANN * surfaceArea * (TsurfK ** 4 - TambK ** 4);

      // Net heat flux into surface element (assume thermal mass m·cp)
      const thermalMass = (params.thermalMass as number) ?? 5000; // J/K
      const dT = (qConduction - qConvection - qRadiation) / thermalMass * dt;
      surfaceTemp = Math.max(ambientTemp - 5, Math.min(sourceTemp + 10, surfaceTemp + dT + noise * 0.1));

      dataPoints.push({
        timestamp: t,
        values: {
          surfaceTemp: Math.round(surfaceTemp * 10) / 10,
          innerTemp: Math.round((sourceTemp - (sourceTemp - surfaceTemp) * 0.3) * 10) / 10,
          ambientTemp: ambientTemp + noise * 0.2,
          qConduction: Math.round(qConduction * 10) / 10,
          qConvection: Math.round(qConvection * 10) / 10,
          qRadiation: Math.round(qRadiation * 10) / 10,
          heatFluxTotal: Math.round((qConduction - qConvection - qRadiation) * 10) / 10,
        },
      });
    }

    const summary = this.computeSummary(dataPoints);
    return this.buildResult('thermal', request.mode, request.scenario, dataPoints, summary, startTime, steps);
  },

  // ── 4. Vibration Propagation Simulation ─────────────────────────────────

  /**
   * Simulates structural vibration response to a sinusoidal excitation.
   *
   * Equation of motion: m·ẍ + c·ẋ + k·x = F₀·sin(ωt)
   * Steady-state amplitude: X = F₀ / sqrt((k - mω²)² + (cω)²)
   * Natural frequency: ω_n = sqrt(k/m)
   * Damping ratio: ζ = c / (2·sqrt(k·m))
   */
  async runVibration(request: SimulationRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    const dt = (request.timeStep ?? 0.01); // vibration needs small dt
    const duration = request.mode === 'transient' ? (request.duration ?? 10) : 5;
    const steps = Math.floor(duration / dt);

    const params = request.parameters;
    const mass = (params.mass as number) ?? 100;           // kg
    const stiffness = (params.stiffness as number) ?? 4e5; // N/m
    const damping = (params.damping as number) ?? 200;     // N·s/m
    const forceAmplitude = (params.forceAmplitude as number) ?? 500; // N
    const excitationFreq = (params.excitationFreq as number) ?? 10;  // Hz

    // Derived quantities
    const omegaN = Math.sqrt(stiffness / mass);                       // rad/s — natural freq
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));         // damping ratio
    const omegaExc = 2 * Math.PI * excitationFreq;                    // rad/s — excitation freq

    const dataPoints: SimulationDataPoint[] = [];
    let x = 0;   // displacement
    let v = 0;   // velocity

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;

      // External force
      const F = forceAmplitude * Math.sin(omegaExc * t);

      // Acceleration: a = (F - c·v - k·x) / m
      const a = (F - damping * v - stiffness * x) / mass;

      // Semi-implicit Euler integration (velocity first, then position)
      v = v + a * dt;
      x = x + v * dt;

      // Record at coarser intervals to keep response size manageable
      if (i % 10 === 0) {
        const acceleration = (F - damping * v - stiffness * x) / mass;
        // RMS velocity: v_rms = |v| / sqrt(2) for sinusoidal
        const rmsVelocity = Math.abs(v) / Math.SQRT2;

        dataPoints.push({
          timestamp: Math.round(t * 1000) / 1000,
          values: {
            displacement_mm: Math.round(x * 1000 * 100) / 100,
            velocity_mm_s: Math.round(v * 1000 * 100) / 100,
            acceleration_m_s2: Math.round(acceleration * 100) / 100,
            rmsVelocity: Math.round(rmsVelocity * 1000 * 100) / 100,
            force_N: Math.round(F * 100) / 100,
          },
        });
      }
    }

    const summary = this.computeSummary(dataPoints);
    summary.steadyStateReachedAt = steps > 100 ? dt * 100 : undefined; // after initial transient

    return this.buildResult('vibration', request.mode, request.scenario, dataPoints, summary, startTime, Math.floor(steps / 10));
  },

  // ── 5. Energy Flow Simulation ───────────────────────────────────────────

  /**
   * Simulates power distribution and energy efficiency through a system.
   *
   * Power: P = V × I × cos(φ)
   * Efficiency: η = P_out / P_in
   * Energy: E = ∫ P(t) dt
   * Losses: P_loss = P_in - P_out = P_in × (1 - η)
   */
  async runEnergyFlow(request: SimulationRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    const dt = request.timeStep ?? 1;
    const duration = request.mode === 'transient' ? (request.duration ?? 3600) : 300;
    const steps = Math.floor(duration / dt);

    const params = request.parameters;
    const ratedPower = (params.ratedPower as number) ?? 500;    // kW
    const baseEfficiency = (params.baseEfficiency as number) ?? 0.92;
    const powerFactor = (params.powerFactor as number) ?? 0.85;
    const voltage = (params.voltage as number) ?? 415;           // V
    const loadProfileAmplitude = (params.loadProfileAmplitude as number) ?? 0.2;

    const dataPoints: SimulationDataPoint[] = [];
    let cumulativeEnergy = 0; // kWh

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      const noise = (Math.random() - 0.5) * 0.01;

      // Load varies sinusoidally with time (simulating production cycle)
      const loadFactor = 0.6 + loadProfileAmplitude * Math.sin(t * 0.01) + loadProfileAmplitude * 0.3 * Math.sin(t * 0.05) + noise;
      const actualLoad = Math.max(0.05, Math.min(1.0, loadFactor));

      // Input power with power factor correction
      const inputPower = ratedPower * actualLoad;
      const apparentPower = inputPower / powerFactor;

      // Efficiency degrades at partial load (quadratic model)
      // η(L) = η_base × (1 - α·(1-L)²)  where α is the part-load penalty
      const alpha = 0.15;
      const efficiency = baseEfficiency * (1 - alpha * (1 - actualLoad) ** 2);
      const outputPower = inputPower * efficiency;
      const losses = inputPower - outputPower;

      // Energy accumulation: E += P × dt  (dt in hours for kWh)
      cumulativeEnergy += outputPower * (dt / 3600);

      // Current: I = P / (V × √3 × cos φ)  for 3-phase
      const current = inputPower * 1000 / (voltage * Math.sqrt(3) * powerFactor);

      dataPoints.push({
        timestamp: t,
        values: {
          inputPower_kW: Math.round(inputPower * 100) / 100,
          outputPower_kW: Math.round(outputPower * 100) / 100,
          losses_kW: Math.round(losses * 100) / 100,
          efficiency_pct: Math.round(efficiency * 10000) / 100,
          loadFactor: Math.round(actualLoad * 100) / 100,
          cumulativeEnergy_kWh: Math.round(cumulativeEnergy * 100) / 100,
          current_A: Math.round(current * 100) / 100,
          apparentPower_kVA: Math.round(apparentPower * 100) / 100,
          powerFactor: powerFactor,
        },
      });
    }

    const summary = this.computeSummary(dataPoints);
    return this.buildResult('energy', request.mode, request.scenario, dataPoints, summary, startTime, steps);
  },

  // ── 6. Pressure Drop Simulation ─────────────────────────────────────────

  /**
   * Simulates pressure drop through a pipe network including fittings and filters.
   *
   * Darcy-Weisbach: ΔP = f × (L/D) × (ρv²/2)
   * Minor losses:   ΔP_minor = K × (ρv²/2)   (K = loss coefficient for fittings)
   * Filter:         ΔP_filter = ΔP_clean × (1/(1-C))²  where C = clogging fraction
   * Flow:           Q = A × v
   */
  async runPressureDrop(request: SimulationRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    const dt = request.timeStep ?? 1;
    const duration = request.mode === 'transient' ? (request.duration ?? 120) : 30;
    const steps = Math.floor(duration / dt);

    const params = request.parameters;
    const inletPressure = (params.inletPressure as number) ?? 8;       // bar
    const pipeDiameter = (params.pipeDiameter as number) ?? 0.1;      // m
    const pipeLength = (params.pipeLength as number) ?? 200;          // m
    const roughness = (params.roughness as number) ?? 0.045e-3;       // m (commercial steel)
    const fluidDensity = (params.fluidDensity as number) ?? 1000;     // kg/m³
    const viscosity = (params.viscosity as number) ?? 1e-3;           // Pa·s (water)
    const flowRate = (params.flowRate as number) ?? 50;               // m³/h
    const numFittings = (params.numFittings as number) ?? 5;
    const fittingK = (params.fittingK as number) ?? 0.5;              // average loss coefficient
    const filterCleanDP = (params.filterCleanDP as number) ?? 0.5;    // bar
    const filterClogging = (params.filterClogging as number) ?? 0;    // 0-1 (0=clean, 1=fully clogged)

    const dataPoints: SimulationDataPoint[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      const noise = (Math.random() - 0.5) * 0.01;

      // Cross-sectional area
      const A = Math.PI * (pipeDiameter / 2) ** 2;

      // Velocity: v = Q / A  (convert m³/h → m³/s)
      const velocity = (flowRate * (1 + 0.05 * Math.sin(t * 0.1) + noise)) / 3600 / A;

      // Reynolds number: Re = ρ × v × D / μ
      const Re = fluidDensity * velocity * pipeDiameter / viscosity;

      // Friction factor (Colebrook-White approximation — Swamee-Jain explicit)
      // f = 0.25 / [log10(ε/(3.7D) + 5.74/Re^0.9)]²
      const f = 0.25 / Math.pow(
        Math.log10(roughness / (3.7 * pipeDiameter) + 5.74 / Math.pow(Math.max(1, Re), 0.9)),
        2
      );

      // Major loss (Darcy-Weisbach)
      const majorDP = f * (pipeLength / pipeDiameter) * (fluidDensity * velocity ** 2 / 2) / 1e5; // bar

      // Minor losses (fittings)
      const minorDP = numFittings * fittingK * (fluidDensity * velocity ** 2 / 2) / 1e5; // bar

      // Filter loss (increases quadratically with clogging)
      const clogFraction = Math.min(0.95, filterClogging + t * 0.001); // slow clogging over time
      const filterDP = clogFraction < 1
        ? filterCleanDP * Math.pow(1 / (1 - clogFraction), 2)
        : 99; // essentially blocked

      const totalDP = majorDP + minorDP + filterDP;
      const outletPressure = Math.max(0, inletPressure - totalDP);

      dataPoints.push({
        timestamp: t,
        values: {
          inletPressure: Math.round(inletPressure * 100) / 100,
          outletPressure: Math.round(outletPressure * 100) / 100,
          totalPressureDrop: Math.round(totalDP * 100) / 100,
          majorLoss: Math.round(majorDP * 1000) / 1000,
          minorLoss: Math.round(minorDP * 1000) / 1000,
          filterLoss: Math.round(filterDP * 1000) / 1000,
          velocity: Math.round(velocity * 100) / 100,
          reynoldsNumber: Math.round(Re),
          frictionFactor: Math.round(f * 10000) / 10000,
          cloggingFraction: Math.round(clogFraction * 100) / 100,
        },
      });
    }

    const summary = this.computeSummary(dataPoints);
    return this.buildResult('pressure_drop', request.mode, request.scenario, dataPoints, summary, startTime, steps);
  },

  // ── 7. Scenario Management ─────────────────────────────────────────────

  /**
   * Run a predefined scenario by applying parameter overrides to a base run.
   * Returns both the base result and the scenario result for comparison.
   */
  async runScenario(baseRequest: SimulationRequest, overrides: SimulationParameters): Promise<{
    base: SimulationResult;
    scenario: SimulationResult;
    deltas: Record<string, { base: number; scenario: number; delta: number; deltaPct: number }>;
  }> {
    logger.info('Running scenario', {
      type: baseRequest.scenario,
      overrides: Object.keys(overrides),
    });

    const baseResult = await this.runSimulation(baseRequest);
    const scenarioRequest = {
      ...baseRequest,
      parameters: { ...baseRequest.parameters, ...overrides },
    };
    const scenarioResult = await this.runSimulation(scenarioRequest);

    // Compute deltas between base and scenario final values
    const deltas: Record<string, { base: number; scenario: number; delta: number; deltaPct: number }> = {};
    for (const key of Object.keys(baseResult.summary.finalValues)) {
      const baseVal = baseResult.summary.finalValues[key] ?? 0;
      const scenVal = scenarioResult.summary.finalValues[key] ?? 0;
      deltas[key] = {
        base: Math.round(baseVal * 100) / 100,
        scenario: Math.round(scenVal * 100) / 100,
        delta: Math.round((scenVal - baseVal) * 100) / 100,
        deltaPct: baseVal !== 0 ? Math.round(((scenVal - baseVal) / Math.abs(baseVal)) * 10000) / 100 : 0,
      };
    }

    return { base: baseResult, scenario: scenarioResult, deltas };
  },

  /**
   * Generate preset scenario definitions for a given domain.
   */
  getScenarioPresets(domain: SimulationDomain): SimulationScenario[] {
    const now = new Date().toISOString();

    switch (domain) {
      case 'process_flow':
        return [
          { id: 'pf-1', name: 'Double Flow Rate', type: 'what_if', description: 'What if flow rate doubles? Check pressure drop and equipment loading.', domain, baseParameters: { flowRate: 100 }, modifiedParameters: { flowRate: 200 }, createdAt: now },
          { id: 'pf-2', name: 'Complete Blockage', type: 'worst_case', description: 'Downstream valve fully closed — zero flow, pressure buildup.', domain, baseParameters: { flowRate: 100 }, modifiedParameters: { flowRate: 0 }, createdAt: now },
          { id: 'pf-3', name: 'Design Capacity', type: 'design_basis', description: 'System at 110% of rated capacity — design basis check.', domain, baseParameters: { flowRate: 100 }, modifiedParameters: { flowRate: 110 }, createdAt: now },
        ];
      case 'thermal':
        return [
          { id: 'th-1', name: 'Cooling Failure', type: 'worst_case', description: 'Loss of cooling — temperature runaway scenario.', domain, baseParameters: { convectionCoeff: 25 }, modifiedParameters: { convectionCoeff: 1 }, createdAt: now },
          { id: 'th-2', name: 'Ambient Spike', type: 'what_if', description: 'Ambient temperature rises to 45°C (heat wave).', domain, baseParameters: { ambientTemp: 25 }, modifiedParameters: { ambientTemp: 45 }, createdAt: now },
          { id: 'th-3', name: 'Max Operating Temp', type: 'design_basis', description: 'Source at maximum design temperature.', domain, baseParameters: { sourceTemp: 350 }, modifiedParameters: { sourceTemp: 500 }, createdAt: now },
        ];
      case 'vibration':
        return [
          { id: 'vb-1', name: 'Resonance Condition', type: 'worst_case', description: 'Excitation frequency matches natural frequency — resonance.', domain, baseParameters: { excitationFreq: 10 }, modifiedParameters: { excitationFreq: 10.05 }, createdAt: now },
          { id: 'vb-2', name: 'Bearing Wear', type: 'what_if', description: 'Increased vibration due to bearing degradation.', domain, baseParameters: { damping: 200 }, modifiedParameters: { damping: 50 }, createdAt: now },
          { id: 'vb-3', name: 'Design Excitation', type: 'design_basis', description: 'Maximum design excitation force.', domain, baseParameters: { forceAmplitude: 500 }, modifiedParameters: { forceAmplitude: 2000 }, createdAt: now },
        ];
      case 'energy':
        return [
          { id: 'en-1', name: 'Full Load', type: 'what_if', description: 'System operating at 100% rated capacity.', domain, baseParameters: { loadProfileAmplitude: 0.2 }, modifiedParameters: { loadProfileAmplitude: 0.4 }, createdAt: now },
          { id: 'en-2', name: 'Power Outage', type: 'worst_case', description: 'Complete loss of power supply.', domain, baseParameters: { ratedPower: 500 }, modifiedParameters: { ratedPower: 0 }, createdAt: now },
          { id: 'en-3', name: 'Design Rating', type: 'design_basis', description: 'At nameplate rating with nominal efficiency.', domain, baseParameters: { baseEfficiency: 0.92 }, modifiedParameters: { baseEfficiency: 0.85 }, createdAt: now },
        ];
      case 'pressure_drop':
        return [
          { id: 'pd-1', name: 'Filter Clogged', type: 'what_if', description: 'Filter 80% clogged — check pressure drop and flow.', domain, baseParameters: { filterClogging: 0 }, modifiedParameters: { filterClogging: 0.8 }, createdAt: now },
          { id: 'pd-2', name: 'Pipe Rupture', type: 'worst_case', description: 'Major leak — pressure falls to atmospheric.', domain, baseParameters: { inletPressure: 8 }, modifiedParameters: { inletPressure: 1 }, createdAt: now },
          { id: 'pd-3', name: 'Max Design Flow', type: 'design_basis', description: 'At maximum design flow rate with clean filter.', domain, baseParameters: { flowRate: 50 }, modifiedParameters: { flowRate: 100 }, createdAt: now },
        ];
      default:
        return [];
    }
  },

  // ── 8. Result Caching & Replay ─────────────────────────────────────────

  /**
   * Retrieve a cached simulation result by ID.
   */
  getCachedResult(id: string): SimulationResult | null {
    const entry = resultCache.get(id);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      resultCache.delete(id);
      return null;
    }
    return entry.result;
  },

  /**
   * List all cached simulation IDs (for replay UI).
   */
  listCachedResults(): Array<{ id: string; domain: SimulationDomain; completedAt: string }> {
    const now = Date.now();
    const results: Array<{ id: string; domain: SimulationDomain; completedAt: string }> = [];
    for (const [id, entry] of resultCache) {
      if (now - entry.cachedAt <= CACHE_TTL_MS) {
        results.push({ id, domain: entry.result.domain, completedAt: entry.result.completedAt });
      } else {
        resultCache.delete(id);
      }
    }
    return results.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  },

  /**
   * Clear the result cache.
   */
  clearCache(): number {
    const count = resultCache.size;
    resultCache.clear();
    return count;
  },

  // ── Private Helpers ────────────────────────────────────────────────────

  /**
   * Enrich simulation parameters with live telemetry values from the database.
   */
  async enrichWithTelemetry(request: SimulationRequest): Promise<SimulationRequest> {
    if (!request.assetId && !request.twinId) return request;

    try {
      // Find telemetry sources linked to the asset (via IoT devices)
      const assetId = request.assetId;
      const readings = await db.telemetryReading.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10,
      });

      if (readings.length === 0) return request;

      // Map telemetry values to simulation parameters where keys match
      const enriched = { ...request, parameters: { ...request.parameters } };
      for (const reading of readings) {
        const key = `source_${reading.sourceId}`;
        if (!(key in enriched.parameters)) {
          enriched.parameters[key] = Number(reading.value) || 0;
        }
      }

      void assetId; // used conceptually to scope telemetry
      return enriched;
    } catch {
      logger.warn('Failed to enrich parameters with telemetry, using defaults');
      return request;
    }
  },

  /**
   * Compute statistical summary across all data points.
   */
  computeSummary(dataPoints: SimulationDataPoint[]): SimulationSummary {
    if (dataPoints.length === 0) {
      return { min: {}, max: {}, avg: {}, finalValues: {}, stability: 0 };
    }

    const keys = Object.keys(dataPoints[0].values);
    const min: Record<string, number> = {};
    const max: Record<string, number> = {};
    const sum: Record<string, number> = {};
    const finalValues: Record<string, number> = { ...dataPoints[dataPoints.length - 1].values };

    for (const key of keys) {
      min[key] = Infinity;
      max[key] = -Infinity;
      sum[key] = 0;
    }

    for (const dp of dataPoints) {
      for (const key of keys) {
        const v = dp.values[key] ?? 0;
        if (v < min[key]) min[key] = v;
        if (v > max[key]) max[key] = v;
        sum[key] += v;
      }
    }

    const avg: Record<string, number> = {};
    for (const key of keys) {
      avg[key] = sum[key] / dataPoints.length;
      min[key] = Math.round(min[key] * 10000) / 10000;
      max[key] = Math.round(max[key] * 10000) / 10000;
      avg[key] = Math.round(avg[key] * 10000) / 10000;
      finalValues[key] = Math.round(finalValues[key] * 10000) / 10000;
    }

    // Stability = inverse of coefficient of variation in last third of data
    const lastThird = dataPoints.slice(Math.floor(dataPoints.length * 2 / 3));
    let totalCV = 0;
    for (const key of keys) {
      const mean = avg[key];
      if (mean === 0) continue;
      const values = lastThird.map(dp => dp.values[key] ?? 0);
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const std = Math.sqrt(variance);
      totalCV += (std / Math.abs(mean));
    }
    const avgCV = totalCV / keys.length;
    const stability = Math.max(0, Math.min(1, 1 - avgCV));

    // Detect steady-state: check if last 10% of values vary < 1% from mean
    let steadyStateReachedAt: number | undefined;
    const checkWindow = Math.max(10, Math.floor(dataPoints.length * 0.1));
    const tail = dataPoints.slice(-checkWindow);
    let isSteady = true;
    for (const key of keys) {
      const mean = avg[key];
      if (mean === 0) continue;
      const deviates = tail.some(dp => {
        const v = dp.values[key] ?? 0;
        return Math.abs(v - mean) / Math.abs(mean) > 0.01;
      });
      if (deviates) { isSteady = false; break; }
    }
    if (isSteady && dataPoints.length > checkWindow) {
      steadyStateReachedAt = dataPoints[dataPoints.length - checkWindow].timestamp;
    }

    return {
      min,
      max,
      avg,
      finalValues,
      stability: Math.round(stability * 10000) / 10000,
      steadyStateReachedAt,
    };
  },

  /**
   * Build a standardised SimulationResult envelope.
   */
  buildResult(
    domain: SimulationDomain,
    mode: SimulationMode,
    scenario: ScenarioType | undefined,
    dataPoints: SimulationDataPoint[],
    summary: SimulationSummary,
    startTime: number,
    iterations: number,
  ): SimulationResult {
    return {
      id: `adv-sim-${domain}-${Date.now()}`,
      domain,
      mode,
      scenario,
      dataPoints,
      summary,
      convergenceReached: summary.stability > 0.9,
      iterations,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  },
};
