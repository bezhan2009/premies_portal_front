import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import "../../styles/components/CurrencyRatesWidget.scss";
import { fetchConversionRates } from "../../api/conversion/conversion.js";
import {
  buildCurrencyRateRows,
  // getCurrencyDisplayLabel,
} from "../../api/utils/getCurrencyCode.js";

const CURRENCY_META = {
  USD: { flag: "🇺🇸", label: "Доллар" },
  EUR: { flag: "🇪🇺", label: "Евро" },
  RUB: { flag: "🇷🇺", label: "Рубль" },
};

const DEFAULT_ROWS = [
  { currency: "RUB", meta: CURRENCY_META.RUB, buy: null, sell: null },
  { currency: "USD", meta: CURRENCY_META.USD, buy: null, sell: null },
  { currency: "EUR", meta: CURRENCY_META.EUR, buy: null, sell: null },
];

const CurrencyRatesWidget = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchConversionRates(new Date());
        if (mounted) {
          setRates(data);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    load();
    const interval = setInterval(load, 600000); // Update every 10 minutes

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const grouped = useMemo(() => {
    if (!rates || rates.length === 0) return DEFAULT_ROWS;

    const rows = buildCurrencyRateRows(rates).map((row) => ({
      ...row,
      meta: CURRENCY_META[row.currency],
    }));
    return rows.filter((r) => r.meta);
  }, [rates]);


  const [isVisible, setIsVisible] = useState(false);

  if (location.pathname.includes("/agent-qr/transactions/list")) return null;

  return (
    <div className={`currency-rates-overlay ${!isVisible ? "minimized" : ""}`}>
      <button 
        className="toggle-visibility-btn" 
        onClick={() => setIsVisible(!isVisible)}
        title={isVisible ? "Скрыть курсы" : "Показать курсы"}
      >
        {isVisible ? "✕" : "💰"}
      </button>
      
      {isVisible && grouped.map((row) => (
        <div key={row.currency} className="currency-card">
          <div className="currency-card-left">
            <div className="currency-flag-circle">{row.meta.flag}</div>
          </div>
          <div className="currency-card-rates">
            <span className="rate-value buy">
              {row.buy != null ? row.buy.toFixed(2) : "—"}
            </span>
            <span className="rate-value sell">
              {row.sell != null ? row.sell.toFixed(2) : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CurrencyRatesWidget;
