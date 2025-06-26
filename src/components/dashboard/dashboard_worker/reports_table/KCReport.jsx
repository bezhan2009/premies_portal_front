import React from 'react';
import '../../../../styles/components/WorkersDataReports.scss';
import ReportsContent from "./ReportContent.jsx";

const KCReport = () => {
    const data = [
        { score: 8.85 },
        { score: 7.98 },
        { score: 0 },
        { score: 0 },
        { score: 0 },
        { score: 0 },
        { score: 0 },
        { score: 0 },
        { score: 0 },
        { score: 0 },
        { score: 0 },
    ];

    return (
        <ReportsContent>
            <h2>Каналы обслуживания</h2>
            <table>
                <thead>
                <tr>
                    <th>Средняя оценка</th>
                </tr>
                </thead>
                <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td>{item.score || ""}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </ReportsContent>
    );
};

export default KCReport;
