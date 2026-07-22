import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PremiumDashboard } from "@/components/next/dashboard/premium-dashboard";
import { hasAnyRole, requireSession } from "@/lib/next/auth";

export const metadata: Metadata = { title: "Отчёты директора" };

export default async function DirectorReportsPage() {
  const session = await requireSession();
  if (!hasAnyRole(session.roles, [5])) redirect("/access-denied");
  return <PremiumDashboard mode="executive" title="Директорская сводка" description="Результаты сотрудников и офисов за выбранный период." />;
}
