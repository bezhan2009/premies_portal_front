import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ModuleWorkspace } from "@/components/next/dashboard/module-workspace";
import { matchPortalRoute, routesForRoles } from "@/config/next-navigation";
import { hasAnyRole, requireSession } from "@/lib/next/auth";

interface PageProps { params: Promise<{ path: string[] }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  const route = matchPortalRoute(`/${path.join("/")}`);
  return route ? { title: route.title, description: route.description } : { title: "Раздел не найден" };
}

export default async function RegisteredRoutePage({ params }: PageProps) {
  const session = await requireSession();
  const { path } = await params;
  const route = matchPortalRoute(`/${path.join("/")}`);
  if (!route) notFound();
  if (!hasAnyRole(session.roles, route.roles)) redirect("/access-denied");
  const related = routesForRoles(session.roles).filter((item) => item.group === route.group && item.path !== route.path && !item.path.includes(":"));
  return <ModuleWorkspace route={route} related={related} />;
}
