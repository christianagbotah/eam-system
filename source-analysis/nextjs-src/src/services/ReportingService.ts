import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Enterprise Reporting Service
 * Server-side report generation with XLSX and PDF export
 */
export class ReportingService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/factorymanager/public/index.php/api/v1';
    }

    /**
     * Generate report based on definition
     */
    async generateReport(reportCode: string, parameters: any = {}, format: 'pdf' | 'xlsx' | 'csv' = 'pdf') {
        try {
            // Get report definition
            const reportDef = await this.getReportDefinition(reportCode);
            if (!reportDef) {
                throw new Error(`Report definition not found: ${reportCode}`);
            }

            // Execute report query with parameters
            const data = await this.executeReportQuery(reportDef.sql_query, parameters);

            // Generate output based on format
            switch (format) {
                case 'xlsx':
                    return this.generateExcel(data, reportDef.report_name);
                case 'pdf':
                    return this.generatePDF(data, reportDef.report_name);
                case 'csv':
                    return this.generateCSV(data);
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
        } catch (error) {
            console.error('Report generation error:', error);
            throw error;
        }
    }

    /**
     * Get report definition from database
     */
    private async getReportDefinition(reportCode: string) {
        const response = await fetch(`${this.apiUrl}/eam/reports/definitions/${reportCode}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch report definition: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Execute report query
     */
    private async executeReportQuery(sqlQuery: string, parameters: any) {
        const response = await fetch(`${this.apiUrl}/eam/reports/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: sqlQuery,
                parameters
            })
        });

        if (!response.ok) {
            throw new Error(`Query execution failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Generate Excel file
     */
    private generateExcel(data: any[], reportName: string): Buffer {
        const workbook = XLSX.utils.book_new();
        
        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(data);
        
        // Auto-size columns
        const colWidths = this.calculateColumnWidths(data);
        worksheet['!cols'] = colWidths;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');
        
        // Generate buffer
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    /**
     * Generate PDF file
     */
    private generatePDF(data: any[], reportName: string): Buffer {
        const doc = new jsPDF('landscape');
        
        // Add title
        doc.setFontSize(16);
        doc.text(reportName, 20, 20);
        
        // Add generation date
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
        
        if (data.length > 0) {
            // Prepare table data
            const columns = Object.keys(data[0]);
            const rows = data.map(row => columns.map(col => row[col] || ''));
            
            // Add table
            (doc as any).autoTable({
                head: [columns],
                body: rows,
                startY: 40,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });
        }
        
        return Buffer.from(doc.output('arraybuffer'));
    }

    /**
     * Generate CSV file
     */
    private generateCSV(data: any[]): string {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    return typeof value === 'string' && value.includes(',') 
                        ? `"${value}"` 
                        : value;
                }).join(',')
            )
        ].join('\n');
        
        return csvContent;
    }

    /**
     * Calculate column widths for Excel
     */
    private calculateColumnWidths(data: any[]) {
        if (data.length === 0) return [];
        
        const headers = Object.keys(data[0]);
        return headers.map(header => {
            const maxLength = Math.max(
                header.length,
                ...data.map(row => String(row[header] || '').length)
            );
            return { width: Math.min(maxLength + 2, 50) };
        });
    }

    /**
     * Get dashboard widget data
     */
    async getDashboardData(widgetCode: string) {
        const response = await fetch(`${this.apiUrl}/eam/dashboard/widgets/${widgetCode}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch widget data: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Get financial summary data
     */
    async getFinancialSummary(period: string = 'monthly') {
        const response = await fetch(`${this->apiUrl}/eam/analytics/financial-summary?period=${period}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch financial summary: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Get SLA performance metrics
     */
    async getSLAPerformance(days: number = 30) {
        const response = await fetch(`${this.apiUrl}/eam/analytics/sla-performance?days=${days}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch SLA performance: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Get asset reliability metrics
     */
    async getAssetReliability(assetId?: number) {
        const url = assetId 
            ? `${this.apiUrl}/eam/analytics/asset-reliability/${assetId}`
            : `${this.apiUrl}/eam/analytics/asset-reliability`;
            
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch asset reliability: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Get downtime cost analysis
     */
    async getDowntimeCostAnalysis(period: string = 'monthly') {
        const response = await fetch(`${this.apiUrl}/eam/analytics/downtime-cost?period=${period}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch downtime analysis: ${response.statusText}`);
        }
        return response.json();
    }
}

// Export singleton instance
export const reportingService = new ReportingService();