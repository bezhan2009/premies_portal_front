import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIES, getAccessToken } from "@/lib/next/auth";
import { backendFetch, BackendError } from "@/lib/next/server/backend";

interface Context {
  params: Promise<{ path: string[] }>;
}

async function proxyRequest(request: NextRequest, context: Context) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Сессия истекла", code: "SESSION_EXPIRED" }, { status: 401 });

  try {
    const { path } = await context.params;
    const encodedPath = path.map((segment) => encodeURIComponent(decodeURIComponent(segment))).join("/");
    const upstreamPath = `/${encodedPath}${request.nextUrl.search}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: request.headers.get("accept") || "application/json",
    };
    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;

    const hasBody = !["GET", "HEAD"].includes(request.method);
    const upstream = await backendFetch(upstreamPath, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
    }, 25_000);

    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) response.headers.set("Content-Disposition", disposition);

    if (upstream.status === 401) {
      Object.values(AUTH_COOKIES).forEach((name) => response.cookies.delete(name));
    }
    return response;
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ error: error.message, code: "BACKEND_ERROR" }, { status: error.status });
    }
    return NextResponse.json({ error: "Не удалось связаться с сервисом", code: "PROXY_ERROR" }, { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
