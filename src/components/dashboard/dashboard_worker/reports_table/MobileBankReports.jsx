import React, { useEffect, useState, useCallback, useRef } from 'react';
import '../../../../styles/components/WorkersDataReports.scss';
import ReportsContent from "./ReportContent.jsx";
import Spinner from "../../../Spinner.jsx";
import {fetchReportMobileBank} from "../../../../api/workers/reports/report_mb.js";

const MBReport = ({ month, year }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [after, setAfter] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const observer = useRef();

    const lastRowRef = useCallback(
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
            const newData = await fetchReportMobileBank(month, year, after);
            setData((prev) => [...prev, ...newData]);

            if (newData.length > 0) {
                const lastId = newData[newData.length - 1].ID;
                setAfter(lastId);
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error("Ошибка при загрузке данных MBReport:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // если сменили месяц или год — обнуляем всё и грузим заново
        setData([]);
        setAfter(null);
        setHasMore(true);
        loadMore();
    }, [month, year]);

    return (
        <ReportsContent>
            <h2>Мобильный банк</h2>
            <table>
                <thead>
                <tr>
                    <th>Прием (ТJ)</th>
                </tr>
                </thead>
                <tbody>
                {data.map((item, index) => {
                    const isLast = index === data.length - 1;
                    return (
                        <tr
                            key={item.ID}
                            ref={isLast ? lastRowRef : null}
                        >
                            <td>{item.prem || ""}</td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
            {loading && (
                <div
                    style={{
                        transform: 'scale(2)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: "100px",
                        width: "auto"
                    }}
                >
                    <Spinner />
                </div>
            )}
            {!loading && !hasMore && data.length === 0 && (
                <div className="loading" align="center">Нет данных за выбранный период</div>
            )}
        </ReportsContent>
    );
};

export default MBReport;
