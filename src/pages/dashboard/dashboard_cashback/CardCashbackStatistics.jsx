import React, { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Select } from "antd";

function formatNumber(value, isSum) {
  if (value == null || isNaN(value)) return "0";
  return Number(value).toLocaleString("ru-RU", {
    minimumFractionDigits: isSum ? 2 : 0,
    maximumFractionDigits: isSum ? 2 : 0,
  });
}

const CustomTooltip = ({ active, payload, label, isSum }) => {
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
            {formatNumber(p.value, isSum)} {isSum ? "TJS" : "шт."}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function CardCashbackStatistics({ data }) {
  const [metric, setMetric] = useState("count");

  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    const grouped = data.reduce((acc, item) => {
      const dateStr = item.created_at ? item.created_at.split("T")[0] : "Без даты";
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          paid: 0,
          error: 0,
          processing: 0,
          paidSum: 0,
          errorSum: 0,
          processingSum: 0,
        };
      }

      const amount = Number(item.amount || item.cashback_amount || 0);
      const status = item.status || "";

      if (status === "Оплачено") {
        acc[dateStr].paid += 1;
        acc[dateStr].paidSum += amount;
      } else if (status === "Ошибка АБС") {
        acc[dateStr].error += 1;
        acc[dateStr].errorSum += amount;
      } else {
        acc[dateStr].processing += 1;
        acc[dateStr].processingSum += amount;
      }

      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data]);

  const displayData = useMemo(() => {
    return chartData.map((d) => ({
      date: d.date,
      paid: metric === "sum" ? d.paidSum : d.paid,
      error: metric === "sum" ? d.errorSum : d.error,
      processing: metric === "sum" ? d.processingSum : d.processing,
    }));
  }, [chartData, metric]);

  const isSum = metric === "sum";

  return (
    <div style={{ padding: "16px", background: "white", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", margin: "16px" }}>
      <div style={{ marginBottom: "16px" }}>
        <Select
          value={metric}
          onChange={setMetric}
          options={[
            { label: "Количество", value: "count" },
            { label: "Сумма", value: "sum" },
          ]}
          style={{ width: 160 }}
        />
      </div>

      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <AreaChart data={displayData}>
            <defs>
              <linearGradient id="paid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2ec4b6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#2ec4b6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="error" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e71d36" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#e71d36" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="processing" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff9f1c" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#ff9f1c" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip isSum={isSum} />} />
            <Legend />

            <Area
              type="monotone"
              dataKey="paid"
              name="Оплачено"
              stroke="#2ec4b6"
              fill="url(#paid)"
              strokeWidth={2.5}
              dot={{ r: 2 }}
            />
            <Area
              type="monotone"
              dataKey="processing"
              name="В обработке"
              stroke="#ff9f1c"
              fill="url(#processing)"
              strokeWidth={2.5}
              dot={{ r: 2 }}
            />
            <Area
              type="monotone"
              dataKey="error"
              name="Ошибка АБС"
              stroke="#e71d36"
              fill="url(#error)"
              strokeWidth={2.5}
              dot={{ r: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
