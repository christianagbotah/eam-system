// ============================================================================
// SIMULATION ENGINE — Industrial process simulation framework
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('simulationEngine');

export interface SimulationConfig {
  type: 'flow' | 'thermal' | 'energy' | 'process';
  sourceId: string;
  parameters: Record<string, number>;
  duration: number; // seconds
  timeStep: number; // seconds
}

export interface SimulationResult {
  id: string;
  config: SimulationConfig;
  dataPoints: SimulationDataPoint[];
  summary: SimulationSummary;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface SimulationDataPoint {
  timestamp: number;
  values: Record<string, number>;
}

export interface SimulationSummary {
  min: Record<string, number>;
  max: Record<string, number>;
  avg: Record<string, number>;
  finalValues: Record<string, number>;
  stability: number; // 0-1
}

// Pre-built simulation models
export class SimulationEngine {
  /**
   * Run a flow simulation (simplified hydraulic model)
   */
  static async runFlowSimulation(sourceId: string, duration = 60, timeStep = 1): Promise<SimulationResult> {
    const startTime = Date.now();
    const config: SimulationConfig = {
      type: 'flow',
      sourceId,
      parameters: { flowRate: 100, pressure: 4, temperature: 25 },
      duration,
      timeStep,
    };

    // Get recent telemetry data for initial conditions
    let initialPressure = 4.0;
    let initialFlow = 100;
    let initialTemp = 25;

    try {
      const readings = await db.telemetryReading.findMany({
        where: { sourceId },
        orderBy: { timestamp: 'desc' },
        take: 5,
      });
      if (readings.length > 0) {
        initialPressure = Number(readings[0].value) || 4.0;
      }
    } catch { /* use defaults */ }

    const dataPoints: SimulationDataPoint[] = [];
    const steps = Math.floor(duration / timeStep);

    for (let i = 0; i < steps; i++) {
      const t = i * timeStep;
      const noise = (Math.random() - 0.5) * 0.1;

      // Simulate pressure decay with oscillation
      const pressure = initialPressure * (0.98 + 0.02 * Math.cos(t * 0.1)) + noise;
      const flow = initialFlow * (0.95 + 0.05 * Math.sin(t * 0.05)) + noise * 10;
      const temp = initialTemp + 2 * Math.sin(t * 0.02) + noise;

      dataPoints.push({
        timestamp: t,
        values: { pressure: Math.round(pressure * 100) / 100, flowRate: Math.round(flow * 10) / 10, temperature: Math.round(temp * 10) / 10 },
      });
    }

    const summary = this.calculateSummary(dataPoints);

    return {
      id: `sim-flow-${Date.now()}`,
      config,
      dataPoints,
      summary,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Run a thermal simulation
   */
  static async runThermalSimulation(sourceId: string, duration = 60, timeStep = 1): Promise<SimulationResult> {
    const startTime = Date.now();
    const config: SimulationConfig = {
      type: 'thermal',
      sourceId,
      parameters: { ambientTemp: 25, heatSource: 80, coolingRate: 0.1 },
      duration,
      timeStep,
    };

    const dataPoints: SimulationDataPoint[] = [];
    const steps = Math.floor(duration / timeStep);

    for (let i = 0; i < steps; i++) {
      const t = i * timeStep;
      const noise = (Math.random() - 0.5) * 0.5;

      // Newton's law of cooling with heat source
      const ambientTemp = config.parameters.ambientTemp;
      const heatSource = config.parameters.heatSource;
      const coolingRate = config.parameters.coolingRate;
      const surfaceTemp = ambientTemp + (heatSource - ambientTemp) * (1 - Math.exp(-coolingRate * t)) + noise;

      dataPoints.push({
        timestamp: t,
        values: {
          surfaceTemperature: Math.round(surfaceTemp * 10) / 10,
          ambientTemperature: ambientTemp + noise * 0.3,
          heatFlux: Math.round((heatSource - surfaceTemp) * 10) / 10,
        },
      });
    }

    const summary = this.calculateSummary(dataPoints);

    return {
      id: `sim-thermal-${Date.now()}`,
      config,
      dataPoints,
      summary,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Run an energy flow simulation
   */
  static async runEnergySimulation(sourceId: string, duration = 60, timeStep = 1): Promise<SimulationResult> {
    const startTime = Date.now();
    const config: SimulationConfig = {
      type: 'energy',
      sourceId,
      parameters: { powerRating: 150, loadFactor: 0.75, efficiency: 0.92 },
      duration,
      timeStep,
    };

    const dataPoints: SimulationDataPoint[] = [];
    const steps = Math.floor(duration / timeStep);

    for (let i = 0; i < steps; i++) {
      const t = i * timeStep;
      const noise = (Math.random() - 0.5) * 0.02;

      // Varying load pattern
      const loadFactor = config.parameters.loadFactor + 0.15 * Math.sin(t * 0.1) + 0.05 * Math.sin(t * 0.3) + noise;
      const inputPower = config.parameters.powerRating * Math.max(0.1, Math.min(1, loadFactor));
      const outputPower = inputPower * config.parameters.efficiency;
      const losses = inputPower - outputPower;

      dataPoints.push({
        timestamp: t,
        values: {
          inputPower: Math.round(inputPower * 10) / 10,
          outputPower: Math.round(outputPower * 10) / 10,
          losses: Math.round(losses * 10) / 10,
          efficiency: Math.round((outputPower / inputPower) * 1000) / 10,
          loadFactor: Math.round(Math.max(0.1, Math.min(1, loadFactor)) * 100) / 100,
        },
      });
    }

    const summary = this.calculateSummary(dataPoints);

    return {
      id: `sim-energy-${Date.now()}`,
      config,
      dataPoints,
      summary,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Calculate simulation summary statistics
   */
  private static calculateSummary(dataPoints: SimulationDataPoint[]): SimulationSummary {
    if (dataPoints.length === 0) {
      return { min: {}, max: {}, avg: {}, finalValues: {}, stability: 0 };
    }

    const keys = Object.keys(dataPoints[0].values);
    const min: Record<string, number> = {};
    const max: Record<string, number> = {};
    const avg: Record<string, number> = {};
    const finalValues: Record<string, number> = { ...dataPoints[dataPoints.length - 1].values };

    for (const key of keys) {
      const values = dataPoints.map(dp => dp.values[key]).filter(v => v !== undefined);
      min[key] = Math.min(...values);
      max[key] = Math.max(...values);
      avg[key] = values.reduce((s, v) => s + v, 0) / values.length;
    }

    // Calculate stability (inverse of variance)
    const lastThird = dataPoints.slice(Math.floor(dataPoints.length * 2 / 3));
    let totalVariance = 0;
    for (const key of keys) {
      const mean = avg[key];
      const values = lastThird.map(dp => dp.values[key]);
      const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
      totalVariance += variance;
    }
    const avgVariance = totalVariance / keys.length;
    const stability = Math.max(0, Math.min(1, 1 - avgVariance / 10));

    return { min, max, avg, finalValues, stability: Math.round(stability * 100) / 100 };
  }
}
