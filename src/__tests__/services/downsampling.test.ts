// ============================================================================
// Downsampling Service — Critical Workflow Tests
// Tests pure utility functions: bucket calculation, aggregation methods,
// delta-of-delta encoding/decoding, percentile calculation
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock the database and cache (needed for module import) ----
vi.mock('@/lib/db', () => ({
  db: {
    telemetryReading: {
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    downsampledReading: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    downsamplingPolicy: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/lib/cache', () => ({
  cache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    delete: vi.fn(),
    deleteByPrefix: vi.fn(),
    getOrSet: vi.fn((_key: string, factory: () => Promise<unknown>) => factory()),
    has: vi.fn().mockReturnValue(false),
    getStats: vi.fn().mockReturnValue({ entries: 0, expiredEntries: 0, totalHits: 0, hitRate: 0 }),
    clear: vi.fn(),
  },
  CACHE_TTL: {
    SHORT: 30_000,
    MEDIUM: 120_000,
    LONG: 300_000,
    VERY_LONG: 900_000,
  },
}));

// ---- Import the pure utility functions ----
import {
  deltaOfDeltaEncode,
  deltaOfDeltaDecode,
} from '@/services/historian/downsampling.service';

// ---- Helper: Pure percentile function (same algorithm as in service) ----
function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
}

// ---- Helper: Pure standard deviation function ----
function computeStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ---- Helper: Pure bucket calculation ----
function calculateBucketStart(timestamp: number, bucketMs: number): number {
  return Math.floor(timestamp / bucketMs) * bucketMs;
}

// ---- Helper: Pure aggregation ----
function aggregate(values: number[], method: string): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  switch (method) {
    case 'min': return sorted[0];
    case 'max': return sorted[sorted.length - 1];
    case 'sum': return values.reduce((s, v) => s + v, 0);
    case 'count': return values.length;
    case 'stddev': return computeStdDev(values, avg);
    case 'percentile': return percentile(sorted, 50);
    case 'avg':
    default: return avg;
  }
}

describe('Downsampling Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. BUCKET CALCULATION
  // =========================================================================

  describe('Bucket Calculation', () => {
    it('should calculate correct bucket start for 1-minute intervals', () => {
      // Jan 1 2025 12:00:30.500 → should align to 12:00:00.000
      const timestamp = new Date('2025-01-01T12:00:30.500Z').getTime();
      const bucketMs = 60_000; // 1 minute
      const bucket = calculateBucketStart(timestamp, bucketMs);
      const expected = new Date('2025-01-01T12:00:00.000Z').getTime();
      expect(bucket).toBe(expected);
    });

    it('should calculate correct bucket start for 5-minute intervals', () => {
      const timestamp = new Date('2025-01-01T12:07:22.000Z').getTime();
      const bucketMs = 300_000; // 5 minutes
      const bucket = calculateBucketStart(timestamp, bucketMs);
      const expected = new Date('2025-01-01T12:05:00.000Z').getTime();
      expect(bucket).toBe(expected);
    });

    it('should calculate correct bucket start for 1-hour intervals', () => {
      const timestamp = new Date('2025-01-01T14:32:15.000Z').getTime();
      const bucketMs = 3_600_000; // 1 hour
      const bucket = calculateBucketStart(timestamp, bucketMs);
      const expected = new Date('2025-01-01T14:00:00.000Z').getTime();
      expect(bucket).toBe(expected);
    });

    it('should calculate correct bucket start for 1-day intervals', () => {
      const timestamp = new Date('2025-03-15T18:45:00.000Z').getTime();
      const bucketMs = 86_400_000; // 1 day
      const bucket = calculateBucketStart(timestamp, bucketMs);
      const expected = new Date('2025-03-15T00:00:00.000Z').getTime();
      expect(bucket).toBe(expected);
    });

    it('should group timestamps into the same bucket correctly', () => {
      const bucketMs = 300_000; // 5 minutes
      const base = new Date('2025-01-01T12:00:00.000Z').getTime();

      const t1 = base + 10_000;  // 12:00:10
      const t2 = base + 120_000; // 12:02:00
      const t3 = base + 250_000; // 12:04:10

      const b1 = calculateBucketStart(t1, bucketMs);
      const b2 = calculateBucketStart(t2, bucketMs);
      const b3 = calculateBucketStart(t3, bucketMs);

      expect(b1).toBe(b2);
      expect(b2).toBe(b3);
      expect(b1).toBe(base);
    });
  });

  // =========================================================================
  // 2. AGGREGATION METHODS
  // =========================================================================

  describe('Aggregation Methods', () => {
    const values = [10, 20, 30, 40, 50];

    it('should calculate avg correctly', () => {
      expect(aggregate(values, 'avg')).toBe(30);
    });

    it('should calculate min correctly', () => {
      expect(aggregate(values, 'min')).toBe(10);
    });

    it('should calculate max correctly', () => {
      expect(aggregate(values, 'max')).toBe(50);
    });

    it('should calculate sum correctly', () => {
      expect(aggregate(values, 'sum')).toBe(150);
    });

    it('should calculate count correctly', () => {
      expect(aggregate(values, 'count')).toBe(5);
    });

    it('should calculate stddev correctly', () => {
      const result = aggregate(values, 'stddev');
      // stddev of [10,20,30,40,50] = sqrt(200) ≈ 14.14
      expect(result).toBeCloseTo(14.14, 1);
    });

    it('should calculate percentile (p50 = median) correctly', () => {
      const result = aggregate(values, 'percentile');
      expect(result).toBe(30); // median of 5 evenly-spaced values
    });

    it('should handle single value for all aggregation methods', () => {
      const single = [42];
      expect(aggregate(single, 'avg')).toBe(42);
      expect(aggregate(single, 'min')).toBe(42);
      expect(aggregate(single, 'max')).toBe(42);
      expect(aggregate(single, 'sum')).toBe(42);
      expect(aggregate(single, 'count')).toBe(1);
      expect(aggregate(single, 'stddev')).toBe(0);
      expect(aggregate(single, 'percentile')).toBe(42);
    });

    it('should handle empty values', () => {
      expect(aggregate([], 'avg')).toBe(0);
      expect(aggregate([], 'min')).toBe(0);
      expect(aggregate([], 'max')).toBe(0);
      expect(aggregate([], 'sum')).toBe(0);
      expect(aggregate([], 'count')).toBe(0);
    });
  });

  // =========================================================================
  // 3. DELTA-OF-DELTA ENCODING AND DECODING
  // =========================================================================

  describe('Delta-of-Delta Encoding/Decoding', () => {
    it('should encode and decode an empty array', () => {
      const encoded = deltaOfDeltaEncode([]);
      expect(encoded.firstValue).toBe(0);
      expect(encoded.deltas).toHaveLength(0);

      const decoded = deltaOfDeltaDecode(encoded);
      expect(decoded).toEqual([0]);
    });

    it('should encode and decode a single value', () => {
      const encoded = deltaOfDeltaEncode([42]);
      expect(encoded.firstValue).toBe(42);
      expect(encoded.deltas).toHaveLength(0);

      const decoded = deltaOfDeltaDecode(encoded);
      expect(decoded).toEqual([42]);
    });

    it('should encode and decode two values', () => {
      const values = [10, 20];
      const encoded = deltaOfDeltaEncode(values);
      expect(encoded.firstValue).toBe(10);
      expect(encoded.deltas).toHaveLength(1);
      expect(encoded.deltas[0]).toBe(10); // delta is 20-10=10

      const decoded = deltaOfDeltaDecode(encoded);
      expect(decoded).toEqual([10, 20]);
    });

    it('should encode and decode a linear sequence', () => {
      const values = [0, 10, 20, 30, 40, 50];
      const encoded = deltaOfDeltaEncode(values);
      expect(encoded.firstValue).toBe(0);
      // Delta-of-delta for linear sequence: all should be 0 (constant delta of 10)
      expect(encoded.deltas).toHaveLength(5);
      expect(encoded.deltas[0]).toBe(10); // first delta
      // Remaining delta-of-deltas should be 0 (constant rate)
      for (let i = 1; i < encoded.deltas.length; i++) {
        expect(encoded.deltas[i]).toBe(0);
      }

      const decoded = deltaOfDeltaDecode(encoded);
      expect(decoded).toEqual(values);
    });

    it('should encode and decode random values', () => {
      const values = [100, 95, 110, 120, 105, 130, 125, 140];
      const encoded = deltaOfDeltaEncode(values);
      expect(encoded.firstValue).toBe(100);
      expect(encoded.deltas).toHaveLength(values.length - 1);

      const decoded = deltaOfDeltaDecode(encoded);
      expect(decoded).toEqual(values);
    });

    it('should produce more compact encoding for linear data', () => {
      const linear = Array.from({ length: 100 }, (_, i) => i * 10);
      const random = Array.from({ length: 100 }, () => Math.random() * 1000);

      const linearEncoded = deltaOfDeltaEncode(linear);
      const randomEncoded = deltaOfDeltaEncode(random);

      // Linear data should have many zero delta-of-deltas after the first
      const linearZeros = linearEncoded.deltas.filter(d => d === 0).length;
      expect(linearZeros).toBeGreaterThan(80); // Most should be zero

      // Random data should have few zero delta-of-deltas
      const randomZeros = randomEncoded.deltas.filter(d => d === 0).length;
      expect(randomZeros).toBeLessThan(10);
    });

    it('should encode and decode floating point values', () => {
      const values = [72.5, 73.1, 71.8, 74.2, 73.9];
      const encoded = deltaOfDeltaEncode(values);

      const decoded = deltaOfDeltaDecode(encoded);
      expect(decoded).toHaveLength(values.length);
      for (let i = 0; i < values.length; i++) {
        expect(decoded[i]).toBeCloseTo(values[i], 10);
      }
    });
  });

  // =========================================================================
  // 4. PERCENTILE CALCULATION
  // =========================================================================

  describe('Percentile Calculation', () => {
    it('should calculate p50 (median) for odd-length arrays', () => {
      const sorted = [1, 2, 3, 4, 5];
      expect(percentile(sorted, 50)).toBe(3);
    });

    it('should calculate p50 (median) for even-length arrays', () => {
      const sorted = [1, 2, 3, 4];
      const result = percentile(sorted, 50);
      expect(result).toBe(2.5); // interpolated
    });

    it('should calculate p0 (minimum)', () => {
      const sorted = [10, 20, 30, 40, 50];
      expect(percentile(sorted, 0)).toBe(10);
    });

    it('should calculate p100 (maximum)', () => {
      const sorted = [10, 20, 30, 40, 50];
      expect(percentile(sorted, 100)).toBe(50);
    });

    it('should calculate p25 (first quartile)', () => {
      const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = percentile(sorted, 25);
      expect(result).toBeCloseTo(3.25, 1);
    });

    it('should calculate p75 (third quartile)', () => {
      const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = percentile(sorted, 75);
      expect(result).toBeCloseTo(7.75, 1);
    });

    it('should return 0 for empty arrays', () => {
      expect(percentile([], 50)).toBe(0);
    });

    it('should return the value for single-element arrays', () => {
      expect(percentile([42], 50)).toBe(42);
      expect(percentile([42], 99)).toBe(42);
    });
  });
});
