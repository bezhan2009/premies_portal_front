import { NextResponse } from "next/server";
import { getSession } from "@/lib/next/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Сессия не найдена" }, { status: 401 });
  return NextResponse.json({ user: session });
}
