import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenManager } from './tokenManager';

let loadingContext: any = null;

export function setLoadingContext(context: any) {
  loadingContext = context;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1/eam',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token and start loading
api.interceptors.request.use(
  async (config) => {
    const requestId = `${config.method}-${config.url}-${Date.now()}`;
    (config as any).metadata = { requestId };
    
    if (loadingContext) {
      loadingContext.startLoading(requestId);
    }
    
    const isAuthEndpoint = config.url?.includes('/auth/login') || 
                           config.url?.includes('/auth/register') || 
                           config.url?.includes('/auth/refresh');
    
    if (!isAuthEndpoint && typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        localStorage.setItem('last_activity', Date.now().toString());
      }
      
      // Add plant_id header for plant isolation
      const plantId = localStorage.getItem('active_plant_id');
      if (plantId !== null && plantId !== '') {
        config.headers['X-Plant-ID'] = plantId;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token expiration and stop loading
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    const requestId = (response.config as any)?.metadata?.requestId;
    if (loadingContext && requestId) {
      loadingContext.stopLoading(requestId);
    }
    return response;
  },
  async (error: AxiosError) => {
    const requestId = (error.config as any)?.metadata?.requestId;
    if (loadingContext && requestId) {
      loadingContext.stopLoading(requestId);
    }
    
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401) {
      const isAuthEndpoint = originalRequest?.url?.includes('/auth/');
      
      if (!isAuthEndpoint && typeof window !== 'undefined' && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }).catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || '/api/v1/eam'}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          
          const newToken = response.data?.data?.access_token;
          if (newToken) {
            localStorage.setItem('access_token', newToken);
            if (response.data.data.refresh_token) {
              localStorage.setItem('refresh_token', response.data.data.refresh_token);
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);
            return api(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }
    
    if (error.response?.status === 404) {
      console.warn('404 Not Found:', error.config?.url);
    }
    
    return Promise.reject(error);
  }
);

export default api;
