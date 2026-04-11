// API wrapper with auth headers
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('eam_token') : null;

  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

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

    const result: { success: boolean; data?: T; kpis?: any; pagination?: any; error?: string } = {
      success: true,
      data: json.data !== undefined ? json.data : json,
    };
    if (json.kpis !== undefined) result.kpis = json.kpis;
    if (json.pagination !== undefined) result.pagination = json.pagination;
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

export const api = {
  get: <T = any>(endpoint: string) => apiFetch<T>(endpoint),
  post: <T = any>(endpoint: string, body?: any) =>
    apiFetch<T>(endpoint, { method: 'POST', body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiFetch<T>(endpoint, { method: 'PATCH', body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiFetch<T>(endpoint, { method: 'PUT', body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) }),
  delete: <T = any>(endpoint: string) => apiFetch<T>(endpoint, { method: 'DELETE' }),
};
