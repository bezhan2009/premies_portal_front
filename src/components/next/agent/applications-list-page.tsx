"use client";

import anime from "animejs";
import clsx from "clsx";
import {
  Archive,
  CalendarDays,
  Download,
  Eye,
  FileImage,
  Filter,
  ImageOff,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/next/api-client";
import { useReducedMotion } from "@/hooks/next/use-reduced-motion";

interface ApplicationStatus {
  ID?: number;
  id?: number;
  name?: string;
}

interface CardApplication {
  ID?: number;
  id?: number;
  name?: string;
  surname?: string;
  patronymic?: string;
  phone_number?: string;
  receiving_office?: string;
  card_name?: string;
  request_creator?: string;
  request_сreator?: string;
  application_status?: ApplicationStatus;
  operator_fio?: string;
  CreatedAt?: string;
  created_at?: string;
  address?: string;
  inn?: string;
  front_side_of_the_passport?: string;
  back_side_of_the_passport?: string;
  selfie_with_passport?: string;
  [key: string]: unknown;
}

interface ApplicationsPayload {
  applications?: CardApplication[];
  data?: CardApplication[] | { applications?: CardApplication[] };
  items?: CardApplication[];
  total?: number;
}

type StatusOption = { id: number | "all"; label: string };

const STATUS_OPTIONS: StatusOption[] = [
  { id: "all", label: "Все" },
  { id: 1, label: "Заявка принята" },
  { id: 2, label: "Заявка обработана" },
  { id: 3, label: "Карта открыта" },
  { id: 4, label: "Карта активирована" },
  { id: 5, label: "Недостоверные данные" },
  { id: 6, label: "Отказано в карте" },
  { id: 7, label: "Не одобрено" },
  { id: 8, label: "Одобрено" },
];

const DOCUMENTS = [
  { key: "front_side_of_the_passport", label: "Лицевая сторона" },
  { key: "back_side_of_the_passport", label: "Задняя сторона" },
  { key: "selfie_with_passport", label: "Скан с лицом" },
] as const;

function normalizeApplications(payload: ApplicationsPayload | CardApplication[] | null): CardApplication[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.applications)) return payload.applications;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === "object" && Array.isArray(payload.data.applications)) return payload.data.applications;
  return [];
}

function appId(app: CardApplication): number {
  return Number(app.ID ?? app.id ?? 0);
}

function clientName(app: CardApplication): string {
  return [app.surname, app.name, app.patronymic].filter(Boolean).join(" ").trim() || "Без имени";
}

function initials(app: CardApplication): string {
  return [app.name, app.surname]
    .filter(Boolean)
    .map((part) => part?.[0]?.toUpperCase())
    .join("") || "AD";
}

function createdAt(app: CardApplication): string {
  return String(app.CreatedAt || app.created_at || "");
}

function statusId(app: CardApplication): number | null {
  const value = app.application_status?.ID ?? app.application_status?.id;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function statusName(app: CardApplication): string {
  return app.application_status?.name || "Без статуса";
}

function creator(app: CardApplication): string {
  return app.request_creator || app.request_сreator || "—";
}

function valueOrDash(value?: unknown): string {
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number") return String(value);
  return "—";
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inDateRange(app: CardApplication, fromDate: string, toDate: string): boolean {
  const source = createdAt(app);
  if (!source || (!fromDate && !toDate)) return true;
  const day = source.slice(0, 10);
  if (fromDate && day < fromDate) return false;
  if (toDate && day > toDate) return false;
  return true;
}

function statusTone(app: CardApplication): string {
  const id = statusId(app);
  if ([3, 4, 8].includes(id || 0)) return "is-green";
  if ([5, 6, 7].includes(id || 0)) return "is-red";
  if (id === 2) return "is-amber";
  return "is-new";
}

function fileUrl(path?: unknown): string | null {
  if (typeof path !== "string" || !path.trim()) return null;
  return `/api/agent/applications/file?path=${encodeURIComponent(path.trim())}`;
}

function downloadCsv(applications: CardApplication[]) {
  const rows = [
    ["ID", "Клиент", "Телефон", "Офис получения", "Карта", "Канал", "Статус", "Оператор", "Создано"],
    ...applications.map((app) => [
      String(appId(app)),
      clientName(app),
      valueOrDash(app.phone_number),
      valueOrDash(app.receiving_office),
      valueOrDash(app.card_name),
      creator(app),
      statusName(app),
      valueOrDash(app.operator_fio),
      createdAt(app),
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `card-applications-${toInputDate(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ApplicationStatusPill({ application }: { application: CardApplication }) {
  return (
    <span className={clsx("application-status-pill", statusTone(application))}>
      <i />
      {statusName(application)}
    </span>
  );
}

function ApplicationSkeleton() {
  return (
    <div className="application-skeleton">
      {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
    </div>
  );
}

export function AgentApplicationsListPage() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const now = new Date();
  const [applications, setApplications] = useState<CardApplication[]>([]);
  const [activeStatus, setActiveStatus] = useState<StatusOption["id"]>("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [toDate, setToDate] = useState(toInputDate(now));
  const [archiveOnly, setArchiveOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedApplication, setSelectedApplication] = useState<CardApplication | null>(null);
  const [operatorName, setOperatorName] = useState("Сотрудник");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      async function loadApplications() {
        setLoading(true);
        setError(null);
        try {
          const params = new URLSearchParams({ month: "0" });
          if (activeStatus !== "all") params.set("status_id", String(activeStatus));
          if (archiveOnly) params.set("archive", "true");
          const payload = await apiRequest<ApplicationsPayload | CardApplication[]>(`/api/agent/applications?${params.toString()}`);
          setApplications(normalizeApplications(payload));
          setSelectedIds(new Set());
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить заявки");
          setApplications([]);
        } finally {
          setLoading(false);
        }
      }

      void loadApplications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeStatus, archiveOnly, reloadNonce]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const session = await apiRequest<{ user?: { username?: string } }>("/api/auth/session").catch(() => null);
      setOperatorName(session?.user?.username || "Сотрудник");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    return applications.filter((app) => {
      const searchable = [
        appId(app),
        clientName(app),
        app.phone_number,
        app.receiving_office,
        app.card_name,
        creator(app),
        statusName(app),
        app.operator_fio,
        app.inn,
        createdAt(app),
      ].join(" ").toLocaleLowerCase("ru");
      return inDateRange(app, fromDate, toDate) && (!query || searchable.includes(query));
    });
  }, [applications, fromDate, search, toDate]);

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    anime({
      targets: rootRef.current.querySelectorAll(".applications-animate"),
      opacity: [0, 1],
      translateY: [8, 0],
      delay: anime.stagger(35),
      duration: 340,
      easing: "easeOutCubic",
    });
  }, [filteredApplications.length, reducedMotion]);

  const selectableApplications = filteredApplications.filter((app) => appId(app) > 0);
  const allVisibleSelected = selectableApplications.length > 0 && selectableApplications.every((app) => selectedIds.has(appId(app)));
  const selectedCount = selectedIds.size;

  function toggleSelected(id: number) {
    if (!id) return;
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
      if (allVisibleSelected) selectableApplications.forEach((app) => next.delete(appId(app)));
      else selectableApplications.forEach((app) => next.add(appId(app)));
      return next;
    });
  }

  function handleChoiceKeyDown(event: KeyboardEvent<HTMLLabelElement>, callback: () => void) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    callback();
  }

  async function goToApplication(app: CardApplication) {
    const id = appId(app);
    if (!id) return;
    setOpeningId(id);
    try {
      await fetch(`/api/agent/applications/${id}/operator`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator_fio: operatorName }),
      });
    } finally {
      router.push(`/agent/card/${id}`);
    }
  }

  return (
    <div ref={rootRef} className="applications-page">
      <section className="applications-header applications-animate">
        <div>
          <span className="page-eyebrow"><SlidersHorizontal size={14} /> Заявки</span>
          <h1>Заявки на карты</h1>
          <p>Единый список заявок с быстрым переходом по статусам, поиском, периодом по CreatedAt и карточкой деталей.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => setReloadNonce((value) => value + 1)} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : undefined} />
          Обновить
        </button>
      </section>

      <section className="applications-status-tabs applications-animate" aria-label="Статусы заявок">
        {STATUS_OPTIONS.map((status) => (
          <button
            type="button"
            className={clsx(activeStatus === status.id && "is-active")}
            onClick={() => setActiveStatus(status.id)}
            key={status.id}
          >
            {status.label}
          </button>
        ))}
      </section>

      <section className="applications-toolbar applications-animate">
        <label className="applications-search">
          <Search size={17} />
          <span className="sr-only">Поиск заявки</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по ID, клиенту, телефону, офису, карте, каналу, статусу" />
        </label>
        <div className="applications-period">
          <CalendarDays size={16} />
          <label><span>От</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label><span>До</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        </div>
        <div className="applications-actions">
          <button type="button" className={clsx("secondary-button", archiveOnly && "is-pressed")} onClick={() => setArchiveOnly((value) => !value)}>
            <Archive size={16} />
            Архив
          </button>
          <button type="button" className={clsx("secondary-button", filtersOpen && "is-pressed")} onClick={() => setFiltersOpen((value) => !value)}>
            <Filter size={16} />
            Фильтры
          </button>
          <button type="button" className="primary-button" onClick={() => downloadCsv(filteredApplications)}>
            <Download size={16} />
            Выгрузка
          </button>
        </div>
      </section>

      {filtersOpen && (
        <section className="applications-filter-panel applications-animate">
          <span>Выбрано: {selectedCount}</span>
          <span>Показано: {filteredApplications.length}</span>
          <span>Оператор перехода: {operatorName}</span>
          <button type="button" onClick={() => { setSearch(""); setFromDate(""); setToDate(""); }}>Сбросить быстрые фильтры</button>
        </section>
      )}

      {error && (
        <div className="inline-alert applications-alert">
          <span><strong>Заявки не загрузились.</strong> {error}</span>
          <button type="button" onClick={() => setReloadNonce((value) => value + 1)}><RefreshCw size={15} /> Повторить</button>
        </div>
      )}

      <section className="panel applications-table-panel applications-animate">
        {loading ? <ApplicationSkeleton /> : (
          <div className="responsive-table applications-responsive-table">
            <table className="applications-table">
              <thead>
                <tr>
                  <th className="applications-check-cell">
                    <label
                      className="choice-input"
                      role="checkbox"
                      aria-checked={allVisibleSelected}
                      tabIndex={0}
                      onClick={(event) => {
                        event.preventDefault();
                        toggleVisibleSelection();
                      }}
                      onKeyDown={(event) => handleChoiceKeyDown(event, toggleVisibleSelection)}
                    >
                      <input type="checkbox" checked={allVisibleSelected} readOnly tabIndex={-1} />
                      <span />
                    </label>
                  </th>
                  <th>ID</th>
                  <th>Клиент</th>
                  <th>Офис получения</th>
                  <th>Карта</th>
                  <th>Канал</th>
                  <th>Статус</th>
                  <th>Оператор</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app, index) => {
                  const id = appId(app);
                  return (
                    <tr key={`${id}-${createdAt(app)}-${index}`}>
                      <td className="applications-check-cell">
                        <label
                          className="choice-input"
                          role="checkbox"
                          aria-checked={selectedIds.has(id)}
                          tabIndex={id ? 0 : -1}
                          onClick={(event) => {
                            event.preventDefault();
                            toggleSelected(id);
                          }}
                          onKeyDown={(event) => handleChoiceKeyDown(event, () => toggleSelected(id))}
                        >
                          <input type="checkbox" checked={selectedIds.has(id)} readOnly tabIndex={-1} />
                          <span />
                        </label>
                      </td>
                      <td><strong>#{id || "—"}</strong></td>
                      <td>
                        <div className="application-client-cell">
                          <span className={`employee-avatar avatar-tone-${index % 4}`}>{initials(app)}</span>
                          <span>
                            <strong>{clientName(app)}</strong>
                            <small>{valueOrDash(app.phone_number)}</small>
                          </span>
                        </div>
                      </td>
                      <td className="applications-office-cell">{valueOrDash(app.receiving_office)}</td>
                      <td><strong>{valueOrDash(app.card_name)}</strong></td>
                      <td>{creator(app)}</td>
                      <td><ApplicationStatusPill application={app} /></td>
                      <td>{valueOrDash(app.operator_fio)}</td>
                      <td>
                        <div className="applications-row-actions">
                          <button type="button" className="secondary-button" onClick={() => setSelectedApplication(app)}>
                            <Eye size={15} />
                            Подробнее
                          </button>
                          <button type="button" className="primary-button" onClick={() => void goToApplication(app)} disabled={openingId === id}>
                            {openingId === id ? <Loader2 size={15} className="spin" /> : null}
                            Перейти
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredApplications.length && (
                  <tr>
                    <td colSpan={9}><div className="table-empty">По текущим параметрам заявок не найдено</div></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedApplication && (
        <ApplicationDetailsModal application={selectedApplication} onClose={() => setSelectedApplication(null)} />
      )}
    </div>
  );
}

function ApplicationDetailsModal({ application, onClose }: { application: CardApplication; onClose: () => void }) {
  const availableDocuments = DOCUMENTS.filter((doc) => Boolean(fileUrl(application[doc.key])));
  return (
    <div className="application-modal-backdrop" onMouseDown={onClose} role="presentation">
      <section className="application-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Детали заявки">
        <button type="button" className="icon-button application-modal-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        <header className="application-modal-head">
          <div>
            <h2>Заявка #{appId(application)}</h2>
            <p>{clientName(application)}</p>
          </div>
          <ApplicationStatusPill application={application} />
        </header>
        <div className="application-detail-grid">
          <span><small>Телефон</small><strong>{valueOrDash(application.phone_number)}</strong></span>
          <span><small>Карта</small><strong>{valueOrDash(application.card_name)}</strong></span>
          <span><small>ИНН</small><strong>{valueOrDash(application.inn)}</strong></span>
          <span><small>Офис получения</small><strong>{valueOrDash(application.receiving_office)}</strong></span>
          <span><small>Канал</small><strong>{creator(application)}</strong></span>
          <span><small>Оператор</small><strong>{valueOrDash(application.operator_fio)}</strong></span>
        </div>
        <div className="application-documents-head">
          <h3>Сканы паспорта</h3>
          <span>Загружено {availableDocuments.length} из 3</span>
        </div>
        <div className="application-documents-grid">
          {DOCUMENTS.map((doc) => {
            const src = fileUrl(application[doc.key]);
            return (
              <figure className={clsx("application-document-card", !src && "is-empty")} key={doc.key}>
                {src ? <Image src={src} alt={doc.label} width={360} height={480} unoptimized /> : <span><ImageOff size={30} />Нет файла</span>}
                <figcaption>{src ? <FileImage size={14} /> : null}{doc.label}</figcaption>
              </figure>
            );
          })}
        </div>
      </section>
    </div>
  );
}
