import { redirect } from "next/navigation";
import { hasAnyRole, requireSession } from "@/lib/next/auth";

export default async function ProductIndexPage() {
  const session = await requireSession();
  if (!hasAnyRole(session.roles, [22])) redirect("/access-denied");
  redirect("/product/cards");
}
