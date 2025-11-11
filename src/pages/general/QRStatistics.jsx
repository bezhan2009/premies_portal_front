import React, { useEffect, useState } from "react";
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
import { DatePicker, Select } from "antd";
import Spinner from "../../components/Spinner";
import AlertMessage from "../../components/general/AlertMessage";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

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

export default function QRStatistics() {
  const backendUrl = import.meta.env.VITE_BACKEND_QR_URL;
  const [metric, setMetric] = useState("count");
  const [selectedRange, setSelectedRange] = useState(null);
  const [data, setData] = useState({});
  const [date, setDate] = useState([]);
  const [date2, setDate2] = useState([]);
  const [mergedData, setMergedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const fetchData = async (type = "themOnUs") => {
    try {
      setLoading(true);
      const endpoint = type === "usOnThem" ? "transactions" : "incoming_tx";

      // динамическая подстановка диапазона дат
      const startDate = data?.start_date || "2025-01-01";
      const endDate = data?.end_date || "2025-11-11";

      const response = await fetch(
        `${backendUrl}${endpoint}?start_date=${startDate}&end_date=${endDate}`
      );
      if (!response.ok) throw new Error(`Ошибка HTTP ${response.status}`);

      const result = await response.json();

      const mapped = result.map((item) => {
        const date =
          item.created_at?.split("T")[0] ||
          item.creation_datetime?.split("T")[0];
        return {
          date,
          count: 1,
          sum: item.amount || 0,
        };
      });

      const grouped = mapped.reduce((acc, curr) => {
        if (!acc[curr.date]) acc[curr.date] = { date: curr.date, count: 0, sum: 0 };
        acc[curr.date].count += curr.count;
        acc[curr.date].sum += curr.sum;
        return acc;
      }, {});

      const finalResult = Object.values(grouped).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      if (type === "usOnThem") setDate(finalResult);
      else setDate2(finalResult);

      showAlert(`Загружено ${result.length} записей`, "success");
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      showAlert("Ошибка загрузки данных. Проверьте сервер.", "error");
    } finally {
      setLoading(false);
    }
  };

  // следим за изменением диапазона и обновляем data.start_date/end_date
  useEffect(() => {
    if (selectedRange?.[0] && selectedRange?.[1]) {
      setData((prev) => ({
        ...prev,
        start_date: selectedRange[0].format("YYYY-MM-DD"),
        end_date: selectedRange[1].format("YYYY-MM-DD"),
      }));
    }
  }, [selectedRange]);

  // когда даты выбраны — обновляем данные
  useEffect(() => {
    if (data?.start_date && data?.end_date) {
      fetchData("usOnThem");
      fetchData("themOnUs");
    }
  }, [data.start_date, data.end_date]);

  // при первом рендере загружаем всё за дефолтный период
  useEffect(() => {
    fetchData("usOnThem");
    fetchData("themOnUs");
  }, []);

  // объединяем данные для графика
  useEffect(() => {
    if (!date.length && !date2.length) return;

    const allDates = Array.from(
      new Set([...date.map((d) => d.date), ...date2.map((d) => d.date)])
    ).sort((a, b) => new Date(a) - new Date(b));

    const merged = allDates.map((d) => {
      const us = date.find((x) => x.date === d);
      const them = date2.find((x) => x.date === d);
      return {
        date: d,
        usOnThem: us ? us[metric] : 0,
        themOnUs: them ? them[metric] : 0,
      };
    });

    setMergedData(merged);
  }, [date, date2, metric]);

  return (
    <div className="p-6">
      <div className="flex gap-4 items-center mb-4">
        <Select
          value={metric}
          onChange={setMetric}
          options={[
            { label: "Количество", value: "count" },
            { label: "Сумма", value: "sum" },
          ]}
          style={{ width: 160 }}
        />
        <RangePicker onChange={(dates) => setSelectedRange(dates)} />
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "80px 0",
            transform: "scale(1.3)",
          }}
        >
          <Spinner />
        </div>
      ) : (
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <AreaChart data={mergedData}>
              <defs>
                <linearGradient id="usOnThem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#417cd5" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#417cd5" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="themOnUs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#82ca9d" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#82ca9d" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              <Area
                type="monotone"
                dataKey="usOnThem"
                name="Наш клиент — чужой QR"
                stroke="#417cd5"
                fill="url(#usOnThem)"
                strokeWidth={2.5}
                dot={{ r: 2 }}
              />
              <Area
                type="monotone"
                dataKey="themOnUs"
                name="Наш QR — чужой клиент"
                stroke="#82ca9d"
                fill="url(#themOnUs)"
                strokeWidth={2.5}
                dot={{ r: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {alert && (
        <AlertMessage
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
}
