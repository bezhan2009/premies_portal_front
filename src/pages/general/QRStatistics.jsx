import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { DatePicker, Select } from "antd";
import AlertMessage from "../../components/general/AlertMessage";
import { formatNumber } from "../../api/utils/formate";

const { RangePicker } = DatePicker;

const dateDef = [
  {
    month: "00-00-0000",
    type: "Наш клиент — чужой QR (Us on Them)",
    count: 0,
    sum: 0,
  },
  {
    month: "00-00-0000",
    type: "Наш QR — чужой клиент (Them on Us)",
    count: 0,
    sum: 0,
  },
];

export default function QRStatistics() {
  const backendUrl = import.meta.env.VITE_BACKEND_QR_URL;
  const [metric, setMetric] = useState("count");
  const [selectedRange, setSelectedRange] = useState(null);
  const [data, setData] = useState({});
  const [date, setDate] = useState([]);
  const [date2, setDate2] = useState([]);
  const [globalDate, setGlobalDate2] = useState(dateDef);

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
      const response = await fetch(
        `${backendUrl}${endpoint}?start_date=${
          data?.start_date || "2025-01-01"
        }&end_date=${data?.end_date || "2025-11-11"}`
      );
      if (!response.ok) throw new Error(`Ошибка HTTP ${response.status}`);

      console.log("endpoint", endpoint);

      const result = await response.json();
      if (type === "usOnThem") {
        let res = result.reduce((acc, curr) => {
          const date = curr.created_at.split("T")[0];
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(curr);
          return acc;
        }, {});

        const finalResult = Object.entries(res).map((key) => {
          return {
            month: key[0],
            type: "Наш клиент — чужой QR (Us on Them)",
            count: key[1].length,
            sum: key[1].reduce((sum, item) => sum + item.amount, 0),
          };
        });
        setDate(finalResult);
      } else {
        let res = result.reduce((acc, curr) => {
          const date = curr.creation_datetime.split("T")[0];
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(curr);
          return acc;
        }, {});

        const finalResult = Object.entries(res).map((key) => {
          return {
            month: key[0],
            type: "Наш QR — чужой клиент (Them on Us)",
            count: key[1].length,
            sum: key[1].reduce((sum, item) => sum + item.amount, 0),
          };
        });

        console.log("finalResult", finalResult);

        setDate2(finalResult);
      }
      showAlert(`Загружено ${result.length} записей`, "success");
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      showAlert("Ошибка загрузки данных. Проверьте сервер.", "error");
    } finally {
      setLoading(false);
    }
  };

  const grouped = [...date, ...date2].reduce((acc, cur) => {
    acc[cur.type] = acc[cur.type] || [];
    acc[cur.type].push(cur);
    return acc;
  }, {});

  console.table("selectedRange", date, date2);

  useEffect(() => {
    if (date && date2) {
      setGlobalDate2([...date, ...date2]);
    }
  }, [date, date2]);

  useEffect(() => {
    if (data?.start_date && data?.end_date) {
      fetchData("usOnThem");
      fetchData("themOnUs");
    }
  }, [data.start_date, data.end_date]);

  useEffect(() => {
    fetchData("usOnThem");
    fetchData("themOnUs");
  }, []);

  useEffect(() => {
    if (selectedRange?.[0] && selectedRange?.[1]) {
      setData((prev) => ({
        ...prev,
        start_date: selectedRange[0].format("YYYY-MM-DD"),
        end_date: selectedRange[1].format("YYYY-MM-DD"),
      }));
    }
  }, [selectedRange]);

  return (
    <>
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

        {!loading ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />

              {Object.keys(grouped).map((type, i) => (
                <Line
                  key={type}
                  dataKey={metric}
                  name={type}
                  data={grouped[type]}
                  stroke={["#8884d8", "#82ca9d", "#ffc658"][i % 3]}
                  strokeWidth={2}
                />
              ))}

              {selectedRange && (
                <ReferenceArea
                  x1={selectedRange[0]?.format("MMM")}
                  x2={selectedRange[1]?.format("MMM")}
                  strokeOpacity={0.3}
                  fill="#82ca9d"
                  fillOpacity={0.2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding: "20px 0" }}>Загрузка данных...</div>
        )}
      </div>
      {alert && (
        <AlertMessage
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </>
  );
}
