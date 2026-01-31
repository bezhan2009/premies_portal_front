import { useMemo, useState } from "react";
import "../../styles/components/TransactionsQR.scss";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Select } from "antd";
import Spinner from "../../components/Spinner";
import dayjs from "dayjs";

const { Option } = Select;

function formatNumber(value) {
    if (value == null || isNaN(value)) return "0";
    return Number(value)
        .toFixed(0)
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
        .replace(".", ",");
}

// Кастомный тултип как в QR странице
const CustomTooltip = ({ active, payload, label, metric }) => {
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
                        {metric === "count" ? p.value : formatNumber(p.value)}
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// Функции для обработки данных банкомата
function parseTxTimestamp(t) {
    const date = String(t.localTransactionDate || "").slice(0, 10);
    const time = String(t.localTransactionTime || "00:00:00").slice(0, 8);
    if (!date) return null;
    const ts = new Date(`${date}T${time}`).getTime();
    return Number.isFinite(ts) ? ts : null;
}

function normalizeAmount(raw) {
    const v = Number(raw);
    if (!Number.isFinite(v)) return 0;
    const normalized = v >= 1000 && v % 100 === 0 ? v / 100 : v;
    return Math.round(normalized);
}

function formatIntWithDots(num) {
    const n = Number(num);
    if (!Number.isFinite(n)) return "—";
    const s = String(Math.trunc(n));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatMoneySmart(amount, currency) {
    const v = Number(amount);
    if (!Number.isFinite(v)) return "—";
    const normalized = v >= 1000 && v % 100 === 0 ? v / 100 : v;
    const suffix = currency === 972 ? "с." : "";
    return `${formatIntWithDots(normalized)} ${suffix}`.trim();
}

export default function TransactionsChartATM({ transactions = [] }) {
    const [metric, setMetric] = useState("count");
    const [loading, setLoading] = useState(false);

    // Агрегируем данные по дням и статусам как в QR
    const { aggregatedData, statistics } = useMemo(() => {
        if (!transactions.length) {
            return { aggregatedData: [], statistics: {} };
        }

        const dayMap = new Map();
        let totalCount = 0;
        let totalSum = 0;
        let successCount = 0;
        let cancelCount = 0;
        let successSum = 0;
        let cancelSum = 0;

        transactions.forEach(t => {
            const ts = parseTxTimestamp(t);
            if (!ts) return;

            const date = dayjs(ts).format("YYYY-MM-DD");
            const amount = normalizeAmount(t.amount);
            const reversal = Number(t.reversal) === 1;
            const isSuccess = !reversal;

            if (!dayMap.has(date)) {
                dayMap.set(date, {
                    date,
                    successCount: 0,
                    cancelCount: 0,
                    successSum: 0,
                    cancelSum: 0,
                    totalCount: 0,
                    totalSum: 0
                });
            }

            const dayData = dayMap.get(date);

            if (isSuccess) {
                dayData.successCount += 1;
                dayData.successSum += amount;
                successCount += 1;
                successSum += amount;
            } else {
                dayData.cancelCount += 1;
                dayData.cancelSum += amount;
                cancelCount += 1;
                cancelSum += amount;
            }

            dayData.totalCount += 1;
            dayData.totalSum += amount;
            totalCount += 1;
            totalSum += amount;
        });

        // Преобразуем в массив и сортируем по дате
        const dataArray = Array.from(dayMap.values()).sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        // Рассчитываем статистику
        const avgAmount = totalCount > 0 ? Math.round(totalSum / totalCount) : 0;
        const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

        return {
            aggregatedData: dataArray,
            statistics: {
                totalCount,
                totalSum,
                successCount,
                cancelCount,
                successSum,
                cancelSum,
                avgAmount,
                successRate
            }
        };
    }, [transactions]);

    // Подготавливаем данные для графика
    const chartData = useMemo(() => {
        return aggregatedData.map(item => {
            if (metric === "count") {
                return {
                    date: item.date,
                    success: item.successCount,
                    cancel: item.cancelCount,
                    total: item.totalCount
                };
            } else {
                return {
                    date: item.date,
                    success: item.successSum,
                    cancel: item.cancelSum,
                    total: item.totalSum
                };
            }
        });
    }, [aggregatedData, metric]);

    if (loading) {
        return (
            <div className="p-6">
                <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
                    <Spinner />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex gap-4 items-center mb-4">
                <Select
                    value={metric}
                    onChange={setMetric}
                    style={{ width: 160 }}
                >
                    <Option value="count">Количество</Option>
                    <Option value="sum">Сумма</Option>
                </Select>

                <div className="stats-info">
                    <div className="stats-row">
                        <span className="stat-label">Всего операций:</span>
                        <span className="stat-value">{statistics.totalCount || 0}</span>
                    </div>
                    <div className="stats-row">
                        <span className="stat-label">Общая сумма:</span>
                        <span className="stat-value">
                            {formatMoneySmart(statistics.totalSum || 0, 972)}
                        </span>
                    </div>
                    <div className="stats-row">
                        <span className="stat-label">Средний чек:</span>
                        <span className="stat-value">
                            {formatMoneySmart(statistics.avgAmount || 0, 972)}
                        </span>
                    </div>
                    <div className="stats-row">
                        <span className="stat-label">Успешных:</span>
                        <span className="stat-value">{statistics.successRate || 0}%</span>
                    </div>
                </div>
            </div>

            <div style={{ width: "100%", height: 400 }}>
                <ResponsiveContainer>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="success" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#82ca9d" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#82ca9d" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="cancel" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ff7c7c" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#ff7c7c" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => dayjs(value).format("DD.MM")}
                        />
                        <YAxis
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => metric === "count" ? value : formatNumber(value)}
                        />
                        <Tooltip
                            content={<CustomTooltip metric={metric} />}
                        />
                        <Legend />

                        <Area
                            type="monotone"
                            dataKey="success"
                            name="Успешные операции"
                            stroke="#82ca9d"
                            fill="url(#success)"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="cancel"
                            name="Отмененные операции"
                            stroke="#ff7c7c"
                            fill="url(#cancel)"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
