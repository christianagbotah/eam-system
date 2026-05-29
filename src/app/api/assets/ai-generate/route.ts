import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin, getUserPlantId } from '@/lib/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:assets:ai-generate');

// ============================================================================
// TYPES — LLM-generated machine data structure
// ============================================================================

interface LLMComponentSpec {
  [key: string]: string | number | boolean;
}

interface LLMSparePart {
  name: string;
  code: string;
  category: string;
  unit: string;
  unitCost: number;
  minStock: number;
  maxStock: number;
  supplier: string;
  specification: LLMComponentSpec;
}

interface LLMComponent {
  name: string;
  description: string;
  criticality: string;
  specification: LLMComponentSpec;
  spareParts: LLMSparePart[];
}

interface LLMSubsystem {
  name: string;
  description: string;
  criticality: string;
  components: LLMComponent[];
}

interface LLMPmTask {
  description: string;
  taskType: string;
  estimatedMinutes: number;
  requiredParts: { partName: string; quantity: number; unit: string }[];
}

interface LLMPmTemplate {
  title: string;
  type: string;
  category: string;
  frequencyType: string;
  estimatedDuration: number;
  priority: string;
  tasks: LLMPmTask[];
}

interface LLMMachineData {
  name: string;
  description: string;
  manufacturer: string;
  model: string;
  specification: LLMComponentSpec;
  criticality: string;
  purchaseCost: number;
  expectedLifeYears: number;
  subsystems: LLMSubsystem[];
  pmTemplates: LLMPmTemplate[];
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are an expert industrial equipment engineer specializing in Enterprise Asset Management (EAM). Given a machine name, generate comprehensive, realistic machine data for asset management systems.

You MUST respond with ONLY a valid JSON object (no markdown fences, no commentary) matching this exact structure:

{
  "name": "Machine Full Name",
  "description": "Detailed description of the machine, its purpose, and key capabilities (3-5 sentences)",
  "manufacturer": "Common real-world manufacturer for this type of equipment",
  "model": "Common model number or series designation",
  "specification": {
    "power_rating_kw": "value with unit",
    "capacity": "production capacity",
    "operating_pressure_bar": "design pressure",
    "speed_rpm": "operational speed",
    "weight_kg": "approximate weight",
    "dimensions_mm": "L x W x H"
  },
  "criticality": "critical|high|medium|low",
  "purchaseCost": 100000,
  "expectedLifeYears": 20,
  "subsystems": [
    {
      "name": "Subsystem Name",
      "description": "What this subsystem does (1-2 sentences)",
      "criticality": "critical|high|medium|low",
      "components": [
        {
          "name": "Component Name",
          "description": "What this component does (1-2 sentences)",
          "criticality": "critical|high|medium|low",
          "specification": { "key": "value" },
          "spareParts": [
            {
              "name": "Spare Part Name",
              "code": "SP-XXX-001",
              "category": "spare_part|consumable|tool",
              "unit": "each|kg|litre|set|meter",
              "unitCost": 100,
              "minStock": 2,
              "maxStock": 6,
              "supplier": "Common supplier name",
              "specification": { "material": "...", "dimensions": "..." }
            }
          ]
        }
      ]
    }
  ],
  "pmTemplates": [
    {
      "title": "Template Title",
      "type": "inspection|preventive|predictive",
      "category": "mechanical|electrical|hydraulic",
      "frequencyType": "daily|weekly|monthly|quarterly|annual",
      "estimatedDuration": 2.0,
      "priority": "low|medium|high|critical",
      "tasks": [
        {
          "description": "Task description",
          "taskType": "check|inspect|measure|lubricate|replace|record",
          "estimatedMinutes": 10,
          "requiredParts": [{ "partName": "Part name", "quantity": 1, "unit": "each" }]
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. Generate 4-8 subsystems depending on machine complexity
2. Each subsystem should have 3-6 components
3. Each critical/high-criticality component should have 1-3 spare parts
4. Generate 4-8 PM templates covering daily checks through annual overhauls
5. Each PM template should have 3-8 tasks
6. Use realistic specifications, costs, and supplier names
7. Make spare part codes follow the format SP-{SUBSYSTEM_ABBREV}-{NUMBER}
8. All values must be realistic for the given machine type
9. ONLY return valid JSON — no markdown code fences, no text before/after`;

// ============================================================================
// HELPER — Call LLM to generate machine data
// ============================================================================

async function generateMachineDataWithLLM(
  machineName: string,
  additionalContext?: string,
): Promise<LLMMachineData> {
  const userPrompt = `Generate comprehensive asset management data for this industrial machine:

Machine: ${machineName}
${additionalContext ? `Additional context: ${additionalContext}` : ''}

Remember: Return ONLY valid JSON matching the specified structure. Include realistic subsystems, components, spare parts, and PM templates.`;

  logger.info('Calling LLM to generate machine data', { machineName });

  const zai = await ZAI.create();
  const response: Record<string, unknown> = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 8000,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM returned empty response');
  }

  // Strip markdown code fences if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(jsonStr);

  // Validate required top-level fields
  const requiredFields = ['name', 'description', 'manufacturer', 'model', 'specification', 'criticality', 'subsystems', 'pmTemplates'];
  for (const field of requiredFields) {
    if (!parsed[field]) {
      throw new Error(`LLM response missing required field: ${field}`);
    }
  }

  // Ensure arrays exist
  parsed.subsystems = Array.isArray(parsed.subsystems) ? parsed.subsystems : [];
  parsed.pmTemplates = Array.isArray(parsed.pmTemplates) ? parsed.pmTemplates : [];

  logger.info('LLM data generated successfully', {
    subsystems: parsed.subsystems.length,
    components: parsed.subsystems.reduce((acc: number, ss: LLMSubsystem) => acc + (ss.components?.length || 0), 0),
    pmTemplates: parsed.pmTemplates.length,
  });

  return parsed as LLMMachineData;
}

// ============================================================================
// HELPER — Generate unique tags and codes
// ============================================================================

function generateShortName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 2)
    .map(w => w.toUpperCase().slice(0, 3))
    .join('-');
}

function generateAssetTag(shortName: string, index: number): string {
  return `AI-${shortName}-${String(index).padStart(3, '0')}`;
}

function generateComponentCode(shortName: string, ssIndex: number, compIndex: number): string {
  return `AI-${shortName}-${String(ssIndex + 1).padStart(2, '0')}-${String(compIndex + 1).padStart(2, '0')}`;
}

async function generateUniqueItemCode(): Promise<string> {
  // Get the next sequence number
  const lastItem = await db.inventoryItem.findFirst({
    where: { itemCode: { startsWith: 'SP-AI-' } },
    orderBy: { itemCode: 'desc' },
    select: { itemCode: true },
  });

  let nextNum = 1;
  if (lastItem) {
    const parts = lastItem.itemCode.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `SP-AI-${String(nextNum).padStart(4, '0')}`;
}

function frequencyTypeToValue(freqType: string): number {
  switch (freqType) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'monthly': return 30;
    case 'quarterly': return 90;
    case 'semiannual': return 180;
    case 'annual': return 365;
    default: return 30;
  }
}

// ============================================================================
// HELPER — Get or create default category for AI-generated assets
// ============================================================================

async function getOrCreateDefaultCategory(): Promise<string> {
  const existing = await db.assetCategory.findFirst({
    where: { code: 'AI-GENERATED' },
  });

  if (existing) return existing.id;

  const category = await db.assetCategory.create({
    data: {
      name: 'AI Generated Equipment',
      code: 'AI-GENERATED',
      description: 'Assets generated by AI asset generation system',
      isActive: true,
    },
  });

  return category.id;
}

// ============================================================================
// MAIN ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const timer = logger.timer('ai-generate.post');

  try {
    // --- Auth ---
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!hasPermission(session, 'assets.create') && !isAdmin(session)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Required: assets.create' },
        { status: 403 },
      );
    }

    // --- Parse body ---
    const body = await request.json();
    const { machineName, additionalContext, plantId: requestedPlantId, categoryId: requestedCategoryId } = body;

    if (!machineName || typeof machineName !== 'string' || machineName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'machineName is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    // --- Resolve plantId ---
    let plantId = requestedPlantId || null;
    if (!plantId) {
      plantId = await getUserPlantId(session.userId);
    }
    if (!plantId) {
      return NextResponse.json(
        { success: false, error: 'No plant specified and user has no primary plant. Please provide a plantId.' },
        { status: 400 },
      );
    }

    // Validate plant exists
    const plant = await db.plant.findUnique({ where: { id: plantId } });
    if (!plant) {
      return NextResponse.json(
        { success: false, error: 'Specified plant not found' },
        { status: 400 },
      );
    }

    // --- Resolve categoryId ---
    let categoryId = requestedCategoryId || null;
    if (!categoryId) {
      categoryId = await getOrCreateDefaultCategory();
    } else {
      const categoryExists = await db.assetCategory.findUnique({ where: { id: categoryId } });
      if (!categoryExists) {
        return NextResponse.json(
          { success: false, error: 'Specified category not found' },
          { status: 400 },
        );
      }
    }

    // --- Call LLM ---
    let machineData: LLMMachineData;
    try {
      machineData = await generateMachineDataWithLLM(
        machineName.trim(),
        additionalContext ? String(additionalContext) : undefined,
      );
    } catch (llmError) {
      const msg = llmError instanceof Error ? llmError.message : 'Unknown LLM error';
      logger.error('LLM generation failed', { message: msg });
      return NextResponse.json(
        { success: false, error: `AI generation failed: ${msg}. Please try again or rephrase the machine name.` },
        { status: 502 },
      );
    }

    // --- Prepare identifiers ---
    const shortName = generateShortName(machineData.name);
    const mainAssetTag = generateAssetTag(shortName, 1);
    const now = new Date();

    // --- Summary counters ---
    const summary = {
      subsystems: 0,
      components: 0,
      bomEntries: 0,
      componentRegistry: 0,
      inventoryItems: 0,
      pmTemplates: 0,
      pmTasks: 0,
      pmSchedules: 0,
      digitalTwin: 0,
      systemDiagram: 0,
    };

    // ================================================================
    // 1. CREATE MAIN ASSET
    // ================================================================
    logger.info('Creating main asset', { name: machineData.name, tag: mainAssetTag });

    const mainAsset = await db.asset.create({
      data: {
        name: machineData.name,
        assetTag: mainAssetTag,
        description: machineData.description,
        manufacturer: machineData.manufacturer,
        model: machineData.model,
        yearManufactured: now.getFullYear(),
        condition: 'new',
        status: 'operational',
        criticality: machineData.criticality || 'medium',
        specification: JSON.stringify(machineData.specification || {}),
        purchaseCost: machineData.purchaseCost || null,
        expectedLifeYears: machineData.expectedLifeYears || null,
        currentValue: machineData.purchaseCost || null,
        plantId,
        categoryId,
        createdById: session.userId,
        isActive: true,
      },
    });

    logger.info('Main asset created', { assetId: mainAsset.id, assetTag: mainAssetTag });

    // ================================================================
    // 2. CREATE SUBSYSTEMS + COMPONENTS (Asset hierarchy + BOM + Registry)
    // ================================================================

    const bomEntries: Array<{
      parentId: string;
      childAssetId: string;
      partNumber: string;
      quantity: number;
      unit: string;
      specification: string;
    }> = [];

    const componentRegistryEntries: Array<{
      componentCode: string;
      name: string;
      description: string;
      componentType: string;
      criticality: string;
      specification: string;
      assetId: string;
      sortOrder: number;
      expectedLifeHours: number | null;
    }> = [];

    const inventoryItemsToCreate: Array<{
      itemCode: string;
      name: string;
      description: string;
      category: string;
      unitOfMeasure: string;
      currentStock: number;
      minStockLevel: number;
      maxStockLevel: number;
      unitCost: number;
      supplier: string;
      plantId: string;
      specification: string;
      createdById: string;
    }> = [];

    // Track used spare part codes to avoid duplicates
    const usedSpareCodes = new Set<string>();

    for (let ssIdx = 0; ssIdx < machineData.subsystems.length; ssIdx++) {
      const subsystem = machineData.subsystems[ssIdx];
      summary.subsystems++;

      // Create subsystem asset (child of main asset)
      const ssAssetTag = generateAssetTag(shortName, 2 + ssIdx);
      const subsystemAsset = await db.asset.create({
        data: {
          name: subsystem.name,
          assetTag: ssAssetTag,
          description: subsystem.description,
          condition: 'new',
          status: 'operational',
          criticality: subsystem.criticality || 'medium',
          specification: JSON.stringify({ subsystem: true }),
          plantId,
          categoryId,
          parentId: mainAsset.id,
          createdById: session.userId,
          isActive: true,
        },
      });

      // BOM entry: main asset -> subsystem
      bomEntries.push({
        parentId: mainAsset.id,
        childAssetId: subsystemAsset.id,
        partNumber: `BOM-${shortName}-${ssIdx + 1}`,
        quantity: 1,
        unit: 'each',
        specification: JSON.stringify({ type: 'subsystem', description: subsystem.description }),
      });

      // Process components within subsystem
      for (let compIdx = 0; compIdx < (subsystem.components || []).length; compIdx++) {
        const component = subsystem.components[compIdx];
        summary.components++;

        const compAssetTag = `${ssAssetTag}-${compIdx + 1}`;
        const componentCode = generateComponentCode(shortName, ssIdx, compIdx);

        // Create component asset (child of subsystem)
        const componentAsset = await db.asset.create({
          data: {
            name: component.name,
            assetTag: compAssetTag,
            description: component.description,
            condition: 'new',
            status: 'operational',
            criticality: component.criticality || 'medium',
            specification: JSON.stringify(component.specification || {}),
            plantId,
            categoryId,
            parentId: subsystemAsset.id,
            createdById: session.userId,
            isActive: true,
          },
        });

        // BOM entry: subsystem -> component
        bomEntries.push({
          parentId: subsystemAsset.id,
          childAssetId: componentAsset.id,
          partNumber: `BOM-${componentCode}`,
          quantity: 1,
          unit: 'each',
          specification: JSON.stringify(component.specification || {}),
        });

        // Component registry entry
        componentRegistryEntries.push({
          componentCode,
          name: component.name,
          description: component.description,
          componentType: 'component',
          criticality: component.criticality || 'medium',
          specification: JSON.stringify(component.specification || {}),
          assetId: mainAsset.id,
          sortOrder: (ssIdx * 100) + compIdx,
          expectedLifeHours: null,
        });

        // Collect spare parts (deduplicate by code)
        for (const sparePart of component.spareParts || []) {
          if (!usedSpareCodes.has(sparePart.code)) {
            usedSpareCodes.add(sparePart.code);
            inventoryItemsToCreate.push({
              itemCode: await generateUniqueItemCode(),
              name: sparePart.name,
              description: `${sparePart.name} - spare part for ${component.name}`,
              category: sparePart.category || 'spare_part',
              unitOfMeasure: sparePart.unit || 'each',
              currentStock: 0,
              minStockLevel: sparePart.minStock || 2,
              maxStockLevel: sparePart.maxStock || 6,
              unitCost: sparePart.unitCost || 0,
              supplier: sparePart.supplier || '',
              plantId,
              specification: JSON.stringify(sparePart.specification || {}),
              createdById: session.userId,
            });
          }
        }
      }
    }

    // ================================================================
    // 3. BATCH CREATE BOM ENTRIES
    // ================================================================
    if (bomEntries.length > 0) {
      await db.billOfMaterial.createMany({
        data: bomEntries.map(entry => ({
          parentId: entry.parentId,
          childAssetId: entry.childAssetId,
          partNumber: entry.partNumber,
          quantity: entry.quantity,
          unit: entry.unit,
          specification: entry.specification,
          status: 'active',
          revision: 'A',
        })),
        skipDuplicates: true,
      });
      summary.bomEntries = bomEntries.length;
    }

    // ================================================================
    // 4. BATCH CREATE COMPONENT REGISTRY ENTRIES
    // ================================================================
    if (componentRegistryEntries.length > 0) {
      await db.componentRegistry.createMany({
        data: componentRegistryEntries.map(entry => ({
          componentCode: entry.componentCode,
          name: entry.name,
          description: entry.description,
          componentType: entry.componentType,
          criticality: entry.criticality,
          specification: entry.specification,
          assetId: entry.assetId,
          sortOrder: entry.sortOrder,
          expectedLifeHours: entry.expectedLifeHours,
          lifecycleStatus: 'operational',
          operatingHours: 0,
          healthScore: 100,
        })),
        skipDuplicates: true,
      });
      summary.componentRegistry = componentRegistryEntries.length;
    }

    // ================================================================
    // 5. BATCH CREATE INVENTORY ITEMS
    // ================================================================
    if (inventoryItemsToCreate.length > 0) {
      await db.inventoryItem.createMany({
        data: inventoryItemsToCreate.map(item => ({
          itemCode: item.itemCode,
          name: item.name,
          description: item.description,
          category: item.category,
          unitOfMeasure: item.unitOfMeasure,
          currentStock: item.currentStock,
          minStockLevel: item.minStockLevel,
          maxStockLevel: item.maxStockLevel,
          unitCost: item.unitCost,
          supplier: item.supplier,
          plantId: item.plantId,
          specification: item.specification,
          imageUrls: '[]',
          createdById: item.createdById,
          isActive: true,
        })),
        skipDuplicates: true,
      });
      summary.inventoryItems = inventoryItemsToCreate.length;
    }

    // ================================================================
    // 6. CREATE PM TEMPLATES + TASKS + SCHEDULES
    // ================================================================
    for (const template of machineData.pmTemplates) {
      summary.pmTemplates++;

      // Create PM template
      const pmTemplate = await db.pmTemplate.create({
        data: {
          title: template.title,
          description: `AI-generated PM template for ${machineData.name}: ${template.title}`,
          type: template.type || 'preventive',
          category: template.category || 'mechanical',
          estimatedDuration: template.estimatedDuration || 2.0,
          priority: template.priority || 'medium',
          requiredSkills: JSON.stringify([]),
          requiredTools: JSON.stringify([]),
          isActive: true,
          createdById: session.userId,
        },
      });

      // Create PM template tasks
      for (let taskIdx = 0; taskIdx < (template.tasks || []).length; taskIdx++) {
        const task = template.tasks[taskIdx];
        summary.pmTasks++;

        await db.pmTemplateTask.create({
          data: {
            templateId: pmTemplate.id,
            taskNumber: taskIdx + 1,
            description: task.description,
            taskType: task.taskType || 'check',
            requiredParts: JSON.stringify(task.requiredParts || []),
            estimatedMinutes: task.estimatedMinutes || 10,
            sortOrder: taskIdx,
            isActive: true,
          },
        });
      }

      // Create PM schedule linked to main asset
      const frequencyType = template.frequencyType || 'monthly';
      const frequencyValue = frequencyTypeToValue(frequencyType);

      await db.pmSchedule.create({
        data: {
          title: `${template.title} - ${machineData.name}`,
          description: `Auto-generated schedule from AI template: ${template.title}`,
          assetId: mainAsset.id,
          frequencyType,
          frequencyValue,
          nextDueDate: new Date(now.getTime() + frequencyValue * 24 * 60 * 60 * 1000),
          estimatedDuration: template.estimatedDuration || 2.0,
          priority: template.priority || 'medium',
          isActive: true,
          autoGenerateWO: true,
          leadDays: frequencyType === 'daily' ? 0 : frequencyType === 'weekly' ? 1 : 3,
          templateId: pmTemplate.id,
          createdById: session.userId,
        },
      });
      summary.pmSchedules++;
    }

    // ================================================================
    // 7. CREATE DIGITAL TWIN
    // ================================================================
    try {
      // Build twin parameters from machine specification + subsystem info
      const twinParameters: Record<string, unknown> = {
        ...machineData.specification,
        manufacturer: machineData.manufacturer,
        model: machineData.model,
        criticality: machineData.criticality,
        subsystems: machineData.subsystems.map(ss => ({
          name: ss.name,
          criticality: ss.criticality,
          componentCount: ss.components?.length || 0,
        })),
      };

      // Build connections between subsystems
      const twinConnections = machineData.subsystems.map((ss, idx) => ({
        id: `conn-${idx}`,
        source: machineData.subsystems[Math.max(0, idx - 1)]?.name || 'input',
        target: ss.name,
        type: 'process_flow',
      }));

      // Determine twin type from machine name
      const nameLower = machineData.name.toLowerCase();
      let twinType = 'other';
      if (nameLower.includes('pump')) twinType = 'pump';
      else if (nameLower.includes('motor') || nameLower.includes('drive')) twinType = 'motor';
      else if (nameLower.includes('compressor')) twinType = 'compressor';
      else if (nameLower.includes('valve')) twinType = 'valve';
      else if (nameLower.includes('heat exchanger') || nameLower.includes('hvac')) twinType = 'heat_exchanger';

      await db.digitalTwin.create({
        data: {
          assetId: mainAsset.id,
          name: `Digital Twin - ${machineData.name}`,
          description: `AI-generated digital twin for ${machineData.name}. Covers ${machineData.subsystems.length} subsystems with ${summary.components} tracked components.`,
          type: twinType,
          parameters: JSON.stringify(twinParameters),
          connections: JSON.stringify(twinConnections),
          healthScore: 100,
          syncInterval: '5min',
          isActive: true,
          createdById: session.userId,
        },
      });
      summary.digitalTwin = 1;
    } catch (twinError) {
      const twinErr = twinError instanceof Error ? twinError : new Error(String(twinError));
      logger.warn('Failed to create digital twin (non-fatal)', { message: twinErr.message });
    }

    // ================================================================
    // 8. CREATE SYSTEM DIAGRAM
    // ================================================================
    try {
      // Build diagram nodes from subsystems
      const diagramNodes = [
        {
          id: 'node-main',
          type: 'processNode',
          position: { x: 400, y: 50 },
          data: {
            label: machineData.name,
            assetId: mainAsset.id,
            assetTag: mainAssetTag,
            criticality: machineData.criticality,
          },
        },
        ...machineData.subsystems.map((ss, idx) => ({
          id: `node-ss-${idx}`,
          type: 'processNode',
          position: {
            x: 100 + (idx % 4) * 250,
            y: 200 + Math.floor(idx / 4) * 200,
          },
          data: {
            label: ss.name,
            criticality: ss.criticality,
            componentCount: ss.components?.length || 0,
          },
        })),
      ];

      // Build edges: main -> each subsystem
      const diagramEdges = machineData.subsystems.map((ss, idx) => ({
        id: `edge-${idx}`,
        source: 'node-main',
        target: `node-ss-${idx}`,
        type: 'smoothstep',
        animated: ss.criticality === 'critical',
        data: { label: 'contains' },
      }));

      await db.systemDiagram.create({
        data: {
          plantId,
          name: `System Diagram - ${machineData.name}`,
          description: `AI-generated system diagram showing the hierarchy and relationships for ${machineData.name}`,
          type: 'process',
          nodes: JSON.stringify(diagramNodes),
          edges: JSON.stringify(diagramEdges),
          viewport: JSON.stringify({ x: 0, y: 0, zoom: 0.8 }),
          isActive: true,
          createdById: session.userId,
        },
      });
      summary.systemDiagram = 1;
    } catch (diagramError) {
      const diagramErr = diagramError instanceof Error ? diagramError : new Error(String(diagramError));
      logger.warn('Failed to create system diagram (non-fatal)', { message: diagramErr.message });
    }

    // ================================================================
    // 9. CREATE AUDIT LOG
    // ================================================================
    try {
      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'create',
          entityType: 'asset',
          entityId: mainAsset.id,
          newValues: JSON.stringify({
            source: 'ai-generate',
            machineName: machineData.name,
            assetTag: mainAssetTag,
            subsystems: summary.subsystems,
            components: summary.components,
            inventoryItems: summary.inventoryItems,
            pmTemplates: summary.pmTemplates,
          }),
        },
      });
    } catch {
      // Non-fatal
    }

    // ================================================================
    // DONE — Return response
    // ================================================================
    timer.end();

    logger.info('AI asset generation completed', {
      assetId: mainAsset.id,
      machineName: machineData.name,
      ...summary,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          asset: {
            id: mainAsset.id,
            name: mainAsset.name,
            assetTag: mainAsset.assetTag,
            description: mainAsset.description,
            manufacturer: mainAsset.manufacturer,
            model: mainAsset.model,
            criticality: mainAsset.criticality,
            status: mainAsset.status,
            condition: mainAsset.condition,
            plantId: mainAsset.plantId,
            categoryId: mainAsset.categoryId,
            specification: mainAsset.specification,
            createdAt: mainAsset.createdAt,
          },
          summary,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    timer.end();

    const message = error instanceof Error ? error.message : 'Failed to generate asset with AI';

    // Handle JSON parse errors specifically
    if (error instanceof SyntaxError && message.includes('JSON')) {
      logger.error('LLM returned invalid JSON', { message, stack: (error as Error).stack });
      return NextResponse.json(
        {
          success: false,
          error: 'AI returned an invalid response format. Please try again.',
        },
        { status: 502 },
      );
    }

    logger.error('AI asset generation failed', { message, stack: error instanceof Error ? error.stack : undefined });

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
