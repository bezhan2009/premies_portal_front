import React, { useState } from 'react';
import { Table } from "../../../table/FlexibleAntTable.jsx";
import '../../../../styles/components/Table.scss';
import ReportsContent from "./ReportContent.jsx";

const ApplicationReport = () => {
    const initialData = [
        {
            id: "75746346",
            status: "Статус",
            comment: "Комментарий",
            fio: "ФИО",
            turnover: "Оборот",
            cardType: "Тип карты",
            document: "Документ",
            inn: "ИНН",
            address: "Адрес",
            card: "Карта",
            turnoverPoint: "Скважина оборота",
            turnoverDetails: "Детали оборота",
            date: "01.02.2024"
        },
        {
            id: "9677272",
            status: "Статус",
            comment: "Комментарий",
            fio: "Иван Иван",
            turnover: "Муж",
            cardType: "Visa Gold",
            document: "Российский",
            inn: "123456789",
            address: "Москва, ул. Ленина, д. 1",
            card: "1234 5678 9012 3456",
            turnoverPoint: "Скважина 1",
            turnoverDetails: "Детали 1",
            date: ""
        },
    ];

    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const onSelectChange = (newSelectedRowKeys) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
    };

    return (
        <div className="report-table-container">
            <h2>Заявки</h2>
            <Table
                dataSource={initialData}
                rowKey="id"
                pagination={false}
                bordered
                rowSelection={rowSelection}
                scroll={{ x: "max-content" }}
            >
                <Table.Column title="ID" dataIndex="id" key="id" />
                <Table.Column title="Статус" dataIndex="status" key="status" />
                <Table.Column title="Комментарий" dataIndex="comment" key="comment" />
                <Table.Column title="ФИО" dataIndex="fio" key="fio" />
                <Table.Column title="Оборот" dataIndex="turnover" key="turnover" />
                <Table.Column title="Тип карты" dataIndex="cardType" key="cardType" />
                <Table.Column title="Документ" dataIndex="document" key="document" />
                <Table.Column title="ИНН" dataIndex="inn" key="inn" />
                <Table.Column title="Адрес" dataIndex="address" key="address" />
                <Table.Column title="Карта" dataIndex="card" key="card" />
                <Table.Column title="Скважина оборота" dataIndex="turnoverPoint" key="turnoverPoint" />
                <Table.Column title="Детали оборота" dataIndex="turnoverDetails" key="turnoverDetails" />
                <Table.Column title="Дата" dataIndex="date" key="date" />
            </Table>
        </div>
    );
};

export default ApplicationReport;
