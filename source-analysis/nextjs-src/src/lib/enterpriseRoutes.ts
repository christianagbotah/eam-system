// Add these routes to your existing API configuration

// Enterprise Dashboard Routes
export const dashboardRoutes = {
  executiveMetrics: '/api/v1/dashboard/executive-metrics',
  kpiSummary: '/api/v1/dashboard/kpi-summary',
  performanceTrends: '/api/v1/dashboard/performance-trends'
}

// Financial Management Routes  
export const financialRoutes = {
  periods: '/api/v1/financial/periods',
  costSummary: '/api/v1/financial/cost-summary',
  lockPeriod: (id: number) => `/api/v1/financial/periods/${id}/lock`
}

// Hierarchy Management Routes
export const hierarchyRoutes = {
  facilities: '/api/v1/hierarchy/facilities',
  areas: (facilityId: number) => `/api/v1/hierarchy/facilities/${facilityId}/areas`,
  lines: (areaId: number) => `/api/v1/hierarchy/areas/${areaId}/lines`,
  tree: '/api/v1/hierarchy/tree'
}

// Audit Routes
export const auditRoutes = {
  logs: '/api/v1/audit/logs',
  complianceReport: '/api/v1/audit/compliance-report'
}