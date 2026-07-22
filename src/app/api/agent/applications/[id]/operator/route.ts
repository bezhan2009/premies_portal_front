import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/next/auth";

const DEFAULT_APPLICATIONS_URL = "http://10.65.10.20:7676";

interface Context {
  params: Promise<{ id: string }>;
}

function applicationsBaseUrl(): string {
  return (process.env.APPLICATIONS_API_URL || process.env.NEXT_PUBLIC_APPLICATIONS_API_URL || DEFAULT_APPLICATIONS_URL).replace(/\/$/, "");
}

async function updateOperator(request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Некорректный ID заявки" }, { status: 400 });

  const body = await request.json().catch(() => null) as { operator_fio?: string } | null;
  const operatorFio = body?.operator_fio?.trim();
  if (!operatorFio) return NextResponse.json({ error: "operator_fio обязателен" }, { status: 400 });

  const token = await getAccessToken();
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const upstream = await fetch(`${applicationsBaseUrl()}/applications/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ operator_fio: operatorFio }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await upstream.text();
    return new NextResponse(text || null, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Не удалось записать оператора заявки" }, { status: 502 });
  }
}

export const PUT = updateOperator;
export const PATCH = updateOperator;
