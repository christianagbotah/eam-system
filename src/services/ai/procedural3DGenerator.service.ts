// ============================================================================
// PROCEDURAL 3D MODEL GENERATOR SERVICE
// ============================================================================
// Generates 3D models from machine names using a FREE two-step pipeline:
//   1. LLM generates a structured JSON geometry specification describing the
//      machine's 3D structure using primitives (box, cylinder, sphere, cone, torus).
//   2. Three.js (server-side Node.js) builds the scene from the spec and exports
//      it to GLB binary via GLTFExporter.
//
// This replaces the paid Meshy.ai API with a zero-cost alternative that works
// with the already-configured LLM (Z.ai SDK / z-ai-web-dev-sdk).
//
// Output:  GLB file saved to public/uploads/models/{assetId}.glb
//          AssetModel + DigitalTwinScene database records created.
// ============================================================================

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai:procedural3DGenerator');

// ============================================================================
// TYPES — LLM Geometry Specification
// ============================================================================

/** Material definition for a 3D part */
export interface GeometryMaterial {
  color: string;       // Hex color string, e.g. "#A8A8A8"
  metalness?: number;  // 0.0 - 1.0
  roughness?: number;  // 0.0 - 1.0
}

/** Geometry parameters — varies by geometry type */
export interface GeometryParams {
  // Box
  width?: number;
  height?: number;
  depth?: number;
  // Cylinder
  radiusTop?: number;
  radiusBottom?: number;
  radialSegments?: number;
  // Sphere
  widthSegments?: number;
  heightSegments?: number;
  // Cone
  radius?: number;
  // Torus
  tube?: number;
  tubularSegments?: number;
}

/** A single 3D part in the machine */
export interface GeometryPart {
  name: string;
  geometry: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus';
  params: GeometryParams & { height?: number };
  position: [number, number, number]; // [x, y, z] in meters
  rotation: [number, number, number]; // [rx, ry, rz] in radians
  material: GeometryMaterial;
}

/** Optional base plate (foundation) for the machine */
export interface BasePlate {
  geometry: 'box';
  width: number;
  height: number;
  depth: number;
}

/** The complete LLM-generated geometry specification */
export interface GeometrySpec {
  machineName: string;
  basePlate?: BasePlate;
  parts: GeometryPart[];
}

// ============================================================================
// TYPES — Service Input/Output
// ============================================================================

/** Parameters for the generateProcedural3D function */
export interface GenerateProcedural3DParams {
  machineName: string;
  assetId: string;
  description?: string;
  userId: string;
}

/** Result returned from the generateProcedural3D function */
export interface GenerateProcedural3DResult {
  success: true;
  assetId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  format: string;
  modelId: string;
  sceneId: string | null;
  partCount: number;
  machineName: string;
  generationTimeMs: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'models');

/** Target bounding box diagonal in meters — models are normalized to fit this */
const TARGET_MODEL_SIZE = 3.0;

/** Supported geometry types for validation */
const SUPPORTED_GEOMETRIES = ['box', 'cylinder', 'sphere', 'cone', 'torus'] as const;

/** Default material when a part doesn't specify one */
const DEFAULT_MATERIAL: GeometryMaterial = {
  color: '#A8A8A8',
  metalness: 0.6,
  roughness: 0.4,
};

// ============================================================================
// LLM SYSTEM PROMPT — Instructs the LLM to generate 3D geometry specs
// ============================================================================

const GEOMETRY_SPEC_SYSTEM_PROMPT = `You are an expert mechanical engineer and 3D technical illustrator specializing in industrial equipment. Given a machine name, you must generate a detailed 3D geometry specification using primitive shapes (box, cylinder, sphere, cone, torus) that approximates the machine's physical appearance.

Your output must be a SINGLE valid JSON object with NO markdown fences, NO commentary, NO text before or after the JSON. The exact structure is:

{
  "machineName": "Full Machine Name",
  "basePlate": {
    "geometry": "box",
    "width": 2.0,
    "height": 0.1,
    "depth": 1.0
  },
  "parts": [
    {
      "name": "descriptive_part_name",
      "geometry": "box|cylinder|sphere|cone|torus",
      "params": { ... geometry-specific params ... },
      "position": [x, y, z],
      "rotation": [rx, ry, rz],
      "material": { "color": "#RRGGBB", "metalness": 0.0-1.0, "roughness": 0.0-1.0 }
    }
  ]
}

GEOMETRY TYPES AND THEIR PARAMS:
- "box": { "width": W, "height": H, "depth": D }
- "cylinder": { "radiusTop": RT, "radiusBottom": RB, "height": H, "radialSegments": N }
- "sphere": { "radius": R, "widthSegments": W, "heightSegments": H }
- "cone": { "radius": R, "height": H, "radialSegments": N }
- "torus": { "radius": R, "tube": T, "radialSegments": N, "tubularSegments": M }

COORDINATE SYSTEM:
- All positions in METERS (typical industrial scale: 0.1 - 5.0m range)
- Y-axis is UP (positive Y = up from the base plate)
- Base plate is at Y=0; parts sit on top of it
- The base plate center is at origin [0, 0, 0]
- Position is the CENTER of the geometry (e.g., a cylinder at [0, 0.7, 0] has its center 0.7m above the base plate)
- Rotation is in RADIANS (π ≈ 3.14159, π/2 ≈ 1.5708)

CRITICAL DESIGN RULES:
1. Generate 8-20 parts for a realistic representation
2. Include ALL major visible components (housing, motor, pipes, valves, flanges, control panels, etc.)
3. Position parts relative to each other CORRECTLY — parts must connect properly
4. Use consistent scale throughout (all in meters)
5. Parts should NOT overlap unless physically correct (e.g., a pipe going into a housing)
6. All positions should form a coherent, realistic machine layout

MATERIAL GUIDELINES (use realistic industrial colors):
- Main body/housing: metallic gray (#A8A8A8 to #CCCCCC), metalness 0.6-0.9, roughness 0.2-0.5
- Motors: darker gray (#666666 to #888888), metalness 0.7-0.9, roughness 0.3-0.4
- Pipes/tubes: steel gray (#888888 to #AAAAAA), metalness 0.8, roughness 0.3
- Flanges/bolts: darker steel (#777777), metalness 0.9, roughness 0.2
- Rubber gaskets/seals: near-black (#222222 to #333333), metalness 0.0, roughness 0.9
- Electrical panels: light gray (#D0D0D0), metalness 0.4, roughness 0.6
- Painted surfaces (safety): specific colors with metalness 0.3-0.5, roughness 0.5-0.7
  - Red (#CC3333) for danger/fire equipment
  - Yellow (#FFCC00) for caution/warning
  - Green (#339933) for safe/go indicators
  - Blue (#3366CC) for informational
- Base plate/foundation: dark gray (#555555), metalness 0.5, roughness 0.6

PART NAMING CONVENTION:
- Use descriptive names: "motor_housing", "drive_shaft", "inlet_pipe", "control_panel", etc.
- Names will be used as mesh identifiers for digital twin component mapping
- Use snake_case with no spaces

IMPORTANT:
- Return ONLY the JSON object — no markdown code fences, no explanatory text
- Ensure ALL required fields are present for every part
- All numerical values must be positive and non-zero
- Use sufficient radialSegments (16-32) for cylinders and cones to appear smooth`;

// ============================================================================
// STEP 1 — LLM Geometry Spec Generation
// ============================================================================

/**
 * Call the LLM to generate a structured JSON geometry specification
 * describing the machine's 3D structure using primitives.
 */
async function generateGeometrySpecWithLLM(
  machineName: string,
  description?: string,
): Promise<GeometrySpec> {
  const timer = logger.timer('llm:geometry-spec');

  const userPrompt = `Generate a detailed 3D geometry specification for this industrial machine using primitive shapes.

Machine: ${machineName}
${description ? `Additional context: ${description}` : ''}

Remember:
- Return ONLY valid JSON, no markdown fences
- Generate 8-20 properly positioned parts
- Use meters for all dimensions
- Use realistic industrial materials
- Parts should form a coherent, connected machine
- Base plate at origin, Y-axis up`;

  logger.info('Calling LLM to generate 3D geometry spec', { machineName });

  const zai = await ZAI.create();
  const response: Record<string, unknown> = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: GEOMETRY_SPEC_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,   // Slightly lower for more precise geometry positions
    max_tokens: 8000,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM returned empty response when generating geometry spec');
  }

  // Strip markdown code fences if the LLM wraps them
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseErr) {
    const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    logger.error('Failed to parse LLM geometry spec JSON', { error: errMsg, snippet: jsonStr.slice(0, 200) });
    throw new Error(`LLM returned invalid JSON for geometry spec: ${errMsg}`);
  }

  const spec = parsed as GeometrySpec;

  // Validate required structure
  if (!spec.machineName || typeof spec.machineName !== 'string') {
    throw new Error('LLM geometry spec missing "machineName" field');
  }

  if (!Array.isArray(spec.parts) || spec.parts.length === 0) {
    throw new Error('LLM geometry spec has no "parts" array or it is empty');
  }

  // Validate each part has required fields
  for (let i = 0; i < spec.parts.length; i++) {
    const part = spec.parts[i];
    if (!part.name || typeof part.name !== 'string') {
      throw new Error(`Part at index ${i} is missing a "name" field`);
    }
    if (!part.geometry || !SUPPORTED_GEOMETRIES.includes(part.geometry as typeof SUPPORTED_GEOMETRIES[number])) {
      throw new Error(
        `Part "${part.name}" has invalid geometry "${part.geometry}". ` +
        `Supported: ${SUPPORTED_GEOMETRIES.join(', ')}`,
      );
    }
    if (!part.params || typeof part.params !== 'object') {
      throw new Error(`Part "${part.name}" is missing "params" object`);
    }
    if (!Array.isArray(part.position) || part.position.length !== 3) {
      throw new Error(`Part "${part.name}" has invalid "position" — must be [x, y, z]`);
    }
    if (!Array.isArray(part.rotation) || part.rotation.length !== 3) {
      throw new Error(`Part "${part.name}" has invalid "rotation" — must be [rx, ry, rz]`);
    }
    if (!part.material || typeof part.material !== 'object') {
      throw new Error(`Part "${part.name}" is missing "material" object`);
    }
  }

  logger.info('LLM geometry spec generated and validated', {
    machineName: spec.machineName,
    partCount: spec.parts.length,
    hasBasePlate: !!spec.basePlate,
  }, );
  timer.end();

  return spec;
}

// ============================================================================
// STEP 2 — Three.js Scene Construction (Server-Side Node.js)
// ============================================================================

/**
 * Build a Three.js Scene from the geometry specification.
 * Uses dynamic imports for Three.js to avoid SSR bundling issues.
 *
 * Returns: { scene, partCount, vertexCount, meshCount }
 */
async function buildSceneFromSpec(
  spec: GeometrySpec,
): Promise<{ scene: any; partCount: number; vertexCount: number; meshCount: number; boundingBox: { min: number[]; max: number[] } }> {
  const timer = logger.timer('threejs:build-scene');

  // Dynamic import for Three.js (server-side Node.js — no DOM needed)
  const THREE = await import('three');

  const scene = new THREE.Scene();
  scene.name = spec.machineName;

  let meshCount = 0;
  let vertexCount = 0;
  const allPositions: number[] = [];

  // ── Create Base Plate ─────────────────────────────────────────────────
  if (spec.basePlate) {
    const bp = spec.basePlate;
    try {
      const geo = new THREE.BoxGeometry(bp.width, bp.height, bp.depth);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x555555,
        metalness: 0.5,
        roughness: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = 'base_plate';
      mesh.position.set(0, 0, 0); // Base plate sits at origin
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshCount++;
      vertexCount += geo.attributes.position.count;
      logger.debug('Base plate created', { width: bp.width, height: bp.height, depth: bp.depth });
    } catch (err) {
      logger.warn('Failed to create base plate geometry (non-fatal)', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Create Parts ─────────────────────────────────────────────────────
  for (const part of spec.parts) {
    try {
      const geometry = createGeometry(THREE, part);
      const material = createMaterial(THREE, part.material || DEFAULT_MATERIAL);
      const mesh = new THREE.Mesh(geometry, material);

      mesh.name = part.name;
      mesh.position.set(
        part.position[0],
        part.position[1],
        part.position[2],
      );
      mesh.rotation.set(
        part.rotation[0],
        part.rotation[1],
        part.rotation[2],
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
      meshCount++;
      vertexCount += geometry.attributes.position.count;

      // Track bounding box
      geometry.computeBoundingBox();
      const bb = geometry.boundingBox;
      if (bb) {
        allPositions.push(
          bb.min.x + mesh.position.x,
          bb.min.y + mesh.position.y,
          bb.min.z + mesh.position.z,
          bb.max.x + mesh.position.x,
          bb.max.y + mesh.position.y,
          bb.max.z + mesh.position.z,
        );
      }
    } catch (partErr) {
      logger.warn(`Failed to create part "${part.name}" — skipping (non-fatal)`, {
        error: partErr instanceof Error ? partErr.message : String(partErr),
        partName: part.name,
        geometry: part.geometry,
      });
    }
  }

  // ── Add Lighting ─────────────────────────────────────────────────────
  // Ambient light for base illumination
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  // Hemisphere light for natural sky/ground illumination
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
  scene.add(hemisphere);

  // Directional light (key light) — simulates sunlight/warehouse overhead
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(5, 8, 5);
  directional.castShadow = true;
  scene.add(directional);

  // Fill light from opposite side
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-3, 4, -3);
  scene.add(fillLight);

  // ── Add Ground Plane ──────────────────────────────────────────────────
  const groundGeo = new THREE.PlaneGeometry(10, 10);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xe0e0e0,
    metalness: 0.1,
    roughness: 0.9,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2; // Rotate to horizontal
  ground.position.y = spec.basePlate ? -(spec.basePlate.height / 2) : -0.05;
  ground.receiveShadow = true;
  ground.name = 'ground_plane';
  scene.add(ground);

  // ── Center & Normalize Model ───────────────────────────────────────────
  // Compute bounding box of all machine parts (exclude ground plane)
  const machineGroup = new THREE.Group();
  machineGroup.name = 'machine_assembly';
  const childrenToMove = scene.children.filter(c => c.name !== 'ground_plane');
  for (const child of childrenToMove) {
    machineGroup.add(child);
  }
  // Clear and re-add
  scene.children.length = 0;
  scene.add(machineGroup);
  scene.add(ground);

  // Compute bounding box of the machine group
  machineGroup.updateMatrixWorld(true);
  const machineBox = new THREE.Box3().setFromObject(machineGroup);

  // Center the model
  const center = machineBox.getCenter(new THREE.Vector3());
  machineGroup.position.sub(center);

  // Normalize scale to fit within target size
  const size = machineBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0 && maxDim > TARGET_MODEL_SIZE) {
    const scaleFactor = TARGET_MODEL_SIZE / maxDim;
    machineGroup.scale.setScalar(scaleFactor);
    logger.info('Model normalized to fit bounding box', {
      originalMaxDim: maxDim.toFixed(2),
      scaleFactor: scaleFactor.toFixed(3),
      targetSize: TARGET_MODEL_SIZE,
    });
  }

  // Recompute bounding box after centering/scaling
  machineGroup.updateMatrixWorld(true);
  const finalBox = new THREE.Box3().setFromObject(machineGroup);

  const boundingBox = {
    min: [finalBox.min.x, finalBox.min.y, finalBox.min.z],
    max: [finalBox.max.x, finalBox.max.y, finalBox.max.z],
  };

  logger.info('Three.js scene built successfully', {
    meshCount,
    vertexCount,
    boundingBox,
  });

  timer.end();
  return { scene, partCount: spec.parts.length, vertexCount, meshCount, boundingBox };
}

// ============================================================================
// Three.js Geometry Factory
// ============================================================================

/**
 * Create a Three.js BufferGeometry from a GeometryPart definition.
 * Validates params and provides sensible defaults.
 */
function createGeometry(THREE: any, part: GeometryPart): any {
  const { geometry: type, params } = part;

  switch (type) {
    case 'box': {
      const w = Number(params.width) || 1;
      const h = Number(params.height) || 1;
      const d = Number(params.depth) || 1;
      return new THREE.BoxGeometry(w, h, d);
    }
    case 'cylinder': {
      const rt = Number(params.radiusTop) || 0.5;
      const rb = Number(params.radiusBottom) || rt;
      const h = Number(params.height) || 1;
      const rs = Number(params.radialSegments) || 24;
      return new THREE.CylinderGeometry(rt, rb, h, rs);
    }
    case 'sphere': {
      const r = Number(params.radius) || 0.5;
      const ws = Number(params.widthSegments) || 24;
      const hs = Number(params.heightSegments) || 16;
      return new THREE.SphereGeometry(r, ws, hs);
    }
    case 'cone': {
      const r = Number(params.radius) || 0.5;
      const h = Number(params.height) || 1;
      const rs = Number(params.radialSegments) || 24;
      return new THREE.ConeGeometry(r, h, rs);
    }
    case 'torus': {
      const r = Number(params.radius) || 0.5;
      const t = Number(params.tube) || 0.15;
      const rs = Number(params.radialSegments) || 16;
      const ts = Number(params.tubularSegments) || 32;
      return new THREE.TorusGeometry(r, t, rs, ts);
    }
    default: {
      throw new Error(`Unsupported geometry type: ${type}`);
    }
  }
}

/**
 * Create a MeshStandardMaterial from a GeometryMaterial definition.
 * Parses hex color strings and applies metalness/roughness.
 */
function createMaterial(THREE: any, matDef: GeometryMaterial): any {
  // Parse hex color string — Three.js Color constructor accepts hex strings
  const color = new THREE.Color(matDef.color || '#A8A8A8');
  const metalness = typeof matDef.metalness === 'number'
    ? Math.max(0, Math.min(1, matDef.metalness))
    : 0.6;
  const roughness = typeof matDef.roughness === 'number'
    ? Math.max(0, Math.min(1, matDef.roughness))
    : 0.4;

  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

// ============================================================================
// STEP 3 — GLB Export via GLTFExporter
// ============================================================================

/**
 * Export a Three.js scene to GLB binary format using GLTFExporter.
 * Returns the GLB file as a Buffer.
 */
async function exportSceneToGLB(scene: any): Promise<Buffer> {
  const timer = logger.timer('threejs:export-glb');

  // Dynamic import for GLTFExporter (server-side Node.js compatible)
  const { GLTFExporter } = await import(
    'three/examples/jsm/exporters/GLTFExporter.js'
  ) as any;

  const exporter = new GLTFExporter();

  // parseAsync returns { glb } as ArrayBuffer for binary export
  const result = await exporter.parseAsync(scene, {
    binary: true,   // Request GLB binary format
    trs: false,      // Don't use TRS (use matrix instead for wider compat)
    onlyVisible: true,
    maxTextureSize: 4096,
  });

  if (!result || !(result instanceof ArrayBuffer)) {
    throw new Error(
      'GLTFExporter parseAsync did not return a valid ArrayBuffer. ' +
      `Got type: ${typeof result}`,
    );
  }

  const buffer = Buffer.from(result);
  timer.end();

  logger.info('GLB export complete', { fileSizeBytes: buffer.length });
  return buffer;
}

// ============================================================================
// STEP 4 — File Persistence
// ============================================================================

/**
 * Ensure the uploads directory exists and save the GLB buffer to disk.
 */
async function saveGLBToDisk(assetId: string, glbBuffer: Buffer): Promise<{ fileName: string; filePath: string; diskPath: string }> {
  const timer = logger.timer('fs:save-glb');

  // Ensure directory exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  const fileName = `${assetId}.glb`;
  const filePath = `/uploads/models/${fileName}`;
  const diskPath = join(UPLOAD_DIR, fileName);

  await writeFile(diskPath, glbBuffer);

  timer.end();
  logger.info('GLB file saved to disk', { diskPath, fileSize: glbBuffer.length });

  return { fileName, filePath, diskPath };
}

// ============================================================================
// STEP 5 — Database Operations
// ============================================================================

/**
 * Create database records for the generated 3D model:
 * 1. AssetModel — stores the file metadata and links to the asset
 * 2. DigitalTwinScene — links the model to the asset's digital twin (if one exists)
 */
async function createDatabaseRecords(
  params: {
    machineName: string;
    assetId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    meshCount: number;
    vertexCount: number;
    boundingBox: { min: number[]; max: number[] };
    userId: string;
    partCount: number;
  },
): Promise<{ modelId: string; sceneId: string | null }> {
  const timer = logger.timer('db:create-records');

  // ── 1. Create AssetModel record ─────────────────────────────────────
  const assetModel = await db.assetModel.create({
    data: {
      name: params.machineName,
      fileName: params.fileName,
      filePath: params.filePath,
      fileType: 'glb',
      fileSize: params.fileSize,
      format: 'glb',
      boundingBox: JSON.stringify(params.boundingBox),
      meshCount: params.meshCount,
      vertexCount: params.vertexCount,
      assetId: params.assetId,
      uploadedById: params.userId,
      isActive: true,
    },
  });

  logger.info('AssetModel record created', {
    modelId: assetModel.id,
    fileName: params.fileName,
  });

  // ── 2. Create DigitalTwinScene if a digital twin exists ─────────────
  let sceneId: string | null = null;
  try {
    const twin = await db.digitalTwin.findFirst({
      where: { assetId: params.assetId },
    });

    if (twin) {
      const twinScene = await db.digitalTwinScene.create({
        data: {
          name: `Procedural 3D - ${params.machineName}`,
          description: `AI-generated procedural 3D model for ${params.machineName}. ` +
            `Built from ${params.partCount} primitive geometries using LLM geometry spec + Three.js.`,
          twinId: twin.id,
          modelId: assetModel.id,
          sceneType: '3d',
          environment: 'industrial',
          backgroundColor: '#1a1a2e',
          groundPlane: true,
          gridEnabled: true,
          ambientLight: 0.4,
          directionalLight: 0.8,
          defaultCameraPosition: JSON.stringify({ x: 3, y: 2, z: 3 }),
          defaultCameraTarget: JSON.stringify({ x: 0, y: 0.5, z: 0 }),
          isActive: true,
          createdById: params.userId,
        },
      });

      sceneId = twinScene.id;
      logger.info('DigitalTwinScene created', {
        sceneId,
        twinId: twin.id,
        modelId: assetModel.id,
      });
    } else {
      logger.info('No digital twin found for asset — skipping scene creation', {
        assetId: params.assetId,
      });
    }
  } catch (sceneErr) {
    logger.warn('Failed to create DigitalTwinScene (non-fatal)', {
      error: sceneErr instanceof Error ? sceneErr.message : String(sceneErr),
    });
  }

  timer.end();
  return { modelId: assetModel.id, sceneId };
}

// ============================================================================
// MAIN PUBLIC API
// ============================================================================

/**
 * Generate a procedural 3D model for an asset using LLM + Three.js.
 *
 * Pipeline:
 *   1. LLM generates a structured JSON geometry specification
 *   2. Three.js builds the 3D scene from the spec in Node.js
 *   3. GLTFExporter exports the scene to GLB binary
 *   4. File is saved to public/uploads/models/{assetId}.glb
 *   5. DB records are created (AssetModel + DigitalTwinScene)
 *
 * @param params - Generation parameters
 * @returns Result with file info and DB record IDs
 * @throws Error if LLM fails, geometry is invalid, or GLB export fails
 */
export async function generateProcedural3D(
  params: GenerateProcedural3DParams,
): Promise<GenerateProcedural3DResult> {
  const overallTimer = logger.timer('procedural-3d:full-pipeline');

  const { machineName, assetId, description, userId } = params;

  logger.info('Starting procedural 3D model generation', {
    machineName,
    assetId,
    userId,
  });

  // ── Step 1: Generate geometry spec with LLM ────────────────────────
  let spec: GeometrySpec;
  try {
    spec = await generateGeometrySpecWithLLM(machineName, description);
  } catch (llmErr) {
    const msg = llmErr instanceof Error ? llmErr.message : String(llmErr);
    logger.error('LLM geometry spec generation failed', { error: msg });
    throw new Error(
      `Failed to generate 3D geometry specification: ${msg}. ` +
      'The LLM may have returned invalid JSON or an incomplete spec. Please try again.',
    );
  }

  // ── Step 2: Build Three.js scene ───────────────────────────────────
  let sceneResult: {
    scene: any;
    partCount: number;
    vertexCount: number;
    meshCount: number;
    boundingBox: { min: number[]; max: number[] };
  };
  try {
    sceneResult = await buildSceneFromSpec(spec);
  } catch (sceneErr) {
    const msg = sceneErr instanceof Error ? sceneErr.message : String(sceneErr);
    logger.error('Three.js scene construction failed', { error: msg });
    throw new Error(
      `Failed to construct 3D scene from geometry spec: ${msg}`,
    );
  }

  // ── Step 3: Export to GLB ───────────────────────────────────────────
  let glbBuffer: Buffer;
  try {
    glbBuffer = await exportSceneToGLB(sceneResult.scene);
  } catch (exportErr) {
    const msg = exportErr instanceof Error ? exportErr.message : String(exportErr);
    logger.error('GLB export failed', { error: msg });
    throw new Error(
      `Failed to export 3D scene to GLB format: ${msg}`,
    );
  }

  // ── Step 4: Save to disk ───────────────────────────────────────────
  let fileResult: { fileName: string; filePath: string; diskPath: string };
  try {
    fileResult = await saveGLBToDisk(assetId, glbBuffer);
  } catch (saveErr) {
    const msg = saveErr instanceof Error ? saveErr.message : String(saveErr);
    logger.error('Failed to save GLB file to disk', { error: msg });
    throw new Error(
      `Failed to save GLB model file: ${msg}`,
    );
  }

  // ── Step 5: Create database records ─────────────────────────────────
  let dbResult: { modelId: string; sceneId: string | null };
  try {
    dbResult = await createDatabaseRecords({
      machineName: spec.machineName,
      assetId,
      fileName: fileResult.fileName,
      filePath: fileResult.filePath,
      fileSize: glbBuffer.length,
      meshCount: sceneResult.meshCount,
      vertexCount: sceneResult.vertexCount,
      boundingBox: sceneResult.boundingBox,
      userId,
      partCount: sceneResult.partCount,
    });
  } catch (dbErr) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    logger.error('Failed to create database records for 3D model', { error: msg });
    // The file was already saved — throw since we can't link it
    throw new Error(
      `Failed to create database records: ${msg}. ` +
      `GLB file was saved to ${fileResult.diskPath} but DB link failed.`,
    );
  }

  const generationTimeMs = overallTimer.end();

  logger.info('Procedural 3D model generation completed successfully', {
    assetId,
    modelId: dbResult.modelId,
    sceneId: dbResult.sceneId,
    fileName: fileResult.fileName,
    fileSize: glbBuffer.length,
    partCount: sceneResult.partCount,
    meshCount: sceneResult.meshCount,
    vertexCount: sceneResult.vertexCount,
    generationTimeMs,
  });

  return {
    success: true,
    assetId,
    fileName: fileResult.fileName,
    filePath: fileResult.filePath,
    fileSize: glbBuffer.length,
    format: 'glb',
    modelId: dbResult.modelId,
    sceneId: dbResult.sceneId,
    partCount: sceneResult.partCount,
    machineName: spec.machineName,
    generationTimeMs,
  };
}
