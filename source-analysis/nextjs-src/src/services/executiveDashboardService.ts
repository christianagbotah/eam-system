import { api } from '@/lib/api'

export interface ExecutiveMetrics {
  totalAssets: number
  activeWorkOrders: number
  overdueWorkOrders: number
  maintenanceCosts: number
  avgOEE: number
  mtbf: number
  mttr: number
  complianceRate: number
}

export interface CostTrend {
  period: string
  laborCost: number
  partsCost: number
  contractorCost: number
  downtimeCost: number
  totalCost: number
}

export interface AssetHealth {
  assetId: number
  assetName: string
  criticality: 'low' | 'medium' | 'high' | 'critical'
  healthScore: number
  lastMaintenance: string
  nextMaintenance: string
  status: 'good' | 'warning' | 'critical'
}

class ExecutiveDashboardService {
  async getExecutiveMetrics(): Promise<ExecutiveMetrics> {
    const response = await api.get('/dashboard/executive-metrics')
    return response.data
  }

  async getCostTrends(months: number = 12): Promise<CostTrend[]> {
    const response = await api.get(`/financial/cost-summary?months=${months}`)
    return response.data.map((item: any) => ({
      period: item.period,
      laborCost: parseFloat(item.labor_cost || 0),
      partsCost: parseFloat(item.parts_cost || 0),
      contractorCost: parseFloat(item.contractor_cost || 0),
      downtimeCost: parseFloat(item.downtime_cost || 0),
      totalCost: parseFloat(item.total_cost || 0)
    }))
  }

  async getAssetHealth(): Promise<AssetHealth[]> {
    const response = await api.get('/assets/health-summary')
    return response.data.map((asset: any) => ({
      assetId: asset.id,
      assetName: asset.name,
      criticality: asset.criticality,
      healthScore: asset.health_score || 85,
      lastMaintenance: asset.last_maintenance,
      nextMaintenance: asset.next_maintenance,
      status: this.calculateHealthStatus(asset.health_score)
    }))
  }

  async getKPIDashboard() {
    const response = await api.get('/dashboard/kpi-summary')
    return response.data
  }

  async getFinancialSummary() {
    const response = await api.get('/financial/periods')
    return response.data
  }

  async getComplianceMetrics() {
    const response = await api.get('/audit/compliance-report')
    return response.data
  }

  private calculateHealthStatus(score: number): 'good' | 'warning' | 'critical' {
    if (score >= 80) return 'good'
    if (score >= 60) return 'warning'
    return 'critical'
  }
}

export const executiveDashboardService = new ExecutiveDashboardService()