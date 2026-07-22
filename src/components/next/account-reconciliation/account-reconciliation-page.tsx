"use client";

import anime from "animejs";
import clsx from "clsx";
import {
  CalendarDays,
  CheckCircle2,
  FileSearch,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/next/use-reduced-motion";
import { apiRequest } from "@/lib/next/api-client";

interface ReconciliationRule {
  ID?: number;
  id?: number;
  name: string;
  terminal_id: string;
  account_number: string;
  CreatedAt?: string;
  created_at?: string;
}

interface ReconciliationRow {
  payment_purpose: string;
  operation_amount: string;
  payer: string;
  operation_date: string;
  oson_operation_number: string;
  operation_time: string;
  card: string;
  reimbursement_found: boolean;
  rrn: string;
}

interface ReconciliationResponse {
  rule: ReconciliationRule;
  from_date: string;
  to_date: string;
  rows: ReconciliationRow[];
  total: number;
  reimbursed: number;
  not_reimbursed: number;
  statement_count: number;
  processing_match_count: number;
}

function ruleId(rule: ReconciliationRule): number {
  return Number(rule.ID ?? rule.id ?? 0);
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createdAt(rule: ReconciliationRule): string {
  const value = rule.CreatedAt || rule.created_at || "";
  return value ? value.slice(0, 10) : "—";
}

function valueOrDash(value?: string): string {
  return value?.trim() || "—";
}

function ruleSearchHaystack(rule: ReconciliationRule): string {
  return [ruleId(rule), rule.name, rule.terminal_id, rule.account_number, createdAt(rule)]
    .join(" ")
    .toLocaleLowerCase("ru");
}

function ReconciliationSkeleton() {
  return (
    <div className="reconciliation-skeleton">
      {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
    </div>
  );
}

function ResultPill({ found }: { found: boolean }) {
  return (
    <span className={clsx("reconciliation-result-pill", found ? "is-yes" : "is-no")}>
      {found ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {found ? "Да" : "Нет"}
    </span>
  );
}

export function AccountReconciliationPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [rules, setRules] = useState<ReconciliationRule[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ReconciliationRule | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await apiRequest<ReconciliationRule[]>("/api/backend/account-reconciliation/rules");
        setRules(Array.isArray(payload) ? payload : []);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить правила сверки");
        setRules([]);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [reloadNonce]);

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    anime({
      targets: rootRef.current.querySelectorAll(".reconciliation-animate"),
      opacity: [0, 1],
      translateY: [8, 0],
      delay: anime.stagger(35),
      duration: 300,
      easing: "easeOutCubic",
    });
  }, [rules.length, reducedMotion]);

  const filteredRules = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    if (!query) return rules;
    return rules.filter((rule) => ruleSearchHaystack(rule).includes(query));
  }, [rules, search]);

  async function deleteRule(rule: ReconciliationRule) {
    const id = ruleId(rule);
    if (!id) return;
    const confirmed = window.confirm(`Удалить правило "${rule.name}"?`);
    if (!confirmed) return;

    await apiRequest(`/api/backend/account-reconciliation/rules/${id}`, { method: "DELETE" });
    setRules((current) => current.filter((item) => ruleId(item) !== id));
  }

  return (
    <div ref={rootRef} className="reconciliation-page">
      <section className="reconciliation-hero reconciliation-animate">
        <div>
          <span className="page-eyebrow"><ShieldCheck size={14} /> Сверка счетов</span>
          <h1>Сверка счетов</h1>
          <p>
            Зарегистрируйте правило по терминалу и счету, выберите период и проверьте,
            получено ли возмещение: выписка сопоставляется с процессингом по RRN.
          </p>
        </div>
        <div className="reconciliation-hero-actions">
          <button type="button" className="secondary-button" onClick={() => setReloadNonce((value) => value + 1)} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : undefined} />
            Обновить
          </button>
          <button type="button" className="primary-button" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Регистрация сверки
          </button>
        </div>
      </section>

      <section className="reconciliation-stat-grid reconciliation-animate">
        <div className="reconciliation-stat-card">
          <span>Всего правил</span>
          <strong>{rules.length}</strong>
          <small>Зарегистрированы вами</small>
        </div>
        <div className="reconciliation-stat-card is-green">
          <span>Готово к сверке</span>
          <strong>{filteredRules.length}</strong>
          <small>После поиска и фильтра</small>
        </div>
        <div className="reconciliation-stat-card is-dark">
          <span>Источник выписки</span>
          <strong>ABS</strong>
          <small>stmnt.php по номеру счета</small>
        </div>
      </section>

      <section className="panel reconciliation-table-panel reconciliation-animate">
        <div className="reconciliation-toolbar">
          <label className="reconciliation-search">
            <Search size={17} />
            <span className="sr-only">Поиск правила</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по названию, терминалу, счету или дате"
            />
          </label>
          <button type="button" className="primary-button" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Новое правило
          </button>
        </div>

        {error && (
          <div className="inline-alert reconciliation-alert">
            <span><strong>Правила не загрузились.</strong> {error}</span>
            <button type="button" onClick={() => setReloadNonce((value) => value + 1)}><RefreshCw size={15} /> Повторить</button>
          </div>
        )}

        {loading ? <ReconciliationSkeleton /> : (
          <div className="responsive-table reconciliation-responsive-table">
            <table className="reconciliation-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Терминал</th>
                  <th>Номер счета</th>
                  <th>Создано</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr key={ruleId(rule)}>
                    <td><strong>#{ruleId(rule) || "—"}</strong></td>
                    <td>
                      <div className="reconciliation-rule-name">
                        <span><FileSearch size={16} /></span>
                        <strong>{valueOrDash(rule.name)}</strong>
                      </div>
                    </td>
                    <td><code>{valueOrDash(rule.terminal_id)}</code></td>
                    <td><code>{valueOrDash(rule.account_number)}</code></td>
                    <td>{createdAt(rule)}</td>
                    <td>
                      <div className="reconciliation-row-actions">
                        <button type="button" className="primary-button" onClick={() => setSelectedRule(rule)}>
                          Сверить
                        </button>
                        <button type="button" className="secondary-button" onClick={() => void deleteRule(rule)}>
                          <Trash2 size={14} />
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredRules.length && (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-empty">Правила сверки не найдены. Создайте первое правило через “Регистрация сверки”.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {createOpen && (
        <CreateRuleModal
          onClose={() => setCreateOpen(false)}
          onCreated={(rule) => {
            setRules((current) => [rule, ...current]);
            setCreateOpen(false);
          }}
        />
      )}

      {selectedRule && (
        <RunReconciliationModal rule={selectedRule} onClose={() => setSelectedRule(null)} />
      )}
    </div>
  );
}

function CreateRuleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (rule: ReconciliationRule) => void }) {
  const [name, setName] = useState("");
  const [terminalID, setTerminalID] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const rule = await apiRequest<ReconciliationRule>("/api/backend/account-reconciliation/rules", {
        method: "POST",
        body: JSON.stringify({
          name,
          terminal_id: terminalID,
          account_number: accountNumber,
        }),
      });
      onCreated(rule);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось создать правило");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="reconciliation-modal-backdrop" onMouseDown={onClose} role="presentation">
      <form className="reconciliation-modal reconciliation-rule-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <button type="button" className="icon-button reconciliation-modal-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        <header className="reconciliation-modal-head">
          <span className="page-eyebrow"><Plus size={14} /> Новое правило</span>
          <h2>Регистрация сверки</h2>
          <p>Укажите терминал, номер счета и понятное название — потом правило можно будет быстро выбрать из таблицы.</p>
        </header>

        <div className="reconciliation-form-grid">
          <label>
            <span>Название</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например: OSON M1000001" required />
          </label>
          <label>
            <span>Терминал</span>
            <input value={terminalID} onChange={(event) => setTerminalID(event.target.value.toUpperCase())} placeholder="M1000001" required />
          </label>
          <label className="is-wide">
            <span>Номер счета</span>
            <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\s/g, ""))} placeholder="17507972090808713010" required />
          </label>
        </div>

        {error && <div className="inline-alert reconciliation-alert"><span>{error}</span></div>}

        <footer className="reconciliation-modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>Закрыть</button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
            Сохранить правило
          </button>
        </footer>
      </form>
    </div>
  );
}

function RunReconciliationModal({ rule, onClose }: { rule: ReconciliationRule; onClose: () => void }) {
  const today = toInputDate(new Date());
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [result, setResult] = useState<ReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiRequest<ReconciliationResponse>("/api/backend/account-reconciliation/run", {
        method: "POST",
        body: JSON.stringify({
          rule_id: ruleId(rule),
          from_date: fromDate,
          to_date: toDate,
        }),
      });
      setResult(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось выполнить сверку");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reconciliation-modal-backdrop" onMouseDown={onClose} role="presentation">
      <section className="reconciliation-modal reconciliation-run-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Сверка счета">
        <button type="button" className="icon-button reconciliation-modal-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        <header className="reconciliation-modal-head">
          <span className="page-eyebrow"><FileSearch size={14} /> Правило #{ruleId(rule)}</span>
          <h2>{rule.name}</h2>
          <p>
            Терминал <strong>{rule.terminal_id}</strong> · счет <strong>{rule.account_number}</strong>.
            Выберите период, чтобы получить выписку и операции процессинга.
          </p>
        </header>

        <div className="reconciliation-run-toolbar">
          <div className="reconciliation-period">
            <CalendarDays size={16} />
            <label><span>От</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
            <label><span>До</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          </div>
          <button type="button" className="primary-button" onClick={() => void run()} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <FileSearch size={16} />}
            Запустить сверку
          </button>
        </div>

        {error && <div className="inline-alert reconciliation-alert"><span>{error}</span></div>}

        {result && (
          <>
            <div className="reconciliation-summary-grid">
              <span><small>Операций в выписке</small><strong>{result.statement_count}</strong></span>
              <span className="is-green"><small>Возмещение получено</small><strong>{result.reimbursed}</strong></span>
              <span className="is-red"><small>Нет совпадения</small><strong>{result.not_reimbursed}</strong></span>
              <span><small>Совпадений по RRN</small><strong>{result.processing_match_count}</strong></span>
            </div>

            <div className="responsive-table reconciliation-results-table-wrap">
              <table className="reconciliation-results-table">
                <thead>
                  <tr>
                    <th>Назначение платежа</th>
                    <th>Сумма операции</th>
                    <th>Плательщик</th>
                    <th>Дата операции</th>
                    <th>Номер операции в ОСОН</th>
                    <th>Время операции</th>
                    <th>Карта</th>
                    <th>Возмещение получено</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, index) => (
                    <tr key={`${row.rrn}-${row.oson_operation_number}-${index}`}>
                      <td className="reconciliation-purpose-cell">{valueOrDash(row.payment_purpose)}</td>
                      <td><strong>{valueOrDash(row.operation_amount)}</strong></td>
                      <td>{valueOrDash(row.payer)}</td>
                      <td>{valueOrDash(row.operation_date)}</td>
                      <td><code>{valueOrDash(row.oson_operation_number)}</code></td>
                      <td>{valueOrDash(row.operation_time)}</td>
                      <td><code>{valueOrDash(row.card)}</code></td>
                      <td><ResultPill found={row.reimbursement_found} /></td>
                    </tr>
                  ))}
                  {!result.rows.length && (
                    <tr>
                      <td colSpan={8}><div className="table-empty">За выбранный период операций в выписке не найдено</div></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
