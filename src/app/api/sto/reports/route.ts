import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { StoExecutionService } from '@/services/sto/execution.service';
import { StoSchedulingService } from '@/services/sto/scheduling.service';
import { StoContractorService } from '@/services/sto/contractor.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const type = searchParams.get('type');

    if (!eventId) {
      return NextResponse.json({ success: false, error: 'eventId is required' }, { status: 400 });
    }

    let report;

    switch (type) {
      case 'closeout':
        report = await StoExecutionService.generateCloseoutReport(eventId);
        break;

      case 'actual_vs_planned':
        report = await StoExecutionService.getActualVsPlanned(eventId);
        break;

      case 'package_completion':
        report = await StoExecutionService.getPackageCompletion(eventId);
        break;

      case 'overlaps':
        report = await StoSchedulingService.detectOverlaps();
        break;

      case 'resource_constraints':
        report = await StoSchedulingService.checkResourceConstraints(eventId);
        break;

      case 'contractor_performance': {
        const contractorId = searchParams.get('contractorId');
        if (!contractorId) {
          return NextResponse.json({ success: false, error: 'contractorId required for performance report' }, { status: 400 });
        }
        report = await StoContractorService.getContractorPerformance(contractorId);
        break;
      }

      case 'expiring_certifications': {
        const days = parseInt(searchParams.get('days') || '30', 10);
        report = await StoContractorService.getExpiringCertifications(days);
        break;
      }

      default:
        // Default: closeout report
        report = await StoExecutionService.generateCloseoutReport(eventId);
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
