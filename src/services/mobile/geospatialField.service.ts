// ============================================================================
// GEOSPATIAL FIELD SERVICE — Advanced geofencing, indoor positioning,
// route optimization, proximity detection for field workforce
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('geospatialField');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoCoordinate {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  timestamp?: string;
}

export interface GeofenceDefinition {
  id: string;
  name: string;
  zoneType: 'radius' | 'polygon';
  coordinates: {
    center?: GeoCoordinate;
    radius?: number;             // meters (for radius type)
    points?: GeoCoordinate[];    // vertices (for polygon type)
  };
  alertOnEnter: boolean;
  alertOnExit: boolean;
  requiresPermit: boolean;
  hazardLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface GeofenceCheckResult {
  inside: boolean;
  zoneId?: string;
  zoneName?: string;
  distance?: number;            // meters to nearest boundary
  zoneType?: string;
  hazardLevel?: string;
  requiresPermit?: boolean;
}

export interface BLEBeacon {
  id: string;
  uuid: string;
  major: number;
  minor: number;
  name: string;
  location: GeoCoordinate;
  floor?: number;
  area?: string;
  associatedAssetId?: string;
  rssiAtOneMeter: number;
  batteryLevel?: number;
  lastSeen?: string;
}

export interface IndoorPosition {
  beaconId?: string;
  area: string;
  floor: number;
  coordinates: GeoCoordinate;
  accuracy: number;
  method: 'ble_trilateration' | 'wifi_fingerprint' | 'beacon_proximity';
  timestamp: string;
}

export interface RouteWaypoint {
  id: string;
  assetId: string;
  assetName: string;
  coordinates: GeoCoordinate;
  sequence: number;
  estimatedDuration: number;    // minutes
  workOrderId?: string;
  priority: string;
}

export interface OptimizedRoute {
  waypoints: RouteWaypoint[];
  totalDistance: number;        // meters
  totalDuration: number;        // minutes (travel + work)
  travelDuration: number;       // minutes (travel only)
  savingsPercentage: number;
  optimizationMethod: string;
}

export interface GPSTrackPoint {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  altitude?: number;
  timestamp: string;
  batteryLevel?: number;
}

export interface LocationSafetyAlert {
  id: string;
  type: 'geofence_breach' | 'restricted_area' | 'emergency_zone' | 'lone_worker' | 'no_movement';
  severity: 'info' | 'warning' | 'danger';
  message: string;
  zoneId?: string;
  zoneName?: string;
  coordinates: GeoCoordinate;
  timestamp: string;
  acknowledged: boolean;
}

export interface DistanceETAResult {
  from: GeoCoordinate;
  to: GeoCoordinate;
  distanceMeters: number;
  distanceKm: number;
  walkingDurationMinutes: number;
  drivingDurationMinutes: number;
  bearingDegrees: number;
  bearingDirection: string;
}

// ---------------------------------------------------------------------------
// GeospatialFieldService
// ---------------------------------------------------------------------------

export class GeospatialFieldService {

  // =========================================================================
  // ADVANCED GEOFENCING
  // =========================================================================

  /**
   * Check if a point is inside a geofence zone.
   */
  static checkGeofence(
    point: GeoCoordinate,
    zone: GeofenceDefinition
  ): GeofenceCheckResult {
    if (zone.zoneType === 'radius' && zone.coordinates.center && zone.coordinates.radius) {
      const distance = GeospatialFieldService.haversineDistance(
        point.lat, point.lng,
        zone.coordinates.center.lat, zone.coordinates.center.lng
      );
      const inside = distance <= zone.coordinates.radius;

      return {
        inside,
        zoneId: zone.id,
        zoneName: zone.name,
        distance: Math.round(distance - zone.coordinates.radius),
        zoneType: 'radius',
        hazardLevel: zone.hazardLevel,
        requiresPermit: zone.requiresPermit,
      };
    }

    if (zone.zoneType === 'polygon' && zone.coordinates.points && zone.coordinates.points.length >= 3) {
      const inside = GeospatialFieldService.pointInPolygon(point, zone.coordinates.points);
      const distance = inside ? 0 : GeospatialFieldService.distanceToPolygon(point, zone.coordinates.points);

      return {
        inside,
        zoneId: zone.id,
        zoneName: zone.name,
        distance: Math.round(distance),
        zoneType: 'polygon',
        hazardLevel: zone.hazardLevel,
        requiresPermit: zone.requiresPermit,
      };
    }

    return { inside: false };
  }

  /**
   * Check a point against all active geofence zones.
   */
  static async checkAllGeofences(point: GeoCoordinate): Promise<GeofenceCheckResult[]> {
    try {
      const zones = await db.geofenceZone.findMany({
        where: { isActive: true },
        select: { id: true, name: true, zoneType: true, coordinates: true, alertOnEnter: true, alertOnExit: true, requiresPermit: true, hazardLevel: true },
      });

      const results: GeofenceCheckResult[] = [];

      for (const zone of zones) {
        try {
          const coords = zone.coordinates as unknown as {
            center?: { lat: number; lng: number };
            radius?: number;
            points?: { lat: number; lng: number }[];
          };

          const definition: GeofenceDefinition = {
            id: zone.id,
            name: zone.name,
            zoneType: zone.zoneType as 'radius' | 'polygon',
            coordinates: coords,
            alertOnEnter: zone.alertOnEnter,
            alertOnExit: zone.alertOnExit,
            requiresPermit: zone.requiresPermit,
            hazardLevel: (zone.hazardLevel || 'low') as 'low' | 'medium' | 'high' | 'critical',
          };

          const result = GeospatialFieldService.checkGeofence(point, definition);
          if (result.inside || (result.distance !== undefined && Math.abs(result.distance) < 100)) {
            results.push(result);
          }
        } catch {
          // Skip malformed zones
        }
      }

      return results;
    } catch (err) {
      logger.error('Failed to check geofences', { error: (err as Error).message });
      return [];
    }
  }

  // =========================================================================
  // INDOOR POSITIONING (BLE BEACONS)
  // =========================================================================

  /**
   * Estimate indoor position from BLE beacon readings using proximity method.
   * Returns the best estimate based on strongest beacon RSSI.
   */
  static estimateIndoorPosition(
    beaconReadings: Array<{ uuid: string; major: number; minor: number; rssi: number }>,
    knownBeacons: BLEBeacon[]
  ): IndoorPosition | null {
    if (beaconReadings.length === 0) return null;

    // Find the closest beacon (highest RSSI)
    let closestBeacon: BLEBeacon | null = null;
    let closestRssi = -Infinity;

    for (const reading of beaconReadings) {
      const beacon = knownBeacons.find(
        b => b.uuid === reading.uuid && b.major === reading.major && b.minor === reading.minor
      );
      if (beacon && reading.rssi > closestRssi) {
        closestRssi = reading.rssi;
        closestBeacon = beacon;
      }
    }

    if (!closestBeacon) return null;

    // Estimate distance from RSSI using path loss model
    const distanceMeters = GeospatialFieldService.rssiToDistance(closestRssi, closestBeacon.rssiAtOneMeter);

    return {
      beaconId: closestBeacon.id,
      area: closestBeacon.area || 'Unknown Area',
      floor: closestBeacon.floor || 1,
      coordinates: closestBeacon.location,
      accuracy: distanceMeters,
      method: 'beacon_proximity',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Convert RSSI to estimated distance in meters.
   */
  static rssiToDistance(rssi: number, rssiAtOneMeter: number): number {
    const n = 2.5; // Path loss exponent (typical indoor: 2-3)
    return Math.pow(10, (rssiAtOneMeter - rssi) / (10 * n));
  }

  // =========================================================================
  // ASSET PROXIMITY DETECTION
  // =========================================================================

  /**
   * Find assets within a given radius of a location.
   */
  static async findNearbyAssets(
    point: GeoCoordinate,
    radiusMeters: number = 100,
    limit: number = 20
  ): Promise<Array<{ asset: { id: string; name: string; assetTag: string; status: string; criticality: string }; distance: number }>> {
    try {
      const assets = await db.asset.findMany({
        where: { isActive: true },
        take: 500,
        select: { id: true, name: true, assetTag: true, status: true, criticality: true, location: true },
      });

      const nearby: Array<{ asset: typeof assets[0]; distance: number }> = [];

      for (const asset of assets) {
        if (!asset.location) continue;

        const coords = GeospatialFieldService.parseLocation(asset.location);
        if (!coords) continue;

        const distance = GeospatialFieldService.haversineDistance(point.lat, point.lng, coords.lat, coords.lng);

        if (distance <= radiusMeters) {
          nearby.push({ asset, distance: Math.round(distance) });
        }
      }

      nearby.sort((a, b) => a.distance - b.distance);
      return nearby.slice(0, limit).map(n => ({
        asset: { id: n.asset.id, name: n.asset.name, assetTag: n.asset.assetTag, status: n.asset.status, criticality: n.asset.criticality },
        distance: n.distance,
      }));
    } catch (err) {
      logger.error('Failed to find nearby assets', { error: (err as Error).message });
      return [];
    }
  }

  // =========================================================================
  // ROUTE OPTIMIZATION
  // =========================================================================

  /**
   * Optimize a multi-stop work tour route using nearest-neighbor heuristic.
   */
  static async optimizeRoute(
    startPoint: GeoCoordinate,
    workOrderIds: string[]
  ): Promise<OptimizedRoute> {
    const timer = logger.timer('optimizeRoute');

    try {
      // Get work order locations
      const workOrders = await db.workOrder.findMany({
        where: { id: { in: workOrderIds } },
        select: { id: true, title: true, assetId: true, estimatedHours: true, priority: true },
      });

      const waypoints: RouteWaypoint[] = [];

      for (const wo of workOrders) {
        let coords: GeoCoordinate | null = null;
        if (wo.assetId) {
          const asset = await db.asset.findUnique({
            where: { id: wo.assetId },
            select: { id: true, name: true, location: true },
          });
          if (asset?.location) {
            coords = GeospatialFieldService.parseLocation(asset.location);
          }
        }

        waypoints.push({
          id: `wp-${wo.id}`,
          assetId: wo.assetId || '',
          assetName: wo.title,
          coordinates: coords || startPoint, // Fallback to start if no location
          sequence: 0,
          estimatedDuration: Math.round((wo.estimatedHours || 0.5) * 60),
          workOrderId: wo.id,
          priority: wo.priority,
        });
      }

      if (waypoints.length === 0) {
        return { waypoints: [], totalDistance: 0, totalDuration: 0, travelDuration: 0, savingsPercentage: 0, optimizationMethod: 'none' };
      }

      // Nearest-neighbor TSP heuristic
      const optimized = GeospatialFieldService.nearestNeighborTSP(startPoint, waypoints);

      // Calculate totals
      let totalDistance = 0;
      let totalTravelTime = 0;
      let prevPoint = startPoint;

      for (const wp of optimized) {
        const dist = GeospatialFieldService.haversineDistance(prevPoint.lat, prevPoint.lng, wp.coordinates.lat, wp.coordinates.lng);
        totalDistance += dist;
        totalTravelTime += dist / 80; // ~80m/min walking speed
        prevPoint = wp.coordinates;
      }

      // Return to start
      const returnDist = GeospatialFieldService.haversineDistance(prevPoint.lat, prevPoint.lng, startPoint.lat, startPoint.lng);
      totalDistance += returnDist;
      totalTravelTime += returnDist / 80;

      const totalWorkTime = optimized.reduce((sum, wp) => sum + wp.estimatedDuration, 0);

      // Estimate savings vs unoptimized (random order)
      const unoptimizedDist = waypoints.length * 500; // Average 500m between stops
      const savingsPercentage = unoptimizedDist > 0 ? Math.round(((unoptimizedDist - totalDistance) / unoptimizedDist) * 100) : 0;

      logger.info('Route optimized', { waypoints: optimized.length, totalDistance: Math.round(totalDistance), savings: savingsPercentage });
      timer.end();

      return {
        waypoints: optimized,
        totalDistance: Math.round(totalDistance),
        totalDuration: Math.round(totalWorkTime + totalTravelTime),
        travelDuration: Math.round(totalTravelTime),
        savingsPercentage: Math.max(savingsPercentage, 0),
        optimizationMethod: 'nearest_neighbor',
      };
    } catch (err) {
      logger.error('Failed to optimize route', { error: (err as Error).message });
      timer.end();
      return { waypoints: [], totalDistance: 0, totalDuration: 0, travelDuration: 0, savingsPercentage: 0, optimizationMethod: 'error' };
    }
  }

  /**
   * Nearest-neighbor TSP heuristic — visit closest unvisited waypoint.
   */
  private static nearestNeighborTSP(start: GeoCoordinate, waypoints: RouteWaypoint[]): RouteWaypoint[] {
    const remaining = [...waypoints];
    const ordered: RouteWaypoint[] = [];
    let current = start;
    let sequence = 1;

    // Sort by priority first (critical → high → medium → low)
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    remaining.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = GeospatialFieldService.haversineDistance(
          current.lat, current.lng,
          remaining[i].coordinates.lat, remaining[i].coordinates.lng
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const wp = remaining.splice(nearestIdx, 1)[0];
      wp.sequence = sequence++;
      ordered.push(wp);
      current = wp.coordinates;
    }

    return ordered;
  }

  // =========================================================================
  // GPS TRACK RECORDING
  // =========================================================================

  /**
   * Process GPS track points for workforce tracking.
   * Returns summary statistics.
   */
  static processGpsTrack(trackPoints: GPSTrackPoint[]): {
    totalDistance: number;
    totalDuration: number;
    averageSpeed: number;
    maxSpeed: number;
    startTime: string;
    endTime: string;
    pointCount: number;
  } {
    if (trackPoints.length < 2) {
      return {
        totalDistance: 0,
        totalDuration: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        startTime: trackPoints[0]?.timestamp || new Date().toISOString(),
        endTime: trackPoints[0]?.timestamp || new Date().toISOString(),
        pointCount: trackPoints.length,
      };
    }

    // Sort by timestamp
    const sorted = [...trackPoints].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let totalDistance = 0;
    let maxSpeed = 0;
    let speedSum = 0;

    for (let i = 1; i < sorted.length; i++) {
      const dist = GeospatialFieldService.haversineDistance(
        sorted[i - 1].lat, sorted[i - 1].lng,
        sorted[i].lat, sorted[i].lng
      );
      totalDistance += dist;
      maxSpeed = Math.max(maxSpeed, sorted[i].speed);
      speedSum += sorted[i].speed;
    }

    const startTime = new Date(sorted[0].timestamp).getTime();
    const endTime = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const totalDuration = (endTime - startTime) / 1000; // seconds

    return {
      totalDistance: Math.round(totalDistance),
      totalDuration: Math.round(totalDuration),
      averageSpeed: totalDuration > 0 ? Math.round((totalDistance / totalDuration) * 3.6 * 10) / 10 : 0, // km/h
      maxSpeed: Math.round(maxSpeed * 3.6 * 10) / 10, // km/h
      startTime: sorted[0].timestamp,
      endTime: sorted[sorted.length - 1].timestamp,
      pointCount: sorted.length,
    };
  }

  // =========================================================================
  // LOCATION-BASED SAFETY ALERTS
  // =========================================================================

  /**
   * Generate safety alerts based on location context.
   */
  static async checkLocationSafety(point: GeoCoordinate, userId: string): Promise<LocationSafetyAlert[]> {
    const alerts: LocationSafetyAlert[] = [];

    // Check geofence zones
    const geofenceResults = await GeospatialFieldService.checkAllGeofences(point);

    for (const result of geofenceResults) {
      if (result.inside && result.hazardLevel && result.hazardLevel !== 'low') {
        alerts.push({
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
          type: result.requiresPermit ? 'restricted_area' : 'geofence_breach',
          severity: result.hazardLevel === 'critical' || result.hazardLevel === 'high' ? 'danger' : 'warning',
          message: `Entered ${result.zoneName} (${result.hazardLevel} hazard)${result.requiresPermit ? '. Permit required!' : ''}`,
          zoneId: result.zoneId,
          zoneName: result.zoneName,
          coordinates: point,
          timestamp: new Date().toISOString(),
          acknowledged: false,
        });
      }
    }

    // Check for nearby critical assets that may pose hazards
    const nearbyAssets = await GeospatialFieldService.findNearbyAssets(point, 50, 5);
    for (const na of nearbyAssets) {
      if (na.asset.criticality === 'critical' && na.distance < 20) {
        alerts.push({
          id: `alert-asset-${Date.now()}`,
          type: 'geofence_breach',
          severity: 'warning',
          message: `Very close to critical asset: ${na.asset.name} (${na.distance}m)`,
          coordinates: point,
          timestamp: new Date().toISOString(),
          acknowledged: false,
        });
      }
    }

    if (alerts.length > 0) {
      logger.warn('Location safety alerts generated', { userId, alertCount: alerts.length });
    }

    return alerts;
  }

  // =========================================================================
  // DISTANCE & ETA CALCULATIONS
  // =========================================================================

  /**
   * Calculate distance and ETA between two points.
   */
  static calculateDistanceETA(from: GeoCoordinate, to: GeoCoordinate): DistanceETAResult {
    const distanceMeters = GeospatialFieldService.haversineDistance(from.lat, from.lng, to.lat, to.lng);
    const distanceKm = distanceMeters / 1000;
    const bearing = GeospatialFieldService.calculateBearing(from.lat, from.lng, to.lat, to.lng);
    const bearingDirection = GeospatialFieldService.bearingToDirection(bearing);

    return {
      from,
      to,
      distanceMeters: Math.round(distanceMeters),
      distanceKm: Math.round(distanceKm * 100) / 100,
      walkingDurationMinutes: Math.round(distanceMeters / 80), // ~80m/min
      drivingDurationMinutes: Math.round(distanceKm / 30 * 60), // ~30 km/h avg plant speed
      bearingDegrees: Math.round(bearing),
      bearingDirection,
    };
  }

  // =========================================================================
  // GEOMETRY UTILITIES
  // =========================================================================

  /**
   * Haversine distance between two lat/lng points in meters.
   */
  static haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing between two points in degrees.
   */
  static calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
      Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  /**
   * Convert bearing degrees to compass direction.
   */
  static bearingToDirection(bearing: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm.
   */
  static pointInPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;

      if (((yi > point.lng) !== (yj > point.lng)) &&
        (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Approximate distance from a point to a polygon boundary.
   */
  static distanceToPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): number {
    let minDist = Infinity;

    for (let i = 0; i < polygon.length; i++) {
      const next = (i + 1) % polygon.length;
      const dist = GeospatialFieldService.distanceToLineSegment(
        point, polygon[i], polygon[next]
      );
      minDist = Math.min(minDist, dist);
    }

    return minDist;
  }

  /**
   * Distance from a point to a line segment.
   */
  private static distanceToLineSegment(
    point: GeoCoordinate,
    segStart: GeoCoordinate,
    segEnd: GeoCoordinate
  ): number {
    const dx = segEnd.lat - segStart.lat;
    const dy = segEnd.lng - segStart.lng;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return GeospatialFieldService.haversineDistance(point.lat, point.lng, segStart.lat, segStart.lng);
    }

    let t = ((point.lat - segStart.lat) * dx + (point.lng - segStart.lng) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projLat = segStart.lat + t * dx;
    const projLng = segStart.lng + t * dy;

    return GeospatialFieldService.haversineDistance(point.lat, point.lng, projLat, projLng);
  }

  /**
   * Parse a location string (lat,lng or lat, lng) into coordinates.
   */
  static parseLocation(location: string): GeoCoordinate | null {
    if (!location) return null;
    const parts = location.split(',').map(s => parseFloat(s.trim()));
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return { lat: parts[0], lng: parts[1] };
  }
}
