import Input from "../../components/elements/Input.jsx";
import "../../styles/components/BlockInfo.scss";
import "../../styles/components/TransactionTypes.scss";
import { useEffect, useState } from "react";
import Select from "../../components/elements/Select.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import Sidebar from "./DynamicMenu.jsx";
import useSidebar from "../../hooks/useSideBar.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    deleteTerminalNames,
    getTerminalNames,
    postTerminalNames,
    putTerminalNames,
    putTransactions,
    putTransactionsNumber,
} from "../../api/transactions/api.js";
import {getCurrencyCode, getCurrenciesCode} from "../../api/utils/getCurrencyCode.js";

const ValidData = {
    transactionType: { required: true },
    description: { required: true },
    atmId: { required: true },
};

import { tableDataDef, transactionTypes } from "../../const/defConst";

// Создаем массив опций для Select компонента (только для создания)
const currencyOptions = Object.entries(getCurrenciesCode()).map(([numericCode, alphabeticCode]) => ({
    value: numericCode,
    label: `${alphabeticCode} (${numericCode})`
}));

// Добавляем опцию для null/пустого значения
currencyOptions.unshift({
    value: '',
    label: 'Не указана'
});

export default function TerminalNames() {
    const { data, setData, validate } = useFormStore();
    const [loading, setLoading] = useState(false);
    const [tableData, setTableData] = useState(tableDataDef);
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    const [edit, setEdit] = useState(null);
    const [filters, setFilters] = useState({
        transactionType: "",
        description: "",
        atmId: "",
        id: "",
        currency: "", // Добавляем фильтр по валюте
    });

    const upDateItem = async () => {
        const isValid = validate(ValidData);
        if (!isValid) {
            toast.error("Пожалуйста, заполните все обязательные поля корректно!");
            return;
        }

        setLoading(true);
        try {
            // Подготавливаем данные для отправки
            const requestData = {
                ...data,
                // Отправляем числовой код валюты (если есть)
                currency: data.currency || null
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
        setLoading(true);
        try {
            // Подготавливаем данные для создания
            const requestData = {
                ...filters,
                // Отправляем числовой код валюты (если есть)
                currency: filters.currency || null
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
        try {
            const response = await getTerminalNames();

            setTableData(
                response.data.map((item) => ({
                    transactionType: String(item.transactionType),
                    description: item.description,
                    atmId: String(item.atmId),
                    id: String(item.id),
                    currency: item.currency ? String(item.currency) : null, // Добавляем валюту
                }))
            );
        } catch (e) {
            console.error("Ошибка при загрузке данных:", e);
        }
    };

    const applyFilters = (data, currentFilters) => {
        if (!Array.isArray(data)) return [];

        return data.filter((row) => {
            // Для валюты делаем отдельную проверку, так как она может быть null
            const currencyFilter = currentFilters.currency;
            let currencyMatch = true;

            if (currencyFilter) {
                if (row.currency) {
                    currencyMatch = row.currency.includes(currencyFilter) ||
                        getCurrencyCode(row.currency).includes(currencyFilter);
                } else {
                    currencyMatch = false; // Если фильтр задан, а валюта null - не показываем
                }
            }

            return (
                row?.transactionType?.includes(currentFilters?.transactionType || "") &&
                row?.description?.includes(currentFilters?.description || "") &&
                row?.atmId?.includes(currentFilters?.atmId || "") &&
                row?.id?.includes(currentFilters?.id || "") &&
                currencyMatch
            );
        });
    };

    const filteredData = applyFilters(tableData, filters);

    useEffect(() => {
        getItems();
    }, []);

    // Функция для форматированного отображения валюты
    const formatCurrencyDisplay = (currencyCode) => {
        if (!currencyCode) return "Не указана";

        const alphabeticCode = getCurrencyCode(currencyCode);
        return `${alphabeticCode} (${currencyCode})`;
    };

    return (
        <>
            <div
                className={`dashboard-container ${
                    isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
                }`}
                style={{ paddingBottom: 0, paddingTop: 0 }}
            >
                <Sidebar
                    activeLink="terminal_names"
                    isOpen={isSidebarOpen}
                    toggle={toggleSidebar}
                />

                <div className="my-applications content-page">
                    <main >
                        <div className="filters animate-slideIn">
                            <input
                                style={{
                                    backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                                }}
                                placeholder="Тип транзакции"
                                value={filters.transactionType}
                                onChange={(e) =>
                                    handleFilterChange("transactionType", e.target.value)
                                }
                            />
                            <input
                                style={{
                                    backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                                }}
                                placeholder="Описание"
                                value={filters.description}
                                onChange={(e) =>
                                    handleFilterChange("description", e.target.value)
                                }
                            />
                            <input
                                style={{
                                    backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                                }}
                                placeholder="ATM ID"
                                value={filters.atmId}
                                onChange={(e) => handleFilterChange("atmId", e.target.value)}
                            />

                            {/* Фильтр по валюте */}
                            <input
                                style={{
                                    backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                                }}
                                placeholder="Валюта (код или номер)"
                                value={filters.currency}
                                onChange={(e) => handleFilterChange("currency", e.target.value)}
                            />

                            {edit?.type !== "create" && (
                                <input
                                    placeholder="id"
                                    value={filters.id}
                                    onChange={(e) => handleFilterChange("id", e.target.value)}
                                />
                            )}

                            <button
                                className="button-edit-roles"
                                onClick={() => {
                                    if (edit?.type === "create") {
                                        createItem();
                                    } else {
                                        setEdit({
                                            type: "create",
                                            id: null,
                                        });
                                    }
                                }}
                            >
                                {edit?.type === "create" ? "Сохранить" : "Создать"}
                            </button>
                        </div>

                        <div className="my-applications-content">
                            <table>
                                <thead>
                                <tr>
                                    <th>Тип транзакции</th>
                                    <th>Описание</th>
                                    <th>ATM ID</th>
                                    <th>Валюта</th>
                                    <th>id</th>
                                    <th>Действия</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredData.map((row, rowIndex) => (
                                    <tr
                                        key={rowIndex}
                                        style={{
                                            backgroundColor:
                                                rowIndex % 2 === 0 ? "#fff" : "#f9f9f9",
                                        }}
                                    >
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                            {edit?.type === "update" && edit?.id === row.id ? (
                                                <Input
                                                    transactionType="text"
                                                    defValue={
                                                        data?.transactionType || row.transactionType
                                                    }
                                                    onChange={(e) => setData("transactionType", e)}
                                                    value={edit?.transactionType}
                                                    onEnter={upDateItem}
                                                />
                                            ) : (
                                                row.transactionType
                                            )}
                                        </td>
                                        <td
                                            style={{ border: "1px solid #ddd", padding: "8px" }}
                                            onClick={() => {
                                                setEdit({
                                                    type: "update",
                                                    id: row.id,
                                                });

                                                setData("transactionType", row.transactionType);
                                                setData("description", row.description);
                                                setData("atmId", row.atmId);
                                                setData("id", row.id);
                                                setData("currency", row.currency || "");
                                            }}
                                        >
                                            {edit?.type === "update" && edit?.id === row.id ? (
                                                <Input
                                                    transactionType="text"
                                                    defValue={data?.description || row.description}
                                                    onChange={(e) => setData("description", e)}
                                                    value={edit?.description}
                                                    onEnter={upDateItem}
                                                />
                                            ) : (
                                                row.description
                                            )}
                                        </td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                            {edit?.type === "update" && edit?.id === row.id ? (
                                                <Input
                                                    transactionType="text"
                                                    defValue={data?.atmId || row.atmId}
                                                    onChange={(e) => setData("atmId", e)}
                                                    value={edit?.atmId}
                                                    onEnter={upDateItem}
                                                />
                                            ) : (
                                                row.atmId
                                            )}
                                        </td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                            {edit?.type === "update" && edit?.id === row.id ? (
                                                // Заменяем Select на Input для ручного ввода
                                                <Input
                                                    transactionType="text"
                                                    defValue={data?.currency || row.currency || ""}
                                                    onChange={(e) => setData("currency", e)}
                                                    value={edit?.currency}
                                                    onEnter={upDateItem}
                                                    placeholder="Введите код валюты (например: 643 или RUB)"
                                                />
                                            ) : (
                                                formatCurrencyDisplay(row.currency)
                                            )}
                                        </td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                            {row.id}
                                        </td>
                                        {edit?.type === "update" && edit?.id === row.id ? (
                                            <td>
                                                <button
                                                    className="button-edit-roles small-size"
                                                    onClick={() => {
                                                        upDateItem();
                                                    }}
                                                >
                                                    Сохранить
                                                </button>
                                                <button
                                                    className="button-edit-roles small-size"
                                                    onClick={() => setEdit(null)}
                                                    style={{ marginLeft: "5px", backgroundColor: "#6c757d" }}
                                                >
                                                    Отмена
                                                </button>
                                            </td>
                                        ) : (
                                            <td>
                                                <button
                                                    className="button-edit-roles small-size"
                                                    onClick={() => {
                                                        setEdit({
                                                            type: "update",
                                                            id: row.id,
                                                        });
                                                        setData("transactionType", row.transactionType);
                                                        setData("description", row.description);
                                                        setData("atmId", row.atmId);
                                                        setData("id", row.id);
                                                        setData("currency", row.currency || "");
                                                    }}
                                                >
                                                    Редактировать
                                                </button>
                                                <button
                                                    className="button-edit-roles small-size"
                                                    onClick={() => deleteItem(row.id)}
                                                    style={{ marginLeft: "5px", backgroundColor: "#dc3545" }}
                                                >
                                                    Удалить
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
