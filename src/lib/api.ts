// API wrapper with auth headers, timeout, and AbortController support
import React from 'react';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const DEFAULT_TIMEOUT_MS = 15_000; // 15 second default timeout

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
): Promise<{ success: boolean; data?: T; error?: string; kpis?: any; pagination?: any; _diag?: any }> {
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
      return { success: true };
    }

    // Check Content-Type before parsing JSON
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!res.ok) {
        return { success: false, error: `Request failed with status ${res.status}` };
      }
      return { success: true };
    }

    let json: any;
    try {
      json = await res.json();
    } catch (parseErr: any) {
      return { success: false, error: `Invalid JSON response: ${parseErr.message}` };
    }

    if (!res.ok) {
      return { success: false, error: json.error || `Request failed with status ${res.status}` };
    }

    const result: { success: boolean; data?: T; kpis?: any; pagination?: any; _diag?: any; error?: string } = {
      success: true,
      data: json.data !== undefined ? json.data : json,
    };
    if (json.kpis !== undefined) result.kpis = json.kpis;
    if (json.pagination !== undefined) result.pagination = json.pagination;
    if (json._diag !== undefined) result._diag = json._diag;
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
