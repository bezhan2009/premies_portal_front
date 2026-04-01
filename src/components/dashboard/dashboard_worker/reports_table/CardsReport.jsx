import React, { useEffect, useState, useCallback, useRef } from "react";
import "../../../../styles/components/WorkersDataReports.scss";
import ReportsContent from "./ReportContent.jsx";
import { fetchReportCards } from "../../../../api/workers/reports/report_cards.js";
import Spinner from "../../../Spinner.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

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
      setCards((prev) => [...prev, ...newCards]);

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
      {
        key: "issue_date",
        label: "Дата выдачи",
        format: (val) => val?.split("T")[0] || "",
      },
      { key: "code", label: "Номер СКК" },
      { key: "coast", label: "Премия (ТЗ)" },
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
            <th>Номер СКК</th>
            <th>Премия (ТЗ)</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card, index) => {
            const isLast = index === cards.length - 1;
            return (
              <tr key={card.ID ?? card.id} ref={isLast ? lastCardRef : null}>
                <td>{card.issue_date?.split("T")[0] || ""}</td>
                <td>{card.code || ""}</td>
                <td>{card.coast || ""}</td>
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
