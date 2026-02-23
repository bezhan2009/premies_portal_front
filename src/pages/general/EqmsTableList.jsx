import React, { useEffect, useMemo, useState } from "react";
import Input from "../../components/elements/Input.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { FcCancel, FcHighPriority, FcOk, FcProcess } from "react-icons/fc";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import PayIcon from "../../assets/pay_icon.png";
import PayedIcon from "../../assets/payed_icon.png";
import { toast } from "react-toastify";
import useSidebar from "../../hooks/useSideBar.js";
import { tableDataDef } from "../../const/defConst.js";
import Sidebar from "../../components/general/DynamicMenu.jsx";
import {toLowercaseSeparator} from "antd/es/watermark/utils.js";

export default function EQMSList() {
    const { data, setData } = useFormStore();
    const [tableData, setTableData] = useState(tableDataDef);
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({});
    const [alert, setAlert] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [payingIds, setPayingIds] = useState(new Set());
    const backendMain = import.meta.env.VITE_BACKEND_URL;
    const backendABS = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
    const token = localStorage.getItem("access_token");
    const [showPayConfirmation, setShowPayConfirmation] = useState(false);
    const [paymentsToProcess, setPaymentsToProcess] = useState([]);
    const [showStatement, setShowStatement] = useState(false);
    const [statementData, setStatementData] = useState([]);
    const [statementLoading, setStatementLoading] = useState(false);
    const [startDate, setStartDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [endDate, setEndDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const accountNumber = "26202972381810638175";
    const [showSinglePayConfirmation, setShowSinglePayConfirmation] = useState(false);
    const [singlePaymentData, setSinglePaymentData] = useState(null);

    const showAlert = (message, type = "success") => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 3500);
    };

    const isWorkingHours = () => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        return currentHour < 17 || (currentHour === 17 && currentMinute <= 10);
    };

    const isPaidCustoms = (row) => {
        if (row.isPayed !== undefined && row.isPayed !== null) {
            return Boolean(row.isPayed);
        }

        if (!row.payedAt) return false;
        if (row.payedAt.includes("0001-01-01")) return false;
        try {
            const date = new Date(row.payedAt);
            return date.getFullYear() >= 2000;
        } catch {
            return false;
        }
    };

    const getPaymentStatus = (row) => {
        if (row.status === "Paid" || row.status === "Success") return "paid";
        if (isPaidCustoms(row)) return "already_paid";
        return "pending";
    };

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return "";
        try {
            const d = new Date(dateString);
            if (isNaN(d)) return dateString;
            if (dateString.includes("0001-01-01")) {
                return "Не оплачено";
            }
            const pad = (n) => String(n).padStart(2, "0");
            const yyyy = d.getFullYear();
            const MM = pad(d.getMonth() + 1);
            const dd = pad(d.getDate());
            const hh = pad(d.getHours());
            const mi = pad(d.getMinutes());
            const ss = pad(d.getSeconds());
            return `${yyyy}-${MM}-${dd} ${hh}:${mi}:${ss}`;
        } catch {
            return dateString;
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const start =
                data?.eqms_start_date || new Date().toISOString().split("T")[0];
            const end = data?.eqms_end_date || new Date().toISOString().split("T")[0];
            const url = `${backendMain}/eqms?start_date=${start}&end_date=${end}`;
            const resp = await fetch(url, {
                method: "GET",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
            const json = await resp.json();
            setTableData(json || []);
            showAlert(`Загружено ${json.length} записей`, "success");
        } catch (err) {
            console.error("Ошибка загрузки данных:", err);
            showAlert("Ошибка загрузки данных. Проверьте сервер.", "error");
            setTableData([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        if (!Array.isArray(tableData)) return [];
        return tableData.filter((row) =>
            Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const rowValue = row[key];

                if (key === "payedAt" && value === "paid") {
                    return isPaidCustoms(row);
                }
                if (key === "payedAt" && value === "not_paid") {
                    return !isPaidCustoms(row);
                }

                if (rowValue == null) return false;

                if (typeof rowValue === "number")
                    return String(rowValue).includes(value);
                if (typeof rowValue === "boolean")
                    return String(rowValue).toLowerCase() === value.toLowerCase();
                if (typeof rowValue === "string")
                    return rowValue.toLowerCase().includes(String(value).toLowerCase());
                return false;
            })
        );
    }, [tableData, filters]);

    const sortedData = useMemo(() => {
        const arr = [...filteredData];
        arr.sort((a, b) => b.id - a.id);
        return arr;
    }, [filteredData]);

    const paySingle = async (transaction) => {
        const resp = await fetch(`${backendMain}/eqms/pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(transaction),
        });
        const result = await resp.json();
        if (!resp.ok) {
            throw new Error(result.error || `Ошибка сервера: ${resp.status}`);
        }
        if (result.error) {
            throw new Error(result.error);
        }
        return result;
    };

    const handlePayWithRetry = async (transaction, retryCount = 0) => {
        const maxRetries = 3;
        const retryDelay = 2000;

        try {
            const result = await paySingle(transaction);
            return result;
        } catch (err) {
            if (retryCount >= maxRetries || !isWorkingHours()) {
                throw err;
            }

            showAlert(
                `Платеж с ID ${transaction.id} завершился с ошибкой: "${
                    err.message
                }". Повторная попытка ${retryCount + 1} из ${maxRetries}...`,
                "warning"
            );

            await new Promise((resolve) => setTimeout(resolve, retryDelay));

            return await handlePayWithRetry(transaction, retryCount + 1);
        }
    };

    const handlePay = async (transaction) => {
        const paymentStatus = getPaymentStatus(transaction);

        if (paymentStatus === "already_paid") {
            showAlert("Таможня уже оплачена ранее", "warning");
            return;
        }
        if (paymentStatus === "paid") {
            showAlert("Оплата уже была отправлена (статус Success)", "info");
            return;
        }

        // Показываем модальное окно подтверждения для одной таможни
        setSinglePaymentData(transaction);
        setShowSinglePayConfirmation(true);
    };

    // Функция для выполнения оплаты одной таможни после подтверждения
    const performSinglePayment = async () => {
        if (!singlePaymentData) return;

        setShowSinglePayConfirmation(false);
        const transaction = singlePaymentData;
        setSinglePaymentData(null);

        setPayingIds((prev) => new Set([...prev, transaction.id]));

        try {
            if (isWorkingHours()) {
                await handlePayWithRetry(transaction, 0);
                showAlert(
                    "Оплата успешно отправлена! Ожидаем подтверждения...",
                    "success"
                );
            } else {
                await paySingle(transaction);
                showAlert(
                    "Оплата успешно отправлена! Ожидаем подтверждения...",
                    "success"
                );
            }

            setTimeout(() => fetchData(), 1000);
        } catch (err) {
            console.error("Ошибка оплаты:", err);

            if (isWorkingHours()) {
                showAlert(
                    `Платеж с ID ${transaction.id} завершился с ошибкой после нескольких попыток: ${err.message}`,
                    "error"
                );
            } else {
                showAlert(err.message || "Не удалось отправить оплату", "error");
            }
        } finally {
            setPayingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(transaction.id);
                return newSet;
            });
        }
    };

    const handleCancelSinglePayment = () => {
        setShowSinglePayConfirmation(false);
        setSinglePaymentData(null);
    };

    const handlePayAll = async () => {
        const toPay = sortedData.filter(
            (row) =>
                selectedRows.includes(row.id) && getPaymentStatus(row) === "pending"
        );

        if (toPay.length === 0) {
            showAlert("Нет выбранных неоплаченных записей для оплаты", "warning");
            return;
        }

        setPaymentsToProcess(toPay);
        setShowPayConfirmation(true);
    };

    const performPayment = async (toPay) => {
        setPayingIds((prev) => new Set([...prev, ...toPay.map((r) => r.id)]));

        let successes = 0;
        let fails = [];
        const batchSize = 150;
        const delayMs = 10000;

        try {
            for (let i = 0; i < toPay.length; i += batchSize) {
                const batch = toPay.slice(i, i + batchSize);
                const promises = batch.map(async (transaction) => {
                    try {
                        if (isWorkingHours()) {
                            await handlePayWithRetry(transaction, 0);
                        } else {
                            await paySingle(transaction);
                        }
                        successes++;
                    } catch (err) {
                        fails.push({ id: transaction.id, error: err.message });
                    }
                });

                await Promise.all(promises);

                if (i + batchSize < toPay.length) {
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }

            const message = `Успешно оплачено: ${successes}. Ошибок: ${fails.length}.`;
            showAlert(message, fails.length === 0 ? "success" : "warning");

            if (fails.length > 0) {
                console.error("Ошибки оплаты:", fails);
            }

            setTimeout(() => fetchData(), 1000);
        } catch (err) {
            showAlert("Критическая ошибка во время массовой оплаты", "error");
        } finally {
            setPayingIds((prev) => {
                const newSet = new Set(prev);
                toPay.forEach((r) => newSet.delete(r.id));
                return newSet;
            });
        }
    };

    const handleConfirmPayment = () => {
        setShowPayConfirmation(false);
        performPayment(paymentsToProcess);
        setPaymentsToProcess([]);
    };

    const handleCancelPayment = () => {
        setShowPayConfirmation(false);
        setPaymentsToProcess([]);
    };

    const handleExport = async () => {
        try {
            const selectedTransactions = sortedData.filter((row) =>
                selectedRows.includes(row.id)
            );

            if (selectedTransactions.length === 0) {
                showAlert("Выберите хотя бы одну запись для выгрузки", "error");
                return;
            }

            const resp = await fetch(`${backendMain}/automation/eqms`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify(selectedTransactions),
            });

            if (!resp.ok) {
                const errorText = await resp.text();
                throw new Error(`Ошибка выгрузки: ${resp.status} - ${errorText}`);
            }

            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            const allSelected =
                selectedRows.length === sortedData.length && sortedData.length > 0;
            const start = data?.eqms_start_date || "";
            const end = data?.eqms_end_date || "";
            const todayFormatted = new Date()
                .toISOString()
                .slice(0, 10)
                .replace(/-/g, "");

            a.download = allSelected
                ? `EQMS_Report_${start}_to_${end}.xlsx`
                : `EQMS_Report_${todayFormatted}.xlsx`;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            showAlert(
                `Файл успешно выгружен (${selectedTransactions.length} записей)`,
                "success"
            );
            setSelectedRows([]);
            setSelectAll(false);
        } catch (err) {
            console.error("Ошибка выгрузки:", err);
            showAlert(`Ошибка выгрузки: ${err.message}`, "error");
        }
    };

    const handleCheckboxToggle = (id, checked) => {
        if (checked) {
            setSelectedRows((prev) => [...prev, id]);
        } else {
            setSelectedRows((prev) => prev.filter((p) => p !== id));
            setSelectAll(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedRows([]);
        } else {
            const ids = sortedData.map((r) => r.id);
            setSelectedRows(ids);
        }
        setSelectAll(!selectAll);
    };

    const selectAllUnpaid = () => {
        const ids = sortedData
            .filter((row) => getPaymentStatus(row) === "pending" && toLowercaseSeparator(row.status) === "success")
            .map((r) => r.id);
        setSelectedRows(ids);
        setSelectAll(false);
    };

    const selectAllPaid = () => {
        const ids = sortedData
            .filter((row) => getPaymentStatus(row) !== "pending" && toLowercaseSeparator(row.status) === "success")
            .map((r) => r.id);
        setSelectedRows(ids);
        setSelectAll(false);
    };

    // Маппинг колонок на русские названия
    const columnNames = {
        id: "ID",
        status: "Статус платежа",
        amount: "Сумма",
        docId: "Номер документа",
        transactionId: "Номер транзакций",
        date: "Дата",
        type_id: "Тип",
        emailToBeNotified: "Почта",
        meanOfPayment: "Тип платежа",
        bankCode: "БИК",
        payerINN: "ИНН плательщика",
        payerName: "Имя плательщика",
        payerBankName: "Банк плательщика",
        payerBankCode: "БИК банка плательщика",
        payerAcc: "Номер счета",
        recINN: "ИНН получателя",
        recName: "Имя получателя",
        recBankName: "Банк получателя",
        recBankCode: "Код банка получателя",
        recAcc: "recAcc",
    };

    const tableHeaders = useMemo(() => {
        if (sortedData.length === 0) return [];
        const firstRow = sortedData[0];
        const excludedHeaders = ["payedAt", "isPayed"];
        const allKeys = Object.keys(firstRow).filter(
            (header) => !excludedHeaders.includes(header)
        );

        // Порядок: id, status, затем остальные
        const orderedKeys = [];
        if (allKeys.includes("id")) orderedKeys.push("id");
        if (allKeys.includes("status")) orderedKeys.push("status");
        allKeys.forEach((key) => {
            if (key !== "id" && key !== "status") {
                orderedKeys.push(key);
            }
        });

        return orderedKeys;
    }, [sortedData]);

    const totalSelected = selectedRows.length;
    const totalPaid = useMemo(
        () =>
            sortedData.filter((row) => getPaymentStatus(row) !== "pending").length,
        [sortedData]
    );
    const totalAmountSelected = useMemo(() => {
        return sortedData
            .filter((row) => selectedRows.includes(row.id))
            .reduce((sum, row) => sum + (row.amount || 0), 0);
    }, [sortedData, selectedRows]);

    useEffect(() => {
        if (!data?.eqms_start_date || !data?.eqms_end_date) {
            const today = new Date().toISOString().split("T")[0];
            setData("eqms_start_date", today);
            setData("eqms_end_date", today);
        }
    }, []);

    useEffect(() => {
        if (data?.eqms_start_date && data?.eqms_end_date) {
            fetchData();
        }
    }, [data?.eqms_start_date, data?.eqms_end_date]);

    useEffect(() => {
        if (selectAll) {
            const ids = sortedData.map((r) => r.id);
            setSelectedRows(ids);
        } else if (selectedRows.length === sortedData.length) {
            setSelectedRows([]);
        }
    }, [selectAll, sortedData]);

    const formatDateForQuery = (dateStr) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split("-");
        return `${d}.${m}.${y}`;
    };

    const handleFetchStatement = async () => {
        setStatementLoading(true);
        const sd = formatDateForQuery(startDate);
        const ed = formatDateForQuery(endDate);
        const url = `${backendABS}/account/operations?startDate=${sd}&endDate=${ed}&accountNumber=${accountNumber}`;
        try {
            const resp = await fetch(url, {
                method: "GET",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
            const json = await resp.json();
            setStatementData(json || []);
            setShowStatement(true);
            showAlert(`Загружено ${json.length} дней с транзакциями`, "success");
        } catch (err) {
            console.error("Ошибка загрузки выписки:", err);
            showAlert("Ошибка загрузки выписки. Проверьте сервер.", "error");
            setStatementData([]);
        } finally {
            setStatementLoading(false);
        }
    };

    const statementHeaders = useMemo(() => {
        if (statementData.length === 0) return [];
        const firstTx = statementData[0]?.Transactions?.[0];
        if (!firstTx) return [];
        return ["DOPER", ...Object.keys(firstTx)];
    }, [statementData]);

    const flatStatementData = useMemo(() => {
        return statementData.flatMap((day) =>
            day.Transactions.map((tx) => ({ ...tx, DOPER: day.DOPER }))
        );
    }, [statementData]);

    return (
        <>
            <div
                className={`dashboard-container ${
                    isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
                }`}
                style={{ paddingBottom: 0, paddingTop: 0 }}
            >
                <Sidebar
                    activeLink="eqms_list"
                    isOpen={isSidebarOpen}
                    toggle={toggleSidebar}
                />
                <div className="page-content-wrapper content-page">
                    <div
                        className="applications-list"
                        style={{ flexDirection: "column", gap: "20px", height: "auto" }}
                    >
                        <main>
                            <div className="my-applications-header">
                                {!showStatement && (
                                    <button
                                        className={!showFilters ? "filter-toggle" : "Unloading"}
                                        onClick={() => setShowFilters(!showFilters)}
                                    >
                                        Фильтры
                                    </button>
                                )}
                                <pre> </pre>
                                {!showStatement && (
                                    <>
                                        <button
                                            className="Unloading"
                                            onClick={handleExport}
                                            disabled={selectedRows.length === 0}
                                        >
                                            Выгрузка EQMS
                                        </button>
                                        <button
                                            className="save"
                                            onClick={handlePayAll}
                                            disabled={selectedRows.length === 0 || payingIds.size > 0}
                                        >
                                            Оплатить всё
                                        </button>
                                        <button
                                            className={selectAll ? "selectAll-toggle" : ""}
                                            onClick={toggleSelectAll}
                                        >
                                            {selectAll ? "Снять выделение" : "Выбрать все"}
                                        </button>
                                        <button className="edit" onClick={selectAllUnpaid}>
                                            Выбрать все неоплаченные
                                        </button>
                                        <button className="save" onClick={selectAllPaid}>
                                            Выбрать все оплаченные
                                        </button>
                                    </>
                                )}
                                <button
                                    className="Unloading"
                                    onClick={handleFetchStatement}
                                    disabled={statementLoading}
                                >
                                    Просмотреть выписку с АБС
                                </button>
                                {!showStatement && (
                                    <div className="selection-stats-card">
                                        <div className="stat">
                                            <span className="label">Выбрано</span>
                                            <strong className="value">{totalSelected}</strong>
                                        </div>
                                        <div className="divider" />
                                        <div className="stat">
                                            <span className="label">Оплачено всего</span>
                                            <strong className="value paid">{totalPaid}</strong>
                                        </div>
                                        <div className="divider" />
                                        <div className="stat highlight">
                                            <span className="label">Сумма выбранных</span>
                                            <strong className="value amount">
                                                {totalAmountSelected.toLocaleString("ru-RU")} С
                                            </strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {showFilters && !showStatement && (
                                <div className="filters animate-slideIn">
                                    <input
                                        placeholder="ID"
                                        onChange={(e) =>
                                            setFilters((p) => ({
                                                ...p,
                                                id: e.target.value,
                                            }))
                                        }
                                    />
                                    <input
                                        placeholder="Doc ID"
                                        onChange={(e) =>
                                            setFilters((p) => ({
                                                ...p,
                                                docId: e.target.value,
                                            }))
                                        }
                                    />
                                    <input
                                        placeholder="Transaction ID"
                                        onChange={(e) =>
                                            setFilters((p) => ({
                                                ...p,
                                                transactionId: e.target.value,
                                            }))
                                        }
                                    />
                                    <input
                                        placeholder="Payer Name"
                                        onChange={(e) =>
                                            setFilters((p) => ({
                                                ...p,
                                                payerName: e.target.value,
                                            }))
                                        }
                                    />
                                    <input
                                        placeholder="Receiver Name"
                                        onChange={(e) =>
                                            setFilters((p) => ({
                                                ...p,
                                                recName: e.target.value,
                                            }))
                                        }
                                    />
                                    <select
                                        onChange={(e) =>
                                            setFilters((p) => ({ ...p, status: e.target.value }))
                                        }
                                    >
                                        <option value="">Статус</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Success">Success</option>
                                        <option value="Failed">Failed</option>
                                    </select>
                                    <select
                                        onChange={(e) =>
                                            setFilters((p) => ({ ...p, payedAt: e.target.value }))
                                        }
                                    >
                                        <option value="">Статус оплаты</option>
                                        <option value="paid">Оплачено</option>
                                        <option value="not_paid">Не оплачено</option>
                                    </select>
                                    <input
                                        placeholder="Amount"
                                        type="number"
                                        onChange={(e) =>
                                            setFilters((p) => ({ ...p, amount: e.target.value }))
                                        }
                                    />
                                </div>
                            )}
                            <div className="my-applications-sub-header">
                                {!showStatement && (
                                    <>
                                        <div>
                                            С{" "}
                                            <Input
                                                type="date"
                                                onChange={(e) => setData("eqms_start_date", e)}
                                                value={data?.eqms_start_date || ""}
                                                style={{ width: "150px" }}
                                                id="eqms_start_date"
                                            />
                                        </div>
                                        <div>
                                            По{" "}
                                            <Input
                                                type="date"
                                                onChange={(e) => setData("eqms_end_date", e)}
                                                value={data?.eqms_end_date || ""}
                                                style={{ width: "150px" }}
                                                id="eqms_end_date"
                                            />
                                        </div>
                                    </>
                                )}
                                {showStatement && (
                                    <>
                                        <div>
                                            Начальная дата для выписки:{" "}
                                            <Input
                                                type="date"
                                                onChange={(e) => setStartDate(e)}
                                                value={startDate}
                                                style={{ width: "150px" }}
                                            />
                                        </div>
                                        <div>
                                            Конечная дата для выписки:{" "}
                                            <Input
                                                type="date"
                                                onChange={(e) => setEndDate(e)}
                                                value={endDate}
                                                style={{ width: "150px" }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div
                                className="my-applications-content"
                                style={{ position: "relative" }}
                            >
                                {showStatement ? (
                                    <>
                                        <button
                                            style={{
                                                backgroundColor: "#2566e8",
                                                color: "#fff",
                                                border: "none",
                                                padding: "8px 16px",
                                                borderRadius: "10px",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                            }}
                                            onClick={() => setShowStatement(false)}
                                        >
                                            Назад к списку EQMS
                                        </button>
                                        {statementLoading ? (
                                            <div style={{ textAlign: "center", padding: "2rem" }}>
                                                Загрузка выписки...
                                            </div>
                                        ) : flatStatementData.length === 0 ? (
                                            <div
                                                style={{
                                                    textAlign: "center",
                                                    padding: "2rem",
                                                    color: "gray",
                                                }}
                                            >
                                                Нет данных для отображения в выписке
                                            </div>
                                        ) : (
                                            <table>
                                                <thead>
                                                <tr>
                                                    {statementHeaders.map((header) => (
                                                        <th key={header}>{header}</th>
                                                    ))}
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {flatStatementData.map((tx, index) => (
                                                    <tr key={index}>
                                                        {statementHeaders.map((header) => (
                                                            <td key={header}>{tx[header]}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </>
                                ) : loading ? (
                                    <div style={{ textAlign: "center", padding: "2rem" }}>
                                        Загрузка...
                                    </div>
                                ) : sortedData.length === 0 ? (
                                    <div
                                        style={{
                                            textAlign: "center",
                                            padding: "2rem",
                                            color: "gray",
                                        }}
                                    >
                                        Нет данных для отображения
                                    </div>
                                ) : (
                                    <table>
                                        <thead>
                                        <tr>
                                            <th>
                                                <input
                                                    type="checkbox"
                                                    className="custom-checkbox"
                                                    checked={selectAll}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                            {tableHeaders.map((header) => (
                                                <th key={header}>
                                                    {columnNames[header] || header}
                                                </th>
                                            ))}
                                            <th>Оплачено в</th>
                                            <th className="active-table">Действия</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {sortedData.map((row) => {
                                            const paymentStatus = getPaymentStatus(row);
                                            const isPaid =
                                                paymentStatus === "already_paid" ||
                                                paymentStatus === "paid";
                                            const isPaying = payingIds.has(row.id);

                                            return (
                                                <tr
                                                    key={row.id}
                                                    style={{
                                                        backgroundColor: isPaid
                                                            ? "#e6ffe6"
                                                            : "transparent",
                                                    }}
                                                >
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            className="custom-checkbox"
                                                            checked={selectedRows.includes(row.id)}
                                                            onChange={(e) =>
                                                                handleCheckboxToggle(row.id, e.target.checked)
                                                            }
                                                        />
                                                    </td>
                                                    {tableHeaders.map((header) => {
                                                        let value = row[header];
                                                        if (
                                                            header.includes("date") ||
                                                            header.includes("Date") ||
                                                            header === "date" ||
                                                            header === "docDate" ||
                                                            header === "dateVal" ||
                                                            header === "dataOpr"
                                                        ) {
                                                            value = formatDateForDisplay(value);
                                                        } else if (header === "resiFlg") {
                                                            value = value ? "Да" : "Нет";
                                                        } else if (header === "status") {
                                                            return (
                                                                <td key={header}>
                                                                    {row.status === "pending" ? (
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                gap: "10px",
                                                                            }}
                                                                        >
                                                                            <FcProcess style={{ fontSize: 22 }} />
                                                                            <span style={{ color: "orange" }}>
                                          Pending
                                        </span>
                                                                        </div>
                                                                    ) : row.status === "success" ? (
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                gap: "10px",
                                                                            }}
                                                                        >
                                                                            <FcOk style={{ fontSize: 22 }} />
                                                                            <span style={{ color: "green" }}>
                                          Success
                                        </span>
                                                                        </div>
                                                                    ) : row.status === "failed" ? (
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                gap: "10px",
                                                                            }}
                                                                        >
                                                                            <FcCancel style={{ fontSize: 22 }} />
                                                                            <span style={{ color: "red" }}>
                                          Failed
                                        </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                gap: "10px",
                                                                            }}
                                                                        >
                                                                            <FcHighPriority
                                                                                style={{ fontSize: 22 }}
                                                                            />
                                                                            <span>{row.status}</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        }
                                                        return <td key={header}>{value}</td>;
                                                    })}
                                                    <td>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "10px",
                                                                color: isPaid ? "green" : "gray",
                                                                fontWeight: isPaid ? "500" : "normal",
                                                            }}
                                                        >
                                                            {isPaid && <FcOk style={{ fontSize: 22 }} />}
                                                            <br />
                                                            <small style={{ opacity: 0.7 }}>
                                                                {formatDateForDisplay(row.payedAt)}
                                                            </small>
                                                        </div>
                                                    </td>
                                                    <td className="active-table">
                                                        <button
                                                            className={`pay-button ${isPaid ? "paid" : ""}`}
                                                            onClick={() =>
                                                                row.status === "success"
                                                                    ? handlePay(row)
                                                                    : toast.error("Таможня не оплачена")
                                                            }
                                                            disabled={isPaying || isPaid}
                                                            style={{
                                                                padding: "8px 12px",
                                                                borderRadius: "6px",
                                                                border: "none",
                                                                cursor:
                                                                    row.status !== "success"
                                                                        ? "not-allowed"
                                                                        : isPaid || isPaying
                                                                            ? "not-allowed"
                                                                            : "pointer",
                                                                opacity:
                                                                    row.status === "success"
                                                                        ? 1
                                                                        : isPaying
                                                                            ? 0.7
                                                                            : isPaid
                                                                                ? 0.6
                                                                                : 0.6,
                                                                color: isPaid || isPaying ? "#333" : "#333",
                                                                fontWeight: "500",
                                                                transition: "all 0.2s",
                                                                minWidth: "120px",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                gap: "8px",
                                                            }}
                                                        >
                                                            {isPaying ? (
                                                                <>Оплачивается...</>
                                                            ) : isPaid ? (
                                                                <>
                                                                    <img
                                                                        src={PayedIcon}
                                                                        width="24"
                                                                        height="24"
                                                                        alt="Оплачено"
                                                                    />
                                                                    Оплачено
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <img
                                                                        src={PayIcon}
                                                                        width="24"
                                                                        height="24"
                                                                        alt="Оплатить"
                                                                    />
                                                                    Оплатить
                                                                </>
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </main>
                    </div>
                    {alert && (
                        <AlertMessage
                            message={alert.message}
                            type={alert.type}
                            onClose={() => setAlert(null)}
                        />
                    )}
                    {showPayConfirmation && (
                        <div className="logout-confirmation">
                            <div className="confirmation-box">
                                <div>
                                    <h1>Подтверждение оплаты</h1>
                                    <p>
                                        Вы уверены, что хотите оплатить все выбранные таможни?
                                        <br />
                                        Количество: {paymentsToProcess.length}
                                        <br />
                                        <br />
                                        После подтверждения начнется процесс оплаты. Отменить
                                        операцию будет невозможно.
                                    </p>
                                </div>
                                <div className="confirmation-buttons">
                                    <button
                                        className="confirm-btn"
                                        onClick={handleConfirmPayment}
                                    >
                                        Да, оплатить
                                    </button>
                                    <button className="cancel-btn" onClick={handleCancelPayment}>
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showSinglePayConfirmation && (
                        <div className="logout-confirmation">
                            <div className="confirmation-box">
                                <div>
                                    <h1>Подтверждение оплаты</h1>
                                    <p>
                                        Вы точно уверены, что хотите оплатить эту таможню?
                                        <br />
                                        <br />
                                        После подтверждения начнется процесс оплаты. Отменить
                                        операцию будет невозможно.
                                    </p>
                                </div>
                                <div className="confirmation-buttons">
                                    <button
                                        className="confirm-btn"
                                        onClick={performSinglePayment}
                                    >
                                        Да, оплатить
                                    </button>
                                    <button
                                        className="cancel-btn"
                                        onClick={handleCancelSinglePayment}
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
