import { useMemo, useState } from "react";
import "../../styles/components/CheckoutTable.css";
import "../../styles/checkbox.scss";

import { BIN_BANKS } from "../../shared/bin-banks/bin-banks";

/** ✅ BIN: берем ПЕРВЫЕ 6 ЦИФР из исходной строки, игнорируя '*' */
function getBin6(cardNumber) {
    const s = String(cardNumber || "").trim();
    if (!s) return "";

    // идем слева направо и собираем цифры, пока не наберем 6
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

    // Ищем самый длинный BIN в BIN_BANKS, который начинается с bin6
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

    // Если не нашли, возвращаем BIN с первыми 6 цифрами
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

    // округляем до maxFractionDigits и убираем лишние нули
    const fixed = num.toFixed(maxFractionDigits);
    const [intPart, fracPart] = fixed.split(".");

    const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // убираем хвостовые нули в дробной части
    const fracTrimmed = (fracPart || "").replace(/0+$/, "");
    return fracTrimmed ? `${intWithDots}.${fracTrimmed}` : intWithDots;
}

function formatMoneySmart(amount, currency) {
    const v = Number(amount);
    if (!Number.isFinite(v)) return "—";

    // твоя логика: иногда сумма приходит в "копейках/дирамах"
    const normalized = v >= 1000 && v % 100 === 0 ? v / 100 : v;

    const suffix = currency === 972 ? "с." : "";
    return `${formatWithDots(normalized, 2)} ${suffix}`.trim();
}

function cycleSort(prev) {
    if (prev === null) return "asc";
    if (prev === "asc") return "desc";
    return null;
}

function compareAny(a, b) {
    const na = Number(a);
    const nb = Number(b);
    const fa = Number.isFinite(na);
    const fb = Number.isFinite(nb);
    if (fa && fb) return na - nb;
    return String(a ?? "").localeCompare(String(b ?? ""), "ru", {
        numeric: true,
        sensitivity: "base",
    });
}

/** ===== status chip - КАК В QR ===== */
function getStatusMeta(tx) {
    const desc = String(tx.responseDescription || "").toLowerCase();
    const code = String(tx.responseCode ?? "");
    const reversal = Number(tx.reversal) === 1;

    if (reversal) return { label: "Отменено", color: "error", icon: "cancel" };
    if (desc.includes("успеш") || code === "0" || code === "-1")
        return { label: "Успешно", color: "success", icon: "check" };

    if (desc.includes("приоритет") || desc.includes("высок"))
        return { label: "Высокий приоритет", color: "error", icon: "priority" };

    return { label: tx.responseDescription || "Ошибка", color: "error", icon: "cancel" };
}

// Простые SVG иконки - КАК В QR
const IconCheck = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
);

const IconCancel = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
);

const IconPriority = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
    </svg>
);

const getStatusIcon = (iconName) => {
    switch(iconName) {
        case "check": return <IconCheck />;
        case "cancel": return <IconCancel />;
        case "priority": return <IconPriority />;
        default: return <IconCancel />;
    }
};

export default function CheckoutTable({ transactions = [] }) {
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [sort, setSort] = useState({ key: "id", dir: "asc" });
    const [query, setQuery] = useState("");

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

                statusLabel: status.label,
                statusColor: status.color,
                statusIcon: status.icon,

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

        const { key, dir } = sort;
        if (!dir) return arr;

        const mul = dir === "asc" ? 1 : -1;

        return [...arr].sort((a, b) => {
            let cmp = 0;

            if (key === "id") cmp = compareAny(a.id, b.id);
            else if (key === "bank") cmp = compareAny(a.bankName, b.bankName);
            else if (key === "terminal")
                cmp = compareAny(a.terminalId ?? a.atmId, b.terminalId ?? b.atmId);
            else if (key === "utrnno") cmp = compareAny(a.utrnno, b.utrnno);
            else if (key === "status") cmp = compareAny(a.statusLabel, b.statusLabel);
            else if (key === "amount") cmp = compareAny(a.amount, b.amount);
            else if (key === "date")
                cmp = compareAny(`${a.date} ${a.time}`, `${b.date} ${b.time}`);

            if (cmp === 0) cmp = compareAny(a.id, b.id);
            return cmp * mul;
        });
    }, [rows, query, sort]);

    const allChecked =
        filteredSorted.length > 0 && filteredSorted.every((r) => selectedIds.has(r.rowId));
    const someChecked =
        filteredSorted.some((r) => selectedIds.has(r.rowId)) && !allChecked;

    const toggleAll = (checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) filteredSorted.forEach((r) => next.add(r.rowId));
            else filteredSorted.forEach((r) => next.delete(r.rowId));
            return next;
        });
    };

    const toggleOne = (rowId, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(rowId);
            else next.delete(rowId);
            return next;
        });
    };

    const onSort = (key) => {
        setSort((prev) => {
            if (prev.key !== key) return { key, dir: "asc" };
            return { key, dir: cycleSort(prev.dir) };
        });
    };

    const sortDirFor = (key) => (sort.key === key ? sort.dir : null);

    const getSortArrow = (key) => {
        const dir = sortDirFor(key);
        if (dir === "asc") return " ↑";
        if (dir === "desc") return " ↓";
        return "";
    };

    return (
        <div className="checkout-table-container">
            <div className="table-header-controls">
                <h2 className="table-title">Операции</h2>
                <input
                    type="text"
                    className="search-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск по любому полю..."
                />
            </div>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                    <tr className="table-header-row">
                        <th className="checkbox-header">
                            <input
                                type="checkbox"
                                className="custom-checkbox"
                                checked={allChecked}
                                onChange={(e) => toggleAll(e.target.checked)}
                                ref={(el) => {
                                    if (el) el.indeterminate = someChecked;
                                }}
                            />
                        </th>

                        <th
                            className="sortable-header"
                            onClick={() => onSort("id")}
                        >
                            ID{getSortArrow("id")}
                        </th>

                        <th
                            className="sortable-header"
                            onClick={() => onSort("bank")}
                        >
                            Банк{getSortArrow("bank")}
                        </th>

                        <th
                            className="sortable-header"
                            onClick={() => onSort("terminal")}
                        >
                            Код терминала{getSortArrow("terminal")}
                        </th>

                        <th
                            className="sortable-header"
                            onClick={() => onSort("utrnno")}
                        >
                            utrnno{getSortArrow("utrnno")}
                        </th>

                        <th
                            className="sortable-header"
                            onClick={() => onSort("status")}
                        >
                            Статус{getSortArrow("status")}
                        </th>

                        <th>Тип</th>

                        <th
                            className="sortable-header text-right"
                            onClick={() => onSort("amount")}
                        >
                            Сумма{getSortArrow("amount")}
                        </th>

                        <th
                            className="sortable-header"
                            onClick={() => onSort("date")}
                        >
                            Дата создания{getSortArrow("date")}
                        </th>
                    </tr>
                    </thead>

                    <tbody>
                    {filteredSorted.map((r) => {
                        const checked = selectedIds.has(r.rowId);
                        const money = formatMoneySmart(r.amount, r.currency);
                        const rowClass = checked ? "row-selected" : "";

                        return (
                            <tr key={r.rowId} className={`data-row ${rowClass}`}>
                                <td className="checkbox-cell">
                                    <input
                                        type="checkbox"
                                        className="custom-checkbox"
                                        checked={checked}
                                        onChange={(e) => toggleOne(r.rowId, e.target.checked)}
                                    />
                                </td>

                                <td>
                                    <div className="cell-id">{r.id ?? "—"}</div>
                                </td>

                                <td>
                                    <div className="bank-info">
                                        <div className="bank-name">{r.bankName || "—"}</div>
                                        <div className="bin-info">
                                            BIN: {r.bin6 || "—"}
                                        </div>
                                    </div>
                                </td>

                                <td>
                                    <div className="terminal-info">
                                        ATM: {r.atmId || "—"}
                                    </div>
                                </td>

                                <td>
                                    <div className="utrnno-cell">
                                        {r.utrnno ?? "—"}
                                    </div>
                                </td>

                                <td>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}
                                    >
                                        <span style={{
                                            display: "flex",
                                            alignItems: "center",
                                            color: r.statusColor === "success" ? "green" :
                                                r.statusColor === "error" ? "red" : "orange"
                                        }}>
                                            {getStatusIcon(r.statusIcon)}
                                        </span>
                                        <span style={{
                                            color: r.statusColor === "success" ? "green" :
                                                r.statusColor === "error" ? "red" : "orange"
                                        }}>
                                            {r.statusLabel}
                                        </span>
                                    </div>
                                </td>

                                <td>
                                    <div
                                        className="type-cell"
                                        title={r.terminalAddress || ""}
                                    >
                                        {r.typeName || "—"}
                                    </div>
                                </td>

                                <td className="text-right">
                                    <div className="amount-cell">{money}</div>
                                </td>

                                <td>
                                    <div className="date-time-cell">
                                        <div className="date-cell">{r.date}</div>
                                        <div className="time-cell">{r.time}</div>
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
