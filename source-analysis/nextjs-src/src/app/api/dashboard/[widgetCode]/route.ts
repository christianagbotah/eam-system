import { NextRequest, NextResponse } from 'next/server';
import { reportingService } from '@/services/ReportingService';

/**
 * Dashboard Analytics API
 * GET /api/dashboard/[widgetCode] - Get widget data
 */

export async function GET(
    request: NextRequest,
    { params }: { params: { widgetCode: string } }
) {
    try {
        const data = await reportingService.getDashboardData(params.widgetCode);
        
        return NextResponse.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Dashboard data error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data', details: error.message },
            { status: 500 }
        );
    }
}