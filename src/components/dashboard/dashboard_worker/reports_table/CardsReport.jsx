import React, { useEffect, useState, useCallback, useRef } from "react";
import "../../../../styles/components/WorkersDataReports.scss";
import ReportsContent from "./ReportContent.jsx";
import { fetchReportCards } from "../../../../api/workers/reports/report_cards.js";
import Spinner from "../../../Spinner.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

const CardsReport = ({ month, year }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [after, setAfter] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const { exportToExcel } = useExcelExport();

  const observer = useRef();

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

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const newCards = await fetchReportCards(month, year, after);
      setCards((prev) => [...prev, ...newCards]);

      if (newCards.length > 0) {
        // для пагинации берем ID последнего объекта
        const lastId = newCards[newCards.length - 1].ID;
        setAfter(lastId);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Ошибка при загрузке карт:", e);
    } finally {
      setLoading(false);
    }
  }, [month, year, after]);

  useEffect(() => {
    // при смене месяца/года обнуляем всё
    setCards([]);
    setAfter(null);
    setHasMore(true);
    loadMore();
  }, [month, year, loadMore]);

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
              <tr key={card.ID} ref={isLast ? lastCardRef : null}>
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
