import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIES, normalizeRoles } from "@/lib/next/auth";
import { backendFetch, BackendError, problemMessage, readBackendPayload } from "@/lib/next/server/backend";
import type { LoginResponse } from "@/lib/next/types";

const loginSchema = z.object({
  username: z.string().trim().min(2).max(120),
  password: z.string().min(1).max(256),
});

function readString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function readNestedRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstRecord(...records: Array<Record<string, unknown>>): Record<string, unknown> {
  return records.find((record) => Object.keys(record).length > 0) ?? {};
}

function authPayload(source: Record<string, unknown>): Record<string, unknown> {
  const nested = firstRecord(
    readNestedRecord(source, "data"),
    readNestedRecord(source, "result"),
    readNestedRecord(source, "response"),
    readNestedRecord(source, "payload"),
  );

  return firstRecord(nested, source);
}

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

    const rawLogin = payload as LoginResponse & Record<string, unknown>;
    const login = authPayload(rawLogin) as LoginResponse & Record<string, unknown>;
    const userPayload = firstRecord(readNestedRecord(login, "user"), readNestedRecord(rawLogin, "user"));
    const initialAccessToken = readString(login, ["access_token", "accessToken", "token"]);
    if (!initialAccessToken) {
      return NextResponse.json({ error: "Сервис авторизации вернул неполный ответ", code: "INVALID_AUTH_RESPONSE" }, { status: 502 });
    }

    let accessToken = initialAccessToken;
    let refreshToken = readString(login, ["refresh_token", "refreshToken"]);
    try {
      const translatedResponse = await backendFetch("/auth/translate-token", {
        headers: { Authorization: `Bearer ${initialAccessToken}`, Accept: "application/json" },
      }, 6_000);
      if (translatedResponse.ok) {
        const translatedPayload = await readBackendPayload(translatedResponse) as Partial<LoginResponse> & Record<string, unknown>;
        const translated = authPayload(translatedPayload) as Partial<LoginResponse> & Record<string, unknown>;
        accessToken = readString(translated, ["access_token", "accessToken", "token"]) || accessToken;
        refreshToken = readString(translated, ["refresh_token", "refreshToken"]) || refreshToken;
      }
    } catch {
      // Token translation is an optional compatibility bridge; the original token remains valid.
    }

    const roles = normalizeRoles(login.role_ids ?? login.roleIds ?? login.roles ?? rawLogin.role_ids ?? rawLogin.roleIds ?? rawLogin.roles ?? userPayload.role_ids ?? userPayload.roleIds ?? userPayload.roles);
    const sessionSeconds = Math.min(Math.max(Number(login.expires_in ?? rawLogin.expires_in) || 1800, 300), 8 * 60 * 60);
    const secure = false;
    const username = readString(login, ["username"]) || readString(userPayload, ["username", "login"]) || parsed.data.username;
    const response = NextResponse.json({ user: { username, roles } });
    const common = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
    const readableCommon = { httpOnly: false, sameSite: "lax" as const, secure, path: "/" };

    response.cookies.set(AUTH_COOKIES.access, accessToken, { ...common, maxAge: sessionSeconds });
    response.cookies.set(AUTH_COOKIES.roles, JSON.stringify(roles), { ...common, maxAge: sessionSeconds });
    response.cookies.set(AUTH_COOKIES.username, username, { ...common, maxAge: sessionSeconds });
    response.cookies.set("access_token", accessToken, { ...readableCommon, maxAge: sessionSeconds });
    response.cookies.set("role_ids", JSON.stringify(roles), { ...readableCommon, maxAge: sessionSeconds });
    response.cookies.set("username", username, { ...readableCommon, maxAge: sessionSeconds });
    if (refreshToken) {
      response.cookies.set(AUTH_COOKIES.refresh, refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 });
      response.cookies.set("refresh_token", refreshToken, { ...readableCommon, maxAge: 7 * 24 * 60 * 60 });
    }
    return response;
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ error: error.message, code: "BACKEND_UNAVAILABLE" }, { status: error.status });
    }
    return NextResponse.json({ error: "Не удалось выполнить вход", code: "AUTH_ERROR" }, { status: 500 });
  }
}
