import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PremiumDashboard } from "@/components/next/dashboard/premium-dashboard";
import { hasAnyRole, requireSession } from "@/lib/next/auth";

export const metadata: Metadata = { title: "Отчёты председателя" };

export default async function ChairmanReportsPage() {
  const session = await requireSession();
  if (!hasAnyRole(session.roles, [9])) redirect("/access-denied");
  return <PremiumDashboard mode="executive" title="Сводка для председателя" description="Ключевые результаты премиальной программы по сети банка." />;
}
