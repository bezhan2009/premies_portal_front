import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PortalSession } from "@/lib/next/types";

export const AUTH_COOKIES = {
  access: "portal_access",
  refresh: "portal_refresh",
  roles: "portal_roles",
  username: "portal_username",
} as const;

export function normalizeRoles(value: unknown): number[] {
  const source = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(source.map(Number).filter((role) => Number.isInteger(role) && role > 0))];
}

export async function getSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIES.access)?.value) return null;

  let roles: number[] = [];
  try {
    roles = normalizeRoles(JSON.parse(cookieStore.get(AUTH_COOKIES.roles)?.value ?? "[]"));
  } catch {
    roles = [];
  }

  return {
    username: cookieStore.get(AUTH_COOKIES.username)?.value || "Сотрудник",
    roles,
  };
}

export async function requireSession(): Promise<PortalSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function hasAnyRole(userRoles: number[], allowedRoles: number[]): boolean {
  return allowedRoles.length === 0 || allowedRoles.some((role) => userRoles.includes(role));
}

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_COOKIES.access)?.value ?? null;
}
