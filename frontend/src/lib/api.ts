const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiRequestInit = RequestInit & { retries?: number };

async function readResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

async function requestWithRetry<T>(path: string, options: ApiRequestInit = {}, attempt = 0): Promise<T> {
  const token = localStorage.getItem("finflow_token");
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const body = await readResponseBody<T>(response);

    if (!response.ok) {
      const detail = (body as { detail?: string }).detail ?? "Request failed";
      const shouldRetry = [408, 429, 500, 502, 503, 504].includes(response.status) && attempt < (options.retries ?? 2);
      if (shouldRetry) {
        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
        return requestWithRetry<T>(path, options, attempt + 1);
      }
      throw new ApiError(detail, response.status);
    }

    return body;
  } catch (error) {
    const shouldRetry = attempt < (options.retries ?? 2) && error instanceof TypeError;
    if (shouldRetry) {
      await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
      return requestWithRetry<T>(path, options, attempt + 1);
    }
    throw error instanceof Error ? error : new ApiError("Request failed", 0);
  }
}

export async function apiFetch<T>(path: string, options: ApiRequestInit = {}): Promise<T> {
  return requestWithRetry<T>(path, options);
}
