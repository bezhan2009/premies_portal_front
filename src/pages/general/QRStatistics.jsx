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
import { useCallback } from "react";

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

function convertDoperToDate(doper) {
  if (!doper || typeof doper !== "string") return "";
  const parts = doper.split(".");
  if (parts.length !== 3) return "";
  const dd = parts[0];
  const MM = parts[1];
  const yy = parts[2];
  const yyyy = yy.length === 2 ? `20${yy}` : yy;
  return `${yyyy}-${MM}-${dd}`;
}

export default function QRStatistics({ startDate, endDate }) {
  const backendUrl = import.meta.env.VITE_BACKEND_QR_URL;
  const [metric, setMetric] = useState("count");
  // const [selectedRange, setSelectedRange] = useState(null);
  const [date, setDate] = useState([]);
  const [date2, setDate2] = useState([]);
  const [date3, setDate3] = useState([]);
  const [mergedData, setMergedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const fetchData = useCallback(
    async (type = "themOnUs") => {
      try {
        setLoading(true);
        let url = "";
        if (type === "usOnUs") {
          const sd = startDate.split("T")[0];
          const ed = endDate.split("T")[0];
          url = `http://10.64.1.10/services/stmnt.php?acc=17507972690808713012&dt1=${sd}&dt2=${ed}&descr=%D0%9E%D0%BF%D0%BB%D0%B0%D1%82%D0%B0%20%D0%BF%D0%BE%20QR%20%D0%BA%D0%BE%D0%B4%D1%83%20%D0%BA%D0%BE%D0%BC%D0%BC%D0%B5%D1%80%D1%81%D0%B0%D0%BD%D1%82%D0%B0`;
        } else {
          const endpoint = type === "usOnThem" ? "transactions" : "incoming_tx";
          url = `${backendUrl}${endpoint}?start_date=${startDate}&end_date=${endDate}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Ошибка HTTP ${response.status}`);

        let result = await response.json();

        if (type === "usOnUs" && Array.isArray(result)) {
          result = result.filter(r => r.trn_acc_code !== "26202972590810637954" && r.txt_ben !== "ЧСП \"АКТИВ БОНК\"");
        }

        const mapped = result.map((item) => {
          let dateStr = "";
          let sumVal = 0;
          if (type === "usOnUs") {
            dateStr = convertDoperToDate(item.doper);
            const rawSum = Number(item.sdok || 0);
            sumVal = rawSum > 0 ? (rawSum / 0.99) : 0;
          } else {
            dateStr = item.created_at?.split("T")[0] || item.creation_datetime?.split("T")[0];
            sumVal = item.amount || 0;
          }
          return {
            date: dateStr,
            count: 1,
            sum: sumVal,
          };
        });

        const grouped = mapped.reduce((acc, curr) => {
          if (!acc[curr.date])
            acc[curr.date] = { date: curr.date, count: 0, sum: 0 };
          acc[curr.date].count += curr.count;
          acc[curr.date].sum += curr.sum;
          return acc;
        }, {});

        const finalResult = Object.values(grouped).sort(
          (a, b) => new Date(a.date) - new Date(b.date),
        );

        if (type === "usOnThem") setDate(finalResult);
        else if (type === "themOnUs") setDate2(finalResult);
        else if (type === "usOnUs") setDate3(finalResult);

        showAlert(`Загружено ${result.length} записей`, "success");
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        showAlert("Ошибка загрузки данных. Проверьте сервер.", "error");
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, backendUrl],
  );

  // когда даты выбраны — обновляем данные
  useEffect(() => {
    if (startDate && endDate) {
      fetchData("usOnThem");
      fetchData("themOnUs");
      fetchData("usOnUs");
    }
  }, [fetchData]);

  // при первом рендере загружаем всё за дефолтный период
  useEffect(() => {
    if (startDate && endDate) {
      fetchData("usOnThem");
      fetchData("themOnUs");
      fetchData("usOnUs");
    }
  }, [fetchData]);

  // объединяем данные для графика
  useEffect(() => {
    if (!date.length && !date2.length && !date3.length) return;

    const allDates = Array.from(
      new Set([
        ...date.map((d) => d.date),
        ...date2.map((d) => d.date),
        ...date3.map((d) => d.date),
      ]),
    ).sort((a, b) => new Date(a) - new Date(b));

    const merged = allDates.map((d) => {
      const us = date.find((x) => x.date === d);
      const them = date2.find((x) => x.date === d);
      const usus = date3.find((x) => x.date === d);
      return {
        date: d,
        usOnThem: us ? us[metric] : 0,
        themOnUs: them ? them[metric] : 0,
        usOnUs: usus ? usus[metric] : 0,
      };
    });

    setMergedData(merged);
  }, [date, date2, date3, metric]);

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
        {/* <RangePicker onChange={(dates) => setSelectedRange(dates)} /> */}
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
        <div style={{ width: "100%", height: 340 }}>
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
                <linearGradient id="usOnUs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9b59b6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#9b59b6" stopOpacity={0.1} />
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
              <Area
                type="monotone"
                dataKey="usOnUs"
                name="Внутрибанковские QR (US on US)"
                stroke="#9b59b6"
                fill="url(#usOnUs)"
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
