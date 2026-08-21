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

// ── Security: Access token is stored IN MEMORY ONLY. ────────────────────────
// It is NEVER written to localStorage, sessionStorage, IndexedDB, or any
// persistent browser storage. This eliminates XSS-based token theft.
//
// On page refresh the token is initially absent. AuthContext calls the
// v2/refresh/ endpoint (HttpOnly cookie sent automatically) to obtain a fresh
// access token and restores authenticated state without a visible logout.
let _accessToken: string | null = null;
let _initialAuthPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

export const getAccessToken = () => {
  return _accessToken;
};

export const performInitialAuth = async (): Promise<string | null> => {
  if (_accessToken) {
    return _accessToken;
  }
  if (_initialAuthPromise) {
    return _initialAuthPromise;
  }
  const hasSession = typeof window !== 'undefined' && !!localStorage.getItem('faazo_user');
  if (!hasSession) {
    return null;
  }

  _initialAuthPromise = (async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}auth/v2/refresh/`,
        {},
        { withCredentials: true }
      );
      const responseData = response.data?.data ?? response.data;
      const { access } = responseData;
      if (access) {
        setAccessToken(access);
        return access;
      }
      return null;
    } catch {
      return null;
    } finally {
      setTimeout(() => {
        _initialAuthPromise = null;
      }, 1000);
    }
  })();

  return _initialAuthPromise;
};

// Request Interceptor: Attach the in-memory access token if present & normalize leading slash
api.interceptors.request.use(
  async (config) => {
    if (config.url && config.url.startsWith('/') && !config.url.startsWith('http://') && !config.url.startsWith('https://')) {
      config.url = config.url.substring(1);
    }

    // Wait for initial auth refresh if pending to prevent unauthenticated race requests on page load
    if (_initialAuthPromise && !config.url?.includes('auth/v2/refresh')) {
      try {
        await _initialAuthPromise;
      } catch {
        // ignore
      }
    }

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
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('faazo_user') : null;
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

      // Clear in-memory token — no localStorage key to remove for access token
      setAccessToken(null);
      if (shouldClear && typeof window !== 'undefined') {
        localStorage.removeItem('faazo_user');
      }
      window.dispatchEvent(new Event('faazo_auth_expired'));
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/';
        }, 0);
      }
      return Promise.reject(error);
    }

    // Do not attempt refresh on the refresh endpoint itself — avoid infinite loop
    if (originalRequest?.url?.includes('auth/v2/refresh') || originalRequest?.url?.includes('auth/jwt/refresh')) {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('faazo_user');
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
        // Clear in-memory token — refresh cookie is gone/expired
        setAccessToken(null);

        if (typeof window !== 'undefined') {
          localStorage.removeItem('faazo_user');
          window.dispatchEvent(new Event('faazo_auth_expired'));
        }

        return Promise.reject(error);
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
