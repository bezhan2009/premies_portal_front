"use client";

import anime from "animejs";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, Command, LogOut, Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  concretePath,
  NAVIGATION_GROUP_ORDER,
  ROLE_LABELS,
  routesForRoles,
  type PortalRoute,
} from "@/config/next-navigation";
import type { PortalSession } from "@/lib/next/types";
import { useUiStore } from "@/stores/ui-store";
import { NavIcon } from "@/components/next/navigation/nav-icon";
import { CommandPalette } from "@/components/next/navigation/command-palette";
import { useReducedMotion } from "@/hooks/next/use-reduced-motion";

function initials(username: string): string {
  return username.split(/[._\s-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AD";
}

function SidebarContent({ session, routes, onNavigate }: { session: PortalSession; routes: PortalRoute[]; onNavigate?: () => void }) {
  const pathname = usePathname() || "/";
  const { sidebarCollapsed } = useUiStore();
  const grouped = useMemo(() => NAVIGATION_GROUP_ORDER.map((group) => ({
    group,
    routes: routes.filter((item) => item.group === group && !item.path.includes(":")),
  })).filter((entry) => entry.routes.length > 0), [routes]);

  return (
    <>
      <Link href="/" className="brand-lockup" onClick={onNavigate} aria-label="Activ Daily — главная">
        <span className="brand-mark"><span>ad</span></span>
        <span className="brand-copy"><strong>Activ Daily</strong><small>премиальный портал</small></span>
      </Link>
      <nav className="sidebar-navigation" aria-label="Основная навигация">
        <p className="sidebar-eyebrow">Рабочее пространство</p>
        {grouped.map(({ group, routes: groupRoutes }, groupIndex) => (
          <div className="nav-group" key={group}>
            {!sidebarCollapsed && groupIndex > 0 && <span className="nav-group-title">{group}</span>}
            {groupRoutes.map((item) => {
              const href = concretePath(item.path);
              const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
              return (
                <Link href={href} onClick={onNavigate} className={clsx("nav-link", active && "is-active")} key={item.path} title={sidebarCollapsed ? item.title : undefined}>
                  <NavIcon name={item.icon} />
                  <span>{item.title}</span>
                  {item.primary && !sidebarCollapsed && <i className="nav-dot" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-profile">
        <span className="avatar">{initials(session.username)}</span>
        <span className="profile-copy"><strong>{session.username}</strong><small>{ROLE_LABELS[session.roles[0]] || `Роль ${session.roles[0] || "—"}`}</small></span>
        <span className="presence-dot" title="В сети" />
      </div>
    </>
  );
}

export function PortalShell({ session, children }: { session: PortalSession; children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [loggingOut, setLoggingOut] = useState(false);
  const {
    sidebarCollapsed,
    mobileNavigationOpen,
    setMobileNavigationOpen,
    setCommandOpen,
    toggleSidebar,
  } = useUiStore();
  const routes = useMemo(() => routesForRoles(session.roles), [session.roles]);

  useEffect(() => {
    if (reducedMotion) return;
    anime({
      targets: ".portal-main-inner",
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 360,
      easing: "easeOutCubic",
    });
  }, [pathname, reducedMotion]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "DELETE" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className={clsx("portal-shell", sidebarCollapsed && "sidebar-is-collapsed")}>
      <aside className="desktop-sidebar">
        <SidebarContent session={session} routes={routes} />
        <button type="button" className="sidebar-toggle" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}>
          {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </aside>

      {mobileNavigationOpen && (
        <div className="mobile-nav-backdrop" onMouseDown={() => setMobileNavigationOpen(false)} role="presentation">
          <aside className="mobile-sidebar" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="mobile-nav-close icon-button" onClick={() => setMobileNavigationOpen(false)} aria-label="Закрыть меню"><X size={20} /></button>
            <SidebarContent session={session} routes={routes} onNavigate={() => setMobileNavigationOpen(false)} />
          </aside>
        </div>
      )}

      <section className="portal-stage">
        <header className="portal-header">
          <div className="header-leading">
            <button type="button" className="icon-button mobile-menu-button" onClick={() => setMobileNavigationOpen(true)} aria-label="Открыть меню"><Menu size={20} /></button>
            <div><span className="header-kicker">ActivBank · Daily operations</span><strong>Добрый день, {session.username}</strong></div>
          </div>
          <div className="header-actions">
            <button type="button" className="search-trigger" onClick={() => setCommandOpen(true)}>
              <Search size={17} /><span>Быстрый поиск</span><kbd><Command size={11} /> K</kbd>
            </button>
            <button type="button" className="icon-button notification-button" aria-label="Уведомления"><Bell size={19} /><i /></button>
            <button type="button" className="logout-button" onClick={logout} disabled={loggingOut}><LogOut size={17} /><span>{loggingOut ? "Выходим…" : "Выйти"}</span></button>
          </div>
        </header>
        <main className="portal-main" id="main-content"><div className="portal-main-inner" key={pathname}>{children}</div></main>
      </section>
      <CommandPalette routes={routes} />
    </div>
  );
}
