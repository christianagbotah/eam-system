import api from '@/lib/api';
import AuditService from '../RWOP/AuditService';

export interface ExcelExportOptions {
  reportType: string;
  data: any;
  filters: any;
  userId: number;
  filename?: string;
}

export class ExcelExportService {
  
  /**
   * Export report data to Excel
   */
  async exportReport(options: ExcelExportOptions): Promise<Blob> {
    try {
      // Log export attempt
      await AuditService.logEnforcement(
        'report_export',
        options.reportType,
        options.userId,
        'EXCEL_EXPORT_INITIATED',
        {
          report_type: options.reportType,
          filters: options.filters,
          filename: options.filename
        }
      );

      const response = await api.post('/exports/excel', {
        reportType: options.reportType,
        data: options.data,
        filters: options.filters,
        options: {
          filename: options.filename || `${options.reportType}_${new Date().toISOString().split('T')[0]}.xlsx`,
          includeCharts: true,
          includeKPIs: true
        }
      }, {
        responseType: 'blob'
      });

      // Log successful export
      await AuditService.logEnforcement(
        'report_export',
        options.reportType,
        options.userId,
        'EXCEL_EXPORT_SUCCESS',
        {
          file_size: response.data.size,
          export_time: new Date().toISOString()
        }
      );

      return response.data;
    } catch (error) {
      // Log failed export
      await AuditService.logEnforcement(
        'report_export',
        options.reportType,
        options.userId,
        'EXCEL_EXPORT_FAILED',
        {
          error_message: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  }

  /**
   * Download Excel file
   */
  downloadExcel(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export with automatic download
   */
  async exportAndDownload(options: ExcelExportOptions) {
    const blob = await this.exportReport(options);
    const filename = options.filename || `${options.reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    this.downloadExcel(blob, filename);
  }
}

export default new ExcelExportService();