import { NextRequest, NextResponse } from 'next/server';
import { reportingService } from '@/services/ReportingService';

/**
 * Enterprise Reporting API Endpoints
 * GET /api/reports/[reportCode] - Generate report
 */

export async function GET(
    request: NextRequest,
    { params }: { params: { reportCode: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') as 'pdf' | 'xlsx' | 'csv' || 'pdf';
        const parameters = Object.fromEntries(searchParams.entries());
        
        // Remove format from parameters
        delete parameters.format;

        const reportBuffer = await reportingService.generateReport(
            params.reportCode,
            parameters,
            format
        );

        const contentTypes = {
            pdf: 'application/pdf',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            csv: 'text/csv'
        };

        const extensions = {
            pdf: 'pdf',
            xlsx: 'xlsx',
            csv: 'csv'
        };

        return new NextResponse(reportBuffer, {
            headers: {
                'Content-Type': contentTypes[format],
                'Content-Disposition': `attachment; filename="${params.reportCode}.${extensions[format]}"`,
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Report generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate report', details: error.message },
            { status: 500 }
        );
    }
}