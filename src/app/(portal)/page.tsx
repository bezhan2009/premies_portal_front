import { redirect } from "next/navigation";
import { defaultRouteForRoles } from "@/config/next-navigation";
import { requireSession } from "@/lib/next/auth";

export default async function PortalHomePage() {
  const session = await requireSession();
  redirect(defaultRouteForRoles(session.roles));
}
