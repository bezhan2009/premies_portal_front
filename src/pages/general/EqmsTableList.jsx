import React, { useEffect, useMemo, useState } from "react";
import Input from "../../components/elements/Input.jsx";
import Select from "../../components/elements/Select.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { FcCancel, FcHighPriority, FcOk, FcProcess } from "react-icons/fc";
import { BsArrowUp, BsArrowDown, BsArrowDownUp } from "react-icons/bs";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import PayIcon from "../../assets/pay_icon.png";
import PayedIcon from "../../assets/payed_icon.png";
import { toast } from "react-toastify";
import { tableDataDef } from "../../const/defConst.js";
import "../../styles/components/StatsEQMS.scss";
import { Table } from "../../components/table/FlexibleAntTable.jsx";

export default function EQMSList() {
    const [tableData, setTableData] = useState([]);
    const { data, setData } = useFormStore();
    const [sortField, setSortField] = useState("id");
    const [sortDirection, setSortDirection] = useState("desc");
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
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
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
        if (row.isPayed !== undefined && row.isPayed !== null) return Boolean(row.isPayed);
        if (!row.payedAt || row.payedAt.includes("0001-01-01")) return false;
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
            if (dateString.includes("0001-01-01")) return "Не оплачено";
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
            const start = data?.eqms_start_date || new Date().toISOString().split("T")[0];
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

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const filteredData = useMemo(() => {
        if (!Array.isArray(tableData)) return [];
        return tableData.filter((row) =>
            Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                if (key === "payedAt" && value === "paid") return isPaidCustoms(row);
                if (key === "payedAt" && value === "not_paid") return !isPaidCustoms(row);
                const rowValue = row[key];
                if (rowValue == null) return false;
                return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
            }),
        );
    }, [tableData, filters]);

    const sortedData = useMemo(() => {
        const arr = [...filteredData];
        arr.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            const cmp = typeof aVal === "number" && typeof bVal === "number" ? aVal - bVal : String(aVal).localeCompare(String(bVal), "ru", { numeric: true });
            return sortDirection === "asc" ? cmp : -cmp;
        });
        return arr;
    }, [filteredData, sortField, sortDirection]);

    const payOne = async (transaction) => {
        const resp = await fetch(`${backendMain}/eqms/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(transaction),
        });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || `Ошибка сервера: ${resp.status}`);
        return result;
    };

    const handlePayWithRetry = async (transaction, retryCount = 0) => {
        try {
            return await payOne(transaction);
        } catch (err) {
            if (retryCount >= 3 || !isWorkingHours()) throw err;
            showAlert(`Ошибка: "${err.message}". Попытка ${retryCount + 1}/3...`, "warning");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return await handlePayWithRetry(transaction, retryCount + 1);
        }
    };

    const handlePay = async (transaction) => {
        const status = getPaymentStatus(transaction);
        if (status === "already_paid") return showAlert("Уже оплачена", "warning");
        if (status === "paid") return showAlert("Успешно оплачена", "info");
        setSinglePaymentData(transaction);
        setShowSinglePayConfirmation(true);
    };

    const performSinglePayment = async () => {
        if (!singlePaymentData) return;
        setShowSinglePayConfirmation(false);
        const transaction = singlePaymentData;
        setSinglePaymentData(null);
        setPayingIds((prev) => new Set([...prev, transaction.id]));
        try {
            await handlePayWithRetry(transaction, 0);
            showAlert("Оплата отправлена!", "success");
            setTimeout(fetchData, 1000);
        } catch (err) {
            showAlert(err.message, "error");
        } finally {
            setPayingIds((prev) => {
                const ns = new Set(prev);
                ns.delete(transaction.id);
                return ns;
            });
        }
    };

    const handlePayAll = async () => {
        const toPay = sortedData.filter((row) => selectedRows.includes(row.id) && getPaymentStatus(row) === "pending");
        if (toPay.length === 0) return showAlert("Нет записей для оплаты", "warning");
        setPaymentsToProcess(toPay);
        setShowPayConfirmation(true);
    };

    const handleConfirmPayment = async () => {
        setShowPayConfirmation(false);
        const toPay = paymentsToProcess;
        await performPayment(toPay);
    };

    const handleCancelPayment = () => {
        setShowPayConfirmation(false);
        setShowSinglePayConfirmation(false);
        setSinglePaymentData(null);
        setPaymentsToProcess([]);
    };

    const performPayment = async (toPay) => {
        setPayingIds((prev) => new Set([...prev, ...toPay.map((r) => r.id)]));
        let ok = 0;
        let errs = [];
        for (let i = 0; i < toPay.length; i += 150) {
            const batch = toPay.slice(i, i + 150);
            await Promise.all(batch.map(async (tx) => {
                try {
                    await handlePayWithRetry(tx, 0);
                    ok++;
                } catch (e) {
                    errs.push({ id: tx.id, error: e.message });
                }
            }));
            if (i + 150 < toPay.length) await new Promise((r) => setTimeout(r, 10000));
        }
        showAlert(`Успешно: ${ok}. Ошибок: ${errs.length}.`, errs.length ? "warning" : "success");
        setTimeout(fetchData, 1000);
        setPayingIds((prev) => {
            const ns = new Set(prev);
            toPay.forEach((r) => ns.delete(r.id));
            return ns;
        });
    };

    const handleExport = async () => {
        try {
            const sel = sortedData.filter((row) => selectedRows.includes(row.id));
            if (!sel.length) return showAlert("Ничего не выбрано", "error");
            const resp = await fetch(`${backendMain}/automation/eqms`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(sel),
            });
            if (!resp.ok) throw new Error("Ошибка выгрузки");
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.download = `EQMS_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.href = url;
            a.click();
            showAlert(`Файл выгружен (${sel.length} записей)`, "success");
            setSelectedRows([]);
            setSelectAll(false);
        } catch (e) {
            showAlert(e.message, "error");
        }
    };

    const toggleSelectAll = () => {
        if (selectAll) setSelectedRows([]);
        else setSelectedRows(sortedData.map((r) => r.id));
        setSelectAll(!selectAll);
    };

    const selectAllUnpaid = () => {
        setSelectedRows(sortedData.filter((r) => getPaymentStatus(r) === "pending" && (r.status || "").toLowerCase() === "success").map((r) => r.id));
        setSelectAll(false);
    };

    const selectAllPaid = () => {
        setSelectedRows(sortedData.filter((r) => getPaymentStatus(r) !== "pending" && (r.status || "").toLowerCase() === "success").map((r) => r.id));
        setSelectAll(false);
    };

    const columnNames = {
        id: "ID", status: "Статус платежа", amount: "Сумма", docId: "Номер документа", transactionId: "Номер транзакций",
        date: "Дата", type_id: "Тип", emailToBeNotified: "Почта", meanOfPayment: "Тип платежа", bankCode: "БИК",
        payerINN: "ИНН плательщика", payerName: "Имя плательщика", payerBankName: "Банк плательщика",
        payerBankCode: "БИК банка плательщика", payerAcc: "Номер счета", recINN: "ИНН получателя",
        recName: "Имя получателя", recBankName: "Банк получателя", recBankCode: "Код банка получателя", recAcc: "recAcc",
    };

    const tableHeaders = useMemo(() => {
        if (!sortedData.length) return [];
        const excluded = ["payedAt", "isPayed"];
        const keys = Object.keys(sortedData[0]).filter(k => !excluded.includes(k));
        const res = [];
        if (keys.includes("id")) res.push("id");
        if (keys.includes("status")) res.push("status");
        keys.forEach(k => { if (k !== "id" && k !== "status") res.push(k); });
        return res;
    }, [sortedData]);

    const handleFetchStatement = async () => {
        setStatementLoading(true);
        const sd = formatDateForQuery(startDate);
        const ed = formatDateForQuery(endDate);
        const url = `${backendABS}/account/operations?startDate=${sd}&endDate=${ed}&accountNumber=${accountNumber}`;
        try {
            const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!resp.ok) throw new Error("Ошибка АБС");
            const json = await resp.json();
            setStatementData(json || []);
            setShowStatement(true);
            showAlert(`Загружено ${json.length} дней`, "success");
        } catch (e) {
            showAlert(e.message, "error");
        } finally {
            setStatementLoading(false);
        }
    };

    const flatStatementData = useMemo(() => {
        return statementData.flatMap((day) =>
            day.Transactions.map((tx) => ({
                ...tx, doper: day.DOPER, kurs: day.Kurs, sumBalOut: day.SumBalOut,
                sumMovD: day.SumMovD, sumMovC: day.SumMovC, sumMovDN: day.SumMovDN,
                sumMovCN: day.SumMovCN, transactionsCount: day.TransactionsCount,
            })),
        );
    }, [statementData]);

    const formatDateForQuery = (dateStr) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split("-");
        return `${d}.${m}.${y}`;
    };

    // Установка дат по умолчанию
    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];
        if (!data?.eqms_start_date) setData("eqms_start_date", today);
        if (!data?.eqms_end_date) setData("eqms_end_date", today);
    }, []);

    // Загрузка данных при изменении дат
    useEffect(() => {
        if (data?.eqms_start_date && data?.eqms_end_date) {
            fetchData();
        }
    }, [data?.eqms_start_date, data?.eqms_end_date]);

    const rowSelection = {
        selectedRowKeys: selectedRows,
        onChange: (keys) => {
            setSelectedRows(keys);
            setSelectAll(keys.length === sortedData.length && sortedData.length > 0);
        },
    };

    return (
        <>
            <div className="page-content-wrapper content-page">
                <div className="applications-list" style={{ flexDirection: "column", gap: "20px", height: "auto" }}>
                    <main>
                        <div className="my-applications-header">
                            {!showStatement && (
                                <button className={!showFilters ? "filter-toggle" : "Unloading"} onClick={() => setShowFilters(!showFilters)}>Фильтры</button>
                            )}
                            <pre> </pre>
                            {!showStatement && (
                                <>
                                    <button className="Unloading" onClick={handleExport} disabled={!selectedRows.length}>Выгрузка EQMS</button>
                                    <button className="save" onClick={handlePayAll} disabled={!selectedRows.length || payingIds.size > 0}>Оплатить всё</button>
                                    <button className={selectAll ? "selectAll-toggle" : ""} onClick={toggleSelectAll}>{selectAll ? "Снять выделение" : "Выбрать все"}</button>
                                    <button className="edit" onClick={selectAllUnpaid}>Все неоплаченные</button>
                                    <button className="save" onClick={selectAllPaid}>Все оплаченные</button>
                                </>
                            )}
                            <button className="Unloading" onClick={handleFetchStatement} disabled={statementLoading}>Выписка АБС</button>
                            {!showStatement && (
                                <div className="selection-stats-card">
                                    <div className="stat"><span className="label">Выбрано</span><strong className="value">{selectedRows.length}</strong></div>
                                    <div className="divider" />
                                    <div className="stat"><span className="label">Оплачено</span><strong className="value paid">{sortedData.filter(r => getPaymentStatus(r) !== "pending").length}</strong></div>
                                    <div className="divider" />
                                    <div className="stat highlight"><span className="label">Сумма</span><strong className="value amount">{sortedData.filter(r => selectedRows.includes(r.id)).reduce((s, r) => s + (r.amount || 0), 0).toLocaleString("ru-RU")} С</strong></div>
                                </div>
                            )}
                        </div>

                        {showFilters && !showStatement && (
                            <div className="filters animate-slideIn">
                                <input placeholder="ID" onChange={e => setFilters(p => ({ ...p, id: e.target.value }))} />
                                <input placeholder="Doc ID" onChange={e => setFilters(p => ({ ...p, docId: e.target.value }))} />
                                <input placeholder="Transaction ID" onChange={e => setFilters(p => ({ ...p, transactionId: e.target.value }))} />
                                <input placeholder="Payer" onChange={e => setFilters(p => ({ ...p, payerName: e.target.value }))} />
                                <input placeholder="Receiver" onChange={e => setFilters(p => ({ ...p, recName: e.target.value }))} />
                                <Select onChange={val => setFilters(p => ({ ...p, status: val }))} value={filters.status} options={[{ value: "", label: "Статус" }, { value: "Pending", label: "Pending" }, { value: "Success", label: "Success" }, { value: "Failed", label: "Failed" }]} />
                                <Select onChange={val => setFilters(p => ({ ...p, payedAt: val }))} value={filters.payedAt} options={[{ value: "", label: "Статус оплаты" }, { value: "paid", label: "Оплачено" }, { value: "not_paid", label: "Не оплачено" }]} />
                            </div>
                        )}

                        <div className="my-applications-sub-header">
                            {!showStatement ? (
                                <>
                                    <div>С <Input type="date" onChange={e => setData("eqms_start_date", e)} value={data?.eqms_start_date || ""} style={{ width: "150px" }} /></div>
                                    <div>По <Input type="date" onChange={e => setData("eqms_end_date", e)} value={data?.eqms_end_date || ""} style={{ width: "150px" }} /></div>
                                </>
                            ) : (
                                <>
                                    <div>Начало <Input type="date" onChange={e => setStartDate(e)} value={startDate} style={{ width: "150px" }} /></div>
                                    <div>Конец <Input type="date" onChange={e => setEndDate(e)} value={endDate} style={{ width: "150px" }} /></div>
                                </>
                            )}
                        </div>

                        <div className="my-applications-content" style={{ position: "relative" }}>
                            {showStatement ? (
                                <>
                                    <button className="button-edit-roles" style={{ marginBottom: 15 }} onClick={() => setShowStatement(false)}>Назад к EQMS</button>
                                    {statementLoading ? <div style={{ textAlign: "center", padding: "2rem" }}>Загрузка...</div> : flatStatementData.length === 0 ? <div style={{ textAlign: "center", padding: "2rem", color: "gray" }}>Нет данных</div> : (
                                        <Table dataSource={flatStatementData} rowKey={(r, i) => i} bordered scroll={{ x: 3500 }} pagination={{ pageSize: 15 }}>
                                            <Table.Column title="Дата операции" dataIndex="doper" sortable />
                                            <Table.Column title="Дата документа" dataIndex="DOCDOPER" sortable />
                                            <Table.Column title="Время" dataIndex="EXECDT" />
                                            <Table.Column title="Описание" dataIndex="TXTDSCR" width={300} />
                                            <Table.Column title="Дебет" dataIndex="MOVD" align="right" />
                                            <Table.Column title="Кредит" dataIndex="MOVC" align="right" />
                                            <Table.Column title="Баланс" dataIndex="sumBalOut" align="right" />
                                            <Table.Column title="Валютная дата" dataIndex="DVAL" />
                                            <Table.Column title="Референс" dataIndex="REFER" sortable />
                                            <Table.Column title="Номер док." dataIndex="NUMDOC" sortable />
                                            <Table.Column title="Клиент кор." dataIndex="CLIENTCOR" width={250} />
                                            <Table.Column title="Счет кор." dataIndex="ACCCOR" />
                                            <Table.Column title="Банк кор." dataIndex="NAMEBCR" width={250} />
                                            <Table.Column title="Курс" dataIndex="kurs" />
                                            <Table.Column title="PDepID" dataIndex="PDepID" />
                                            <Table.Column title="PID" dataIndex="PID" />
                                            <Table.Column title="KSOCODE" dataIndex="KSOCODE" />
                                            <Table.Column title="BNKKOR" dataIndex="BNKKOR" />
                                            <Table.Column title="JCODEBE" dataIndex="JCODEBE" />
                                            <Table.Column title="JRNNCR" dataIndex="JRNNCR" />
                                            <Table.Column title="MOVDN" dataIndex="MOVDN" align="right" />
                                            <Table.Column title="MOVCN" dataIndex="MOVCN" align="right" />
                                            <Table.Column title="CODEBCR" dataIndex="CODEBCR" />
                                            <Table.Column title="KNP" dataIndex="KNP" />
                                            <Table.Column title="CODEBC" dataIndex="CODEBC" />
                                            <Table.Column title="TXT_HEAD" dataIndex="TXT_HEAD" width={200} />
                                            <Table.Column title="TXT_BUCH" dataIndex="TXT_BUCH" width={200} />
                                            <Table.Column title="CMSFL" dataIndex="CMSFL" />
                                            <Table.Column title="PARENT_REFER" dataIndex="PARENT_REFER" />
                                            <Table.Column title="KURS_ISP" dataIndex="KURS_ISP" />
                                        </Table>
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
                                                    <span className="eqms-th__label">
                                                        {columnNames[header] || header}
                                                    </span>
                                                    <span className="eqms-th__icon">
                                                        {sortField === header ? (
                                                            sortDirection === "asc" ? (
                                                                <BsArrowUp />
                                                            ) : (
                                                                <BsArrowDown />
                                                            )
                                                        ) : (
                                                            <BsArrowDownUp className="eqms-th__icon--idle" />
                                                        )}
                                                    </span>
                                                </th>
                                            ))}
                                            <th className="eqms-th">Оплачено в</th>
                                            <th className="eqms-th active-table">Действия</th>
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
                                                        backgroundColor: isPaid ? "#e6ffe6" : "transparent",
                                                    }}
                                                >
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            className="custom-checkbox"
                                                            checked={selectedRows.includes(row.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedRows((prev) => [...prev, row.id]);
                                                                } else {
                                                                    setSelectedRows((prev) => prev.filter((p) => p !== row.id));
                                                                    setSelectAll(false);
                                                                }
                                                            }}
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
                                                                    {row.status?.toLowerCase() === "pending" ? (
                                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                                            <FcProcess style={{ fontSize: 22 }} />
                                                                            <span style={{ color: "orange" }}>Pending</span>
                                                                        </div>
                                                                    ) : row.status?.toLowerCase() === "success" ? (
                                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                                            <FcOk style={{ fontSize: 22 }} />
                                                                            <span style={{ color: "green" }}>Success</span>
                                                                        </div>
                                                                    ) : row.status?.toLowerCase() === "failed" ? (
                                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                                            <FcCancel style={{ fontSize: 22 }} />
                                                                            <span style={{ color: "red" }}>Failed</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                                            <FcHighPriority style={{ fontSize: 22 }} />
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
                                                                row.status?.toLowerCase() === "success"
                                                                    ? handlePay(row)
                                                                    : toast.error("Таможня не оплачена")
                                                            }
                                                            disabled={isPaying || isPaid}
                                                            style={{
                                                                padding: "8px 12px",
                                                                borderRadius: "6px",
                                                                border: "none",
                                                                cursor:
                                                                    row.status?.toLowerCase() !== "success"
                                                                        ? "not-allowed"
                                                                        : isPaid || isPaying
                                                                            ? "not-allowed"
                                                                            : "pointer",
                                                                opacity:
                                                                    row.status?.toLowerCase() === "success" && !isPaid && !isPaying
                                                                        ? 1
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
            </div>

            {alert && <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}
            {showPayConfirmation && (
                <div className="logout-confirmation">
                    <div className="confirmation-box">
                        <h1>Подтверждение!</h1>
                        <p>Оплатить всё выбранное ({paymentsToProcess.length})?</p>
                        <div className="confirmation-buttons"><button className="confirm-btn" onClick={handleConfirmPayment}>Да</button><button className="cancel-btn" onClick={handleCancelPayment}>Нет</button></div>
                    </div>
                </div>
            )}
            {showSinglePayConfirmation && (
                <div className="logout-confirmation">
                    <div className="confirmation-box">
                        <h1>Оплата</h1>
                        <p>Оплатить эту таможню?</p>
                        <div className="confirmation-buttons"><button className="confirm-btn" onClick={performSinglePayment}>Да</button><button className="cancel-btn" onClick={handleCancelPayment}>Нет</button></div>
                    </div>
                </div>
            )}
        </>
    );
}
