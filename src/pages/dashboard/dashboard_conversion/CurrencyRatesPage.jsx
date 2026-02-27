import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import Sidebar from "../../../components/general/DynamicMenu.jsx";
import useSidebar from "../../../hooks/useSideBar.js";
import { fetchConversionRates } from "../../../api/conversion/conversion.js";
import "../../../styles/dashboard/CurrencyRates.scss";

const CURRENCY_META = {
  USD: { flag: "🇺🇸", label: "Доллар США" },
  EUR: { flag: "🇪🇺", label: "Евро" },
  TJS: { flag: "🇹🇯", label: "Сомони" },
};

export default function CurrencyRatesPage() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConversionRates(new Date());
      setRates(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Ошибка при загрузке курсов:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  // Группировка: для каждой пары валют показываем покупку и продажу
  const groupedRates = () => {
    const groups = {};

    rates.forEach((rate) => {
      // Определяем иностранную валюту (не TJS)
      const foreignCurrency =
        rate.currencyFrom !== "TJS" ? rate.currencyFrom : rate.currencyTo;

      if (!groups[foreignCurrency]) {
        groups[foreignCurrency] = { buy: null, sell: null };
      }

      if (rate.type === "from" && rate.currencyFrom !== "TJS") {
        // Покупка: банк покупает иностранную валюту (клиент продаёт)
        groups[foreignCurrency].buy = rate.amountTo;
      } else if (rate.type === "to" && rate.currencyTo !== "TJS") {
        // Продажа: банк продаёт иностранную валюту (клиент покупает)
        groups[foreignCurrency].sell = rate.amount;
      }
    });

    return Object.entries(groups).map(([currency, values]) => ({
      currency,
      ...values,
      meta: CURRENCY_META[currency] || { flag: "💱", label: currency },
    }));
  };

  return (
    <>
      <Helmet>
        <title>Курсы валют</title>
      </Helmet>
      <div
        className={`dashboard-container ${
          isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
        }`}
      >
        <Sidebar
          activeLink="currency_rates"
          isOpen={isSidebarOpen}
          toggle={toggleSidebar}
        />

        <div className="dashboard-container">
          <div className="currency-rates-page">
            <div className="currency-rates-header">
              <h1>
                <span className="header-icon">💱</span>
                Курсы валют
              </h1>
              <button
                className={`refresh-btn ${loading ? "loading" : ""}`}
                onClick={loadRates}
                disabled={loading}
              >
                <span className="refresh-icon">🔄</span>
                Обновить
              </button>
            </div>

            {lastUpdated && (
              <div className="currency-rates-date">
                Дата обновления:{" "}
                {lastUpdated.toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}{" "}
                в{" "}
                {lastUpdated.toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}

            <div className="currency-rates-card">
              {loading ? (
                <div className="loading-state">
                  <span className="loading-spinner">⏳</span>
                  <p>Загрузка курсов валют...</p>
                </div>
              ) : error ? (
                <div className="error-state">
                  <span className="error-icon">⚠️</span>
                  <p>Не удалось загрузить курсы валют</p>
                  <p className="error-message">{error}</p>
                  <button className="retry-btn" onClick={loadRates}>
                    Повторить
                  </button>
                </div>
              ) : (
                <table className="currency-rates-table">
                  <thead>
                    <tr>
                      <th>Валюта</th>
                      <th>Покупка (TJS)</th>
                      <th>Продажа (TJS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRates().map((row) => (
                      <tr key={row.currency}>
                        <td>
                          <div className="currency-name">
                            <span className="currency-flag">
                              {row.meta.flag}
                            </span>
                            <div className="currency-info">
                              <div className="currency-code">
                                {row.currency}
                              </div>
                              <div className="currency-label">
                                {row.meta.label}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="rate-value buy">
                            {row.buy != null ? row.buy.toFixed(2) : "—"}
                          </span>
                        </td>
                        <td>
                          <span className="rate-value sell">
                            {row.sell != null ? row.sell.toFixed(2) : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
