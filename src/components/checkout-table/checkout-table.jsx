import { useMemo, useState } from "react";
import "../../styles/components/CheckoutTable.css";
import "../../styles/checkbox.scss";
import { BIN_BANKS } from "../../shared/bin-banks/bin-banks";
import { Table } from "../table/FlexibleAntTable.jsx";

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
    if (bestMatch) return BIN_BANKS[bestMatch];
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

/** ===== status chip - КАК В QR ===== */
function getStatusMeta(tx) {
    const desc = String(tx.responseDescription || "").toLowerCase();
    const code = String(tx.responseCode ?? "");
    const reversal = Number(tx.reversal) === 1;

    if (reversal) return { label: "Отменено", color: "red", icon: "cancel" };
    if (desc.includes("успеш") || code === "0" || code === "-1")
        return { label: "Успешно", color: "green", icon: "check" };

    if (desc.includes("приоритет") || desc.includes("высок"))
        return { label: "Высокий приоритет", color: "red", icon: "priority" };

    return { label: tx.responseDescription || "Ошибка", color: "red", icon: "cancel" };
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
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [query, setQuery] = useState("");

    const rows = useMemo(() => {
        return transactions.map((t) => {
            const dt = formatDateTime(t.localTransactionDate, t.localTransactionTime);
            const status = getStatusMeta(t);
            const rowId = String(t.id ?? `${t.utrnno ?? ""}-${t.terminalId ?? ""}`);
            const bankName = getBankByCardNumber(t.cardNumber);
            const bin6 = getBin6(t.cardNumber);

            return {
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

    const filteredData = useMemo(() => {
        const q = String(query || "").trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => {
            const hay = [
                r.id, r.bankName, r.bin6, r.atmId, r.terminalId, r.utrnno,
                r.statusLabel, r.typeName, r.terminalAddress, r.date, r.time, r.amount,
            ]
                .map((x) => String(x ?? "").toLowerCase())
                .join(" | ");
            return hay.includes(q);
        });
    }, [rows, query]);

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
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
                <Table
                    dataSource={filteredData}
                    rowKey="rowId"
                    rowSelection={rowSelection}
                    bordered
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 15 }}
                >
                    <Table.Column title="ID" dataIndex="id" sortable />
                    <Table.Column
                        title="Банк"
                        key="bank"
                        sortable
                        render={(_, r) => (
                            <div className="bank-info">
                                <div className="bank-name">{r.bankName || "—"}</div>
                                <div className="bin-info">BIN: {r.bin6 || "—"}</div>
                            </div>
                        )}
                    />
                    <Table.Column
                        title="Код терминала"
                        key="terminal"
                        sortable
                        render={(_, r) => (
                            <div className="terminal-info">ATM: {r.atmId || "—"}</div>
                        )}
                    />
                    <Table.Column title="utrnno" dataIndex="utrnno" sortable />
                    <Table.Column
                        title="Статус"
                        key="status"
                        sortable
                        render={(_, r) => (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ display: "flex", alignItems: "center", color: r.statusColor }}>
                                    {getStatusIcon(r.statusIcon)}
                                </span>
                                <span style={{ color: r.statusColor }}>{r.statusLabel}</span>
                            </div>
                        )}
                    />
                    <Table.Column title="Тип" dataIndex="typeName" />
                    <Table.Column
                        title="Сумма"
                        key="amount"
                        align="right"
                        sortable
                        render={(_, r) => formatMoneySmart(r.amount, r.currency)}
                    />
                    <Table.Column
                        title="Дата создания"
                        key="date"
                        sortable
                        render={(_, r) => (
                            <div className="date-time-cell">
                                <div className="date-cell">{r.date}</div>
                                <div className="time-cell">{r.time}</div>
                            </div>
                        )}
                    />
                </Table>
            </div>
        </div>
    );
}
