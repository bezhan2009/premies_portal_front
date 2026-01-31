import { useMemo, useState } from "react";
import "../../styles/components/TransactionsQR.scss";
import { FcCancel, FcHighPriority, FcOk } from "react-icons/fc";

import { BIN_BANKS } from "../../shared/bin-banks/bin-banks";

/** ✅ BIN: берем ПЕРВЫЕ 6 ЦИФР из исходной строки, игнорируя '*' */
function getBin6(cardNumber) {
    const s = String(cardNumber || "").trim();
    if (!s) return "";

    let bin = "";
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch >= "0" && ch <= "9") {
            bin += ch;
            if (bin.length === 6) break;
        }
    }
    return bin.length === 6 ? bin : "";
}

function getBankByCardNumber(cardNumber) {
    const bin6 = getBin6(cardNumber);
    if (!bin6) return "—";

    let bestMatch = null;
    let maxLength = 0;

    for (const bin in BIN_BANKS) {
        if (bin.startsWith(bin6) && bin.length > maxLength) {
            bestMatch = bin;
            maxLength = bin.length;
        }
    }

    if (bestMatch) {
        return BIN_BANKS[bestMatch];
    }

    return `BIN ${bin6}`;
}

/** ===== utils ===== */
function formatDateTime(dateStr, timeStr) {
    const d = String(dateStr || "").slice(0, 10);
    const t = String(timeStr || "").slice(0, 8);
    if (!d) return { date: "—", time: "—" };
    return { date: d, time: t || "00:00:00" };
}

function formatWithDots(num, maxFractionDigits = 2) {
    if (!Number.isFinite(num)) return "—";

    const fixed = num.toFixed(maxFractionDigits);
    const [intPart, fracPart] = fixed.split(".");

    const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    const fracTrimmed = (fracPart || "").replace(/0+$/, "");
    return fracTrimmed ? `${intWithDots}.${fracTrimmed}` : intWithDots;
}

function formatMoneySmart(amount, currency) {
    const v = Number(amount);
    if (!Number.isFinite(v)) return "—";

    const normalized = v >= 1000 && v % 100 === 0 ? v / 100 : v;

    const suffix = currency === 972 ? "с." : "";
    return `${formatWithDots(normalized, 2)} ${suffix}`.trim();
}

function getStatusMeta(tx) {
    const desc = String(tx.responseDescription || "").toLowerCase();
    const code = String(tx.responseCode ?? "");
    const reversal = Number(tx.reversal) === 1;

    if (reversal) return { type: "cancel", label: "Отменено" };
    if (desc.includes("успеш") || code === "0" || code === "-1")
        return { type: "success", label: "Успешно" };
    if (desc.includes("приоритет") || desc.includes("высок"))
        return { type: "high_priority", label: "Высокий приоритет" };

    return { type: "cancel", label: tx.responseDescription || "Ошибка" };
}

export default function CheckoutTable({ transactions = [] }) {
    const [selectedRows, setSelectedRows] = useState([]);
    const [query, setQuery] = useState("");
    const [selectAll, setSelectAll] = useState(false);

    const rows = useMemo(() => {
        return transactions.map((t) => {
            const dt = formatDateTime(t.localTransactionDate, t.localTransactionTime);
            const status = getStatusMeta(t);
            const rowId = String(t.id ?? `${t.utrnno ?? ""}-${t.terminalId ?? ""}`);

            const bin6 = getBin6(t.cardNumber);
            const bankName = getBankByCardNumber(t.cardNumber);

            return {
                raw: t,
                rowId,
                id: t.id,
                bankName,
                bin6,
                terminalId: t.terminalId,
                atmId: t.atmId,
                utrnno: t.utrnno,
                statusType: status.type,
                statusLabel: status.label,
                amount: t.amount,
                currency: t.currency,
                typeName: t.transactionTypeName,
                terminalAddress: t.terminalAddress,
                date: dt.date,
                time: dt.time,
            };
        });
    }, [transactions]);

    const filteredSorted = useMemo(() => {
        const q = String(query || "").trim().toLowerCase();

        let arr = rows;
        if (q) {
            arr = arr.filter((r) => {
                const hay = [
                    r.id,
                    r.bankName,
                    r.bin6,
                    r.atmId,
                    r.terminalId,
                    r.utrnno,
                    r.statusLabel,
                    r.typeName,
                    r.terminalAddress,
                    r.date,
                    r.time,
                    r.amount,
                ]
                    .map((x) => String(x ?? "").toLowerCase())
                    .join(" | ");
                return hay.includes(q);
            });
        }

        return arr;
    }, [rows, query]);

    const getRowKey = (row) => row.rowId;

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedRows([]);
        } else {
            const keys = filteredSorted.map((r) => getRowKey(r));
            setSelectedRows(keys);
        }
        setSelectAll(!selectAll);
    };

    const handleCheckboxToggle = (key, checked) => {
        if (checked) {
            setSelectedRows((prev) => [...prev, key]);
        } else {
            setSelectedRows((prev) => prev.filter((p) => p !== key));
            setSelectAll(false);
        }
    };

    return (
        <div className="checkout-table-container">
            <div className="my-applications-header header-with-balance">
                <h2 className="table-title">Операции банкомата</h2>

                <div className="header-controls">
                    <input
                        type="text"
                        className="search-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Поиск по любому полю..."
                        style={{ marginRight: '10px' }}
                    />

                    <button
                        className={selectAll ? "selectAll-toggle" : ""}
                        onClick={toggleSelectAll}
                        style={{ marginRight: '10px' }}
                    >
                        {selectAll ? "Снять выделение" : "Выбрать все"}
                    </button>
                </div>
            </div>

            <div className="my-applications-content">
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
                        <th>ID</th>
                        <th>Банк</th>
                        <th>Код терминала</th>
                        <th>utrnno</th>
                        <th>Статус</th>
                        <th>Тип операции</th>
                        <th>Сумма</th>
                        <th>Дата создания</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredSorted.map((r) => {
                        const key = getRowKey(r);
                        const checked = selectedRows.includes(key);
                        const money = formatMoneySmart(r.amount, r.currency);

                        const getStatusIcon = (type) => {
                            switch(type) {
                                case "success":
                                    return <FcOk style={{ fontSize: 22 }} />;
                                case "cancel":
                                    return <FcCancel style={{ fontSize: 22 }} />;
                                case "high_priority":
                                    return <FcHighPriority style={{ fontSize: 22 }} />;
                                default:
                                    return <FcCancel style={{ fontSize: 22 }} />;
                            }
                        };

                        const getStatusColor = (type) => {
                            switch(type) {
                                case "success": return "green";
                                case "cancel": return "red";
                                case "high_priority": return "red";
                                default: return "red";
                            }
                        };

                        return (
                            <tr key={key}>
                                <td>
                                    <input
                                        type="checkbox"
                                        className="custom-checkbox"
                                        checked={checked}
                                        onChange={(e) => handleCheckboxToggle(key, e.target.checked)}
                                    />
                                </td>
                                <td>{r.id || "—"}</td>
                                <td>
                                    <div className="bank-info">
                                        <div>{r.bankName || "—"}</div>
                                        {r.bin6 && (
                                            <div className="bin-info">BIN: {r.bin6}</div>
                                        )}
                                    </div>
                                </td>
                                <td>{r.atmId || r.terminalId || "—"}</td>
                                <td>{r.utrnno || "—"}</td>
                                <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        {getStatusIcon(r.statusType)}
                                        <span style={{ color: getStatusColor(r.statusType) }}>
                                                {r.statusLabel}
                                            </span>
                                    </div>
                                </td>
                                <td title={r.terminalAddress || ""}>
                                    {r.typeName || "—"}
                                </td>
                                <td>{money}</td>
                                <td>
                                    <div className="date-time-cell">
                                        <div>{r.date}</div>
                                        <div>{r.time}</div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}

                    {filteredSorted.length === 0 && (
                        <tr>
                            <td colSpan={9} className="no-data-cell">
                                Нет данных
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
