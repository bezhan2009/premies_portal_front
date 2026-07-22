import React, { useMemo, useState } from "react";
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

function formatNumber(value) {
  if (value == null || isNaN(value)) return "0";
  return Number(value)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    .replace(".", ",");
}

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
          color: "var(--text-color)",
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

export default function CashbackStatistics({ items }) {
  const [metric, setMetric] = useState("count");

  const chartData = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];

    const grouped = items.reduce((acc, curr) => {
      const dateRaw = curr.created_at || curr.updated_at;
      if (!dateRaw) return acc;
      
      const date = dateRaw.split("T")[0];
      if (!acc[date]) {
        acc[date] = { date, count: 0, cashbackSum: 0, transactionSum: 0 };
      }
      
      acc[date].count += 1;
      acc[date].cashbackSum += Number(curr.amount || curr.cashback_amount || 0);
      acc[date].transactionSum += Number((curr.transaction_amount || curr.amount || 0) / 100);
      
      return acc;
    }, {});

    return Object.values(grouped).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [items]);

  if (!chartData.length) return null;

  return (
    <div className="p-6" style={{ paddingBottom: 0 }}>
      <div className="flex gap-4 items-center mb-4">
        <Select
          value={metric}
          onChange={setMetric}
          options={[
            { label: "Количество операций", value: "count" },
            { label: "Сумма", value: "sum" },
          ]}
          style={{ width: 200 }}
        />
      </div>

      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#417cd5" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#417cd5" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorCashback" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#82ca9d" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#82ca9d" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorTransaction" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffc658" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#ffc658" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {metric === "count" ? (
              <Area
                type="monotone"
                dataKey="count"
                name="Количество операций"
                stroke="#417cd5"
                fill="url(#colorCount)"
                strokeWidth={2.5}
                dot={{ r: 2 }}
              />
            ) : (
              <Area
                type="monotone"
                dataKey="cashbackSum"
                name="Сумма кэшбэка (TJS)"
                stroke="#82ca9d"
                fill="url(#colorCashback)"
                strokeWidth={2.5}
                dot={{ r: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
