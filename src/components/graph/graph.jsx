import { useMemo } from "react";
import "../../styles/components/TransactionsChart.css";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
} from "recharts";

/** ===== utils ===== */
function pad2(n) {
    return String(n).padStart(2, "0");
}

function formatDDMM(ts) {
    const d = new Date(ts);
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
}

function formatHHMMSS(ts) {
    const d = new Date(ts);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatDDMMHHMMSS(ts) {
    return `${formatDDMM(ts)} ${formatHHMMSS(ts)}`;
}

function formatWeekday(ts) {
    return new Date(ts).toLocaleDateString("ru-RU", { weekday: "short" });
}

// банкомат выдаёт только целые; если пришло в "копейках" — делим на 100
function normalizeAmount(raw) {
    const v = Number(raw);
    if (!Number.isFinite(v)) return 0;

    const normalized = v >= 1000 && v % 100 === 0 ? v / 100 : v;
    return Math.round(normalized);
}

// 1.234.567
function formatIntWithDots(num) {
    const n = Number(num);
    if (!Number.isFinite(n)) return "—";
    const s = String(Math.trunc(n));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function dayKeyFromTs(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayStartTs(dayKey) {
    return new Date(`${dayKey}T00:00:00`).getTime();
}

function parseTxTimestamp(t) {
    const date = String(t.localTransactionDate || "").slice(0, 10);
    const time = String(t.localTransactionTime || "00:00:00").slice(0, 8);
    if (!date) return null;

    const ts = new Date(`${date}T${time}`).getTime();
    return Number.isFinite(ts) ? ts : null;
}

function pickMostFrequent(items) {
    const map = new Map();
    for (const it of items) {
        const v = String(it || "").trim();
        if (!v) continue;
        map.set(v, (map.get(v) || 0) + 1);
    }
    let best = "";
    let bestCount = 0;
    for (const [k, c] of map.entries()) {
        if (c > bestCount) {
            best = k;
            bestCount = c;
        }
    }
    return best || "—";
}

/** ===== Tooltip - ИДЕНТИЧНЫЙ QR СТИЛЮ ===== */
function CustomTxTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;

    const weekday = formatWeekday(p.ts);
    const dt = formatDDMMHHMMSS(p.ts);

    return (
        <div
            style={{
                background: "rgba(255,255,255,0.85)",
                padding: "10px 14px",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                backdropFilter: "blur(8px)",
                fontSize: "13px",
                color: "#333",
            }}
        >
            <div style={{ fontWeight: "600", marginBottom: "6px" }}>
                {weekday}, {dt}
            </div>

            <div>
                <div style={{ marginBottom: "4px" }}>
                    <span style={{ color: "#666" }}>Сумма: </span>
                    <span style={{ fontWeight: "500" }}>{formatIntWithDots(p.amount)}</span>
                </div>

                {p.terminalId && (
                    <div style={{ marginBottom: "4px" }}>
                        <span style={{ color: "#666" }}>Банкомат: </span>
                        <span style={{ fontWeight: "500" }}>{p.terminalId}</span>
                    </div>
                )}

                {p.rrn && (
                    <div style={{ marginBottom: "4px" }}>
                        <span style={{ color: "#666" }}>RRN: </span>
                        <span style={{ fontWeight: "500" }}>{p.rrn}</span>
                    </div>
                )}

                {p.stan && (
                    <div>
                        <span style={{ color: "#666" }}>STAN: </span>
                        <span style={{ fontWeight: "500" }}>{p.stan}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function TransactionsChartBarsEach({ transactions = [] }) {
    const {
        data,
        daySeparators,
        totalCount,
        totalSum,
        avgAmount,
        avgOpsPerDay,
        atmAddress,
    } = useMemo(() => {
        // фильтр
        const filtered = transactions.filter((t) => {
            const amount = Number(t.amount);
            const reversal = Number(t.reversal);
            return Number.isFinite(amount) && amount > 0 && reversal !== 1;
        });

        // адрес: берём самый частый terminalAddress
        const atmAddress = pickMostFrequent(filtered.map((t) => t.terminalAddress));

        // каждая операция = столбик
        const rows = [];
        for (const t of filtered) {
            const ts = parseTxTimestamp(t);
            if (!ts) continue;

            rows.push({
                ts,
                amount: normalizeAmount(t.amount),
                terminalId: t.terminalId || t.atmId || t.terminal || "",
                rrn: t.rrn || "",
                stan: t.stan || "",
                dayKey: dayKeyFromTs(ts),
            });
        }

        rows.sort((a, b) => a.ts - b.ts);

        const seen = new Set();
        const data = [];
        for (const r of rows) {
            const key = `${r.ts}|${r.amount}|${r.rrn}|${r.stan}|${r.terminalId}`;
            if (seen.has(key)) continue;
            seen.add(key);

            data.push({
                ...r,
                xKey: String(data.length),
            });
        }

        const daySeparators = [];
        let prevDay = null;
        for (const d of data) {
            if (d.dayKey !== prevDay) {
                daySeparators.push({
                    dayKey: d.dayKey,
                    xKey: d.xKey,
                    label: formatDDMM(dayStartTs(d.dayKey)),
                });
                prevDay = d.dayKey;
            }
        }

        const totalCount = data.length;
        const totalSum = data.reduce((s, r) => s + (r.amount || 0), 0);
        const avgAmount = totalCount ? Math.round(totalSum / totalCount) : 0;

        const daysCount = daySeparators.length;
        const avgOpsPerDayRaw = daysCount ? totalCount / daysCount : 0;
        const avgOpsPerDay = Math.floor(avgOpsPerDayRaw + 0.5);

        return {
            data,
            daySeparators,
            totalCount,
            totalSum,
            avgAmount,
            avgOpsPerDay,
            atmAddress,
        };
    }, [transactions]);

    return (
        <div className="chart-card">
            <div className="chart-content">
                <div className="chart-header">
                    <div className="header-left">
                        <h2 className="chart-title">Транзакции банкомата</h2>
                        <div className="chart-subtitle">
                            Адрес: {atmAddress}
                        </div>
                        <div className="chart-description">
                            каждый столбик = 1 операция • разделение по дням
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="stats-chips">
                            <span className="stats-chip">Кол-во операций: {totalCount}</span>
                            <span className="stats-chip">Общая сумма: {formatIntWithDots(totalSum)}</span>
                            <span className="stats-chip">Средний чек: {formatIntWithDots(avgAmount)}</span>
                            <span className="stats-chip">Среднее операций/день: {avgOpsPerDay}</span>
                        </div>
                    </div>
                </div>

                <div className="chart-divider"></div>

                <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="xKey" hide />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                width={70}
                                tickFormatter={(v) => formatIntWithDots(v)}
                                stroke="#666"
                            />
                            <Tooltip content={<CustomTxTooltip />} />

                            {daySeparators.map((d) => (
                                <ReferenceLine
                                    key={d.dayKey}
                                    x={d.xKey}
                                    stroke="rgba(196,30,58,0.6)"
                                    strokeDasharray="4 4"
                                    label={{
                                        value: d.label,
                                        position: "insideTopLeft",
                                        fontSize: 11,
                                        fill: "rgba(196,30,58,0.9)",
                                    }}
                                />
                            ))}

                            <Bar
                                dataKey="amount"
                                name="Amount"
                                fill="#C41E3A"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
