"use client";

import anime from "animejs";
import clsx from "clsx";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/next/api-client";
import { useReducedMotion } from "@/hooks/next/use-reduced-motion";

interface PortalUser {
  id?: number;
  ID?: number;
  username?: string;
  full_name?: string;
  fullName?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
  isActive?: boolean;
  roles?: Array<string | RoleLike>;
  compliance_code?: string;
  complianceCode?: string;
  last_seen?: string;
  lastSeen?: string;
}

interface RoleLike {
  id?: number;
  ID?: number;
  name?: string;
  title?: string;
}

interface UsersPayload {
  users?: PortalUser[];
  data?: PortalUser[] | { users?: PortalUser[] };
}

type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "inactive", label: "Отключенные" },
];

const valueOrDash = (value?: string | null) => value?.trim() || "—";

function userId(user: PortalUser): number {
  return Number(user.id ?? user.ID ?? 0);
}

function displayName(user: PortalUser): string {
  const full = user.full_name || user.fullName;
  if (full?.trim()) return full.trim();
  return [user.last_name || user.lastName, user.first_name || user.firstName].filter(Boolean).join(" ").trim();
}

function roleName(role: string | RoleLike): string {
  if (typeof role === "string") return role;
  return role.name || role.title || `Роль ${role.id ?? role.ID ?? ""}`.trim();
}

function initials(user: PortalUser): string {
  const source = displayName(user) || user.username || "AD";
  return source
    .split(/[._\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";
}

function normalizeUsers(payload: UsersPayload | PortalUser[] | null): PortalUser[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.users)) return payload.users;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === "object" && Array.isArray(payload.data.users)) return payload.data.users;
  return [];
}

function normalizeRoles(payload: RoleLike[] | { roles?: RoleLike[]; data?: RoleLike[] } | null): RoleLike[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.roles)) return payload.roles;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function UserStatus({ active }: { active: boolean }) {
  return (
    <span className={clsx("user-status-pill", active ? "is-active" : "is-inactive")}>
      <i />
      {active ? "Активен" : "Отключен"}
    </span>
  );
}

function UsersSkeleton() {
  return (
    <div className="users-skeleton" aria-label="Загрузка пользователей">
      {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
    </div>
  );
}

export function OperatorUsersPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [roles, setRoles] = useState<RoleLike[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [focusedUser, setFocusedUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersPayload, rolesPayload] = await Promise.all([
        apiRequest<UsersPayload | PortalUser[]>("/api/backend/users?all=true"),
        apiRequest<RoleLike[] | { roles?: RoleLike[]; data?: RoleLike[] }>("/api/backend/roles").catch(() => null),
      ]);
      setUsers(normalizeUsers(usersPayload));
      setRoles(normalizeRoles(rolesPayload));
      setSelectedIds(new Set());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить пользователей");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const roleOptions = useMemo(() => {
    const fromUsers = users.flatMap((user) => (user.roles || []).map(roleName)).filter(Boolean);
    const fromCatalog = roles.map(roleName).filter(Boolean);
    return Array.from(new Set([...fromCatalog, ...fromUsers])).sort((a, b) => a.localeCompare(b, "ru"));
  }, [roles, users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    return users.filter((user) => {
      const active = Boolean(user.is_active ?? user.isActive);
      const userRoles = (user.roles || []).map(roleName);
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "active" && active) ||
        (statusFilter === "inactive" && !active);
      const roleMatches = roleFilter === "all" || userRoles.includes(roleFilter);
      const searchable = [
        user.id,
        user.ID,
        user.username,
        displayName(user),
        user.email,
        user.phone,
        user.compliance_code,
        user.complianceCode,
        ...userRoles,
      ].join(" ").toLocaleLowerCase("ru");
      return statusMatches && roleMatches && (!query || searchable.includes(query));
    });
  }, [roleFilter, search, statusFilter, users]);

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    anime({
      targets: rootRef.current.querySelectorAll(".users-animate"),
      opacity: [0, 1],
      translateY: [10, 0],
      delay: anime.stagger(45),
      duration: 360,
      easing: "easeOutCubic",
    });
  }, [filteredUsers.length, reducedMotion]);

  const activeCount = users.filter((user) => Boolean(user.is_active ?? user.isActive)).length;
  const inactiveCount = Math.max(users.length - activeCount, 0);
  const selectedCount = selectedIds.size;
  const allVisibleSelected = filteredUsers.length > 0 && filteredUsers.every((user) => selectedIds.has(userId(user)));

  function toggleSelected(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibleSelection() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) filteredUsers.forEach((user) => next.delete(userId(user)));
      else filteredUsers.forEach((user) => next.add(userId(user)));
      return next;
    });
  }

  return (
    <div ref={rootRef} className="users-page">
      <section className="users-hero users-animate">
        <div>
          <span className="page-eyebrow"><UsersRound size={14} /> Управление доступом</span>
          <h1>Пользователи портала</h1>
          <p>Быстрый рабочий экран для оператора: поиск по ключевым полям, фильтр по роли и статусу, спокойная таблица без лишних эффектов.</p>
        </div>
        <div className="users-hero-actions">
          <button type="button" className="secondary-button" onClick={() => void loadUsers()} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : undefined} />
            Обновить
          </button>
          <Link href="/auth/register" className="primary-button">
            <UserRound size={16} />
            Новый пользователь
          </Link>
        </div>
      </section>

      <section className="users-stat-grid users-animate">
        <article className="users-stat-card">
          <span><UsersRound size={16} /> Всего</span>
          <strong>{users.length}</strong>
          <small>пользователей в системе</small>
        </article>
        <article className="users-stat-card is-green">
          <span><CheckCircle2 size={16} /> Активные</span>
          <strong>{activeCount}</strong>
          <small>могут работать в портале</small>
        </article>
        <article className="users-stat-card is-red">
          <span><CircleAlert size={16} /> Отключенные</span>
          <strong>{inactiveCount}</strong>
          <small>доступ временно закрыт</small>
        </article>
        <article className="users-stat-card is-dark">
          <span><ShieldCheck size={16} /> Выбрано</span>
          <strong>{selectedCount}</strong>
          <small>записей в текущей выборке</small>
        </article>
      </section>

      <section className="panel users-table-panel users-animate">
        <div className="users-toolbar">
          <label className="users-search">
            <Search size={17} />
            <span className="sr-only">Поиск пользователя</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по ID, ФИО, логину, телефону, email или роли" />
          </label>
          <div className="users-filters">
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Фильтр по роли">
              <option value="all">Все роли</option>
              {roleOptions.map((role) => <option value={role} key={role}>{role}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Фильтр по статусу">
              {STATUS_FILTERS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="inline-alert users-alert">
            <span><strong>Пользователи не загрузились.</strong> {error}</span>
            <button type="button" onClick={() => void loadUsers()}><RefreshCw size={15} /> Повторить</button>
          </div>
        )}

        {loading ? <UsersSkeleton /> : (
          <div className="responsive-table users-responsive-table">
            <table className="users-table">
              <thead>
                <tr>
                  <th className="users-check-cell">
                    <label className="choice-input">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} />
                      <span />
                    </label>
                  </th>
                  <th>ID</th>
                  <th>Пользователь</th>
                  <th>Контакты</th>
                  <th>Роли</th>
                  <th>Статус</th>
                  <th>Активность</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const id = userId(user);
                  const name = displayName(user);
                  const userRoles = (user.roles || []).map(roleName);
                  return (
                    <tr key={`${id}-${user.username || index}`}>
                      <td className="users-check-cell">
                        <label className="choice-input">
                          <input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggleSelected(id)} />
                          <span />
                        </label>
                      </td>
                      <td><strong>#{id || "—"}</strong></td>
                      <td>
                        <div className="user-name-cell">
                          <span className={`employee-avatar avatar-tone-${index % 4}`}>{initials(user)}</span>
                          <span>
                            <strong>{name || user.username || "Без имени"}</strong>
                            <small>@{valueOrDash(user.username)}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="user-contact-stack">
                          <span><Mail size={13} /> {valueOrDash(user.email)}</span>
                          <span><Phone size={13} /> {valueOrDash(user.phone)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="role-chip-list">
                          {userRoles.length ? userRoles.slice(0, 3).map((role) => <span key={role}>{role}</span>) : <span>Без роли</span>}
                          {userRoles.length > 3 && <span>+{userRoles.length - 3}</span>}
                        </div>
                      </td>
                      <td><UserStatus active={Boolean(user.is_active ?? user.isActive)} /></td>
                      <td>
                        <span className="last-seen"><Clock3 size={13} /> {valueOrDash(user.last_seen || user.lastSeen)}</span>
                      </td>
                      <td>
                        <button type="button" className="row-action users-row-action" onClick={() => setFocusedUser(user)} aria-label={`Открыть ${name || user.username || id}`}>
                          <ChevronRight size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredUsers.length && (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-empty">
                        {users.length ? "По текущим фильтрам пользователей не найдено" : "Пока нет данных для отображения"}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {focusedUser && (
        <div className="users-modal-backdrop" onMouseDown={() => setFocusedUser(null)} role="presentation">
          <section className="users-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Карточка пользователя">
            <button type="button" className="icon-button users-modal-close" onClick={() => setFocusedUser(null)} aria-label="Закрыть"><X size={20} /></button>
            <div className="users-modal-head">
              <span className="employee-avatar avatar-tone-2">{initials(focusedUser)}</span>
              <div>
                <h2>{displayName(focusedUser) || focusedUser.username || "Пользователь"}</h2>
                <p>#{userId(focusedUser)} · @{valueOrDash(focusedUser.username)}</p>
              </div>
              <UserStatus active={Boolean(focusedUser.is_active ?? focusedUser.isActive)} />
            </div>
            <div className="users-detail-grid">
              <span><Mail size={16} /><small>Email</small><strong>{valueOrDash(focusedUser.email)}</strong></span>
              <span><Phone size={16} /><small>Телефон</small><strong>{valueOrDash(focusedUser.phone)}</strong></span>
              <span><ShieldCheck size={16} /><small>Compliance</small><strong>{valueOrDash(focusedUser.compliance_code || focusedUser.complianceCode)}</strong></span>
              <span><Clock3 size={16} /><small>Последняя активность</small><strong>{valueOrDash(focusedUser.last_seen || focusedUser.lastSeen)}</strong></span>
            </div>
            <div className="users-modal-roles">
              <span className="card-overline">Роли пользователя</span>
              <div className="role-chip-list">
                {(focusedUser.roles || []).length ? (focusedUser.roles || []).map((role) => <span key={roleName(role)}>{roleName(role)}</span>) : <span>Роли не назначены</span>}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
