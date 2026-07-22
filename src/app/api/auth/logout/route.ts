import { NextResponse } from "next/server";
import { AUTH_COOKIES, getAccessToken } from "@/lib/next/auth";
import { backendFetch } from "@/lib/next/server/backend";

export async function DELETE() {
  const token = await getAccessToken();

  if (token) {
    try {
      await backendFetch("/auth/logout", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      }, 5_000);
    } catch {
      // Local session cleanup must succeed even when the backend is unavailable.
    }
  }

  const response = NextResponse.json({ ok: true });
  Object.values(AUTH_COOKIES).forEach((name) => response.cookies.delete(name));
  ["access_token", "refresh_token", "role_ids", "username"].forEach((name) => response.cookies.delete(name));
  return response;
}
