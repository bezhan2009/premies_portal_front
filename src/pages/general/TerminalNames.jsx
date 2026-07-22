import React, { useEffect, useMemo, useState } from "react";
import { Input, Button, Space } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { useFormStore } from "../../hooks/useFormState.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    deleteTerminalNames,
    getTerminalNames,
    postTerminalNames,
    putTerminalNames,
} from "../../api/transactions/api.js";
import {
    getCurrencyCode,
} from "../../api/utils/getCurrencyCode.js";
import { Table } from "../../components/table/FlexibleAntTable.jsx";
import Spinner from "../../components/Spinner.jsx";

const ValidData = {
    transactionType: { required: true },
    description: { required: true },
    atmId: { required: true },
};

export default function TerminalNames() {
    const { data, errors, setData, validate } = useFormStore();
    const [loading, setLoading] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [edit, setEdit] = useState(null);
    const [filters, setFilters] = useState({
        transactionType: "",
        description: "",
        atmId: "",
        id: "",
        currency: "",
    });

    const upDateItem = async () => {
        const isValid = validate(ValidData);
        if (!isValid) {
            toast.error("Пожалуйста, заполните все обязательные поля корректно!");
            return;
        }

        setLoading(true);
        try {
            const requestData = {
                ...data,
                currency: data.currency || null,
            };

            const response = await putTerminalNames(requestData);
            if (response.status === 200 || response.status === 201) {
                toast.success("Успешно обновлён!");
                setEdit(null);
                getItems();
            }
        } catch (e) {
            const errorMessage =
                e?.response?.data?.message ||
                e?.message ||
                "Произошла ошибка при обновлении";
            toast.error(`Ошибка: ${errorMessage}`);
            console.error("Ошибка при обновлении:", e);
        } finally {
            setLoading(false);
        }
    };

    const createItem = async () => {
        if (!filters.transactionType || !filters.description || !filters.atmId) {
            toast.error("Пожалуйста, заполните Тип транзакции, Описание и ATM ID!");
            return;
        }

        setLoading(true);
        try {
            const requestData = {
                ...filters,
                currency: filters.currency || null,
            };

            const response = await postTerminalNames(requestData);
            if (response.status === 200 || response.status === 201) {
                toast.success("Успешно создан!");
                setEdit(null);
                setFilters({
                    transactionType: "",
                    description: "",
                    atmId: "",
                    id: "",
                    currency: "",
                });
                getItems();
            }
        } catch (e) {
            const errorMessage =
                e?.response?.data?.message ||
                e?.message ||
                "Произошла ошибка при создании";
            toast.error(`Ошибка: ${errorMessage}`);
            console.error("Ошибка при создании:", e);
        } finally {
            setLoading(false);
        }
    };

    const deleteItem = async (id) => {
        setLoading(true);
        try {
            const response = await deleteTerminalNames(id);
            if (response.status === 200 || response.status === 201) {
                toast.success("Успешно удалён!");
                setEdit(null);
                getItems();
            }
        } catch (e) {
            const errorMessage =
                e?.response?.data?.message ||
                e?.message ||
                "Произошла ошибка при удалении";
            toast.error(`Ошибка: ${errorMessage}`);
            console.error("Ошибка при удалении:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const getItems = async () => {
        setLoading(true);
        try {
            const response = await getTerminalNames();
            setTableData(
                response.data.map((item) => ({
                    transactionType: String(item.transactionType),
                    description: item.description,
                    atmId: String(item.atmId),
                    id: String(item.id),
                    currency: item.currency ? String(item.currency) : null,
                })),
            );
        } catch (e) {
            console.error("Ошибка при загрузке данных:", e);
            toast.error("Не удалось загрузить данные");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getItems();
    }, []);

    const formatCurrencyDisplay = (currencyCode) => {
        if (!currencyCode) return "Не указана";
        const alphabeticCode = getCurrencyCode(currencyCode);
        return `${alphabeticCode} (${currencyCode})`;
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
        onFilter: (value, record) => {
            if (!record[dataIndex]) return false;
            if (dataIndex === "currency") {
                const formatted = formatCurrencyDisplay(record[dataIndex]);
                return formatted.toLowerCase().includes(value.toLowerCase());
            }
            return record[dataIndex].toString().toLowerCase().includes(value.toLowerCase());
        },
    });

    const columns = useMemo(
        () => [
            {
                title: "Тип транзакции",
                dataIndex: "transactionType",
                key: "transactionType",
                sorter: (a, b) => String(a.transactionType).localeCompare(String(b.transactionType), "ru", { numeric: true }),
                ...getColumnSearchProps("transactionType", "Тип транзакции"),
                render: (val, record) => {
                    if (edit?.type === "update" && edit?.id === record.id) {
                        return (
                            <Input
                                value={data?.transactionType || ""}
                                onChange={(e) => setData("transactionType", e.target.value)}
                                onPressEnter={upDateItem}
                            />
                        );
                    }
                    return val;
                },
            },
            {
                title: "Описание",
                dataIndex: "description",
                key: "description",
                sorter: (a, b) => a.description.localeCompare(b.description, "ru"),
                ...getColumnSearchProps("description", "Описание"),
                render: (val, record) => {
                    if (edit?.type === "update" && edit?.id === record.id) {
                        return (
                            <Input
                                value={data?.description || ""}
                                onChange={(e) => setData("description", e.target.value)}
                                onPressEnter={upDateItem}
                            />
                        );
                    }
                    return (
                        <span
                            onClick={() => {
                                setEdit({
                                    type: "update",
                                    id: record.id,
                                });
                                setData("transactionType", record.transactionType);
                                setData("description", record.description);
                                setData("atmId", record.atmId);
                                setData("id", record.id);
                                setData("currency", record.currency || "");
                            }}
                            style={{ cursor: "pointer", textDecoration: "underline" }}
                        >
                            {val}
                        </span>
                    );
                },
            },
            {
                title: "ATM ID",
                dataIndex: "atmId",
                key: "atmId",
                sorter: (a, b) => a.atmId.localeCompare(b.atmId, "ru", { numeric: true }),
                ...getColumnSearchProps("atmId", "ATM ID"),
                render: (val, record) => {
                    if (edit?.type === "update" && edit?.id === record.id) {
                        return (
                            <Input
                                value={data?.atmId || ""}
                                onChange={(e) => setData("atmId", e.target.value)}
                                onPressEnter={upDateItem}
                            />
                        );
                    }
                    return val;
                },
            },
            {
                title: "Валюта",
                dataIndex: "currency",
                key: "currency",
                sorter: (a, b) => String(a.currency || "").localeCompare(String(b.currency || ""), "ru", { numeric: true }),
                ...getColumnSearchProps("currency", "Валюта"),
                render: (val, record) => {
                    if (edit?.type === "update" && edit?.id === record.id) {
                        return (
                            <Input
                                value={data?.currency || ""}
                                onChange={(e) => setData("currency", e.target.value)}
                                onPressEnter={upDateItem}
                                placeholder="Код валюты (например: 643)"
                            />
                        );
                    }
                    return formatCurrencyDisplay(val);
                },
            },
            {
                title: "id",
                dataIndex: "id",
                key: "id",
                sorter: (a, b) => String(a.id).localeCompare(String(b.id), "ru", { numeric: true }),
                ...getColumnSearchProps("id", "id"),
            },
            {
                title: "Действия",
                key: "actions",
                render: (_, record) => {
                    if (edit?.type === "update" && edit?.id === record.id) {
                        return (
                            <Space>
                                <Button type="primary" size="small" onClick={upDateItem} loading={loading}>
                                    Сохранить
                                </Button>
                                <Button size="small" onClick={() => setEdit(null)}>
                                    Отмена
                                </Button>
                            </Space>
                        );
                    }
                    return (
                        <Space>
                            <Button
                                size="small"
                                onClick={() => {
                                    setEdit({
                                        type: "update",
                                        id: record.id,
                                    });
                                    setData("transactionType", record.transactionType);
                                    setData("description", record.description);
                                    setData("atmId", record.atmId);
                                    setData("id", record.id);
                                    setData("currency", record.currency || "");
                                }}
                            >
                                Редактировать
                            </Button>
                            <Button
                                danger
                                size="small"
                                onClick={() => {
                                    if (window.confirm("Вы уверены, что хотите удалить эту запись?")) {
                                        deleteItem(record.id);
                                    }
                                }}
                                loading={loading}
                            >
                                Удалить
                            </Button>
                        </Space>
                    );
                },
            },
        ],
        [edit, data, loading]
    );

    return (
        <div className="block_info_prems content-page">
            <div className="table-header-actions" style={{ margin: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <h2 style={{ margin: 0 }}>Имена терминалов</h2>
                </div>
                <Space>
                    <Button
                        type="primary"
                        onClick={() => {
                            if (edit?.type === "create") {
                                setEdit(null);
                            } else {
                                setEdit({ type: "create", id: null });
                                setFilters({
                                    transactionType: "",
                                    description: "",
                                    atmId: "",
                                    id: "",
                                    currency: "",
                                });
                            }
                        }}
                    >
                        {edit?.type === "create" ? "Скрыть форму" : "Создать запись"}
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={getItems}
                        loading={loading}
                    >
                        Обновить
                    </Button>
                </Space>
            </div>

            {edit?.type === "create" && (
                <div className="filters animate-slideIn" style={{ margin: "16px", padding: "16px", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
                    <h4 style={{ marginTop: 0, marginBottom: "12px" }}>Новая запись</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#666" }}>Тип транзакции *</span>
                            <Input
                                placeholder="Например: 774"
                                value={filters.transactionType}
                                onChange={(e) => handleFilterChange("transactionType", e.target.value)}
                                style={{ width: "150px" }}
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#666" }}>Описание *</span>
                            <Input
                                placeholder="Например: Dushanbe Kassa 1"
                                value={filters.description}
                                onChange={(e) => handleFilterChange("description", e.target.value)}
                                style={{ width: "250px" }}
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#666" }}>ATM ID *</span>
                            <Input
                                placeholder="Например: J526026"
                                value={filters.atmId}
                                onChange={(e) => handleFilterChange("atmId", e.target.value)}
                                style={{ width: "150px" }}
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#666" }}>Валюта (номерной код)</span>
                            <Input
                                placeholder="Например: 972"
                                value={filters.currency}
                                onChange={(e) => handleFilterChange("currency", e.target.value)}
                                style={{ width: "150px" }}
                            />
                        </div>
                        <Space style={{ alignSelf: "flex-end" }}>
                            <Button type="primary" onClick={createItem} loading={loading}>
                                Сохранить
                            </Button>
                            <Button onClick={() => setEdit(null)}>
                                Отмена
                            </Button>
                        </Space>
                    </div>
                </div>
            )}

            <Table
                tableId="terminal-names-list"
                columns={columns}
                dataSource={tableData}
                rowKey={(record) => record.id}
                loading={{
                    spinning: loading,
                    indicator: <Spinner size="small" />,
                }}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Всего ${total} записей` }}
                bordered
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "Нет данных" }}
            />
        </div>
    );
}