import api from '@/lib/api';
import AuditService from '../RWOP/AuditService';

export interface PDFExportOptions {
  reportType: string;
  data: any;
  filters: any;
  userId: number;
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter';
}

export class PDFExportService {
  
  /**
   * Export report data to PDF
   */
  async exportReport(options: PDFExportOptions): Promise<Blob> {
    try {
      // Log export attempt
      await AuditService.logEnforcement(
        'report_export',
        options.reportType,
        options.userId,
        'PDF_EXPORT_INITIATED',
        {
          report_type: options.reportType,
          filters: options.filters,
          filename: options.filename,
          orientation: options.orientation,
          page_size: options.pageSize
        }
      );

      const response = await api.post('/exports/pdf', {
        reportType: options.reportType,
        data: options.data,
        filters: options.filters,
        options: {
          filename: options.filename || `${options.reportType}_${new Date().toISOString().split('T')[0]}.pdf`,
          orientation: options.orientation || 'portrait',
          pageSize: options.pageSize || 'A4',
          includeCharts: true,
          includeHeader: true,
          includeFooter: true,
          companyLogo: true
        }
      }, {
        responseType: 'blob'
      });

      // Log successful export
      await AuditService.logEnforcement(
        'report_export',
        options.reportType,
        options.userId,
        'PDF_EXPORT_SUCCESS',
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
        'PDF_EXPORT_FAILED',
        {
          error_message: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  }

  /**
   * Download PDF file
   */
  downloadPDF(blob: Blob, filename: string) {
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
  async exportAndDownload(options: PDFExportOptions) {
    const blob = await this.exportReport(options);
    const filename = options.filename || `${options.reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
    this.downloadPDF(blob, filename);
  }

  /**
   * Print report (opens in new window)
   */
  async printReport(options: PDFExportOptions) {
    const blob = await this.exportReport(options);
    const url = window.URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
}

export default new PDFExportService();