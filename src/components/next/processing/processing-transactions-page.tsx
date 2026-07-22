"use client";

import anime from "animejs";
import clsx from "clsx";
import { ArrowDownLeft, ArrowUpRight, CreditCard, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/next/api-client";
import { useReducedMotion } from "@/hooks/next/use-reduced-motion";

interface ProcessingTransaction {
  id?: number | string;
  utrnno?: number | string;
  transactionDate?: string;
  localTransactionDate?: string;
  transactionTime?: string;
  localTransactionTime?: string;
  cardId?: string;
  cardNumber?: string;
  amountCurrency?: number | string | null;
  amountCardCurrency?: number | string | null;
  currency?: string | number;
  cardCurrency?: string | number;
  transactionTypeName?: string;
  responseDescription?: string;
  [key: string]: unknown;
}

interface ProcessingPayload {
  processing_transactions?: ProcessingTransaction[];
  processingTransactions?: ProcessingTransaction[];
  transactions?: ProcessingTransaction[];
  data?: ProcessingTransaction[] | {
    processing_transactions?: ProcessingTransaction[];
    processingTransactions?: ProcessingTransaction[];
    transactions?: ProcessingTransaction[];
  };
}

function normalizeTransactions(payload: ProcessingPayload | ProcessingTransaction[] | null): ProcessingTransaction[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.processing_transactions)) return payload.processing_transactions;
  if (Array.isArray(payload.processingTransactions)) return payload.processingTransactions;
  if (Array.isArray(payload.transactions)) return payload.transactions;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.processing_transactions)) return payload.data.processing_transactions;
    if (Array.isArray(payload.data.processingTransactions)) return payload.data.processingTransactions;
    if (Array.isArray(payload.data.transactions)) return payload.data.transactions;
  }
  return [];
}

function valueOrDash(value: unknown): string {
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number") return String(value);
  return "—";
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatSignedAmount(value: unknown): { text: string; tone: "positive" | "negative" | "zero" } {
  const numeric = numericValue(value);
  if (numeric === null) {
    const raw = valueOrDash(value);
    if (raw === "—") return { text: raw, tone: "zero" };
    if (raw.startsWith("-")) return { text: raw, tone: "negative" };
    if (raw.startsWith("+")) return { text: raw, tone: "positive" };
    return { text: `+${raw}`, tone: "positive" };
  }

  if (numeric === 0) return { text: "0", tone: "zero" };

  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric));

  return {
    text: `${numeric > 0 ? "+" : "-"}${formatted}`,
    tone: numeric > 0 ? "positive" : "negative",
  };
}

function SignedAmount({ value }: { value: unknown }) {
  const amount = formatSignedAmount(value);
  const positive = amount.tone === "positive";
  const negative = amount.tone === "negative";
  return (
    <span className={clsx("signed-amount", positive && "is-positive", negative && "is-negative")}>
      {positive ? <ArrowUpRight size={13} /> : negative ? <ArrowDownLeft size={13} /> : null}
      {amount.text}
    </span>
  );
}

function transactionId(transaction: ProcessingTransaction, index: number): string {
  return String(transaction.utrnno || transaction.id || index + 1);
}

export function ProcessingTransactionsPage({ ids }: { ids: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [transactions, setTransactions] = useState<ProcessingTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await apiRequest<ProcessingPayload | ProcessingTransaction[]>(`/api/processing/transactions/${encodeURIComponent(ids)}`);
        setTransactions(normalizeTransactions(payload));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Не удалось получить выписку из ПЦ");
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ids, reloadNonce]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    if (!query) return transactions;
    return transactions.filter((transaction) => JSON.stringify(transaction).toLocaleLowerCase("ru").includes(query));
  }, [search, transactions]);

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    anime({
      targets: rootRef.current.querySelectorAll(".processing-animate"),
      opacity: [0, 1],
      translateY: [8, 0],
      delay: anime.stagger(40),
      duration: 340,
      easing: "easeOutCubic",
    });
  }, [filteredTransactions.length, reducedMotion]);

  return (
    <div ref={rootRef} className="processing-page">
      <section className="processing-header processing-animate">
        <div>
          <span className="page-eyebrow"><CreditCard size={14} /> Выписки из ПЦ</span>
          <h1>Процессинговые транзакции</h1>
          <p>Карты: {ids}. Поля amountCurrency и amountCardCurrency отображаются со знаком плюс или минус.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => setReloadNonce((value) => value + 1)} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : undefined} />
          Обновить
        </button>
      </section>

      <section className="processing-toolbar processing-animate">
        <label className="processing-search">
          <Search size={17} />
          <span className="sr-only">Поиск по выписке</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по карте, utrnno, описанию, дате или сумме" />
        </label>
        <span>{filteredTransactions.length} операций</span>
      </section>

      {error && (
        <div className="inline-alert processing-animate">
          <span><strong>Выписка не загрузилась.</strong> {error}</span>
          <button type="button" onClick={() => setReloadNonce((value) => value + 1)}><RefreshCw size={15} /> Повторить</button>
        </div>
      )}

      <section className="panel processing-table-panel processing-animate">
        {loading ? (
          <div className="processing-skeleton">
            {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
          </div>
        ) : (
          <div className="responsive-table processing-responsive-table">
            <table className="processing-table">
              <thead>
                <tr>
                  <th>UTRNNO</th>
                  <th>Дата</th>
                  <th>Время</th>
                  <th>Карта</th>
                  <th>Операция</th>
                  <th>amountCurrency</th>
                  <th>amountCardCurrency</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction, index) => (
                  <tr key={`${transactionId(transaction, index)}-${index}`}>
                    <td><strong>#{transactionId(transaction, index)}</strong></td>
                    <td>{valueOrDash(transaction.localTransactionDate || transaction.transactionDate)}</td>
                    <td>{valueOrDash(transaction.localTransactionTime || transaction.transactionTime)}</td>
                    <td>
                      <div className="processing-card-cell">
                        <strong>{valueOrDash(transaction.cardNumber)}</strong>
                        <small>{valueOrDash(transaction.cardId)}</small>
                      </div>
                    </td>
                    <td>{valueOrDash(transaction.transactionTypeName)}</td>
                    <td><SignedAmount value={transaction.amountCurrency} /></td>
                    <td><SignedAmount value={transaction.amountCardCurrency} /></td>
                    <td>{valueOrDash(transaction.responseDescription)}</td>
                  </tr>
                ))}
                {!filteredTransactions.length && (
                  <tr>
                    <td colSpan={8}><div className="table-empty">Операции не найдены</div></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
