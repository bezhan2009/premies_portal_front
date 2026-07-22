import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PremiumDashboard } from "@/components/next/dashboard/premium-dashboard";
import { hasAnyRole, requireSession } from "@/lib/next/auth";

export const metadata: Metadata = { title: "Моя премия" };

export default async function WorkerPremiumsPage() {
  const session = await requireSession();
  if (!hasAnyRole(session.roles, [6, 8])) redirect("/access-denied");
  return <PremiumDashboard mode="worker" />;
}
