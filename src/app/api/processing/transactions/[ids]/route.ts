import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/next/auth";

const DEFAULT_PROCESSING_TRANSACTIONS_URL = "http://10.64.20.84:5012/api/Transactions/search-transactions";

interface Context {
  params: Promise<{ ids: string }>;
}

function processingTransactionsUrl(): string {
  return process.env.PROCESSING_TRANSACTIONS_URL || process.env.NEXT_PUBLIC_PROCESSING_TRANSACTIONS_URL || DEFAULT_PROCESSING_TRANSACTIONS_URL;
}

export async function GET(request: NextRequest, context: Context) {
  const { ids } = await context.params;
  const cardIds = ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!cardIds.length || cardIds.some((id) => !/^[\w-]+$/.test(id))) {
    return NextResponse.json({ error: "Некорректный список карт" }, { status: 400 });
  }

  const upstreamUrl = new URL(processingTransactionsUrl());
  request.nextUrl.searchParams.forEach((value, key) => upstreamUrl.searchParams.append(key, value));
  cardIds.forEach((cardId) => upstreamUrl.searchParams.append("cardIds", cardId));

  const token = await getAccessToken();
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Не удалось получить выписку из ПЦ" }, { status: 502 });
  }
}
