'use client';

import axios from 'axios';

const _rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/';
const API_BASE_URL = _rawApiBase.endsWith('/') ? _rawApiBase : `${_rawApiBase}/`;
const _rawMediaBase = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:8000';
const MEDIA_BASE_URL = _rawMediaBase.endsWith('/') ? _rawMediaBase.slice(0, -1) : _rawMediaBase;

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
    if (!_accessToken && typeof window !== 'undefined' && !!localStorage.getItem('faazo_user') && !config.url?.includes('auth/v2/refresh')) {
      try {
        await performInitialAuth();
      } catch {
        // ignore
      }
    } else if (_initialAuthPromise && !config.url?.includes('auth/v2/refresh')) {
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

    // When sending FormData, ensure Content-Type is completely unset so Axios & the browser
    // automatically generate multipart/form-data with the correct multi-part boundary string
    const isFormData =
      config.data instanceof FormData ||
      (config.data && typeof config.data === 'object' && (
        config.data.constructor?.name === 'FormData' ||
        typeof (config.data as any).append === 'function'
      ));

    if (isFormData && config.headers) {
      if (typeof (config.headers as any).delete === 'function') {
        (config.headers as any).delete('Content-Type');
        (config.headers as any).delete('content-type');
      }
      delete config.headers['Content-Type'];
      delete (config.headers as any)['content-type'];
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
    // Only force-logout when the error is about the CURRENT user's own account (401 or explicit account block/delete),
    // NOT when an admin receives a 403/400 mentioning a blocked/deleted customer or soft-deleted entity.
    const errorData = error.response?.data;
    const detail = String(errorData?.detail || errorData?.message || '');
    const lowerDetail = detail.toLowerCase();
    const isAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    const isSelfAccountBlocked =
      (error.response?.status === 401 || (error.response?.status === 403 && !isAdminPage)) &&
      (lowerDetail.includes('account is blocked') ||
        lowerDetail.includes('account has been blocked') ||
        lowerDetail.includes('account is deleted') ||
        lowerDetail.includes('account is deactivated') ||
        lowerDetail.includes('account is blocked or deleted') ||
        (!isAdminPage && (lowerDetail.includes('blocked') || lowerDetail.includes('deleted'))));

    if (isSelfAccountBlocked) {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('faazo_user');
        window.dispatchEvent(new Event('faazo_auth_expired'));
        const target = isAdminPage ? '/admin/login' : '/';
        setTimeout(() => {
          window.location.href = target;
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
            originalRequest._retry = true;
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
  if (!url || typeof url !== 'string') return '';
  // Blob and Data URLs are local client-side objects and must never be prefixed with backend URL
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  // Normalize localhost/127.0.0.1 loopback URLs generated by backend serializers during internal SSR
  let cleanUrl = url;
  if (cleanUrl.startsWith('http://127.0.0.1:8000')) {
    cleanUrl = cleanUrl.replace('http://127.0.0.1:8000', '');
  } else if (cleanUrl.startsWith('http://localhost:8000')) {
    cleanUrl = cleanUrl.replace('http://localhost:8000', '');
  } else if (cleanUrl.startsWith('https://127.0.0.1:8000')) {
    cleanUrl = cleanUrl.replace('https://127.0.0.1:8000', '');
  } else if (cleanUrl.startsWith('https://localhost:8000')) {
    cleanUrl = cleanUrl.replace('https://localhost:8000', '');
  }

  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) return cleanUrl;
  if (cleanUrl.startsWith('/images/') || cleanUrl.startsWith('/brand/') || cleanUrl.startsWith('/category/') || cleanUrl.startsWith('/assets/') || cleanUrl.startsWith('/placeholders/')) return cleanUrl;

  // On client browser, if MEDIA_BASE_URL points to localhost/loopback or is empty,
  // return relative path so the browser loads directly from the current origin (e.g. https://faazo.cloud/media/...)
  const isBrowser = typeof window !== 'undefined';
  const isLocalMediaBase = !MEDIA_BASE_URL || MEDIA_BASE_URL.includes('localhost') || MEDIA_BASE_URL.includes('127.0.0.1');
  if (isBrowser && isLocalMediaBase) {
    return cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
  }

  if (cleanUrl.startsWith('/')) return `${MEDIA_BASE_URL}${cleanUrl}`;
  return `${MEDIA_BASE_URL}/${cleanUrl}`;
};

export const getMediaUrl = getAbsoluteImageUrl;

