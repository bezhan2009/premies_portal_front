import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/next/auth";

const DEFAULT_APPLICATIONS_URL = "http://10.65.10.20:7676";

function applicationsBaseUrl(): string {
  return (process.env.APPLICATIONS_API_URL || process.env.NEXT_PUBLIC_APPLICATIONS_API_URL || DEFAULT_APPLICATIONS_URL).replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path") || "";
  if (!filePath || filePath.includes("..") || filePath.includes("\0") || filePath.startsWith("http")) {
    return NextResponse.json({ error: "Недопустимый путь файла" }, { status: 400 });
  }

  const token = await getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const upstream = await fetch(`${applicationsBaseUrl()}/${filePath.replace(/^\/+/, "")}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!upstream.ok) return NextResponse.json({ error: "Файл не найден" }, { status: upstream.status });
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить файл" }, { status: 502 });
  }
}
