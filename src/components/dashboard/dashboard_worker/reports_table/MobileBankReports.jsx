import React from 'react';
import '../../../../styles/components/WorkersDataReports.scss'
import ReportsContent from "./ReportContent.jsx";

const MBReport = () => {
    const data = [
        { client: "737546346", tz: 5 },
        { client: "56777722", tz: 5 },
        { client: "", tz: 0 },
        { client: "", tz: 0 },
        { client: "", tz: 0 },
        { client: "", tz: 0 },
        { client: "", tz: 0 },
        { client: "", tz: 0 },
        { client: "", tz: 0 },
        { client: "", tz: 0 },
        { client: "", tz: 0 },
    ];

    return (
        <ReportsContent>
            <h2>Мобильный банк</h2>
            <table>
                <thead>
                <tr>
                    <th>ИНН клиента</th>
                    <th>Прием (ТЗ)</th>
                </tr>
                </thead>
                <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td>{item.client || ""}</td>
                        <td>{item.tz || ""}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </ReportsContent>
    );
};

export default MBReport;
