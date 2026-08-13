import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, Search } from "lucide-react";
import Spinner from "../../../components/Spinner.jsx";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export default function SMSHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${backendUrl}/sms/history`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Не удалось загрузить историю SMS");
      }
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Не удалось загрузить историю SMS");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => [
      item.phone_number,
      item.message_content,
      item.sender_username,
      formatDateTime(item.sent_at),
    ].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [items, search]);

  return (
    <div className="block_info_prems content-page sms-history-page">
      <div className="sms-history-header">
        <div>
          <h2>История SMS</h2>
          <p>Отправленные сообщения операторов</p>
        </div>
        <button type="button" className="button" onClick={loadHistory} disabled={loading}>
          <RefreshCw size={16} />
          Обновить
        </button>
      </div>

      <div className="sms-history-toolbar">
        <Search size={16} />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по номеру, тексту, пользователю или дате"
        />
      </div>

      {error && (
        <div className="sms-history-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "24px" }}>
          <Spinner center label="Загружаем историю SMS" />
        </div>
      ) : (
        <div className="table-reports-div sms-history-table-wrap">
          <table className="table-reports sms-history-table">
            <thead>
              <tr>
                <th>Номер телефона</th>
                <th>Текст SMS</th>
                <th>Дата и время отправки</th>
                <th>Пользователь</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.phone_number || "-"}</td>
                    <td className="sms-history-message-cell">{item.message_content || "-"}</td>
                    <td>{formatDateTime(item.sent_at || item.created_at)}</td>
                    <td>{item.sender_username || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>История SMS отсутствует</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
