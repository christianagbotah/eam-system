'use client';

import { useState } from 'react';
import { Download, Printer, FileSpreadsheet, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { KPIMetric, ChartData } from '@/services/RWOP/Reports/BaseReportService';
import ExcelExportService from '@/services/Core/Export/ExcelExportService';
import PDFExportService from '@/services/Core/Export/PDFExportService';
import { useAuth } from '@/hooks/useAuth';

interface ReportDashboardProps {
  title: string;
  description: string;
  kpis: KPIMetric[];
  charts: ChartData[];
  tableData?: any[];
  reportType: string;
  filters: any;
  loading?: boolean;
}

export default function ReportDashboard({
  title,
  description,
  kpis,
  charts,
  tableData,
  reportType,
  filters,
  loading = false
}: ReportDashboardProps) {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const formatKPIValue = (kpi: KPIMetric) => {
    switch (kpi.format) {
      case 'currency':
        return new Intl.NumberFormat('en-GH', {
          style: 'currency',
          currency: 'GHS'
        }).format(Number(kpi.value));
      case 'percentage':
        return `${Number(kpi.value).toFixed(1)}%`;
      case 'hours':
        return `${Number(kpi.value).toFixed(1)}h`;
      default:
        return kpi.value.toString();
    }
  };

  const handleExportExcel = async () => {
    if (!user?.id) return;
    
    setExporting(true);
    try {
      await ExcelExportService.exportAndDownload({
        reportType,
        data: { kpis, charts, tableData },
        filters,
        userId: user.id,
        filename: `${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`
      });
    } catch (error) {
      console.error('Excel export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!user?.id) return;
    
    setExporting(true);
    try {
      await PDFExportService.exportAndDownload({
        reportType,
        data: { kpis, charts, tableData },
        filters,
        userId: user.id,
        filename: `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`
      });
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white print:bg-white print:text-black print:border print:p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 print:text-2xl print:text-black">{title}</h1>
            <p className="text-blue-100 print:text-gray-600">{description}</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-2">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border p-6 print:p-3 print:border print:shadow-none">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 print:text-xs">{kpi.label}</h3>
              {kpi.trend && (
                kpi.trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900 print:text-lg">{formatKPIValue(kpi)}</div>
            {kpi.trend && (
              <div className={`text-sm mt-1 ${kpi.trend > 0 ? 'text-green-600' : 'text-red-600'} print:text-xs`}>
                {kpi.trend > 0 ? '+' : ''}{kpi.trend.toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
        {charts.map((chartData, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border p-6 print:p-4 print:border print:shadow-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 print:text-base">
              {chartData.datasets[0]?.label || `Chart ${index + 1}`}
            </h3>
            <div className="h-64 print:h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">Chart: {chartData.labels.join(', ')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table Data */}
      {tableData && tableData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border print:border print:shadow-none">
          <div className="p-6 print:p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 print:text-base">Detailed Data</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm print:text-xs">
                <thead className="bg-gray-50 print:bg-gray-100">
                  <tr>
                    {Object.keys(tableData[0]).map((key) => (
                      <th key={key} className="px-4 py-3 text-left font-medium text-gray-900 print:px-2 print:py-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-t print:border-gray-300">
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-3 text-gray-900 print:px-2 print:py-1">
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}