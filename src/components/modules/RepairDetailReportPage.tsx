'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileSpreadsheet, Download, RefreshCw, Filter, Building2, Wrench, Clock, DollarSign } from 'lucide-react';

export default function RepairDetailReportPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [plantId, setPlantId] = useState('');
  const [plants, setPlants] = useState<any[]>([]);

  // Load plants for filter dropdown
  useEffect(() => {
    api.get<any[]>('/api/plants').then((res) => {
      if (res.success && res.data) {
        setPlants(Array.isArray(res.data) ? res.data : []);
      }
    });
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (plantId) params.set('plantId', plantId);

      const res = await api.get(`/api/repairs/reports/detailed?${params.toString()}`);
      if (res.success) {
        setData(res.data || []);
        setSummary(res.summary || null);
      } else {
        toast.error(res.error || 'Failed to load report');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load report');
    }
    setLoading(false);
  }, [dateFrom, dateTo, statusFilter, typeFilter, plantId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (plantId) params.set('plantId', plantId);
      params.set('format', 'xlsx');

      const res = await api.getRaw(`/api/repairs/reports/detailed?${params.toString()}`, { timeout: 60_000 });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `repair-details-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success('Excel report downloaded');
      } else {
        toast.error('Failed to download report');
      }
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    }
    setExporting(false);
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const criticalityColor = (c: string) => {
    switch (c) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Repair Detail Report</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Machine name + parts worked on — with Excel export
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting || data.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {exporting ? (
            <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
          )}
          Export Excel
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Total WOs', value: summary.totalWorkOrders, icon: Wrench, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { label: 'With Parts Specified', value: summary.workOrdersWithComponents, icon: Building2, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
            { label: 'Total Rows', value: summary.totalRows, icon: Filter, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
          ].map((s) => (
            <Card key={s.label} className="border-0 shadow-sm dark:bg-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm dark:bg-card mt-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="predictive">Predictive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {plants.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Plant</Label>
                <Select value={plantId} onValueChange={setPlantId}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Plants" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Plants</SelectItem>
                    {plants.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button variant="outline" onClick={loadReport} disabled={loading} size="sm">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-0 shadow-sm dark:bg-card mt-4 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Loading report data...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No completed repair work orders found</p>
              <p className="text-xs mt-1">Adjust the filters or complete repair work orders to see data here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="whitespace-nowrap">WO Number</TableHead>
                    <TableHead className="whitespace-nowrap">Machine Name</TableHead>
                    <TableHead className="whitespace-nowrap">Component/Part</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">Component Code</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Criticality</TableHead>
                    <TableHead className="whitespace-nowrap">Priority</TableHead>
                    <TableHead className="whitespace-nowrap">Assigned To</TableHead>
                    <TableHead className="whitespace-nowrap hidden xl:table-cell">Root Cause</TableHead>
                    <TableHead className="whitespace-nowrap hidden xl:table-cell">Materials Used</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Mat. Cost</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Labor Hrs</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Total Cost</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">{row['WO Number'] as string}</TableCell>
                      <TableCell className="font-medium">{row['Machine Name'] as string}</TableCell>
                      <TableCell>
                        {(row['Component/Part'] as string) === '(No component specified)' ? (
                          <span className="text-muted-foreground text-xs italic">No component specified</span>
                        ) : (
                          <span>{row['Component/Part'] as string}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">
                        {row['Component Code'] as string}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {row['Component Criticality'] as string ? (
                          <Badge variant={criticalityColor(row['Component Criticality'] as string) as any}>
                            {row['Component Criticality'] as string}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityColor(row['Priority'] as string) as any}>
                          {row['Priority'] as string}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{row['Assigned To'] as string}</TableCell>
                      <TableCell className="hidden xl:table-cell max-w-[200px] truncate text-xs text-muted-foreground">
                        {row['Root Cause'] as string || '—'}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell max-w-[200px] truncate text-xs">
                        {row['Materials Used'] as string || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {(row['Total Material Cost'] as number)?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {(row['Labor Hours'] as number)?.toFixed(1) || '0'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {(row['Total Cost'] as number)?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {row['Completed'] as string || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer info */}
      <div className="mt-4 text-xs text-muted-foreground flex items-center justify-between">
        <span>{data.length} row(s) displayed</span>
        <span>Report includes: WO Number, Machine Name, Parts/Components worked on, costs, labor hours</span>
      </div>
    </div>
  );
}
