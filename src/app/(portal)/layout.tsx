import type { ReactNode } from "react";
import { PortalShell } from "@/components/next/navigation/portal-shell";
import { requireSession } from "@/lib/next/auth";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return <PortalShell session={session}>{children}</PortalShell>;
}
