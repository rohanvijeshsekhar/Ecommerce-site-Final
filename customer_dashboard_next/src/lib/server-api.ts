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
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${MEDIA_BASE_URL}${url}`;
  return `${MEDIA_BASE_URL}/${url}`;
}
