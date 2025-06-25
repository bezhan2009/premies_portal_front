import React from 'react';
import '../../../../styles/components/WorkersDataReports.scss';
import ReportsContent from "./ReportContent.jsx";

const CardTurnoversReport = () => {
    const data = [
        { accountNumber: "75746346", rating: 5 },
        { accountNumber: "9677272", rating: 5 },
        { accountNumber: "", rating: 0 },
        { accountNumber: "", rating: 0 },
        { accountNumber: "", rating: 0 },
        { accountNumber: "", rating: 0 },
        { accountNumber: "", rating: 0 },
        { accountNumber: "", rating: 0 },
        { accountNumber: "", rating: 0 },
        { accountNumber: "", rating: 0 },
        { accountNumber: "", rating: 0 },
    ];

    return (
        <ReportsContent>
            <h2>Обороты</h2>
            <table>
                <thead>
                <tr>
                    <th>Номер счета</th>
                    <th>Оценка</th>
                </tr>
                </thead>
                <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td>{item.accountNumber || ""}</td>
                        <td>{item.rating || ""}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </ReportsContent>
    );
};

export default CardTurnoversReport;
