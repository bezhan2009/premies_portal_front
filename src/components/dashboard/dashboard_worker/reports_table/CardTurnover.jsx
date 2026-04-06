import React from 'react';
import { Table } from "../../../table/FlexibleAntTable.jsx";
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
            <Table dataSource={data} rowKey={(record, index) => index} pagination={false} bordered>
                <Table.Column title="Номер счета" dataIndex="accountNumber" key="accountNumber" />
                <Table.Column title="Оценка" dataIndex="rating" key="rating" render={(val) => val || ""} />
            </Table>
        </ReportsContent>
    );
};

export default CardTurnoversReport;
