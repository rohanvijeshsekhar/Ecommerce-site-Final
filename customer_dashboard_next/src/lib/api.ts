'use client';

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/';
const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:8000';

// C1: withCredentials must be true so the browser sends the HttpOnly
// refresh token cookie (faazo_refresh) on every request to the same origin.
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Access token lives in memory for security, but is also persisted to
// localStorage as a convenience to survive page reloads in development.
// The HttpOnly refresh cookie remains the authoritative auth mechanism.
const ACCESS_TOKEN_KEY = 'faazo_access_token';
let _accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }
};

export const getAccessToken = () => {
  if (!_accessToken && typeof window !== 'undefined') {
    _accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return _accessToken;
};

// Request Interceptor: Attach the in-memory access token if present & normalize leading slash
api.interceptors.request.use(
  (config) => {
    if (config.url && config.url.startsWith('/') && !config.url.startsWith('http://') && !config.url.startsWith('https://')) {
      config.url = config.url.substring(1);
    }
    // getAccessToken() falls back to localStorage when _accessToken is empty
    // (e.g. on the first request after a page reload, before initializeAuth completes).
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401s and cookie-based silent token refresh
let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
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
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle blocked or soft-deleted user — no retry
    const errorData = error.response?.data;
    const detail = errorData?.detail || errorData?.message || '';
    const isBlockedOrDeleted =
      (error.response?.status === 401 || error.response?.status === 403) &&
      (detail.toLowerCase().includes('blocked') || detail.toLowerCase().includes('deleted'));

    if (isBlockedOrDeleted) {
      const userStr = localStorage.getItem('faazo_user');
      let shouldClear = true;
      if (userStr) {
        try {
          const storedUser = JSON.parse(userStr);
          if (storedUser.role === 'admin') {
            shouldClear = false;
          }
        } catch {
          // ignore parse error
        }
      }

      setAccessToken(null);
      if (shouldClear) {
        localStorage.removeItem('faazo_user');
        localStorage.removeItem('faazo_access_token');
      }
      window.dispatchEvent(new Event('faazo_auth_expired'));
      window.location.replace('/');
      return Promise.reject(error);
    }

    // Do not attempt refresh on the refresh endpoint itself
    if (originalRequest?.url?.includes('auth/v2/refresh') || originalRequest?.url?.includes('auth/jwt/refresh')) {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('faazo_user');
        localStorage.removeItem('faazo_access_token');
      }
      return Promise.reject(error);
    }

    // If it is a 401 and we have not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If there is no existing session at all, skip the refresh attempt silently.
      const hasSession = typeof window !== 'undefined' && !!localStorage.getItem('faazo_user');
      if (!hasSession) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // C1: No body needed — the HttpOnly faazo_refresh cookie is sent automatically.
        const response = await axios.post(
          `${API_BASE_URL}auth/v2/refresh/`,
          {},
          { withCredentials: true }
        );

        // v2 envelope: { success: true, data: { access, access_expires_in } }
        const responseData = response.data?.data ?? response.data;
        const { access } = responseData;

        setAccessToken(access);
        processQueue(null, access);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        setAccessToken(null);

        if (typeof window !== 'undefined') {
          localStorage.removeItem('faazo_user');
          localStorage.removeItem('faazo_access_token');
          window.dispatchEvent(new Event('faazo_auth_expired'));
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);


export const getAbsoluteImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${MEDIA_BASE_URL}${url}`;
  return `${MEDIA_BASE_URL}/${url}`;
};
