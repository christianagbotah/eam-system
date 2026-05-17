// ============================================================================
// CAMERA SYSTEM SERVICE — View bookmarks and inspection tours for 3D scenes
// ============================================================================

import { BaseRepository } from '@/repositories/BaseRepository';
import { createLogger } from '@/lib/logger';
import { NotFoundError } from '@/lib/errors';

const log = createLogger('CameraSystemService');

// Repositories
const bookmarkRepo = new BaseRepository('assetViewBookmark');
const tourRepo = new BaseRepository('inspectionTour');
const sceneRepo = new BaseRepository('digitalTwinScene');
const twinRepo = new BaseRepository('digitalTwin');

export const cameraSystemService = {
  // ── View Bookmarks ────────────────────────────────────────────────────────

  /**
   * List all saved camera view bookmarks for a scene.
   */
  async listBookmarks(sceneId: string) {
    const timer = log.timer('listBookmarks');

    const bookmarks = await bookmarkRepo.findMany({
      where: { sceneId },
      include: { createdBy: { select: { id: true, name: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    timer.end();
    return bookmarks;
  },

  /**
   * Create a new camera view bookmark with position, target, and optional
   * visibility / section-plane state for full scene restoration.
   */
  async createBookmark(data: {
    sceneId: string;
    name: string;
    description?: string;
    cameraPosition: { x: number; y: number; z: number };
    cameraTarget: { x: number; y: number; z: number };
    cameraUp?: { x: number; y: number; z: number };
    cameraFov?: number;
    isOrthographic?: boolean;
    zoomLevel?: number;
    hiddenMeshes?: string[];
    highlightedMeshes?: string[];
    sectionPlane?: { normal: [number, number, number]; constant: number };
    createdById: string;
  }) {
    const timer = log.timer('createBookmark');

    await sceneRepo.findByIdOrFail(data.sceneId);

    const bookmark = await bookmarkRepo.create({
      sceneId: data.sceneId,
      name: data.name,
      description: data.description || null,
      cameraPosition: JSON.stringify(data.cameraPosition),
      cameraTarget: JSON.stringify(data.cameraTarget),
      cameraUp: data.cameraUp ? JSON.stringify(data.cameraUp) : null,
      cameraFov: data.cameraFov || 50,
      isOrthographic: data.isOrthographic || false,
      zoomLevel: data.zoomLevel || null,
      hiddenMeshes: data.hiddenMeshes ? JSON.stringify(data.hiddenMeshes) : null,
      highlightedMeshes: data.highlightedMeshes ? JSON.stringify(data.highlightedMeshes) : null,
      sectionPlane: data.sectionPlane ? JSON.stringify(data.sectionPlane) : null,
      createdById: data.createdById,
    } as Record<string, unknown>);

    log.info('View bookmark created', {
      bookmarkId: (bookmark as unknown as { id: string }).id,
      sceneId: data.sceneId,
    });

    timer.end();
    return bookmark;
  },

  /**
   * Delete a view bookmark by ID.
   */
  async deleteBookmark(id: string) {
    const timer = log.timer('deleteBookmark');

    await bookmarkRepo.findByIdOrFail(id);
    await bookmarkRepo.delete(id);

    log.info('View bookmark deleted', { bookmarkId: id });
    timer.end();
  },

  // ── Inspection Tours ──────────────────────────────────────────────────────

  /**
   * List all inspection tours for a digital twin, ordered by sort position.
   */
  async listTours(twinId: string) {
    const timer = log.timer('listTours');

    const tours = await tourRepo.findMany({
      where: { twinId },
      include: { createdBy: { select: { id: true, name: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    timer.end();
    return tours;
  },

  /**
   * Create an inspection tour with one or more camera steps.
   * Estimated duration is auto-calculated from step durations (default 3s each).
   */
  async createTour(data: {
    twinId: string;
    name: string;
    description?: string;
    steps: Array<{
      name: string;
      cameraPosition: { x: number; y: number; z: number };
      cameraTarget: { x: number; y: number; z: number };
      cameraFov?: number;
      duration?: number;
      narration?: string;
    }>;
    difficulty?: string;
    isPublished?: boolean;
    createdById: string;
  }) {
    const timer = log.timer('createTour');

    await twinRepo.findByIdOrFail(data.twinId);

    // Auto-calculate total estimated time from step durations
    const estimatedTime = data.steps.reduce((sum, s) => sum + (s.duration || 3), 0);

    const tour = await tourRepo.create({
      twinId: data.twinId,
      name: data.name,
      description: data.description || null,
      steps: JSON.stringify(data.steps),
      estimatedTime,
      difficulty: data.difficulty || 'basic',
      isPublished: data.isPublished || false,
      createdById: data.createdById,
    } as Record<string, unknown>);

    log.info('Inspection tour created', {
      tourId: (tour as unknown as { id: string }).id,
      twinId: data.twinId,
      steps: data.steps.length,
      estimatedTime,
    });

    timer.end();
    return tour;
  },

  /**
   * Update an existing inspection tour. If steps change, the estimated
   * time is recalculated automatically.
   */
  async updateTour(
    id: string,
    data: {
      name?: string;
      description?: string;
      steps?: Array<{
        name: string;
        cameraPosition: { x: number; y: number; z: number };
        cameraTarget: { x: number; y: number; z: number };
        cameraFov?: number;
        duration?: number;
        narration?: string;
      }>;
      difficulty?: string;
      isPublished?: boolean;
      sortOrder?: number;
    }
  ) {
    const timer = log.timer('updateTour');

    const updateData: Record<string, unknown> = { ...data };

    if (data.steps) {
      updateData.steps = JSON.stringify(data.steps);
      updateData.estimatedTime = data.steps.reduce((sum, s) => sum + (s.duration || 3), 0);
    }

    const tour = await tourRepo.update(id, updateData);

    log.info('Inspection tour updated', { tourId: id });
    timer.end();
    return tour;
  },

  /**
   * Delete an inspection tour by ID.
   */
  async deleteTour(id: string) {
    const timer = log.timer('deleteTour');

    await tourRepo.findByIdOrFail(id);
    await tourRepo.delete(id);

    log.info('Inspection tour deleted', { tourId: id });
    timer.end();
  },
};
