import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/next/auth";

const DEFAULT_APPLICATIONS_URL = "http://10.65.10.20:7676";

function applicationsBaseUrl(): string {
  return (process.env.APPLICATIONS_API_URL || process.env.NEXT_PUBLIC_APPLICATIONS_API_URL || DEFAULT_APPLICATIONS_URL).replace(/\/$/, "");
}

async function proxyApplications(request: NextRequest) {
  const upstreamUrl = new URL(`${applicationsBaseUrl()}/applications`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  const token = await getAccessToken();
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Не удалось получить заявки" }, { status: 502 });
  }
}

export const GET = proxyApplications;
