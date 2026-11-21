export const PRODUCTION_API_BASE_URL = 'https://nexoraapi.sopdev.in';

/**
 * Resolves the backend API base URL.
 * - Production builds default to https://nexoraapi.sopdev.in (overridable via VITE_API_BASE_URL over HTTPS).
 * - Non-HTTPS remote URLs are rejected to ensure all API communication uses HTTPS.
 * - In local/preview development without VITE_API_BASE_URL, defaults to same-origin ('').
 */
export function resolveApiBaseUrl(
  envUrl?: string,
  isProd = import.meta.env.PROD
): string {
  const candidate = (envUrl || '').trim().replace(/\/+$/, '');
  if (candidate) {
    if (candidate.startsWith('https://')) {
      return candidate;
    }
    if (
      !isProd &&
      (candidate.startsWith('http://localhost:') ||
        candidate.startsWith('http://127.0.0.1:'))
    ) {
      return candidate;
    }
  }
  return isProd ? PRODUCTION_API_BASE_URL : '';
}

export const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL as string | undefined,
  import.meta.env.PROD
);

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
