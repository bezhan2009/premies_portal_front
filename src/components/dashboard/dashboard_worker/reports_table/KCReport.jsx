import React, { useEffect, useState } from 'react';
import '../../../../styles/components/WorkersDataReports.scss';
import ReportsContent from "./ReportContent.jsx";
import Spinner from "../../../Spinner.jsx";
import {fetchReportKCAndTests} from "../../../../api/workers/reports/report_kc.js";

const KCReport = ({ month, year }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await fetchReportKCAndTests(month, year);
            setData(result);
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
            <table>
                <thead>
                <tr>
                    <th>Средняя оценка (call_center)</th>
                    <th>Коэффициент</th>
                    <th>Жалобы</th>
                    <th>Тесты</th>
                </tr>
                </thead>
                <tbody>
                {data.length > 0 ? (
                    data.map((item) => (
                        <tr key={item.ID}>
                            <td>{item.call_center || 0}</td>
                            <td>{item.coefficient || 0}</td>
                            <td>{item.complaint || 0}</td>
                            <td>{item.tests || 0}</td>
                        </tr>
                    ))
                ) : (
                    !loading && (
                        <tr>
                            <td colSpan={4} style={{textAlign: "center"}}>
                                <div className="loading" align="center">Нет данных за выбранный период</div>
                            </td>
                        </tr>
                    )
                )}
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
        </ReportsContent>
    );
};

export default KCReport;
