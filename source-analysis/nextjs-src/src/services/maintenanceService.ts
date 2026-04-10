import api from '@/lib/api';

export const maintenanceService = {
  // Maintenance Requests
  getRequests: (params?: any) => api.get('/maintenance-requests', { params }),
  getRequest: (id: number) => api.get(`/maintenance-requests/${id}`),
  createRequest: (data: any) => api.post('/maintenance-requests', data),
  updateRequest: (id: number, data: any) => api.put(`/maintenance-requests/${id}`, data),
  deleteRequest: (id: number) => api.delete(`/maintenance-requests/${id}`),
  approveRequest: (id: number) => api.post(`/maintenance-requests/${id}/approve`),
  rejectRequest: (id: number, reason: string) => api.post(`/maintenance-requests/${id}/reject`, { reason }),
  triageRequest: (id: number, data: { priority: string }) => api.post(`/maintenance-requests/${id}/triage`, data),
  getRequestDashboard: (userId?: number) => api.get('/maintenance-requests/dashboard', { params: { user_id: userId } }),
  bulkDeleteRequests: (ids: number[]) => api.post('/maintenance-requests/bulk-delete', { ids }),
  bulkUpdateRequestStatus: (ids: number[], status: string) => api.post('/maintenance-requests/bulk-update-status', { ids, status }),
  exportRequests: (format: 'csv' | 'json' = 'csv') => api.get('/maintenance-requests/export', { params: { format }, responseType: 'blob' }),
  
  // Request Attachments
  uploadRequestAttachment: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/maintenance-requests/${id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getRequestAttachments: (id: number) => api.get(`/maintenance-requests/${id}/attachments`),
  deleteRequestAttachment: (id: number) => api.delete(`/maintenance/attachments/${id}`),
  
  // Request Comments
  addRequestComment: (id: number, comment: string) => api.post(`/maintenance-requests/${id}/comments`, { comment }),
  getRequestComments: (id: number) => api.get(`/maintenance-requests/${id}/comments`),

  // Work Orders
  getWorkOrders: (params?: any) => api.get('/work-orders', { params }),
  createWorkOrderFromRequest: (requestId: number, data?: { technician_id?: number; work_type?: string }) => 
    api.post(`/maintenance-requests/${requestId}/create-work-order`, data),
  assignWorkOrder: (id: number, data: any) => api.post(`/work-orders/${id}/assign`, data),
  acknowledgeWorkOrder: (id: number) => api.post(`/work-orders/${id}/acknowledge`),
  startWork: (id: number) => api.post(`/work-orders/${id}/start`),
  completeWork: (id: number, notes: string) => api.post(`/work-orders/${id}/complete`, { notes }),
  inspectWorkOrder: (id: number, data: any) => api.post(`/work-orders/${id}/inspect`, data),
  closeWorkOrder: (id: number) => api.post(`/work-orders/${id}/close`),
  verifyWorkOrder: (id: number, data: any) => api.post(`/work-orders/${id}/verify`, data),
  reopenWorkOrder: (id: number, data: { reason: string }) => api.post(`/work-orders/${id}/reopen`, data),
  adjustCost: (id: number, data: any) => api.post(`/work-orders/${id}/adjust-cost`, data),
  addFailureAnalysis: (id: number, data: any) => api.post(`/work-orders/${id}/failure-analysis`, data),
  
  // Approvals
  getPendingApprovals: () => api.get('/approvals/pending'),
  approveApproval: (id: number, notes?: string) => api.post(`/approvals/${id}/approve`, { notes }),
  rejectApproval: (id: number, notes?: string) => api.post(`/approvals/${id}/reject`, { notes }),
  
  // Verifications
  getPendingVerifications: () => api.get('/verifications/pending'),
  getVerificationChecklist: (workOrderId: number) => api.get(`/work-orders/${workOrderId}/verification-checklist`),
  getWorkOrderDashboard: (userId?: number) => api.get('/work-orders/dashboard', { params: { user_id: userId } }),

  // Analytics
  getAnalyticsDashboard: (startDate?: string, endDate?: string) => 
    api.get('/maintenance/analytics/dashboard', { params: { start_date: startDate, end_date: endDate } }),
  getKPIs: (startDate?: string, endDate?: string) => 
    api.get('/maintenance/analytics/kpis', { params: { start_date: startDate, end_date: endDate } }),
  getTechnicianPerformance: (startDate?: string, endDate?: string) => 
    api.get('/maintenance/analytics/technician-performance', { params: { start_date: startDate, end_date: endDate } }),
  getDepartmentPerformance: (startDate?: string, endDate?: string) => 
    api.get('/maintenance/analytics/department-performance', { params: { start_date: startDate, end_date: endDate } }),
  getMachineBreakdowns: (startDate?: string, endDate?: string) => 
    api.get('/maintenance/analytics/machine-breakdowns', { params: { start_date: startDate, end_date: endDate } }),
  getTrends: (startDate?: string, endDate?: string) => 
    api.get('/maintenance/analytics/trends', { params: { start_date: startDate, end_date: endDate } }),
  exportAnalytics: (startDate?: string, endDate?: string) => 
    api.get('/maintenance/analytics/export', { params: { start_date: startDate, end_date: endDate }, responseType: 'blob' }),
  exportReport: (type: string, startDate?: string, endDate?: string) => 
    api.get('/maintenance/analytics/export', { params: { type, start_date: startDate, end_date: endDate } }),

  // Modules
  getModules: () => api.get('/modules'),
  toggleModule: (id: number) => api.post(`/modules/${id}/toggle`),
  updateModuleSettings: (id: number, settings: any) => api.put(`/modules/${id}/settings`, settings),
  seedModules: () => api.post('/modules/seed'),

  // Comments
  getComments: (entityType: string, entityId: number) => 
    api.get(`/comments/${entityType}/${entityId}`),
  addComment: (data: { entity_type: string; entity_id: number; comment: string; user_id: number }) => 
    api.post('/comments', data),
  updateComment: (id: number, comment: string) => 
    api.put(`/comments/${id}`, { comment }),
  deleteComment: (id: number) => 
    api.delete(`/comments/${id}`),

  // Attachments
  getAttachments: (entityType: string, entityId: number) => 
    api.get(`/attachments/${entityType}/${entityId}`),
  uploadAttachment: (formData: FormData) => 
    api.post('/attachments', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteAttachment: (id: number) => 
    api.delete(`/attachments/${id}`),
  downloadAttachment: (id: number) => 
    api.get(`/attachments/${id}/download`, { responseType: 'blob' }),

  // Bulk Operations
  bulkUpdateStatus: (ids: number[], status: string) => 
    api.post('/maintenance/bulk/update-status', { ids, status }),
  bulkAssign: (ids: number[], userId: number) => 
    api.post('/maintenance/bulk/assign', { ids, user_id: userId }),
  bulkDelete: (ids: number[]) => 
    api.post('/maintenance/bulk/delete', { ids }),
  bulkExport: (ids: number[], format: 'csv' | 'json' = 'csv') => 
    api.post('/maintenance/bulk/export', { ids, format }, { responseType: 'blob' }),

  // Notifications
  getNotifications: (userId: number) => 
    api.get(`/notifications/user/${userId}`),
  markNotificationAsRead: (id: number) => 
    api.put(`/notifications/${id}/read`),
  markAllNotificationsAsRead: (userId: number) => 
    api.post('/notifications/mark-all-read', { user_id: userId }),

  // ==================== ENTERPRISE FEATURES v3.0 ====================
  
  // Team Management
  getTeam: (workOrderId: number) => 
    api.get(`/maintenance-orders/${workOrderId}/team`),
  assignTeamMember: (workOrderId: number, data: any) => 
    api.post(`/maintenance-orders/${workOrderId}/team`, data),
  updateTeamMember: (workOrderId: number, memberId: number, data: any) => 
    api.put(`/maintenance-orders/${workOrderId}/team/${memberId}`, data),
  removeTeamMember: (workOrderId: number, memberId: number) => 
    api.delete(`/maintenance-orders/${workOrderId}/team/${memberId}`),

  // Assistance Requests
  getAssistanceRequests: (workOrderId: number) => 
    api.get(`/maintenance-orders/${workOrderId}/assistance-requests`),
  createAssistanceRequest: (workOrderId: number, data: any) => 
    api.post(`/maintenance-orders/${workOrderId}/assistance-requests`, data),
  approveAssistanceRequest: (workOrderId: number, requestId: number, data: any) => 
    api.post(`/maintenance-orders/${workOrderId}/assistance-requests/${requestId}/approve`, data),
  rejectAssistanceRequest: (workOrderId: number, requestId: number, data: any) => 
    api.post(`/maintenance-orders/${workOrderId}/assistance-requests/${requestId}/reject`, data),

  // Job Planning
  getJobPlan: (workOrderId: number) => 
    api.get(`/maintenance-orders/${workOrderId}/job-plan`),
  createJobPlan: (workOrderId: number, data: any) => 
    api.post(`/maintenance-orders/${workOrderId}/job-plan`, data),
  updateJobPlan: (workOrderId: number, planId: number, data: any) => 
    api.put(`/maintenance-orders/${workOrderId}/job-plan/${planId}`, data),

  // Resource Reservations
  getReservations: (workOrderId: number) => 
    api.get(`/maintenance-orders/${workOrderId}/reservations`),
  createReservation: (workOrderId: number, data: any) => 
    api.post(`/maintenance-orders/${workOrderId}/reservations`, data),
  updateReservation: (workOrderId: number, reservationId: number, data: any) => 
    api.put(`/maintenance-orders/${workOrderId}/reservations/${reservationId}`, data),

  // SLA Tracking
  getSlaTracking: (workOrderId: number) => 
    api.get(`/maintenance-orders/${workOrderId}/sla`),
  initializeSla: (workOrderId: number, data: any) => 
    api.post(`/maintenance-orders/${workOrderId}/sla/initialize`, data),
  getBreachedSlas: () => 
    api.get('/maintenance-orders/sla/breached'),

  // Predictive Maintenance
  getInspections: (assetId?: number) => 
    assetId ? api.get(`/inspections/asset/${assetId}`) : api.get('/inspections'),
  createInspection: (data: any) => 
    api.post('/inspections', data),

  // Shutdown Events
  getShutdownEvents: () => 
    api.get('/shutdown-events'),
  createShutdownEvent: (data: any) => 
    api.post('/shutdown-events', data),
  linkToShutdown: (workOrderId: number, data: any) => 
    api.post(`/maintenance-orders/${workOrderId}/link-shutdown`, data),
};
