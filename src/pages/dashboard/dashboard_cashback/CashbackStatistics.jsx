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
import { Empty, Select, Table, Tag, Button, Space } from "antd";
import {
  buildCashbackChartSeries,
  summarizeCashbackByName,
} from "./cardCashbackStatisticsUtils.js";

const SERIES_COLORS = [
  "#417cd5",
  "#2ec4b6",
  "#ff9f1c",
  "#9b5de5",
  "#e71d36",
  "#00a8e8",
  "#6a994e",
  "#f15bb5",
];

function formatNumber(value, isSum = false) {
  if (value == null || Number.isNaN(Number(value))) return "0";

  return Number(value).toLocaleString("ru-RU", {
    minimumFractionDigits: isSum ? 2 : 0,
    maximumFractionDigits: isSum ? 2 : 0,
  });
}

const CustomTooltip = ({ active, payload, label, isSum }) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.94)",
        padding: "10px 14px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        backdropFilter: "blur(8px)",
        fontSize: "13px",
        color: "var(--text-color)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "6px" }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey}>
          <span style={{ color: entry.color }}>{entry.name}: </span>
          {formatNumber(entry.value, isSum)} {isSum ? "TJS" : "шт."}
        </div>
      ))}
    </div>
  );
};

export default function CashbackStatistics({ items, periodLabel }) {
  const [metric, setMetric] = useState("sum");
  const [showChart,setShowChart]=useState(true);
  const [showTable,setShowTable]=useState(true);
  const summary = useMemo(() => summarizeCashbackByName(items), [items]);
  const chart = useMemo(
    () => buildCashbackChartSeries(items, metric),
    [items, metric],
  );
  const totalAmount = useMemo(
    () => summary.reduce((total, item) => total + item.totalAmount, 0),
    [summary],
  );

  const columns = useMemo(
    () => [
      {
        title: "Название кэшбэка",
        dataIndex: "name",
        key: "name",
        render: (value) => <strong>{value}</strong>,
      },
      {
        title: "Операций",
        dataIndex: "count",
        key: "count",
        align: "right",
      },
      {
        title: "Общая сумма за период",
        dataIndex: "totalAmount",
        key: "totalAmount",
        align: "right",
        render: (value) => <strong>{formatNumber(value, true)} TJS</strong>,
      },
      {
        title: "Оплачено",
        dataIndex: "paidCount",
        key: "paidCount",
        align: "right",
      },
      {
        title: "В обработке",
        dataIndex: "processingCount",
        key: "processingCount",
        align: "right",
      },
      {
        title: "Ошибки",
        dataIndex: "errorCount",
        key: "errorCount",
        align: "right",
      },
      {
        title: "Возвраты",
        dataIndex: "returnedCount",
        key: "returnedCount",
        align: "right",
      },
    ],
    [],
  );

  return (
    <div
      style={{
        margin: "16px",
        padding: "18px",
        background: "var(--block-bg, white)",
        border: "1px solid var(--border-color, #eef0f3)",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Статистика по названиям кэшбэка</h3>
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Tag color="blue">{periodLabel}</Tag>
            <Tag color="green">
              Общая сумма: {formatNumber(totalAmount, true)} TJS
            </Tag>
          </div>
        </div>
        <Space wrap><Button aria-expanded={showChart} onClick={()=>setShowChart(value=>!value)}>{showChart?'Скрыть график статистики':'Показать график статистики'}</Button><Button aria-expanded={showTable} onClick={()=>setShowTable(value=>!value)}>{showTable?'Скрыть таблицу статистики':'Показать таблицу статистики'}</Button><Select
          value={metric}
          onChange={setMetric}
          options={[
            { label: "Сумма кэшбэка", value: "sum" },
            { label: "Количество операций", value: "count" },
          ]}
          style={{ width: 220 }}
        /></Space>
      </div>

      {showChart && (chart.data.length ? (
        <div style={{ width: "100%", height: 340, marginBottom: "20px" }}>
          <ResponsiveContainer>
            <AreaChart data={chart.data}>
              <defs>
                {chart.series.map((series, index) => {
                  const color = SERIES_COLORS[index % SERIES_COLORS.length];

                  return (
                    <linearGradient
                      key={series.key}
                      id={`gradient_${series.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={color} stopOpacity={0.75} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.08} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip isSum={metric === "sum"} />} />
              <Legend />
              {chart.series.map((series, index) => {
                const color = SERIES_COLORS[index % SERIES_COLORS.length];

                return (
                  <Area
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.name}
                    stroke={color}
                    fill={`url(#gradient_${series.key})`}
                    strokeWidth={2.25}
                    dot={{ r: 2 }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty
          description="За выбранный период данных нет"
          style={{ margin: "24px 0" }}
        />
      ))}

      <div hidden={!showTable}><Table
        size="small"
        rowKey="name"
        columns={columns}
        dataSource={summary}
        pagination={false}
        scroll={{ x: 850 }}
        locale={{ emptyText: "За выбранный период данных нет" }}
        summary={() =>
          summary.length ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <strong>Итого</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>
                  {summary.reduce((total, item) => total + item.count, 0)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <strong>{formatNumber(totalAmount, true)} TJS</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} colSpan={4} />
            </Table.Summary.Row>
          ) : null
        }
      /></div>
    </div>
  );
}
