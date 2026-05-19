// ============================================================================
// REPORT EXPORT — Generate downloadable reports in various formats
// ============================================================================

import { createLogger } from '@/lib/logger';

const logger = createLogger('reportExport');

export type ExportFormat = 'csv' | 'json';

export interface ReportConfig {
  title: string;
  description?: string;
  period: { start: string; end: string };
  sections: ReportSection[];
  generatedBy: string;
  plantId?: string;
}

export interface ReportSection {
  title: string;
  type: 'table' | 'summary' | 'chart' | 'text';
  headers?: string[];
  rows: (string | number | null | undefined)[][];
  summary?: Record<string, unknown>;
}

export class ReportExportService {
  /**
   * Export data as CSV
   */
  static toCSV(report: ReportConfig): string {
    const lines: string[] = [];

    // Header
    lines.push(`"${report.title}","Generated: ${new Date().toISOString()}","Period: ${report.period.start} to ${report.period.end}"`);

    if (report.description) {
      lines.push(`"${report.description}"`);
    }

    lines.push(''); // Empty line separator

    // Sections
    for (const section of report.sections) {
      lines.push(`=== ${section.title} ===`);
      lines.push('');

      if (section.type === 'summary' && section.summary) {
        lines.push('Metric,Value');
        for (const [key, value] of Object.entries(section.summary)) {
          lines.push(`"${key}","${String(value)}"`);
        }
      } else if (section.type === 'table') {
        if (section.headers) {
          lines.push(section.headers.map(h => `"${h}"`).join(','));
        }
        for (const row of section.rows) {
          lines.push(row.map(cell => {
            const val = cell === null || cell === undefined ? '' : String(cell);
            return `"${val.replace(/"/g, '""')}"`;
          }).join(','));
        }
      } else if (section.type === 'text') {
        for (const row of section.rows) {
          lines.push(...row.map(String));
        }
      }

      lines.push(''); // Empty line between sections
    }

    return lines.join('\n');
  }

  /**
   * Export data as JSON
   */
  static toJSON(report: ReportConfig): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate download response
   */
  static generateDownload(format: ExportFormat, report: ReportConfig): { content: string; filename: string; contentType: string } {
    const safeName = report.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'csv':
        return {
          content: this.toCSV(report),
          filename: `${safeName}_${date}.csv`,
          contentType: 'text/csv',
        };
      case 'json':
        return {
          content: this.toJSON(report),
          filename: `${safeName}_${date}.json`,
          contentType: 'application/json',
        };
      default:
        return {
          content: this.toCSV(report),
          filename: `${safeName}_${date}.csv`,
          contentType: 'text/csv',
        };
    }
  }
}
