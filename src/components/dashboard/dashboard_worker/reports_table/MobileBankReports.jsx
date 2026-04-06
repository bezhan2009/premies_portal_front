import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Table } from "../../../table/FlexibleAntTable.jsx";
import '../../../../styles/components/WorkersDataReports.scss';
import ReportsContent from "./ReportContent.jsx";
import Spinner from "../../../Spinner.jsx";
import { fetchReportMobileBank } from "../../../../api/workers/reports/report_mb.js";

const MBReport = ({ month, year }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [after, setAfter] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const observer = useRef();

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;
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
    }, [month, year, after, loading, hasMore]);

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
        [loading, hasMore, loadMore]
    );

    useEffect(() => {
        setData([]);
        setAfter(null);
        setHasMore(true);
    }, [month, year]);

    useEffect(() => {
        if (data.length === 0 && hasMore && !loading) {
            loadMore();
        }
    }, [data, hasMore, loading, loadMore]);

    return (
        <ReportsContent>
            <h2>Мобильный банк</h2>
            <Table dataSource={data} rowKey="ID" pagination={false} bordered onRow={(record, index) => ({
                ref: index === data.length - 1 ? lastRowRef : null,
            })}>
                <Table.Column title="Прием (ТJ)" dataIndex="prem" key="prem" render={(val) => val || ""} />
            </Table>

            {loading && (
                <div style={{ transform: 'scale(2)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: "20px 0" }}>
                    <Spinner />
                </div>
            )}
            {!loading && !hasMore && data.length === 0 && (
                <div className="loading" align="center" style={{ marginTop: "20px" }}>Нет данных за выбранный период</div>
            )}
        </ReportsContent>
    );
};

export default MBReport;
