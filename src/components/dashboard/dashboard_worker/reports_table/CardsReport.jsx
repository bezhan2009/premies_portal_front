import React from 'react';
import '../../../../styles/components/WorkersDataReports.scss';
import ReportsContent from "./ReportContent.jsx";

const CardsReport = () => {
    const data = [
        { date: "21.06.2025", skk: "20270624СЗВАРВ", tz: 6 },
        { date: "25.06.2025", skk: "20270624СЗВАРВ", tz: 8 },
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
            <h2>Выданные карты</h2>
            <table>
                <thead>
                <tr>
                    <th>Дата выдачи</th>
                    <th>Номер СКК</th>
                    <th>Прием (ТЗ)</th>
                </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr key={index}>
                            <td>{item.date || ""}</td>
                            <td>{item.skk || ""}</td>
                            <td>{item.tz || ""}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </ReportsContent>
    );
};

export default CardsReport;
