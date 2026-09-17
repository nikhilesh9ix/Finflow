const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiRequestInit = RequestInit & { retries?: number };

/**
 * True only when the request never reached the server (network failure / server down).
 * A 4xx or 5xx response means the backend answered, so demo-data fallbacks must not
 * claim it is unavailable.
 */
export function isBackendUnreachable(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status === 0;
}

/**
 * True when the session is rejected (expired/invalid token, or none sent).
 * These are never worth retrying or reporting — the app is on its way to /login.
 */
export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

async function readResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  // A proxy or gateway error (nginx 502) returns an HTML page, not JSON. Parsing it
  // blindly threw "Unexpected token '<'" straight into the UI.
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Turn FastAPI's `detail` into a readable sentence. Validation errors (422) send
 * an array of objects; passing that to `new Error()` displayed "[object Object]".
 */
function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((item: { loc?: unknown[]; msg?: string }) => {
        const field = item.loc?.filter((part) => part !== "body").join(".");
        return field ? `${field}: ${item.msg}` : item.msg;
      })
      .filter(Boolean)
      .join("; ");
  }
  return status >= 500 ? "The server hit an error. Please try again." : "Request failed";
}

// Only requests that are safe to repeat are retried. Retrying a POST after a 5xx
// or a dropped connection can create the same record twice (a budget was sent
// three times), because the first attempt may already have succeeded.
const RETRYABLE_METHODS = new Set(["GET", "HEAD"]);

const PUBLIC_PATHS = ["/auth/login", "/auth/register"];

async function requestWithRetry<T>(path: string, options: ApiRequestInit = {}, attempt = 0): Promise<T> {
  const token = localStorage.getItem("finflow_token");
  const needsAuth = !PUBLIC_PATHS.includes(path);

  // Fail closed instead of sending a bare request. When several queries run in
  // parallel and one 401s, the handler below clears the token mid-flight; without
  // this guard the siblings would still fire and come back "Missing bearer token",
  // burying the real reason the session ended.
  if (needsAuth && !token) {
    throw new ApiError("Your session has ended. Please sign in again.", 401);
  }

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const canRetry = RETRYABLE_METHODS.has((options.method ?? "GET").toUpperCase());

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const body = await readResponseBody<T>(response);

    if (!response.ok) {
      const detail = errorMessage(body, response.status);

      // A 401 on an authenticated call means the stored token is stale or invalid
      // (e.g. signed with a previous SECRET_KEY). Drop it and let the app return
      // to the login screen — the backend is reachable, so this is not a fallback case.
      // Only when the rejected token is still the stored one: a late 401 from the
      // previous session (e.g. the logout call) must not sign out a new login.
      if (response.status === 401 && path !== "/auth/login" && localStorage.getItem("finflow_token") === token) {
        localStorage.removeItem("finflow_token");
        window.dispatchEvent(new Event("auth:unauthorized"));
      }

      const shouldRetry =
        canRetry && [408, 500, 502, 503, 504].includes(response.status) && attempt < (options.retries ?? 2);
      if (shouldRetry) {
        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
        return requestWithRetry<T>(path, options, attempt + 1);
      }
      throw new ApiError(detail, response.status);
    }

    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // fetch() rejects with a TypeError when the server is unreachable.
    const shouldRetry = canRetry && attempt < (options.retries ?? 2) && error instanceof TypeError;
    if (shouldRetry) {
      await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
      return requestWithRetry<T>(path, options, attempt + 1);
    }
    throw new ApiError("Could not reach the server. Check that the backend is running.", 0);
  }
}

export async function apiFetch<T>(path: string, options: ApiRequestInit = {}): Promise<T> {
  return requestWithRetry<T>(path, options);
}
