import React from 'react';
import '../../../../styles/components/WorkersDataReports.scss'
import ReportsContent from "./ReportContent.jsx";


const CardsReport = () => {
    const data = [
        { date: "21.05.2025", skk: "20270524СЗВАРВ", tz: 6 },
        { date: "25.05.2025", skk: "20270524СЗВАРВ", tz: 8 },
        { date: "", skk: "", tz: 0 },
        { date: "", skk: "", tz: 0 },
        { date: "", skk: "", tz: 0 },
        { date: "", skk: "", tz: 0 },
        { date: "", skk: "", tz: 0 },
        { date: "", skk: "", tz: 0 },
        { date: "", skk: "", tz: 0 },
        { date: "", skk: "", tz: 0 },
        { date: "", skk: "", tz: 0 },
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

export default CardsReport;
