import { useMemo, useState, useEffect } from "react";
import "../../styles/components/TransactionsChart.css";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";

/** ===== utils ===== */
function pad2(n) {
    return String(n).padStart(2, "0");
}

function formatNumber(value) {
    if (value == null || isNaN(value)) return "0";
    return Number(value)
        .toFixed(0)
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
        .replace(".", ",");
}

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

function normalizeAmount(raw) {
    const v = Number(raw);
    if (!Number.isFinite(v)) return 0;
    const normalized = v >= 1000 && v % 100 === 0 ? v / 100 : v;
    return Math.round(normalized);
}

/** ===== Tooltip - ИДЕНТИЧНЫЙ QR СТИЛЮ ===== */
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
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
                <div style={{ fontWeight: "600", marginBottom: "6px" }}>{label}</div>
                {payload.map((p, i) => (
                    <div key={i}>
                        <span style={{ color: p.color }}>{p.name}: </span>
                        {formatNumber(p.value)}
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function TransactionsChart({ transactions = [] }) {
    const [metric, setMetric] = useState("count");

    const {
        chartData,
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

        // группируем по дням
        const rows = [];
        for (const t of filtered) {
            const ts = parseTxTimestamp(t);
            if (!ts) continue;

            rows.push({
                ts,
                amount: normalizeAmount(t.amount),
                dayKey: dayKeyFromTs(ts),
            });
        }

        // группируем данные по дням
        const grouped = rows.reduce((acc, curr) => {
            if (!acc[curr.dayKey]) {
                acc[curr.dayKey] = { date: curr.dayKey, count: 0, sum: 0 };
            }
            acc[curr.dayKey].count += 1;
            acc[curr.dayKey].sum += curr.amount;
            return acc;
        }, {});

        // преобразуем в массив и сортируем
        const chartData = Object.values(grouped).sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        ).map(d => ({
            date: d.date,
            operations: d.count,
            amount: d.sum,
        }));

        const totalCount = rows.length;
        const totalSum = rows.reduce((s, r) => s + r.amount, 0);
        const avgAmount = totalCount ? Math.round(totalSum / totalCount) : 0;

        const daysCount = chartData.length;
        const avgOpsPerDayRaw = daysCount ? totalCount / daysCount : 0;
        const avgOpsPerDay = Math.floor(avgOpsPerDayRaw + 0.5);

        return {
            chartData,
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

                <div className="chart-controls">
                    <select
                        value={metric}
                        onChange={(e) => setMetric(e.target.value)}
                        className="metric-select"
                    >
                        <option value="count">Количество</option>
                        <option value="sum">Сумма</option>
                    </select>
                </div>

                <div className="chart-divider"></div>

                <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="atmGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#C41E3A" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#C41E3A" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11 }}
                                stroke="#666"
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                stroke="#666"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />

                            <Area
                                type="monotone"
                                dataKey={metric === "count" ? "operations" : "amount"}
                                name={metric === "count" ? "Количество операций" : "Сумма операций"}
                                stroke="#C41E3A"
                                fill="url(#atmGradient)"
                                strokeWidth={2.5}
                                dot={{ r: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
