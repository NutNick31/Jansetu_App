import { getIdToken } from './firebaseAuth';

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken().catch(() => null);
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...authHeader, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} at ${path} ${body}`);
  }
  return (await res.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: form });
}
