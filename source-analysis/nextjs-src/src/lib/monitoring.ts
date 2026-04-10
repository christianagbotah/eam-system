/**
 * Enterprise Monitoring & Error Tracking
 * Stub implementation - can be replaced with Sentry integration
 */

export class MonitoringService {
  /**
   * Initialize user context
   */
  static initUserContext(user: { id: string; email: string; role: string; plantId?: string }) {
    console.log('User context initialized:', user.role);
  }

  /**
   * Track API errors with context
   */
  static trackAPIError(error: any, context: {
    endpoint: string;
    method: string;
    userId?: string;
    plantId?: string;
    requestData?: any;
  }) {
    console.error('API Error:', context.endpoint, error.message);
  }

  /**
   * Track security events
   */
  static trackSecurityEvent(event: {
    type: 'unauthorized_access' | 'suspicious_activity' | 'validation_failure' | 'rate_limit_exceeded';
    userId?: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }) {
    console.warn('Security Event:', event.type, event.details);
  }

  /**
   * Track performance metrics
   */
  static trackPerformance(metric: {
    name: string;
    value: number;
    unit: 'ms' | 's' | 'bytes';
    tags?: Record<string, string>;
  }) {
    console.log('Performance:', metric.name, metric.value + metric.unit);
  }

  /**
   * Track business events
   */
  static trackBusinessEvent(event: {
    name: string;
    category: 'maintenance' | 'inventory' | 'production' | 'user_action' | 'system';
    userId?: string;
    plantId?: string;
    properties?: Record<string, any>;
  }) {
    console.log('Business Event:', event.category, event.name);
  }

  /**
   * Track application errors with enhanced context
   */
  static trackApplicationError(error: Error, context: {
    component?: string;
    action?: string;
    userId?: string;
    plantId?: string;
    additionalData?: any;
  }) {
    console.error('Application Error:', context.component, error.message);
  }

  /**
   * Start performance transaction
   */
  static startTransaction(name: string, op: string) {
    console.log('Transaction started:', name, op);
    return { finish: () => console.log('Transaction finished:', name) };
  }

  /**
   * Add breadcrumb for debugging
   */
  static addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
    data?: any;
  }) {
    console.log('Breadcrumb:', breadcrumb.message);
  }

  /**
   * Flush pending events
   */
  static async flush(timeout: number = 2000) {
    return Promise.resolve();
  }
}

// Initialize monitoring on app start
export const initializeMonitoring = () => {
  console.log('✅ Enterprise monitoring initialized (stub mode)');
};