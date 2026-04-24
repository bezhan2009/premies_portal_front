import React, { useEffect, useState, useCallback, useRef } from "react";
import "../../../../styles/components/WorkersDataReports.scss";
import ReportsContent from "./ReportContent.jsx";
import { fetchReportCards } from "../../../../api/workers/reports/report_cards.js";
import Spinner from "../../../Spinner.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import {
  fetchCardDetails,
  fetchCardServices,
} from "../../../../api/processing/transactions.js";

const CardsReport = ({ month, year }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { exportToExcel } = useExcelExport();

  const observer = useRef(null);
  const afterRef = useRef(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    try {
      const newCards = await fetchReportCards(month, year, afterRef.current);
      
      // Обогащаем данные карт дополнительной информацией
      const enrichedCards = await Promise.all(
        newCards.map(async (card) => {
          try {
            const cardId = card.ID ?? card.id ?? card.code;
            const [details, services] = await Promise.all([
              fetchCardDetails(cardId),
              fetchCardServices(cardId),
            ]);
            return { ...card, details, services };
          } catch (e) {
            console.error(`Ошибка при обогащении карты:`, e);
            return card;
          }
        }),
      );

      setCards((prev) => [...prev, ...enrichedCards]);

      if (newCards.length > 0) {
        afterRef.current =
          newCards[newCards.length - 1].ID ?? newCards[newCards.length - 1].id;
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Ошибка при загрузке карт:", e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [month, year]);

  const lastCardRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, loadMore],
  );

  useEffect(() => {
    setCards([]);
    setHasMore(true);
    afterRef.current = null;
    loadingRef.current = false;
    loadMore();
  }, [month, year, loadMore]);

  useEffect(() => () => observer.current?.disconnect(), []);

  const handleExport = () => {
    const columns = [
      { key: (row) => row.details?.cardNumberMask || "-", label: "Карта" },
      { key: (row) => row.details?.cardTypeName || "-", label: "Тип" },
      { key: (row) => row.statusName || "-", label: "Статус АБС" },
      { key: (row) => `${row.details?.statusDescription || ""} (${row.details?.hotCardStatus || ""})`, label: "Статус ПЦ" },
      { key: (row) => row.details?.accounts?.map(a => a.number).join("\n") || "-", label: "Счета карты" },
      { key: (row) => row.details?.accounts?.map(a => `${a.balance} ${a.currency}`).join("\n") || "-", label: "Остатки в ПЦ" },
      { key: (row) => {
          const accs = row.details?.accounts?.map(a => `${a.number} ${a.balance} (${a.currency})`);
          return accs?.join(", ") || "-";
        }, label: "Счета" },
      { key: (row) => {
          const svcs = row.services?.map(s => {
            const type = s.identification?.serviceId === "300" ? "SMS" : 
                         s.identification?.serviceId === "330" ? "3DS" : null;
            return type ? `${s.extNumber} ${type}` : null;
          }).filter(Boolean);
          return svcs?.join(", ") || "-";
        }, label: "Уведомления" },
    ];
    exportToExcel(cards, columns, "Выданные карты");
  };

  return (
    <ReportsContent>
      <div className="table-header-actions">
        <h2>Выданные карты</h2>
        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Дата выдачи</th>
            <th>ID Карты</th>
            <th>Карта</th>
            <th>Тип</th>
            <th>Статус АБС</th>
            <th>Статус ПЦ</th>
            <th>Счета карты</th>
            <th style={{ color: '#27ae60' }}>Остатки в ПЦ</th>
            <th>Уведомления</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card, index) => {
            const isLast = index === cards.length - 1;
            return (
              <tr key={card.ID ?? card.id} ref={isLast ? lastCardRef : null}>
                <td>{card.issue_date?.split("T")[0] || ""}</td>
                <td style={{ fontSize: '11px', color: '#666' }}>{card.ID ?? card.id}</td>
                <td>{card.CardNumber || card.details?.cardNumberMask || "-"}</td>
                <td>{card.CardTypeName || card.details?.cardTypeName || "-"}</td>
                <td>{card.statusName || "-"}</td>
                <td>
                  <span style={{ color: card.details?.statusDescription?.toLowerCase()?.includes('valid') ? '#27ae60' : 'inherit' }}>
                    {card.details?.statusDescription || "-"} ({card.details?.hotCardStatus || "-"})
                  </span>
                </td>
                <td className="limits-table__td">
                  {card.details?.accounts?.map((acc, aIdx) => (
                    <div key={aIdx} style={{ whiteSpace: 'nowrap', borderBottom: aIdx < (card.details.accounts.length - 1) ? '1px solid #eee' : 'none', padding: '2px 0' }}>
                      {acc.number}
                    </div>
                  ))}
                </td>
                <td className="limits-table__td" style={{ color: '#27ae60' }}>
                  {card.details?.accounts?.map((acc, aIdx) => (
                    <div key={aIdx} style={{ whiteSpace: 'nowrap', borderBottom: aIdx < (card.details.accounts.length - 1) ? '1px solid #eee' : 'none', padding: '2px 0' }}>
                      <b>{Number(acc.balance).toFixed(2)}</b> {acc.currency}
                    </div>
                  ))}
                </td>
                <td className="limits-table__td">
                  {card.services?.map((s, sIdx) => {
                    const type = s.identification?.serviceId === "300" ? "SMS" : 
                                 s.identification?.serviceId === "330" ? "3DS" : null;
                    if (!type) return null;
                    return (
                      <div key={sIdx} style={{ whiteSpace: 'nowrap' }}>
                        {s.extNumber} {type}
                      </div>
                    );
                  })}
                  {(!card.services || card.services.length === 0) && "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {loading && (
        <div
          style={{
            transform: "scale(2)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "100px",
            width: "auto",
          }}
        >
          <Spinner />
        </div>
      )}
      {!loading && !hasMore && cards.length === 0 && (
        <div className="loading">Нет данных за выбранный период</div>
      )}
    </ReportsContent>
  );
};

export default CardsReport;
