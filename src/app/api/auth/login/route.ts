import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIES, normalizeRoles } from "@/lib/next/auth";
import { backendFetch, BackendError, problemMessage, readBackendPayload } from "@/lib/next/server/backend";
import type { LoginResponse } from "@/lib/next/types";

const loginSchema = z.object({
  username: z.string().trim().min(2).max(120),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Проверьте логин и пароль", code: "INVALID_CREDENTIALS" }, { status: 400 });
    }

    const signInResponse = await backendFetch("/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(parsed.data),
    }, 12_000);
    const payload = await readBackendPayload(signInResponse);

    if (!signInResponse.ok) {
      return NextResponse.json(
        { error: problemMessage(payload, "Неверный логин или пароль"), code: "SIGN_IN_FAILED" },
        { status: signInResponse.status === 401 ? 401 : 400 },
      );
    }

    const login = payload as LoginResponse;
    if (!login?.access_token) {
      return NextResponse.json({ error: "Сервис авторизации вернул неполный ответ", code: "INVALID_AUTH_RESPONSE" }, { status: 502 });
    }

    let accessToken = login.access_token;
    let refreshToken = login.refresh_token;
    try {
      const translatedResponse = await backendFetch("/auth/translate-token", {
        headers: { Authorization: `Bearer ${login.access_token}`, Accept: "application/json" },
      }, 6_000);
      if (translatedResponse.ok) {
        const translated = await readBackendPayload(translatedResponse) as Partial<LoginResponse>;
        accessToken = translated.access_token || accessToken;
        refreshToken = translated.refresh_token || refreshToken;
      }
    } catch {
      // Token translation is an optional compatibility bridge; the original token remains valid.
    }

    const roles = normalizeRoles(login.role_ids);
    const sessionSeconds = Math.min(Math.max(Number(login.expires_in) || 1800, 300), 8 * 60 * 60);
    const secure = process.env.NODE_ENV === "production";
    const response = NextResponse.json({ user: { username: parsed.data.username, roles } });
    const common = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };

    response.cookies.set(AUTH_COOKIES.access, accessToken, { ...common, maxAge: sessionSeconds });
    response.cookies.set(AUTH_COOKIES.roles, JSON.stringify(roles), { ...common, maxAge: sessionSeconds });
    response.cookies.set(AUTH_COOKIES.username, parsed.data.username, { ...common, maxAge: sessionSeconds });
    if (refreshToken) {
      response.cookies.set(AUTH_COOKIES.refresh, refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 });
    }
    return response;
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ error: error.message, code: "BACKEND_UNAVAILABLE" }, { status: error.status });
    }
    return NextResponse.json({ error: "Не удалось выполнить вход", code: "AUTH_ERROR" }, { status: 500 });
  }
}
