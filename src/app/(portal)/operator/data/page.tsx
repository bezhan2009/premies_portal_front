import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PremiumDashboard } from "@/components/next/dashboard/premium-dashboard";
import { hasAnyRole, requireSession } from "@/lib/next/auth";

export const metadata: Metadata = { title: "Данные сотрудников" };

export default async function OperatorDataPage() {
  const session = await requireSession();
  if (!hasAnyRole(session.roles, [3])) redirect("/access-denied");
  return <PremiumDashboard mode="data" />;
}
