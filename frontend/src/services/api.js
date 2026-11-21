const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4600/api/v1'
).replace(/\/+$/, '');

const TOKEN_STORAGE_KEY = 'gym_auth_token';

/**
 * Custom API error preserving HTTP status and backend error code.
 */
export class ApiError extends Error {
  constructor(message, status, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Core HTTP request wrapper targeting http://localhost:4600/api/v1.
 * Unwraps the standardized { success, data, pagination, error } envelope.
 */
export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body:
        body !== undefined && !(body instanceof FormData)
          ? JSON.stringify(body)
          : body,
    });
  } catch {
    throw new ApiError(
      'Unable to reach the Mad Max Gym API server. Please ensure the backend is running on port 4600.',
      0,
      'NETWORK_ERROR'
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || (payload && payload.success === false)) {
    const message =
      payload?.error?.message ||
      `Request failed with status ${response.status}.`;
    const code = payload?.error?.code || 'REQUEST_FAILED';
    throw new ApiError(message, response.status, code);
  }

  return payload;
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) =>
    apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) =>
    apiRequest(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) =>
    apiRequest(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
  getHealth: () => apiRequest('/health', { skipAuth: true }),
};

export default api;
