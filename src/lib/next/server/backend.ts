import "server-only";

const DEFAULT_TIMEOUT_MS = 15_000;

export class BackendError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export function getBackendUrl(): string {
  return (process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || "http://localhost:7575").replace(/\/$/, "");
}

function safeBackendPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.includes("..") || normalized.includes("\\") || normalized.includes("\0")) {
    throw new BackendError("Недопустимый путь запроса", 400);
  }
  return normalized;
}

export async function backendFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${getBackendUrl()}${safeBackendPath(path)}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof BackendError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new BackendError("Сервис не ответил вовремя", 504);
    }
    throw new BackendError("Сервис временно недоступен", 503);
  } finally {
    clearTimeout(timer);
  }
}

export async function readBackendPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function problemMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object") {
    const candidate = payload as Record<string, unknown>;
    for (const key of ["error", "detail", "message"]) {
      if (typeof candidate[key] === "string" && candidate[key]) return candidate[key];
    }
  }
  return fallback;
}
