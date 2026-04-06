import Input from "../../components/elements/Input.jsx";
import "../../styles/components/BlockInfo.scss";
import "../../styles/components/TransactionTypes.scss";
import { useEffect, useMemo, useState } from "react";
import Select from "../../components/elements/Select.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    getTransactions,
    putTransactions,
    putTransactionsNumber,
} from "../../api/transactions/api.js";
import { tableDataDef, transactionTypes } from "../../const/defConst";
import { Table } from "../../components/table/FlexibleAntTable.jsx";

const ValidData = {
    type: { required: true },
    name: { required: true },
    number: { required: true },
};

export default function TransactionTypes() {
    const { data, errors, setData, validate } = useFormStore();
    const [loading, setLoading] = useState(false);
    const [tableData, setTableData] = useState(tableDataDef);
    const [edit, setEdit] = useState(null);
    const [filters, setFilters] = useState({
        type: "",
        name: "",
        number: "",
        id: "",
    });

    const upDateUserWorkers = async () => {
        const isValid = validate(ValidData);
        if (!isValid) {
            toast.error("Пожалуйста, заполните все обязательные поля корректно!");
            return;
        }

        setLoading(true);
        try {
            const response = await putTransactions(data);
            if (response.status === 200 || response.status === 201) {
                toast.success("Название операции успешно обновлено!");
                setEdit(null);
                getItems();
            }
        } catch (e) {
            const errorMessage = e?.response?.data?.message || e?.message || "Ошибка при обновлении";
            toast.error(`Ошибка: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const upDateUserNumber = async () => {
        const isValid = validate(ValidData);
        if (!isValid) {
            toast.error("Пожалуйста, заполните все обязательные поля корректно!");
            return;
        }

        setLoading(true);
        try {
            const response = await putTransactionsNumber(data);
            if (response.status === 200 || response.status === 201) {
                toast.success("Вид операции успешно обновлён!");
                setEdit(null);
                getItems();
            }
        } catch (e) {
            const errorMessage = e?.response?.data?.message || e?.message || "Ошибка при обновлении";
            toast.error(`Ошибка: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const getItems = async () => {
        try {
            const response = await getTransactions();
            setTableData(
                response.data.map((item) => ({
                    type: String(item.type),
                    name: item.name,
                    number: String(item.number),
                    id: String(item.id),
                })),
            );
        } catch (e) {
            console.error("Ошибка при загрузке:", e);
        }
    };

    const filteredData = useMemo(() => {
        if (!Array.isArray(tableData)) return [];
        return tableData.filter((row) =>
            row?.type?.includes(filters?.type || "") &&
            row?.name?.includes(filters?.name || "") &&
            row?.number?.includes(filters?.number || "") &&
            row?.id?.includes(filters?.id || "")
        );
    }, [tableData, filters]);

    useEffect(() => {
        getItems();
    }, []);

    const startEditName = (row) => {
        setEdit({ type: "name", id: row.id });
        setData("type", row.type);
        setData("number", row.number);
        setData("name", row.name);
        setData("id", row.id);
    };

    const startEditNumber = (row) => {
        setEdit({ type: "number", id: row.id });
        setData("type", row.type);
        setData("name", row.name);
        setData("number", row.number);
        setData("id", row.id);
    };

    return (
        <div className="my-applications content-page">
            <main>
                <div className="filters animate-slideIn">
                    <input placeholder="Тип транзакции" value={filters.type} onChange={(e) => handleFilterChange("type", e.target.value)} />
                    <input placeholder="Название операции" value={filters.name} onChange={(e) => handleFilterChange("name", e.target.value)} />
                    <input placeholder="Вид операции" value={filters.number} onChange={(e) => handleFilterChange("number", e.target.value)} />
                    <input placeholder="id" value={filters.id} onChange={(e) => handleFilterChange("id", e.target.value)} />
                </div>
                <div className="my-applications-content">
                    <Table dataSource={filteredData} rowKey="id" bordered loading={loading} pagination={{ pageSize: 15 }}>
                        <Table.Column title="Тип транзакции" dataIndex="type" key="type" sortable />
                        <Table.Column
                            title="Название операции"
                            key="name"
                            sortable
                            render={(val, row) => (
                                edit?.type === "name" && edit?.id === row.id ? (
                                    <Input type="text" onChange={(e) => setData("name", e)} value={data?.name || ""} onEnter={upDateUserWorkers} />
                                ) : (
                                    <div style={{ cursor: "pointer" }} onClick={() => startEditName(row)}>{row.name}</div>
                                )
                            )}
                        />
                        <Table.Column
                            title="Вид операции"
                            key="number"
                            sortable
                            render={(val, row) => (
                                edit?.type === "number" && edit?.id === row.id ? (
                                    <Select onChange={(e) => setData("number", e)} value={data?.number || row.number} options={transactionTypes} />
                                ) : (
                                    <div style={{ cursor: "pointer" }} onClick={() => startEditNumber(row)}>
                                        {transactionTypes.find((e) => e.value == row?.number)?.label || row.number}
                                    </div>
                                )
                            )}
                        />
                        <Table.Column title="id" dataIndex="id" key="id" sortable />
                        <Table.Column
                            title="Действия"
                            key="actions"
                            render={(_, row) => (
                                edit?.id === row.id ? (
                                    <div className="active-table">
                                        <button className="button-edit-roles small-size" onClick={() => (edit.type === "number" ? upDateUserNumber() : upDateUserWorkers())}>Сохранить</button>
                                        <button className="button-edit-roles small-size" onClick={() => setEdit(null)} style={{ marginLeft: 5, backgroundColor: "#6c757d" }}>Отмена</button>
                                    </div>
                                ) : null
                            )}
                        />
                    </Table>
                </div>
            </main>
        </div>
    );
}
