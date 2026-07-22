"use client";

import anime from "animejs";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkers } from "@/hooks/next/use-workers";
import { useReducedMotion } from "@/hooks/next/use-reduced-motion";
import type { Worker } from "@/lib/next/types";
import { AnimatedSphere } from "@/components/next/visual/animated-sphere";

export type PremiumDashboardMode = "operator" | "worker" | "reports" | "data" | "executive";

interface PremiumDashboardProps {
  mode: PremiumDashboardMode;
  title?: string;
  description?: string;
}

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const DEMO_WORKERS: Worker[] = [
  { id: 1, salary: 6800, officeName: "ЦО · Душанбе", user: { id: 1, username: "m.saidova", fullName: "Манижа Саидова", email: "" }, metric: { mobileBankConnects: 82, cardTurnoverPremium: 1280, activeCardsPremium: 940, cardSalesPremium: 1160, salaryProject: 780, serviceScore: 9.4, testScore: 9.1 }, premium: 4910 },
  { id: 2, salary: 7200, officeName: "Филиал 02", user: { id: 2, username: "f.rahmon", fullName: "Фируз Рахмон", email: "" }, metric: { mobileBankConnects: 74, cardTurnoverPremium: 1120, activeCardsPremium: 840, cardSalesPremium: 980, salaryProject: 720, serviceScore: 8.9, testScore: 8.7 }, premium: 4280 },
  { id: 3, salary: 6400, officeName: "Филиал 05", user: { id: 3, username: "z.nazarova", fullName: "Зарина Назарова", email: "" }, metric: { mobileBankConnects: 69, cardTurnoverPremium: 1070, activeCardsPremium: 760, cardSalesPremium: 910, salaryProject: 680, serviceScore: 9.2, testScore: 8.3 }, premium: 4025 },
  { id: 4, salary: 7000, officeName: "ЦО · Душанбе", user: { id: 4, username: "a.karimov", fullName: "Азиз Каримов", email: "" }, metric: { mobileBankConnects: 64, cardTurnoverPremium: 980, activeCardsPremium: 720, cardSalesPremium: 860, salaryProject: 610, serviceScore: 8.6, testScore: 7.9 }, premium: 3670 },
  { id: 5, salary: 6100, officeName: "Филиал 01", user: { id: 5, username: "s.umarov", fullName: "Сино Умаров", email: "" }, metric: { mobileBankConnects: 57, cardTurnoverPremium: 870, activeCardsPremium: 660, cardSalesPremium: 790, salaryProject: 560, serviceScore: 8.2, testScore: 8.1 }, premium: 3310 },
];

const formatCurrency = (value: number, compact = false) => new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "TJS",
  maximumFractionDigits: 0,
  notation: compact ? "compact" : "standard",
}).format(value);

function employeeInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function MetricCard({ label, value, change, icon, tone = "red", hint }: { label: string; value: string; change: number; icon: React.ReactNode; tone?: string; hint: string }) {
  const positive = change >= 0;
  return (
    <article className="metric-card dashboard-animate">
      <div className={`metric-icon tone-${tone}`}>{icon}</div>
      <div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>
      <span className={`metric-change ${positive ? "is-positive" : "is-negative"}`}>
        {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(change)}%
      </span>
    </article>
  );
}

function DashboardSkeleton() {
  return <div className="dashboard-skeleton" aria-label="Загрузка данных"><i /><i /><i /><i /></div>;
}

export function PremiumDashboard({ mode, title, description }: PremiumDashboardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const scope = mode === "worker" ? "me" : "all";
  const query = useWorkers({ month, year, scope });
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const workers = useMemo(() => query.data?.length ? query.data : demoEnabled ? DEMO_WORKERS : [], [demoEnabled, query.data]);

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    anime({
      targets: rootRef.current.querySelectorAll(".dashboard-animate"),
      opacity: [0, 1],
      translateY: [12, 0],
      delay: anime.stagger(65),
      duration: 480,
      easing: "easeOutCubic",
    });
  }, [mode, reducedMotion, workers.length]);

  const stats = useMemo(() => {
    const total = workers.reduce((sum, item) => sum + item.premium, 0);
    const average = workers.length ? Math.round(total / workers.length) : 0;
    const salaryTotal = workers.reduce((sum, item) => sum + item.salary, 0);
    const attainment = salaryTotal ? Math.min(100, Math.round((total / (salaryTotal * 0.65)) * 100)) : 0;
    return { total, average, employees: workers.length, attainment };
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("ru");
    const sorted = [...workers].sort((a, b) => b.premium - a.premium);
    if (!normalized) return sorted;
    return sorted.filter((worker) => `${worker.user.fullName} ${worker.officeName} ${worker.user.username}`.toLocaleLowerCase("ru").includes(normalized));
  }, [search, workers]);

  const heading = title || (mode === "worker" ? "Моя премия" : mode === "reports" ? "Премиальная аналитика" : mode === "data" ? "Данные сотрудников" : "Премиальный пульс");
  const subheading = description || (mode === "worker" ? "Понятная детализация вашего результата за выбранный период." : "Контролируйте фонд, динамику KPI и готовность расчёта в одном окне.");
  const monthLabel = MONTHS[month - 1];
  const chartValues = [58, 64, 61, 73, 69, 82, 76, 88, 91, 84, 94, stats.attainment || 78];

  return (
    <div ref={rootRef} className="dashboard-page">
      <section className="dashboard-title-row dashboard-animate">
        <div><span className="page-eyebrow"><Sparkles size={14} /> Премии · {year}</span><h1>{heading}</h1><p>{subheading}</p></div>
        <div className="period-control">
          <CalendarDays size={17} />
          <label><span className="sr-only">Месяц</span><select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{MONTHS.map((item, index) => <option value={index + 1} key={item}>{item}</option>)}</select></label>
          <label><span className="sr-only">Год</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        </div>
      </section>

      {query.isError && !demoEnabled && (
        <div className="inline-alert dashboard-animate"><span><strong>Данные пока недоступны.</strong> Проверьте подключение к основному сервису.</span><button type="button" onClick={() => query.refetch()}><RefreshCw size={15} /> Повторить</button></div>
      )}

      <section className="premium-hero dashboard-animate">
        <div className="premium-hero-copy">
          <span className="hero-status"><i /> Расчёт за {monthLabel.toLocaleLowerCase("ru")} открыт</span>
          <p>{mode === "worker" ? "Ожидаемая премия" : "Премиальный фонд"}</p>
          <strong>{formatCurrency(stats.total)}</strong>
          <div className="hero-progress-label"><span>Готовность расчёта</span><b>{stats.attainment}%</b></div>
          <div className="hero-progress"><i style={{ width: `${stats.attainment}%` }} /></div>
          <small><CheckCircle2 size={14} /> Показатели синхронизируются через защищённый шлюз</small>
        </div>
        <div className="premium-hero-visual"><AnimatedSphere compact /><div className="orb-caption"><span>+12.4%</span><small>к прошлому периоду</small></div></div>
      </section>

      {query.isLoading && !demoEnabled ? <DashboardSkeleton /> : (
        <section className="metric-grid">
          <MetricCard label="Фонд премий" value={formatCurrency(stats.total, true)} change={12.4} hint="утверждено к расчёту" icon={<CircleDollarSign size={20} />} />
          <MetricCard label="Сотрудники" value={String(stats.employees)} change={4.2} hint="в текущей выборке" icon={<UsersRound size={20} />} tone="blue" />
          <MetricCard label="Средняя премия" value={formatCurrency(stats.average, true)} change={8.6} hint="на одного сотрудника" icon={<Target size={20} />} tone="violet" />
          <MetricCard label="Выполнение KPI" value={`${stats.attainment}%`} change={mode === "worker" ? 5.1 : -1.3} hint="от планового уровня" icon={<Sparkles size={20} />} tone="amber" />
        </section>
      )}

      <section className="dashboard-content-grid">
        <article className="panel trend-panel dashboard-animate">
          <div className="panel-heading"><div><span>Динамика фонда</span><h2>Результат за 12 месяцев</h2></div><span className="soft-badge">TJS · помесячно</span></div>
          <div className="trend-summary"><strong>{formatCurrency(stats.total, true)}</strong><span><ArrowUpRight size={14} /> 9.8% за квартал</span></div>
          <div className="bar-chart" aria-label="График динамики премий">
            {chartValues.map((value, index) => <i key={`${value}-${index}`} className={index === month - 1 ? "is-current" : ""} style={{ height: `${value}%` }}><span>{MONTHS[index].slice(0, 3)}</span></i>)}
          </div>
        </article>

        <article className="panel activity-panel dashboard-animate">
          <div className="panel-heading"><div><span>Состояние расчёта</span><h2>Контрольные этапы</h2></div><button type="button" className="icon-button subtle" onClick={() => query.refetch()} aria-label="Обновить"><RefreshCw size={17} /></button></div>
          <ol className="activity-list">
            <li><span className="activity-icon is-done"><CheckCircle2 size={16} /></span><div><strong>Показатели загружены</strong><small>Карты, мобильный банк и сервис</small></div><time>готово</time></li>
            <li><span className="activity-icon is-live"><Sparkles size={16} /></span><div><strong>Формула рассчитана</strong><small>Применены коэффициенты качества</small></div><time>сейчас</time></li>
            <li><span className="activity-icon"><Target size={16} /></span><div><strong>Проверка оператора</strong><small>Подтверждение итоговых значений</small></div><time>{stats.attainment}%</time></li>
          </ol>
          <button type="button" className="secondary-button full-button"><Download size={16} /> Скачать сводку</button>
        </article>
      </section>

      <section className="panel employees-panel dashboard-animate">
        <div className="panel-heading employees-heading">
          <div><span>{mode === "worker" ? "Детализация" : "Лидеры периода"}</span><h2>{mode === "data" ? "Реестр сотрудников" : "Результаты сотрудников"}</h2></div>
          <label className="table-search"><Search size={16} /><span className="sr-only">Поиск сотрудника</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти сотрудника…" /></label>
        </div>
        <div className="responsive-table">
          <table>
            <thead><tr><th>Сотрудник</th><th>Офис</th><th>Сервис</th><th>Тесты</th><th>Моб. банк</th><th>Премия</th><th aria-label="Открыть" /></tr></thead>
            <tbody>
              {filteredWorkers.slice(0, 8).map((worker, index) => (
                <tr key={worker.id}>
                  <td><div className="employee-cell"><span className={`employee-avatar avatar-tone-${index % 4}`}>{employeeInitials(worker.user.fullName)}</span><span><strong>{worker.user.fullName}</strong><small>@{worker.user.username}</small></span></div></td>
                  <td>{worker.officeName}</td><td>{worker.metric.serviceScore.toFixed(1)}</td><td>{worker.metric.testScore.toFixed(1)}</td><td>{worker.metric.mobileBankConnects}</td><td><strong>{formatCurrency(worker.premium)}</strong></td><td><button type="button" className="row-action" aria-label={`Открыть ${worker.user.fullName}`}><ChevronRight size={17} /></button></td>
                </tr>
              ))}
              {!filteredWorkers.length && <tr><td colSpan={7}><div className="table-empty">{query.isError ? "Нет связи с источником данных" : "За выбранный период данных пока нет"}</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
