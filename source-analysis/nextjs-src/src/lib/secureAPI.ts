/**
 * Enterprise API Security Layer
 * Enforces RBAC and input validation before API calls
 */

import { hasPermission } from './rbac';
import { InputValidator, ValidationSchemas, ValidationRules } from './validation';
import api from './api';
import { alert } from '@/components/AlertModalProvider';
import { MonitoringService } from './monitoring';

export interface SecureAPIOptions {
  module: string;
  action: string;
  validationSchema?: ValidationRules | Record<string, ValidationRules>;
  requirePlantId?: boolean;
}

export class SecureAPI {
  /**
   * Secure API call with RBAC and validation checks
   */
  static async call<T = any>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    data?: any,
    options: SecureAPIOptions = { module: '', action: 'view' }
  ): Promise<T> {
    const startTime = Date.now();

    // 1. Check user authentication
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert.error('Authentication Required', 'Please log in to continue');
      MonitoringService.trackSecurityEvent({
        type: 'unauthorized_access',
        details: { reason: 'no_token', endpoint }
      });
      throw new Error('Not authenticated');
    }

    // 2. Get user role
    const userStr = localStorage.getItem('user');
    let userRole = 'technician';
    let userId: string | undefined;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userRole = user.role || 'technician';
        userId = user.id;
      } catch (e) {
        console.error('Failed to parse user data');
        userRole = 'technician';
      }
    }

    // 3. Check RBAC permissions
    if (!hasPermission(userRole, options.module, options.action)) {
      alert.error('Access Denied', `You don't have permission to ${options.action} ${options.module}`);
      MonitoringService.trackSecurityEvent({
        type: 'unauthorized_access',
        userId,
        details: { reason: 'insufficient_permissions', module: options.module, action: options.action, endpoint }
      });
      throw new Error(`Insufficient permissions: ${userRole} cannot ${options.action} ${options.module}`);
    }

    // 4. Validate input data
    if (data && options.validationSchema) {
      let validationResult;

      if (typeof options.validationSchema === 'object' && !('required' in options.validationSchema)) {
        // It's a schema object with multiple fields
        validationResult = InputValidator.validateObject(data, options.validationSchema as Record<string, ValidationRules>);
      } else {
        // It's a single field validation
        validationResult = InputValidator.validate(data, options.validationSchema as ValidationRules, 'Data');
      }

      if (!validationResult.isValid) {
        const errorMessage = validationResult.errors.join(', ');
        alert.error('Validation Error', errorMessage);
        MonitoringService.trackSecurityEvent({
          type: 'validation_failure',
          userId,
          details: { errors: validationResult.errors, endpoint }
        });
        throw new Error(`Validation failed: ${errorMessage}`);
      }
    }

    // 5. Check plant isolation (if required)
    if (options.requirePlantId) {
      const plantId = localStorage.getItem('active_plant_id');
      if (!plantId) {
        alert.error('Plant Selection Required', 'Please select a plant to continue');
        MonitoringService.trackSecurityEvent({
          type: 'validation_failure',
          userId,
          details: { reason: 'plant_not_selected', endpoint }
        });
        throw new Error('Plant ID required but not selected');
      }
    }

    // 6. Make the API call
    try {
      const response = await api.request({
        method,
        url: endpoint,
        data: method !== 'get' ? data : undefined,
        params: method === 'get' ? data : undefined
      });

      // Track successful API call performance
      const duration = Date.now() - startTime;
      MonitoringService.trackPerformance({
        name: `api_call_${method}`,
        value: duration,
        unit: 'ms',
        tags: {
          endpoint: endpoint.split('?')[0], // Remove query params
          status: 'success'
        }
      });

      return response.data;
    } catch (error: any) {
      // Track API error
      const duration = Date.now() - startTime;
      MonitoringService.trackAPIError(error, {
        endpoint,
        method,
        userId,
        plantId: localStorage.getItem('active_plant_id') || undefined,
        requestData: data
      });

      // Track performance for failed calls
      MonitoringService.trackPerformance({
        name: `api_call_${method}`,
        value: duration,
        unit: 'ms',
        tags: {
          endpoint: endpoint.split('?')[0],
          status: 'error',
          error_code: error.response?.status?.toString() || 'unknown'
        }
      });

      // Handle API errors
      const errorMessage = error.response?.data?.message || error.message || 'API call failed';
      console.error('Secure API call failed:', error);
      throw error;
    }
  }

  // Convenience methods for common operations
  static async get<T = any>(endpoint: string, params?: any, options?: SecureAPIOptions): Promise<T> {
    return this.call('get', endpoint, params, options);
  }

  static async post<T = any>(endpoint: string, data?: any, options?: SecureAPIOptions): Promise<T> {
    return this.call('post', endpoint, data, options);
  }

  static async put<T = any>(endpoint: string, data?: any, options?: SecureAPIOptions): Promise<T> {
    return this.call('put', endpoint, data, options);
  }

  static async delete<T = any>(endpoint: string, options?: SecureAPIOptions): Promise<T> {
    return this.call('delete', endpoint, undefined, options);
  }
}

// Pre-configured secure API methods for common modules
export const SecureMaintenanceAPI = {
  getRequests: (params?: any) => SecureAPI.get('/maintenance-requests/my-queue?role=supervisor', params, {
    module: 'maintenance_requests',
    action: 'view',
    requirePlantId: true
  }),

  getFilteredRequests: (filters?: any) => SecureAPI.get('/maintenance-requests/filter', filters, {
    module: 'maintenance_requests',
    action: 'view',
    requirePlantId: true
  }),

  createRequest: (data: any) => SecureAPI.post('/maintenance-requests', data, {
    module: 'maintenance_requests',
    action: 'create',
    validationSchema: ValidationSchemas.maintenanceRequest,
    requirePlantId: true
  }),

  updateRequest: (id: number, data: any) => SecureAPI.put(`/maintenance-requests/${id}`, data, {
    module: 'maintenance_requests',
    action: 'update',
    validationSchema: ValidationSchemas.maintenanceRequest,
    requirePlantId: true
  }),

  approveRequest: (id: number, data?: any) => SecureAPI.post(`/maintenance-requests/${id}/approve`, data, {
    module: 'maintenance_requests',
    action: 'approve',
    requirePlantId: true
  }),

  rejectRequest: (id: number, data?: any) => SecureAPI.post(`/maintenance-requests/${id}/reject`, data, {
    module: 'maintenance_requests',
    action: 'approve', // reject uses same permission as approve
    requirePlantId: true
  })
};

export const SecureUserAPI = {
  getUsers: (params?: any) => SecureAPI.get('/users', params, {
    module: 'users',
    action: 'view',
    requirePlantId: true
  }),

  createUser: (data: any) => SecureAPI.post('/users', data, {
    module: 'users',
    action: 'create',
    validationSchema: ValidationSchemas.user,
    requirePlantId: true
  }),

  updateUser: (id: number, data: any) => SecureAPI.put(`/users/${id}`, data, {
    module: 'users',
    action: 'update',
    validationSchema: ValidationSchemas.user,
    requirePlantId: true
  })
};

export const SecureAssetAPI = {
  getAssets: (params?: any) => SecureAPI.get('/assets-unified', params, {
    module: 'assets',
    action: 'view',
    requirePlantId: true
  }),

  createAsset: (data: any) => SecureAPI.post('/assets-unified', data, {
    module: 'assets',
    action: 'create',
    validationSchema: ValidationSchemas.asset,
    requirePlantId: true
  }),

  updateAsset: (id: number, data: any) => SecureAPI.put(`/assets-unified/${id}`, data, {
    module: 'assets',
    action: 'update',
    validationSchema: ValidationSchemas.asset,
    requirePlantId: true
  })
};