import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';

/**
 * WorkOrderMaterial is a legacy compatibility projection used by older WO views.
 * The authoritative material lifecycle is RepairMaterialRequest, which owns
 * supervisor/store approvals, inventory issue/return, consumption/waste and
 * reconciliation. Do not maintain a second independent workflow here.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id, materialId } = await params;

    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const wo = await db.workOrder.findUnique({
      where: { id },
      select: { id: true, isLocked: true },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }
    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is permanently locked. No modifications are allowed after planner closure.' }, { status: 400 });
    }

    const existing = await db.workOrderMaterial.findUnique({
      where: { id: materialId },
      select: { id: true, workOrderId: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });
    }
    if (existing.workOrderId !== id) {
      return NextResponse.json({ success: false, error: 'Material does not belong to this work order' }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Legacy WorkOrderMaterial status is read-only. Use the canonical RepairMaterialRequest workflow for approval, issue, return, consumption, waste, and reconciliation.',
      canonicalEndpoint: '/api/repairs/material-requests',
      currentStatus: existing.status,
    }, { status: 409 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update material';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id, materialId } = await params;

    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const material = await db.workOrderMaterial.findUnique({
      where: { id: materialId },
      select: { id: true, workOrderId: true, status: true },
    });
    if (!material) {
      return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });
    }
    if (material.workOrderId !== id) {
      return NextResponse.json({ success: false, error: 'Material does not belong to this work order' }, { status: 400 });
    }

    // Deleting only the compatibility projection would leave the authoritative
    // RepairMaterialRequest behind and create inconsistent audit/state. Cancel
    // the canonical request instead; projection cleanup can be performed by a
    // controlled migration once legacy consumers are retired.
    return NextResponse.json({
      success: false,
      error: 'Legacy WorkOrderMaterial records cannot be deleted independently. Cancel the canonical RepairMaterialRequest instead.',
      canonicalEndpoint: '/api/repairs/material-requests',
      currentStatus: material.status,
    }, { status: 409 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete material';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
