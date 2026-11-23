/**
 * Server-side API fetch wrapper for use in Server Components.
 * Uses native fetch() — no axios, no localStorage, no browser APIs.
 * Reads API_URL from process.env (server-only, not NEXT_PUBLIC_).
 */

const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1/';
const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://127.0.0.1:8000';

export interface ServerApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Server-side fetch that calls the Django REST API.
 * Handles the FAAZO response envelope: { success, data, message }
 */
export async function serverFetch<T>(
  endpoint: string,
  options?: {
    revalidate?: number | false;
    tags?: string[];
    params?: Record<string, string | number | boolean | undefined>;
  }
): Promise<ServerApiResponse<T>> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  const url = new URL(cleanEndpoint, baseUrl);

  // Add query params
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const fetchOptions: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    headers: {
      'Content-Type': 'application/json',
    },
    next: {},
  };

  if (options?.revalidate !== undefined) {
    fetchOptions.next!.revalidate = options.revalidate;
    if (options.revalidate === 0) {
      fetchOptions.cache = 'no-store';
    }
  }
  if (options?.tags) {
    fetchOptions.next!.tags = options.tags;
  }

  try {
    const res = await fetch(url.toString(), fetchOptions);

    if (!res.ok) {
      if (res.status === 404) {
        // 404 is an expected Not Found state (e.g. invalid or legacy slug)
        return { success: false, message: `Resource not found (404)` };
      }
      console.warn(`[serverFetch] ${endpoint} returned ${res.status}`);
      return { success: false, message: `API returned ${res.status}` };
    }

    const json = await res.json();
    return json;
  } catch (error) {
    console.warn(`[serverFetch] Failed to fetch ${endpoint}:`, error);
    return { success: false, message: 'Server fetch failed' };
  }
}

/**
 * Resolves a relative image URL to an absolute URL for use in Server Components.
 */
export function getServerImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  // Normalize localhost/127.0.0.1 loopback URLs from internal Django serializer responses
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

  // On the server side during SSR, if MEDIA_BASE_URL is localhost or empty,
  // return a relative path so HTML rendered for mobile/desktop clients loads from their host
  const isLocalMediaBase = !MEDIA_BASE_URL || MEDIA_BASE_URL.includes('localhost') || MEDIA_BASE_URL.includes('127.0.0.1');
  if (isLocalMediaBase) {
    return cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
  }

  if (cleanUrl.startsWith('/')) return `${MEDIA_BASE_URL}${cleanUrl}`;
  return `${MEDIA_BASE_URL}/${cleanUrl}`;
}
