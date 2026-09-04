// API wrapper with auth headers, timeout, and AbortController support
import React from 'react';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const DEFAULT_TIMEOUT_MS = 15_000; // 15 second default timeout

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  kpis?: any;
  pagination?: any;
  _diag?: any;
  // Preserve structured domain metadata returned by APIs (for example
  // readiness blockers, active-session conflicts, validation details).
  [key: string]: any;
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('eam_token');
  const plantId = localStorage.getItem('user_plant_id');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (plantId) headers['x-plant-id'] = plantId;
  return headers;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<ApiResponse<T>> {
  const { timeout = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...restOptions } = options;
  const isFormData = restOptions.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...getAuthHeaders(),
    ...(restOptions.headers as Record<string, string> || {}),
  };

  // Create AbortController — respects both external signal and timeout
  const controller = new AbortController();
  const { signal } = controller;

  // If external signal is provided, abort when it fires
  if (externalSignal) {
    if (externalSignal.aborted) {
      return { success: false, error: 'Request was aborted' };
    }
    externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason));
  }

  // Set up timeout
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeout);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...restOptions,
      headers,
      signal,
    });

    clearTimeout(timeoutId);

    // Handle 204 No Content
    if (res.status === 204) {
      return { success: true, status: res.status };
    }

    // Check Content-Type before parsing JSON
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!res.ok) {
        return { success: false, error: `Request failed with status ${res.status}`, status: res.status };
      }
      return { success: true, status: res.status };
    }

    let json: any;
    try {
      json = await res.json();
    } catch (parseErr: any) {
      return { success: false, error: `Invalid JSON response: ${parseErr.message}`, status: res.status };
    }

    const payload: Record<string, any> = json && typeof json === 'object' ? json : {};

    if (!res.ok || payload.success === false) {
      // Preserve every structured field returned by the domain endpoint. Older
      // behavior collapsed failures to {success,error}, which discarded data
      // such as readiness blockers and the conflicting active work order and
      // left field technicians with a generic, non-actionable error.
      return {
        ...payload,
        success: false,
        error: typeof payload.error === 'string' && payload.error
          ? payload.error
          : `Request failed with status ${res.status}`,
        status: res.status,
      } as ApiResponse<T>;
    }

    const result: ApiResponse<T> = {
      ...payload,
      success: true,
      status: res.status,
      data: payload.data !== undefined ? payload.data : json,
    };
    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      const msg = err?.message || '';
      if (msg.includes('timed out') || msg.includes('Timeout')) {
        return { success: false, error: 'Request timed out' };
      }
      return { success: false, error: 'Request was cancelled' };
    }
    return { success: false, error: err.message || 'Network error' };
  }
}

export const api = {
  get: <T = any>(endpoint: string, opts?: RequestInit & { timeout?: number }) =>
    apiFetch<T>(endpoint, { ...opts, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, opts?: RequestInit & { timeout?: number }) =>
    apiFetch<T>(endpoint, {
      ...opts,
      method: 'POST',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    }),
  patch: <T = any>(endpoint: string, body?: any, opts?: RequestInit & { timeout?: number }) =>
    apiFetch<T>(endpoint, {
      ...opts,
      method: 'PATCH',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    }),
  put: <T = any>(endpoint: string, body?: any, opts?: RequestInit & { timeout?: number }) =>
    apiFetch<T>(endpoint, {
      ...opts,
      method: 'PUT',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    }),
  delete: <T = any>(endpoint: string, opts?: RequestInit & { timeout?: number }) =>
    apiFetch<T>(endpoint, { ...opts, method: 'DELETE' }),
  /** Raw fetch returning the Response (for blob/binary downloads). Auth headers are injected. */
  getRaw: (endpoint: string, opts?: RequestInit & { timeout?: number }) => {
    const url = `${API_BASE}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), opts?.timeout || DEFAULT_TIMEOUT_MS);
    if (opts?.signal) {
      opts.signal.addEventListener('abort', () => controller.abort(opts.signal?.reason));
    }
    return fetch(url, {
      ...opts,
      headers: { ...getAuthHeaders(), ...(opts?.headers as Record<string, string> || {}) },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  },
};

/**
 * React hook that returns an AbortController ref.
 * The controller is automatically aborted when the component unmounts.
 * Usage:
 *   const abortRef = useAbortController();
 *   api.get('/api/data', { signal: abortRef.current.signal });
 */
export function useAbortRef(): React.MutableRefObject<AbortController> {
  const controllerRef = React.useRef<AbortController>(new AbortController());
  React.useEffect(() => {
    const ctrl = controllerRef.current;
    return () => { ctrl.abort('unmounted'); };
  }, []);
  return controllerRef;
}
