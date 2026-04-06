import React, { useEffect, useState } from 'react';
import { Table } from "../../../table/FlexibleAntTable.jsx";
import '../../../../styles/components/WorkersDataReports.scss';
import ReportsContent from "./ReportContent.jsx";
import Spinner from "../../../Spinner.jsx";
import { fetchReportKCAndTests } from "../../../../api/workers/reports/report_kc.js";

const KCReport = ({ month, year }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await fetchReportKCAndTests(month, year);
            setData(result || []);
        } catch (e) {
            console.error("Ошибка при загрузке KCReport:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [month, year]);

    return (
        <ReportsContent>
            <h2>Каналы обслуживания</h2>
            <Table dataSource={data} rowKey="ID" pagination={false} bordered>
                <Table.Column title="Средняя оценка (call_center)" dataIndex="call_center" key="call_center" render={(val) => val || 0} />
                <Table.Column title="Коэффициент" dataIndex="coefficient" key="coefficient" render={(val) => val || 0} />
                <Table.Column title="Жалобы" dataIndex="complaint" key="complaint" render={(val) => val || 0} />
                <Table.Column title="Тесты" dataIndex="tests" key="tests" render={(val) => val || 0} />
            </Table>

            {loading && (
                <div style={{ transform: 'scale(2)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: "20px 0" }}>
                    <Spinner />
                </div>
            )}
            {!loading && data.length === 0 && (
                <div className="loading" align="center" style={{ marginTop: "20px" }}>Нет данных за выбранный период</div>
            )}
        </ReportsContent>
    );
};

export default KCReport;
