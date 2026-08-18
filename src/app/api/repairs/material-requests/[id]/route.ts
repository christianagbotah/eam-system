import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { getPlantScope, canAccessPlant } from '@/lib/plant-scope';

// 24-hour threshold for overdue detection
const OVERDUE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// GET /api/repairs/material-requests/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const matReq = await db.repairMaterialRequest.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, fullName: true, username: true, department: true } },
        supervisorApprovedBy: { select: { id: true, fullName: true } },
        storekeeperApprovedBy: { select: { id: true, fullName: true } },
        issuedByUser: { select: { id: true, fullName: true } },
        returnedByUser: { select: { id: true, fullName: true } },
        workOrder: {
          select: {
            id: true, woNumber: true, title: true, status: true, plantId: true,
            assignedSupervisor: { select: { id: true, fullName: true } },
            planner: { select: { id: true, fullName: true } },
          },
        },
        item: { select: { id: true, itemCode: true, name: true, currentStock: true, unitOfMeasure: true } },
      },
    });

    if (!matReq) return NextResponse.json({ success: false, error: 'Material request not found' }, { status: 404 });

    // Plant scope validation (through linked work order)
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, matReq.workOrder?.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Compute overdue flag: pending requests older than 24 hours
    const enriched = {
      ...matReq,
      isOverdue:
        matReq.status === 'pending' &&
        Date.now() - new Date(matReq.createdAt).getTime() > OVERDUE_THRESHOLD_MS,
    };

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load material request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/repairs/material-requests/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const existing = await db.repairMaterialRequest.findUnique({
      where: { id },
      include: { workOrder: { select: { plantId: true } } },
    });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // Plant scope validation (through linked work order)
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, existing.workOrder?.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Ownership check: only the requester (or admin/supervisor/manager) can edit a pending request
    if (!isAdmin(session) && !hasRole(session, 'maintenance_supervisor') && !hasRole(session, 'maintenance_manager') && !hasRole(session, 'plant_manager')) {
      if (existing.requestedById !== session.userId) {
        return NextResponse.json({ success: false, error: 'You can only edit your own requests' }, { status: 403 });
      }
      if (existing.status !== 'pending') {
        return NextResponse.json({ success: false, error: 'Only pending requests can be edited' }, { status: 400 });
      }
    }

    const body = await request.json();
    const allowedFields: Record<string, unknown> = {};
    if (body.quantityRequested !== undefined) allowedFields.quantityRequested = body.quantityRequested;
    if (body.unit !== undefined) allowedFields.unit = body.unit;
    if (body.unitCost !== undefined) allowedFields.unitCost = body.unitCost;
    if (body.reason !== undefined) allowedFields.reason = body.reason;
    if (body.notes !== undefined) allowedFields.notes = body.notes;
    if (body.urgency !== undefined && ['low', 'normal', 'high', 'critical'].includes(body.urgency)) {
      allowedFields.urgency = body.urgency;
    }

    const updated = await db.repairMaterialRequest.update({
      where: { id },
      data: allowedFields,
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'repair_material_request',
        entityId: id,
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(allowedFields),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update material request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/repairs/material-requests/[id] — cancel (only if pending)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const existing = await db.repairMaterialRequest.findUnique({
      where: { id },
      include: { workOrder: { select: { plantId: true } } },
    });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // Plant scope validation (through linked work order)
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, existing.workOrder?.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Only pending requests can be cancelled' }, { status: 400 });
    }

    // Ownership check: only requester or admin/supervisor/manager can cancel
    if (!isAdmin(session) && !hasRole(session, 'maintenance_supervisor') && !hasRole(session, 'maintenance_manager') && !hasRole(session, 'plant_manager')) {
      if (existing.requestedById !== session.userId) {
        return NextResponse.json({ success: false, error: 'You can only cancel your own requests' }, { status: 403 });
      }
    }

    await db.repairMaterialRequest.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'repair_material_request',
        entityId: id,
        oldValues: JSON.stringify(existing),
      },
    });

    return NextResponse.json({ success: true, message: 'Material request cancelled' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel material request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/material-requests/[id] — workflow actions
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action, approvedQuantity, quantityApproved, quantityReturned, quantityConsumed, quantityWasted, notes } = body;

    const matReq = await db.repairMaterialRequest.findUnique({
      where: { id },
      include: {
        workOrder: {
          select: {
            id: true, woNumber: true, title: true,
            assignedSupervisorId: true, plannerId: true, assignedTo: true,
          },
        },
        requestedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!matReq) return NextResponse.json({ success: false, error: 'Material request not found' }, { status: 404 });

    // ── Role-based access control for workflow actions ──
    if (action === 'supervisor_approve' || action === 'supervisor_reject') {
      if (!isAdmin(session) &&
          !hasRole(session, 'maintenance_supervisor') &&
          !hasRole(session, 'maintenance_manager') &&
          !hasRole(session, 'plant_manager')) {
        return NextResponse.json({ success: false, error: 'Only admin, maintenance supervisor, maintenance manager, or plant manager can supervisor-approve material requests' }, { status: 403 });
      }
    }
    if (action === 'storekeeper_approve' || action === 'storekeeper_reject') {
      if (!isAdmin(session) &&
          !hasRole(session, 'store_keeper') &&
          !hasRole(session, 'inventory_manager') &&
          !hasRole(session, 'tools_shop_attendant')) {
        return NextResponse.json({ success: false, error: 'Only admin, store keeper, store manager, or tools shop attendant can store-approve material requests' }, { status: 403 });
      }
    }

    const now = new Date();
    let updated: any;

    switch (action) {
      // ──────────────────────────────────────────────
      // SUPERVISOR APPROVE — with optional quantity override
      // ──────────────────────────────────────────────
      case 'supervisor_approve': {
        if (matReq.status !== 'pending') {
          return NextResponse.json({ success: false, error: `Cannot approve: current status is ${matReq.status}` }, { status: 400 });
        }
        const qty = approvedQuantity ?? quantityApproved ?? matReq.quantityRequested;
        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: {
            status: 'supervisor_approved',
            supervisorApprovedById: session.userId,
            supervisorApprovedAt: now,
            supervisorApprovedQuantity: qty !== matReq.quantityRequested ? qty : null,
            quantityApproved: qty,
          },
        });

        // Audit trail for supervisor approval
        await db.auditLog.create({
          data: {
            userId: session.userId,
            action: 'material_request_supervisor_approve',
            entityType: 'repair_material_request',
            entityId: id,
            newValues: JSON.stringify({
              action: 'supervisor_approve',
              status: 'supervisor_approved',
              approvedQuantity: qty,
              requestedQuantity: matReq.quantityRequested,
              quantityChanged: qty !== matReq.quantityRequested,
            }),
          },
        });

        // Notify store keepers
        const storeKeepers = await db.user.findMany({
          where: { userRoles: { some: { role: { slug: 'store_keeper' } } }, status: 'active' },
          select: { id: true },
        });
        for (const sk of storeKeepers) {
          await notifyUser(
            sk.id,
            'repair_material_request',
            'Material Request Awaiting Store Approval',
            `${qty} ${matReq.unit} of ${matReq.itemName} approved by supervisor for WO ${matReq.workOrder.woNumber}`,
            'repair_material_request',
            id,
            'maintenance-work-orders',
          );
        }

        // Notify requester
        await notifyUser(
          matReq.requestedById,
          'repair_material_request',
          'Material Request Supervisor Approved',
          qty !== matReq.quantityRequested
            ? `Your request for ${matReq.itemName} was approved (quantity adjusted from ${matReq.quantityRequested} to ${qty})`
            : `Your request for ${matReq.itemName} was approved by supervisor`,
          'repair_material_request',
          id,
          `material-requests?id=${id}`,
        );
        break;
      }

      // ──────────────────────────────────────────────
      // SUPERVISOR REJECT — with rejection reason in notes
      // ──────────────────────────────────────────────
      case 'supervisor_reject': {
        if (matReq.status !== 'pending') {
          return NextResponse.json({ success: false, error: `Cannot reject: current status is ${matReq.status}` }, { status: 400 });
        }
        const rejectionNotes = notes
          ? `[${now.toISOString()}] REJECTED by ${session.userId}: ${notes}`
          : `[${now.toISOString()}] REJECTED by ${session.userId}`;
        const updatedNotes = matReq.notes
          ? `${matReq.notes}\n${rejectionNotes}`
          : rejectionNotes;

        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: {
            status: 'rejected',
            supervisorApprovedById: session.userId,
            supervisorApprovedAt: now,
            notes: updatedNotes,
          },
        });

        // Audit trail for rejection
        await db.auditLog.create({
          data: {
            userId: session.userId,
            action: 'material_request_supervisor_reject',
            entityType: 'repair_material_request',
            entityId: id,
            newValues: JSON.stringify({
              action: 'supervisor_reject',
              status: 'rejected',
              reason: notes || null,
            }),
          },
        });

        await notifyUser(
          matReq.requestedById,
          'repair_material_request',
          'Material Request Rejected',
          `Your request for ${matReq.itemName} was rejected by supervisor${notes ? `: ${notes}` : ''}`,
          'repair_material_request',
          id,
          `material-requests?id=${id}`,
        );
        break;
      }

      // ──────────────────────────────────────────────
      // STOREKEEPER APPROVE — with optional quantity override + stock reservation
      // ──────────────────────────────────────────────
      case 'storekeeper_approve': {
        if (matReq.status !== 'supervisor_approved') {
          return NextResponse.json({ success: false, error: `Cannot approve: current status is ${matReq.status}` }, { status: 400 });
        }

        const qty = approvedQuantity ?? quantityApproved ?? matReq.quantityApproved;

        try {
          updated = await db.$transaction(async (tx) => {
            let stockReserved = false;

            // Reserve stock: deduct from inventory via an 'adjustment' movement
            if (matReq.itemId) {
              const invItem = await tx.inventoryItem.findUnique({ where: { id: matReq.itemId } });
              if (invItem) {
                if (invItem.currentStock < qty) {
                  throw new Error(`INSUFFICIENT_STOCK:Available: ${invItem.currentStock}, Required: ${qty}`);
                }
                // Deduct stock as reservation
                await tx.inventoryItem.update({
                  where: { id: matReq.itemId },
                  data: { currentStock: { decrement: qty } },
                });
                // Create reservation stock movement of type 'adjustment'
                await tx.stockMovement.create({
                  data: {
                    itemId: matReq.itemId,
                    type: 'adjustment',
                    quantity: qty,
                    previousStock: invItem.currentStock,
                    newStock: invItem.currentStock - qty,
                    reason: `Stock reserved for WO ${matReq.workOrder.woNumber} — ${matReq.itemName}`,
                    referenceType: 'work_order',
                    referenceId: matReq.workOrderId,
                    performedById: session.userId,
                    notes: `Reservation: ${qty} ${matReq.unit} reserved for material request ${id.substring(0, 8)}`,
                  },
                });
                stockReserved = true;
              }
            }

            return tx.repairMaterialRequest.update({
              where: { id },
              data: {
                status: 'storekeeper_approved',
                storekeeperApprovedById: session.userId,
                storekeeperApprovedAt: now,
                storekeeperApprovedQuantity: qty !== matReq.quantityApproved ? qty : null,
                quantityApproved: qty,
                stockReserved,
              },
            });
          });
        } catch (txError: unknown) {
          if (txError instanceof Error && txError.message.startsWith('INSUFFICIENT_STOCK:')) {
            return NextResponse.json({
              success: false,
              error: `Insufficient stock to reserve. ${txError.message.replace('INSUFFICIENT_STOCK:', '')}`,
            }, { status: 400 });
          }
          throw txError;
        }

        // Audit trail for storekeeper approval with reservation details
        await db.auditLog.create({
          data: {
            userId: session.userId,
            action: 'material_request_storekeeper_approve',
            entityType: 'repair_material_request',
            entityId: id,
            newValues: JSON.stringify({
              action: 'storekeeper_approve',
              status: 'storekeeper_approved',
              approvedQuantity: qty,
              previousApprovedQuantity: matReq.quantityApproved,
              quantityChanged: qty !== matReq.quantityApproved,
              stockReserved: updated.stockReserved,
              itemId: matReq.itemId || null,
            }),
          },
        });

        await notifyUser(
          matReq.requestedById,
          'repair_material_request',
          'Material Request Ready for Issuance',
          `${qty} ${matReq.unit} of ${matReq.itemName} approved by store keeper. Ready for pickup.`,
          'repair_material_request',
          id,
          `material-requests?id=${id}`,
        );
        break;
      }

      // ──────────────────────────────────────────────
      // STOREKEEPER REJECT — with rejection reason in notes
      // ──────────────────────────────────────────────
      case 'storekeeper_reject': {
        if (matReq.status !== 'supervisor_approved') {
          return NextResponse.json({ success: false, error: `Cannot reject: current status is ${matReq.status}` }, { status: 400 });
        }
        const rejectionNotes = notes
          ? `[${now.toISOString()}] REJECTED by store: ${notes}`
          : `[${now.toISOString()}] REJECTED by store keeper ${session.userId}`;
        const updatedNotes = matReq.notes
          ? `${matReq.notes}\n${rejectionNotes}`
          : rejectionNotes;

        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: {
            status: 'rejected',
            storekeeperApprovedById: session.userId,
            storekeeperApprovedAt: now,
            notes: updatedNotes,
          },
        });

        // Audit trail for store rejection
        await db.auditLog.create({
          data: {
            userId: session.userId,
            action: 'material_request_storekeeper_reject',
            entityType: 'repair_material_request',
            entityId: id,
            newValues: JSON.stringify({
              action: 'storekeeper_reject',
              status: 'rejected',
              reason: notes || null,
            }),
          },
        });

        await notifyUser(
          matReq.requestedById,
          'repair_material_request',
          'Material Request Rejected by Store',
          `Your request for ${matReq.itemName} was rejected by store keeper${notes ? `: ${notes}` : ''}`,
          'repair_material_request',
          id,
          `material-requests?id=${id}`,
        );
        break;
      }

      // ──────────────────────────────────────────────
      // ISSUE — handle both reserved and non-reserved stock
      // ──────────────────────────────────────────────
      case 'issue': {
        if (matReq.status !== 'storekeeper_approved' && matReq.status !== 'picking') {
          return NextResponse.json({ success: false, error: `Cannot issue: current status is ${matReq.status}` }, { status: 400 });
        }
        const qtyToIssue = approvedQuantity ?? quantityApproved ?? matReq.quantityApproved;

        try {
          updated = await db.$transaction(async (tx) => {
            // If stock was already reserved at storekeeper approval, just create the issue record.
            // If not reserved (no itemId or no reservation happened), deduct stock now.
            if (matReq.itemId) {
              const invItem = await tx.inventoryItem.findUnique({ where: { id: matReq.itemId } });

              if (matReq.stockReserved) {
                // Stock was already deducted during reservation — just record the issuance
                if (invItem) {
                  await tx.stockMovement.create({
                    data: {
                      itemId: matReq.itemId,
                      type: 'out',
                      quantity: qtyToIssue,
                      previousStock: invItem.currentStock,
                      newStock: invItem.currentStock, // already deducted during reservation
                      reason: `Issued for WO ${matReq.workOrder.woNumber} (from reserved stock)`,
                      referenceType: 'work_order',
                      referenceId: matReq.workOrderId,
                      performedById: session.userId,
                      notes: `Issuance from reserved stock for material request ${id.substring(0, 8)}` + (notes ? ` — ${notes}` : ''),
                    },
                  });
                }
              } else {
                // Stock was NOT reserved — deduct now
                if (invItem) {
                  if (invItem.currentStock < qtyToIssue) {
                    throw new Error(`INSUFFICIENT_STOCK:Available: ${invItem.currentStock}, Requested: ${qtyToIssue}`);
                  }
                  await tx.inventoryItem.update({
                    where: { id: matReq.itemId },
                    data: { currentStock: { decrement: qtyToIssue } },
                  });
                  await tx.stockMovement.create({
                    data: {
                      itemId: matReq.itemId,
                      type: 'out',
                      quantity: qtyToIssue,
                      previousStock: invItem.currentStock,
                      newStock: invItem.currentStock - qtyToIssue,
                      reason: `Issued for WO ${matReq.workOrder.woNumber}`,
                      referenceType: 'work_order',
                      referenceId: matReq.workOrderId,
                      performedById: session.userId,
                      notes: notes || null,
                    },
                  });
                }
              }
            }

            return tx.repairMaterialRequest.update({
              where: { id },
              data: {
                status: 'issued',
                quantityIssued: qtyToIssue,
                issuedById: session.userId,
                issuedAt: now,
              },
            });
          });
        } catch (txError: unknown) {
          if (txError instanceof Error && txError.message.startsWith('INSUFFICIENT_STOCK:')) {
            return NextResponse.json({
              success: false,
              error: `Insufficient stock. ${txError.message.replace('INSUFFICIENT_STOCK:', '')}`,
            }, { status: 400 });
          }
          throw txError;
        }

        // Audit trail for issuance
        await db.auditLog.create({
          data: {
            userId: session.userId,
            action: 'material_request_issue',
            entityType: 'repair_material_request',
            entityId: id,
            newValues: JSON.stringify({
              action: 'issue',
              status: 'issued',
              quantityIssued: qtyToIssue,
              wasReserved: !!matReq.stockReserved,
              itemId: matReq.itemId || null,
            }),
          },
        });

        // Notify requester
        await notifyUser(
          matReq.requestedById,
          'repair_material_request',
          'Materials Issued',
          `${qtyToIssue} ${matReq.unit} of ${matReq.itemName} issued for WO ${matReq.workOrder.woNumber}`,
          'repair_material_request',
          id,
          `material-requests?id=${id}`,
        );

        // Notify work order's planner when material is issued
        if (matReq.workOrder.plannerId && matReq.workOrder.plannerId !== matReq.requestedById) {
          await notifyUser(
            matReq.workOrder.plannerId,
            'repair_material_request',
            'Material Issued for Planned Work Order',
            `${qtyToIssue} ${matReq.unit} of ${matReq.itemName} issued for WO ${matReq.workOrder.woNumber}`,
            'repair_material_request',
            id,
            'maintenance-work-orders',
          );
        }

        // Notify assigned supervisor if different from planner
        if (matReq.workOrder.assignedSupervisorId
            && matReq.workOrder.assignedSupervisorId !== matReq.requestedById
            && matReq.workOrder.assignedSupervisorId !== matReq.workOrder.plannerId) {
          await notifyUser(
            matReq.workOrder.assignedSupervisorId,
            'repair_material_request',
            'Material Issued for WO Under Your Supervision',
            `${qtyToIssue} ${matReq.unit} of ${matReq.itemName} issued for WO ${matReq.workOrder.woNumber}`,
            'repair_material_request',
            id,
            'maintenance-work-orders',
          );
        }
        break;
      }

      // ──────────────────────────────────────────────
      // RECORD RETURN — with cumulative return tracking
      // ──────────────────────────────────────────────
      case 'record_return': {
        if (matReq.status !== 'issued' && matReq.status !== 'partially_returned') {
          return NextResponse.json({ success: false, error: `Cannot record return: current status is ${matReq.status}` }, { status: 400 });
        }
        const qtyToReturn = approvedQuantity ?? quantityApproved ?? quantityReturned ?? 0;

        if (qtyToReturn <= 0) {
          return NextResponse.json({ success: false, error: 'Return quantity must be greater than 0' }, { status: 400 });
        }

        // Validate cumulative returns don't exceed issued quantity
        const previousReturned = matReq.quantityReturned || 0;
        const cumulativeReturn = previousReturned + qtyToReturn;
        if (cumulativeReturn > matReq.quantityIssued) {
          return NextResponse.json({
            success: false,
            error: `Cumulative returns (${cumulativeReturn}) would exceed issued quantity (${matReq.quantityIssued}). Already returned: ${previousReturned}. Max additional return: ${matReq.quantityIssued - previousReturned}`,
          }, { status: 400 });
        }

        const newStatus = cumulativeReturn >= matReq.quantityIssued ? 'fully_returned' : 'partially_returned';

        updated = await db.$transaction(async (tx) => {
          // Add back to inventory
          if (matReq.itemId && qtyToReturn > 0) {
            const invItem = await tx.inventoryItem.findUnique({ where: { id: matReq.itemId } });
            if (invItem) {
              await tx.inventoryItem.update({
                where: { id: matReq.itemId },
                data: { currentStock: { increment: qtyToReturn } },
              });
              await tx.stockMovement.create({
                data: {
                  itemId: matReq.itemId,
                  type: 'in',
                  quantity: qtyToReturn,
                  previousStock: invItem.currentStock,
                  newStock: invItem.currentStock + qtyToReturn,
                  reason: `Returned from WO ${matReq.workOrder.woNumber}`,
                  referenceType: 'work_order',
                  referenceId: matReq.workOrderId,
                  performedById: session.userId,
                  notes: `Return #${Math.floor(previousReturned) + 1}: ${qtyToReturn} ${matReq.unit}` + (notes ? ` — ${notes}` : ''),
                },
              });
            }
          }

          return tx.repairMaterialRequest.update({
            where: { id },
            data: {
              status: newStatus,
              quantityReturned: cumulativeReturn,
              returnedById: session.userId,
              returnedAt: now,
            },
          });
        });

        // Audit trail for return with cumulative tracking
        await db.auditLog.create({
          data: {
            userId: session.userId,
            action: 'material_request_record_return',
            entityType: 'repair_material_request',
            entityId: id,
            newValues: JSON.stringify({
              action: 'record_return',
              status: newStatus,
              returnQuantity: qtyToReturn,
              previousReturned,
              cumulativeReturned: cumulativeReturn,
              quantityIssued: matReq.quantityIssued,
              itemId: matReq.itemId || null,
            }),
          },
        });

        // Notify requester about the return
        await notifyUser(
          matReq.requestedById,
          'repair_material_request',
          newStatus === 'fully_returned'
            ? 'All Materials Returned'
            : 'Partial Material Return Recorded',
          newStatus === 'fully_returned'
            ? `All ${matReq.quantityIssued} ${matReq.unit} of ${matReq.itemName} returned for WO ${matReq.workOrder.woNumber}`
            : `${qtyToReturn} ${matReq.unit} of ${matReq.itemName} returned for WO ${matReq.workOrder.woNumber}. Total returned: ${cumulativeReturn}/${matReq.quantityIssued}`,
          'repair_material_request',
          id,
          `material-requests?id=${id}`,
        );
        break;
      }

      // ──────────────────────────────────────────────
      // CONSUME MATERIAL — record actual consumption
      // ──────────────────────────────────────────────
      case 'consume_material': {
        // Authorization: only assigned technician or admin
        if (!isAdmin(session) && matReq.workOrder.assignedTo !== session.userId) {
          return NextResponse.json({ success: false, error: 'Only the assigned technician or admin can record material consumption' }, { status: 403 });
        }

        if (matReq.status !== 'issued') {
          return NextResponse.json({ success: false, error: `Cannot consume: current status is ${matReq.status}. Materials must be issued first.` }, { status: 400 });
        }

        if (!quantityConsumed || quantityConsumed <= 0) {
          return NextResponse.json({ success: false, error: 'Consumption quantity must be greater than 0' }, { status: 400 });
        }

        const previousConsumed = matReq.consumedQty || 0;
        const previousWasted = matReq.wastedQty || 0;
        const previousReturned = matReq.quantityReturned || 0;
        const available = matReq.quantityIssued - previousConsumed - previousWasted - previousReturned;

        if (quantityConsumed > available + 0.0001) { // floating-point tolerance
          return NextResponse.json({
            success: false,
            error: `Cannot consume ${quantityConsumed}: only ${Math.max(0, available)} available (issued: ${matReq.quantityIssued}, consumed: ${previousConsumed}, wasted: ${previousWasted}, returned: ${previousReturned})`,
          }, { status: 400 });
        }

        const newConsumed = previousConsumed + quantityConsumed;
        const totalAccounted = newConsumed + previousWasted + previousReturned;
        const newStatus = totalAccounted >= matReq.quantityIssued - 0.0001 ? 'fully_consumed' : matReq.status;

        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: {
            consumedQty: newConsumed,
            ...(newStatus !== matReq.status ? { status: newStatus } : {}),
          },
        });

        // Audit trail for consumption
        await db.auditLog.create({
          data: {
            userId: session.userId,
            action: 'material_request_consume',
            entityType: 'repair_material_request',
            entityId: id,
            newValues: JSON.stringify({
              action: 'consume_material',
              quantityConsumed,
              previousConsumed,
              newConsumed,
              available,
              quantityIssued: matReq.quantityIssued,
              status: newStatus,
              notes: notes || null,
            }),
          },
        });

        // Notify supervisor when material is consumed
        if (matReq.workOrder.assignedSupervisorId) {
          await notifyUser(
            matReq.workOrder.assignedSupervisorId,
            'repair_material_request',
            'Material Consumed',
            `${quantityConsumed} ${matReq.unit} of ${matReq.itemName} consumed for WO ${matReq.workOrder.woNumber}. Total consumed: ${newConsumed}/${matReq.quantityIssued}`,
            'repair_material_request',
            id,
            'maintenance-work-orders',
          );
        }

        break;
      }

      // ──────────────────────────────────────────────
      // WASTE MATERIAL — record wasted/discarded material
      // ──────────────────────────────────────────────
      case 'waste_material': {
        // Authorization: only assigned technician or admin
        if (!isAdmin(session) && matReq.workOrder.assignedTo !== session.userId) {
          return NextResponse.json({ success: false, error: 'Only the assigned technician or admin can record material waste' }, { status: 403 });
        }

        if (matReq.status !== 'issued') {
          return NextResponse.json({ success: false, error: `Cannot record waste: current status is ${matReq.status}. Materials must be issued first.` }, { status: 400 });
        }

        if (!quantityWasted || quantityWasted <= 0) {
          return NextResponse.json({ success: false, error: 'Waste quantity must be greater than 0' }, { status: 400 });
        }

        const previousConsumed = matReq.consumedQty || 0;
        const previousWasted = matReq.wastedQty || 0;
        const previousReturned = matReq.quantityReturned || 0;
        const available = matReq.quantityIssued - previousConsumed - previousWasted - previousReturned;

        if (quantityWasted > available + 0.0001) { // floating-point tolerance
          return NextResponse.json({
            success: false,
            error: `Cannot waste ${quantityWasted}: only ${Math.max(0, available)} available (issued: ${matReq.quantityIssued}, consumed: ${previousConsumed}, wasted: ${previousWasted}, returned: ${previousReturned})`,
          }, { status: 400 });
        }

        const newWasted = previousWasted + quantityWasted;
        const totalAccounted = previousConsumed + newWasted + previousReturned;
        const newStatus = totalAccounted >= matReq.quantityIssued - 0.0001 ? 'fully_consumed' : matReq.status;

        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: {
            wastedQty: newWasted,
            ...(newStatus !== matReq.status ? { status: newStatus } : {}),
          },
        });

        // Audit trail for waste
        await db.auditLog.create({
          data: {
            userId: session.userId,
            action: 'material_request_waste',
            entityType: 'repair_material_request',
            entityId: id,
            newValues: JSON.stringify({
              action: 'waste_material',
              quantityWasted,
              previousWasted,
              newWasted,
              available,
              quantityIssued: matReq.quantityIssued,
              status: newStatus,
              notes: notes || null,
            }),
          },
        });

        // Notify supervisor when material is wasted
        if (matReq.workOrder.assignedSupervisorId) {
          await notifyUser(
            matReq.workOrder.assignedSupervisorId,
            'repair_material_request',
            'Material Wasted',
            `${quantityWasted} ${matReq.unit} of ${matReq.itemName} wasted for WO ${matReq.workOrder.woNumber}. Total wasted: ${newWasted}/${matReq.quantityIssued}`,
            'repair_material_request',
            id,
            'maintenance-work-orders',
          );
        }

        break;
      }

      // ──────────────────────────────────────────────
      // RECONCILE — validate consumed + wasted + returned == issued
      // ──────────────────────────────────────────────
      case 'reconcile': {
        const consumed = matReq.consumedQty || 0;
        const wasted = matReq.wastedQty || 0;
        const returned = matReq.quantityReturned || 0;
        const issued = matReq.quantityIssued;
        const totalAccounted = consumed + wasted + returned;
        const discrepancy = Math.round((issued - totalAccounted) * 1000) / 1000;
        const balanced = Math.abs(discrepancy) < 0.001;

        return NextResponse.json({
          success: true,
          data: {
            reconciliation: {
              materialRequestId: id,
              itemName: matReq.itemName,
              issued,
              consumed,
              wasted,
              returned,
              totalAccounted,
              discrepancy,
              balanced,
              status: balanced ? 'reconciled' : 'unreconciled',
              workOrderNumber: matReq.workOrder.woNumber,
            },
          },
        });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Note: per-action audit logs are written inside each case above.
    // The catch-all audit log below is kept as a safety net but will be a duplicate.
    // Since each action now writes its own detailed audit log, we skip the generic one.
    // await db.auditLog.create({ ... });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
