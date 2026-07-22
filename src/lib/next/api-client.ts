export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const payload = await response.json().catch(() => null) as
    | { error?: string; code?: string }
    | T
    | null;

  if (!response.ok) {
    const problem = payload && typeof payload === "object" ? payload as { error?: string; code?: string } : null;
    throw new ApiError(problem?.error || "Не удалось выполнить запрос", response.status, problem?.code);
  }

  return payload as T;
}
