import React, { useEffect, useState, useCallback, useRef } from 'react';
import '../../../../styles/components/WorkersDataReports.scss';
import ReportsContent from "./ReportContent.jsx";
import {fetchReportCards} from "../../../../api/workers/reports/report_cards.js";
import Spinner from "../../../Spinner.jsx";

const CardsReport = ({ month, year }) => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [after, setAfter] = useState(null);
    const [hasMore, setHasMore] = useState(true);

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
        [loading, hasMore]
    );

    const loadMore = async () => {
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
    };

    useEffect(() => {
        // при смене месяца/года обнуляем всё
        setCards([]);
        setAfter(null);
        setHasMore(true);
        loadMore();
    }, [month, year]);

    return (
        <ReportsContent>
            <h2>Выданные карты</h2>
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
                        <tr
                            key={card.ID}
                            ref={isLast ? lastCardRef : null}
                        >
                            <td>{card.issue_date?.split("T")[0] || ""}</td>
                            <td>{card.code || ""}</td>
                            <td>{card.coast || ""}</td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
            {loading && <div style={{
                transform: 'scale(2)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: "100px",
                width: "auto"
            }}>
                <Spinner/>
            </div>}
            {!loading && !hasMore && cards.length === 0 && (
                <div className="loading">Нет данных за выбранный период</div>
            )}
        </ReportsContent>
    );
};

export default CardsReport;
