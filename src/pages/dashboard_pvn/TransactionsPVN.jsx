import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Input from "../../components/elements/Input.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { FcCancel, FcHighPriority, FcOk, FcProcess } from "react-icons/fc";
import { BsArrowUp, BsArrowDown, BsArrowDownUp } from "react-icons/bs";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import PayIcon from "../../assets/pay_icon.png";
import PayedIcon from "../../assets/payed_icon.png";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import "../../styles/components/StatsEQMS.scss";

export default function PVNTransactionsList() {
    const { data, setData } = useFormStore();
    const [tableData, setTableData] = useState([]);
    const [sortField, setSortField] = useState("id");
    const [sortDirection, setSortDirection] = useState("desc");
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({});
    const [alert, setAlert] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [payingIds, setPayingIds] = useState(new Set());
    const backendABS = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
    const token = localStorage.getItem("access_token");
    const [showPayConfirmation, setShowPayConfirmation] = useState(false);
    const [paymentsToProcess, setPaymentsToProcess] = useState([]);
    const [showSinglePayConfirmation, setShowSinglePayConfirmation] = useState(false);
    const [singlePaymentData, setSinglePaymentData] = useState(null);
    const fetchTimeoutRef = useRef(null);

    const defaultDatesRef = useRef(null);
    if (!defaultDatesRef.current) {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
        defaultDatesRef.current = {
            from: fiveMinutesAgo.toISOString().slice(0, 16),
            to: now.toISOString().slice(0, 16),
        };
    }
    const defaultFromDateTime = defaultDatesRef.current.from;
    const defaultToDateTime = defaultDatesRef.current.to;

    const showAlert = (message, type = "success") => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 3500);
    };

    const isPaidTransaction = (row) => {
        return row.transaction_card_payed?.isPayed === true;
    };

    const formatAmount = (value) => {
        if (typeof value !== "number") return value;
        return (value / 100).toLocaleString("ru-RU", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return "";
        try {
            const d = new Date(dateString);
            if (isNaN(d)) return dateString;
            if (dateString.includes("0001-01-01")) return "Не оплачено";
            const pad = (n) => String(n).padStart(2, "0");
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        } catch {
            return dateString;
        }
    };

    const fetchData = useCallback(async () => {
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = null;
        }

        const from = data?.pvn_from_datetime || defaultFromDateTime;
        const to = data?.pvn_to_datetime || defaultToDateTime;

        if (new Date(from) > new Date(to)) {
            showAlert("Дата начала не может быть позже даты окончания", "error");
            return;
        }

        try {
            setLoading(true);

            const fromRFC = new Date(from).toISOString();
            const toRFC = new Date(to).toISOString();

            const url = `${backendABS}/pvn/transactions?from=${encodeURIComponent(fromRFC)}&to=${encodeURIComponent(toRFC)}`;
            const resp = await fetch(url, {
                method: "GET",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!resp.ok) {
                const errBody = await resp.json().catch(() => ({}));
                throw new Error(errBody.error || `Ошибка HTTP ${resp.status}`);
            }

            const json = await resp.json();
            setTableData(json || []);
            showAlert(`Загружено ${json.length} транзакций`, "success");
        } catch (err) {
            console.error("Ошибка загрузки данных:", err);
            showAlert(err.message || "Ошибка загрузки данных. Проверьте сервер.", "error");
            setTableData([]);
        } finally {
            setLoading(false);
        }
    }, [data?.pvn_from_datetime, data?.pvn_to_datetime, backendABS, token, defaultFromDateTime, defaultToDateTime]);

    useEffect(() => {
        if (data?.pvn_from_datetime && data?.pvn_to_datetime) {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
            fetchTimeoutRef.current = setTimeout(() => {
                fetchData();
            }, 500);
        }
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, [data?.pvn_from_datetime, data?.pvn_to_datetime, fetchData]);

    useEffect(() => {
        if (!data?.pvn_from_datetime) {
            setData("pvn_from_datetime", defaultFromDateTime);
        }
        if (!data?.pvn_to_datetime) {
            setData("pvn_to_datetime", defaultToDateTime);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredData = useMemo(() => {
        if (!Array.isArray(tableData)) return [];
        return tableData.filter((row) =>
            Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const rowValue = row[key];
                if (rowValue == null) return false;
                if (typeof rowValue === "number") return String(rowValue).includes(value);
                if (typeof rowValue === "boolean") return String(rowValue).toLowerCase() === value.toLowerCase();
                if (typeof rowValue === "string")
                    return rowValue.toLowerCase().includes(String(value).toLowerCase());
                return false;
            })
        );
    }, [tableData, filters]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const sortedData = useMemo(() => {
        const arr = [...filteredData];
        arr.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            const cmp =
                typeof aVal === "number" && typeof bVal === "number"
                    ? aVal - bVal
                    : String(aVal).localeCompare(String(bVal), "ru", { numeric: true });
            return sortDirection === "asc" ? cmp : -cmp;
        });
        return arr;
    }, [filteredData, sortField, sortDirection]);

    const paySingle = async (transaction) => {
        const resp = await fetch(`${backendABS}/pvn/transactions/pay`, {
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

    const handlePay = (transaction) => {
        if (isPaidTransaction(transaction)) {
            showAlert("Транзакция уже оплачена", "warning");
            return;
        }
        setSinglePaymentData(transaction);
        setShowSinglePayConfirmation(true);
    };

    const performSinglePayment = async () => {
        if (!singlePaymentData) return;
        setShowSinglePayConfirmation(false);
        const transaction = singlePaymentData;
        setSinglePaymentData(null);
        setPayingIds((prev) => new Set([...prev, transaction.utrnno]));

        try {
            await paySingle(transaction);
            showAlert("Оплата успешно отправлена!", "success");
            setTimeout(() => fetchData(), 1000);
        } catch (err) {
            console.error("Ошибка оплаты:", err);
            showAlert(err.message || "Не удалось отправить оплату", "error");
        } finally {
            setPayingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(transaction.utrnno);
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
            (row) => selectedRows.includes(row.id) && !isPaidTransaction(row)
        );
        if (toPay.length === 0) {
            showAlert("Нет выбранных неоплаченных записей для оплаты", "warning");
            return;
        }
        setPaymentsToProcess(toPay);
        setShowPayConfirmation(true);
    };

    const performPayment = async (toPay) => {
        setPayingIds((prev) => new Set([...prev, ...toPay.map((r) => r.utrnno)]));
        let successes = 0;
        let fails = [];
        const batchSize = 50;
        const delayMs = 2000;

        try {
            for (let i = 0; i < toPay.length; i += batchSize) {
                const batch = toPay.slice(i, i + batchSize);
                const promises = batch.map(async (transaction) => {
                    try {
                        await paySingle(transaction);
                        successes++;
                    } catch (err) {
                        fails.push({ utrnno: transaction.utrnno, error: err.message });
                    }
                });
                await Promise.all(promises);
                if (i + batchSize < toPay.length) {
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
            const message = `Успешно оплачено: ${successes}. Ошибок: ${fails.length}.`;
            showAlert(message, fails.length === 0 ? "success" : "warning");
            if (fails.length > 0) console.error("Ошибки оплаты:", fails);
            setTimeout(() => fetchData(), 1000);
        } catch (err) {
            showAlert("Критическая ошибка во время массовой оплаты", "error");
        } finally {
            setPayingIds((prev) => {
                const newSet = new Set(prev);
                toPay.forEach((r) => newSet.delete(r.utrnno));
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

    const handleExport = () => {
        if (selectedRows.length === 0) {
            showAlert("Нет выбранных записей для экспорта", "warning");
            return;
        }

        const selectedData = sortedData.filter((row) => selectedRows.includes(row.id));
        if (selectedData.length === 0) return;

        const columnLabels = {
            id: "ID",
            cardNumber: "Номер карты",
            amount: "Сумма",
            currency: "Валюта",
            localTransactionDate: "Дата транзакции",
            localTransactionTime: "Время",
            terminalId: "Терминал",
            atmId: "ATM ID",
            utrnno: "Utrnno",
            payed_utrnno: "Оплата - Utrnno",
            payed_isPayed: "Оплата - Статус",
            payed_createdAt: "Оплата - Дата создания",
            payed_updatedAt: "Оплата - Дата обновления",
            payed_deletedAt: "Оплата - Дата удаления",
        };

        const excluded = [
            "cardId", "responseCode", "responseDescription", "reqamt", "conamt", "acctbal",
            "netbal", "conCurrency", "reversal", "transactionType", "transactionTypeName",
            "transactionTypeNumber", "terminalAddress", "mcc", "account", "transaction_card_payed"
        ];

        const baseHeaders = Object.keys(selectedData[0]).filter(
            (key) => !excluded.includes(key) && !key.startsWith("_")
        );
        const allHeaders = [
            ...baseHeaders,
            "payed_utrnno",
            "payed_isPayed",
            "payed_createdAt",
            "payed_updatedAt",
            "payed_deletedAt",
        ];

        const getCurrencyLabel = (value) => {
            if (typeof value !== "number") return value;
            return value === 810 ? "RUB" : value === 840 ? "USD" : value === 978 ? "EUR" : value;
        };

        const rows = selectedData.map((row) => {
            const obj = {};
            for (const header of allHeaders) {
                const label = columnLabels[header] || header;
                if (header.startsWith("payed_")) {
                    const field = header.replace("payed_", "");
                    const val = row.transaction_card_payed?.[field];
                    obj[label] = val !== undefined && val !== null ? val : "";
                } else if (header === "amount") {
                    obj[label] = typeof row[header] === "number" ? row[header] / 100 : row[header];
                } else if (header === "currency") {
                    obj[label] = getCurrencyLabel(row[header]);
                } else if (header.includes("Date") || header === "localTransactionDate") {
                    obj[label] = formatDateForDisplay(row[header]);
                } else {
                    obj[label] = row[header] !== null && row[header] !== undefined ? row[header] : "";
                }
            }
            return obj;
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);

        // Авто-ширина колонок
        const colWidths = Object.keys(rows[0] || {}).map((key) => ({
            wch: Math.max(
                key.length,
                ...rows.map((r) => String(r[key] ?? "").length)
            ) + 2,
        }));
        worksheet["!cols"] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Транзакции");

        XLSX.writeFile(workbook, `pvn_transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);

        showAlert(`Экспортировано ${selectedData.length} записей`, "success");
        setSelectedRows([]);
        setSelectAll(false);
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
            setSelectedRows(sortedData.map((r) => r.id));
        }
        setSelectAll(!selectAll);
    };

    const selectAllUnpaid = () => {
        setSelectedRows(sortedData.filter((row) => !isPaidTransaction(row)).map((r) => r.id));
        setSelectAll(false);
    };

    const selectAllPaid = () => {
        setSelectedRows(sortedData.filter((row) => isPaidTransaction(row)).map((r) => r.id));
        setSelectAll(false);
    };

    const columnNames = {
        id: "ID",
        cardNumber: "Номер карты",
        amount: "Сумма",
        currency: "Валюта",
        localTransactionDate: "Дата транзакции",
        localTransactionTime: "Время",
        terminalId: "Терминал",
        atmId: "ATM ID",
        utrnno: "Utrnno",
        transaction_card_payed: "Статус оплаты",
    };

    const tableHeaders = useMemo(() => {
        if (sortedData.length === 0) return [];
        const excluded = [
            "cardId", "responseCode", "responseDescription", "reqamt", "conamt", "acctbal",
            "netbal", "conCurrency", "reversal", "transactionType", "transactionTypeName",
            "transactionTypeNumber", "terminalAddress", "mcc", "account", "transaction_card_payed"
        ];
        return Object.keys(sortedData[0]).filter(
            (key) => !excluded.includes(key) && !key.startsWith("_")
        );
    }, [sortedData]);

    const totalSelected = selectedRows.length;
    const totalPaid = useMemo(
        () => sortedData.filter((row) => isPaidTransaction(row)).length,
        [sortedData]
    );
    const totalAmountSelected = useMemo(() => {
        return sortedData
            .filter((row) => selectedRows.includes(row.id))
            .reduce((sum, row) => sum + (row.amount || 0), 0) / 100;
    }, [sortedData, selectedRows]);

    return (
        <>
            <div className="page-content-wrapper">
                    <div className="applications-list" style={{ flexDirection: "column", gap: "20px", height: "auto" }}>
                        <main>
                            <div className="my-applications-header">
                                <button
                                    className={!showFilters ? "filter-toggle" : "Unloading"}
                                    onClick={() => setShowFilters(!showFilters)}
                                >
                                    Фильтры
                                </button>
                                <pre> </pre>
                                <button
                                    className="Unloading"
                                    onClick={handleExport}
                                    disabled={selectedRows.length === 0}
                                >
                                    Выгрузка в Excel
                                </button>
                                <button
                                    className="save"
                                    onClick={handlePayAll}
                                    disabled={selectedRows.length === 0 || payingIds.size > 0}
                                >
                                    Оплатить выбранные
                                </button>
                                <button
                                    className={selectAll ? "selectAll-toggle" : ""}
                                    onClick={toggleSelectAll}
                                >
                                    {selectAll ? "Снять выделение" : "Выбрать все"}
                                </button>
                                <button className="edit" onClick={selectAllUnpaid}>
                                    Выбрать неоплаченные
                                </button>
                                <button className="save" onClick={selectAllPaid}>
                                    Выбрать оплаченные
                                </button>

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
                                            {totalAmountSelected.toLocaleString("ru-RU", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })} {sortedData[0]?.currency || ""}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {showFilters && (
                                <div className="filters animate-slideIn">
                                    <input
                                        placeholder="Номер карты"
                                        onChange={(e) => setFilters((p) => ({ ...p, cardNumber: e.target.value }))}
                                    />
                                    <input
                                        placeholder="ATM ID"
                                        onChange={(e) => setFilters((p) => ({ ...p, atmId: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Utrnno"
                                        onChange={(e) => setFilters((p) => ({ ...p, utrnno: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Сумма"
                                        type="number"
                                        onChange={(e) => setFilters((p) => ({ ...p, amount: e.target.value }))}
                                    />
                                </div>
                            )}

                            <div className="my-applications-sub-header">
                                <div>
                                    С{" "}
                                    <Input
                                        type="datetime-local"
                                        onChange={(e) => setData("pvn_from_datetime", e)}
                                        value={data?.pvn_from_datetime || defaultFromDateTime}
                                        style={{ width: "200px" }}
                                        id="pvn_from_datetime"
                                    />
                                </div>
                                <div>
                                    По{" "}
                                    <Input
                                        type="datetime-local"
                                        onChange={(e) => setData("pvn_to_datetime", e)}
                                        value={data?.pvn_to_datetime || defaultToDateTime}
                                        style={{ width: "200px" }}
                                        id="pvn_to_datetime"
                                    />
                                </div>
                            </div>

                            <div className="my-applications-content" style={{ position: "relative" }}>
                                {loading ? (
                                    <div style={{ textAlign: "center", padding: "2rem" }}>Загрузка...</div>
                                ) : sortedData.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "2rem", color: "gray" }}>
                                        Нет данных для отображения
                                    </div>
                                ) : (
                                    <table className="eqms-table">
                                        <thead>
                                        <tr>
                                            <th className="eqms-th eqms-th--checkbox">
                                                <input
                                                    type="checkbox"
                                                    className="custom-checkbox"
                                                    checked={selectAll}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                            {tableHeaders.map((header) => (
                                                <th
                                                    key={header}
                                                    className={`eqms-th eqms-th--sortable${sortField === header ? " eqms-th--active" : ""}`}
                                                    onClick={() => handleSort(header)}
                                                >
                                                    <span className="eqms-th__label">{columnNames[header] || header}</span>
                                                    <span className="eqms-th__icon">
                                                        {sortField === header ? (
                                                            sortDirection === "asc" ? <BsArrowUp /> : <BsArrowDown />
                                                        ) : (
                                                            <BsArrowDownUp className="eqms-th__icon--idle" />
                                                        )}
                                                    </span>
                                                </th>
                                            ))}
                                            <th className="eqms-th">Статус оплаты</th>
                                            <th className="eqms-th">Дата оплаты</th>
                                            <th className="eqms-th active-table">Действия</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {sortedData.map((row) => {
                                            const paid = isPaidTransaction(row);
                                            const isPaying = payingIds.has(row.utrnno);

                                            return (
                                                <tr
                                                    key={row.id}
                                                    style={{ backgroundColor: paid ? "#e6ffe6" : "transparent" }}
                                                >
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            className="custom-checkbox"
                                                            checked={selectedRows.includes(row.id)}
                                                            onChange={(e) => handleCheckboxToggle(row.id, e.target.checked)}
                                                        />
                                                    </td>
                                                    {tableHeaders.map((header) => {
                                                        let value = row[header];
                                                        if (header.includes("Date") || header === "localTransactionDate") {
                                                            value = formatDateForDisplay(value);
                                                        }
                                                        if (header === "currency" && typeof value === "number") {
                                                            value = value === 810 ? "RUB" : value === 840 ? "USD" : value === 978 ? "EUR" : value;
                                                        }
                                                        if (header === "amount" && typeof value === "number") {
                                                            value = formatAmount(value);
                                                        }
                                                        return <td key={header}>{value}</td>;
                                                    })}
                                                    <td>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: paid ? "green" : "gray", fontWeight: paid ? "500" : "normal" }}>
                                                            {paid ? <FcOk style={{ fontSize: 22 }} /> : <FcProcess style={{ fontSize: 22 }} />}
                                                            <span>{paid ? "Оплачено" : "Не оплачено"}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {row.transaction_card_payed?.createdAt
                                                            ? formatDateForDisplay(row.transaction_card_payed.createdAt)
                                                            : ""}
                                                    </td>
                                                    <td className="active-table">
                                                        <button
                                                            className={`pay-button ${paid ? "paid" : ""}`}
                                                            onClick={() => handlePay(row)}
                                                            disabled={isPaying || paid}
                                                            style={{
                                                                padding: "8px 12px",
                                                                borderRadius: "6px",
                                                                border: "none",
                                                                cursor: paid || isPaying ? "not-allowed" : "pointer",
                                                                opacity: paid || isPaying ? 0.6 : 1,
                                                                color: "#333",
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
                                                            ) : paid ? (
                                                                <>
                                                                    <img src={PayedIcon} width="24" height="24" alt="Оплачено" />
                                                                    Оплачено
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <img src={PayIcon} width="24" height="24" alt="Оплатить" />
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
                        <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />
                    )}

                    {showPayConfirmation && (
                        <div className="logout-confirmation">
                            <div className="confirmation-box">
                                <div>
                                    <h1>Подтверждение оплаты</h1>
                                    <p>
                                        Вы уверены, что хотите оплатить выбранные транзакции?
                                        <br />
                                        Количество: {paymentsToProcess.length}
                                        <br /><br />
                                        После подтверждения начнется процесс оплаты. Отменить операцию будет невозможно.
                                    </p>
                                </div>
                                <div className="confirmation-buttons">
                                    <button className="confirm-btn" onClick={handleConfirmPayment}>Да, оплатить</button>
                                    <button className="cancel-btn" onClick={handleCancelPayment}>Отмена</button>
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
                                        Вы точно уверены, что хотите оплатить эту транзакцию?
                                        <br /><br />
                                        После подтверждения начнется процесс оплаты. Отменить операцию будет невозможно.
                                    </p>
                                </div>
                                <div className="confirmation-buttons">
                                    <button className="confirm-btn" onClick={performSinglePayment}>Да, оплатить</button>
                                    <button className="cancel-btn" onClick={handleCancelSinglePayment}>Отмена</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
        </>
    );
}
