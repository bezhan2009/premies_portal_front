import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Input, Button, Space, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import "../../../styles/components/Table.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { apiClient } from "../../../api/utils/apiClient.js";
import Spinner from "../../../components/Spinner.jsx";
import { Table } from "../../../components/table/FlexibleAntTable.jsx";
import { getCurrencyCode } from "../../../api/utils/getCurrencyCode.js";

const CardCashbackTable = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const backendURL = import.meta.env.VITE_BACKEND_URL;
    const { exportToExcel } = useExcelExport();

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiClient(`${backendURL}/card-cashback`);
            const data = response.data;
            if (Array.isArray(data)) {
                setItems(data);
            } else if (data && Array.isArray(data.data)) {
                setItems(data.data);
            } else {
                setItems([]);
            }
        } catch (e) {
            console.error("Ошибка загрузки:", e);
            setError("Ошибка загрузки данных");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [backendURL]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handlePay = async (utrno) => {
        try {
            await apiClient.post(`${backendURL}/card-cashback/pay/${utrno}`);
            fetchItems();
        } catch (e) {
            console.error("Ошибка при оплате:", e);
            alert("Ошибка при повторе платежа");
        }
    };

    const handleReturn = async (utrno) => {
        if (!window.confirm("Вы уверены, что хотите вернуть кэшбэк?")) return;
        try {
            await apiClient.post(`${backendURL}/card-cashback/return/${utrno}`);
            fetchItems();
        } catch (e) {
            console.error("Ошибка при возврате:", e);
            alert("Ошибка при возврате кэшбэка");
        }
    };

    const getColumnSearchProps = (dataIndex, label) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }}>
                <Input
                    placeholder={`Поиск ${label}`}
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => confirm()}
                    style={{ marginBottom: 8, display: "block" }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => confirm()}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Поиск
                    </Button>
                    <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
                        Сброс
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />,
        onFilter: (value, record) =>
            record[dataIndex] ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()) : false,
    });

    const columns = useMemo(
        () => [
            {
                title: "ID",
                dataIndex: "id",
                key: "id",
                sorter: (a, b) => a.id - b.id,
                width: 80,
            },
            {
                title: "Дата создания",
                dataIndex: "created_at",
                key: "created_at",
                sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
                render: (val) => (val ? new Date(val).toLocaleString("ru-RU") : "-"),
            },
            {
                title: "Дата обновления",
                dataIndex: "updated_at",
                key: "updated_at",
                sorter: (a, b) => new Date(a.updated_at) - new Date(b.updated_at),
                render: (val) => (val ? new Date(val).toLocaleString("ru-RU") : "-"),
            },
            {
                title: "Сумма кэшбэка",
                dataIndex: "amount",
                key: "amount",
                sorter: (a, b) => a.amount - b.amount,
                render: (val, record) => `${val} ${getCurrencyCode(String(record.currency || ""))}`,
            },
            {
                title: "UTRNO",
                dataIndex: "utrno",
                key: "utrno",
                ...getColumnSearchProps("utrno", "UTRNO"),
            },
            {
                title: "Название кэшбэка",
                dataIndex: "cashback_name",
                key: "cashback_name",
                ...getColumnSearchProps("cashback_name", "Название кэшбэка"),
            },
            {
                title: "Номер карты",
                dataIndex: "card_number",
                key: "card_number",
                ...getColumnSearchProps("card_number", "Номер карты"),
            },
            {
                title: "ID карты",
                dataIndex: "card_id",
                key: "card_id",
                ...getColumnSearchProps("card_id", "ID карты"),
            },
            {
                title: "Номер счета",
                dataIndex: "account_number",
                key: "account_number",
                ...getColumnSearchProps("account_number", "Номер счета"),
            },
            {
                title: "ATM ID",
                dataIndex: "atm_id",
                key: "atm_id",
                ...getColumnSearchProps("atm_id", "ATM ID"),
            },
            {
                title: "Адрес терминала",
                dataIndex: "terminal_address",
                key: "terminal_address",
                ...getColumnSearchProps("terminal_address", "Адрес терминала"),
                ellipsis: true,
            },
            {
                title: "Статус",
                dataIndex: "status",
                key: "status",
                filters: [
                    { text: "Оплачено", value: "Оплачено" },
                    { text: "Ошибка АБС", value: "Ошибка АБС" },
                    { text: "В обработке", value: "" },
                    { text: "Возвращено", value: "Возвращено" },
                    { text: "Возврат", value: "Возврат" },
                ],
                onFilter: (value, record) => (record.status || "") === value,
                render: (val) => {
                    let color = "orange";
                    let text = val || "В обработке";
                    if (val === "Оплачено") color = "green";
                    if (val === "Ошибка АБС") color = "red";
                    if (val === "Возвращено" || val === "Возврат") color = "volcano";
                    return <Tag color={color}>{text}</Tag>;
                },
            },
            {
                title: "Возврат",
                dataIndex: "reversal",
                key: "reversal",
                filters: [
                    { text: "ДА", value: "ДА" },
                    { text: "НЕТ", value: "НЕТ" },
                ],
                onFilter: (value, record) => (record.reversal || "НЕТ") === value,
                render: (val) => (
                    <Tag color={val === "ДА" ? "red" : "blue"}>{val === "ДА" ? "ДА" : "НЕТ"}</Tag>
                ),
            },
            {
                title: "Действия",
                key: "actions",
                render: (_, record) => {
                    // Статус "Возвращено" или "Возврат" - блокируем кнопку возврата
                    const isReturned = record.status === "Возвращено" || record.status === "Возврат";
                    // Статус "Ошибка АБС" - показываем кнопку "Повторить"
                    const isError = record.status === "Ошибка АБС";

                    return (
                        <Space>
                            {isError && (
                                <Button type="primary" size="small" onClick={() => handlePay(record.utrno)}>
                                    Повторить
                                </Button>
                            )}
                            <Button
                                danger
                                size="small"
                                onClick={() => handleReturn(record.utrno)}
                                disabled={isReturned}
                            >
                                {isReturned ? "Возвращено" : "Вернуть"}
                            </Button>
                        </Space>
                    );
                },
            },
        ],
        [fetchItems],
    );

    const handleExport = () => {
        const exportColumns = columns
            .filter((col) => col.key !== "actions")
            .map((col) => ({ key: col.dataIndex, label: col.title }));
        exportToExcel(items, exportColumns, "Кэшбэк по картам");
    };

    return (
        <div className="block_info_prems content-page">
            <div className="table-header-actions" style={{ margin: "16px" }}>
                <h2>Кэшбэк по картам</h2>
                <Button className="export-excel-btn" onClick={handleExport}>
                    Экспорт в Excel
                </Button>
            </div>

            {error ? (
                <p style={{ color: "red", margin: "16px" }}>{error}</p>
            ) : (
                <Table
                    tableId="cashback-card-list"
                    columns={columns}
                    dataSource={items}
                    rowKey={(record) => record.id || record.utrno}
                    loading={{
                        spinning: loading,
                        indicator: <Spinner size="small" />,
                    }}
                    pagination={{ pageSize: 10 }}
                    bordered
                    scroll={{ x: "max-content" }}
                    locale={{ emptyText: "Нет данных" }}
                />
            )}
        </div>
    );
};

export default CardCashbackTable;
