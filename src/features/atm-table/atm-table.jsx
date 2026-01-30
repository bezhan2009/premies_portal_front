import { useEffect, useMemo, useState } from "react";
import DateRangeModal from "../../components/dialog/dialog";
import { fetchATM } from "../../api/atm/atm.js";
import "../../styles/components/table-controls.scss"
import { ATM_ERRORS_RU, ATM_WARNINGS_RU } from "../../shared/atm-errors/atm-errors";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

/** ====== ПЕРЕВОДЫ ====== */
const normalizeKey = (s) => String(s ?? "").trim().replace(/\s+/g, " ");

const translateIssue = (x, kind = "error") => {
    if (x == null) return "";

    const raw =
        typeof x === "string" || typeof x === "number"
            ? String(x)
            : x?.message ?? x?.text ?? x?.code ?? JSON.stringify(x);

    const key = normalizeKey(raw);
    if (!key) return "";

    if (kind === "warning") return ATM_WARNINGS_RU[key] || key;
    return ATM_ERRORS_RU[key] || key;
};

/** ====== МАППЕР СЕРВЕРА -> СТРОКА ДЛЯ ТАБЛИЦЫ ====== */
const getDispCount = (dispenser = [], currency, denom) => {
    const item = dispenser.find((d) => d.currency === currency && d.denomination === denom);
    return item?.currentBanknotes ?? 0;
};

const sumBalance = (dispenser = [], currency) =>
    dispenser
        .filter((d) => d.currency === currency)
        .reduce((acc, d) => acc + (d.currentBanknotes ?? 0) * (d.denomination ?? 0), 0);

const ListChips = ({ items = [], kind = "error" }) => {
    if (!items?.length) return <span className="empty-value">—</span>;

    return (
        <div className="chips-container">
            {items.map((it, i) => {
                const ru = translateIssue(it, kind);
                const en = normalizeKey(
                    typeof it === "string" || typeof it === "number"
                        ? it
                        : it?.message ?? it?.text ?? it?.code ?? ""
                );

                return (
                    <div
                        key={`${kind}-${i}`}
                        className={`chip ${kind === 'error' ? 'chip-error' : 'chip-warning'}`}
                        title={en ? `EN: ${en}` : ""}
                    >
                        {ru || "—"}
                    </div>
                );
            })}
        </div>
    );
};

const transformAtm = (atm) => {
    const disp = atm?.Dispenser ?? [];
    const info = atm?.info ?? {};

    const usd100 = getDispCount(disp, "USD", 100);
    const tjs200 = getDispCount(disp, "TJS", 200);
    const tjs100 = getDispCount(disp, "TJS", 100);
    const tjs50 = getDispCount(disp, "TJS", 50);
    const tjs20 = getDispCount(disp, "TJS", 20);
    const tjs10 = getDispCount(disp, "TJS", 10);

    return {
        id: atm?.TID ?? "—",
        atmState: atm?.ATMState ?? "—",

        location: info?.name ?? "—",
        region: info?.region ?? "—",
        address: info?.address ?? "—",

        usd100,
        tjs200,
        tjs100,
        tjs50,
        tjs20,
        tjs10,

        balanceUsd: sumBalance(disp, "USD"),
        balanceTjs: sumBalance(disp, "TJS"),

        errors: Array.isArray(atm?.Errors) ? atm.Errors : [],
        warnings: Array.isArray(atm?.Warning)
            ? atm.Warning
            : Array.isArray(atm?.Warnings)
                ? atm.Warnings
                : [],
    };
};

/** ===== сорт helpers ===== */
function cycleDir(prev) {
    if (prev === null) return "desc";
    if (prev === "desc") return "asc";
    return null;
}

function parseSortableId(v) {
    const s = String(v ?? "").trim();
    const num = Number(s);
    if (Number.isFinite(num)) return { type: "num", value: num, raw: s };
    return { type: "str", value: s, raw: s };
}

function compareId(a, b) {
    const A = parseSortableId(a);
    const B = parseSortableId(b);

    if (A.type === "num" && B.type === "num") return A.value - B.value;
    if (A.type !== B.type) return A.type === "num" ? -1 : 1;

    return A.value.localeCompare(B.value, "ru", { numeric: true, sensitivity: "base" });
}

export default function AtmStickyTable() {
    const [openModal, setOpenModal] = useState(false);
    const [selectedAtm, setSelectedAtm] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [idQuery, setIdQuery] = useState("");
    const [sort, setSort] = useState({ key: "total", dir: null });

    const navigate = useNavigate();

    // Определяем размер экрана без MUI
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const isSm = windowWidth <= 900;
    const isXs = windowWidth <= 700;

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const atmData = await fetchATM();
                setData(atmData);
                setError(null);
            } catch (err) {
                setError(err.message || 'Ошибка при загрузке данных');
                console.error('Ошибка при загрузке банкоматов:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleOpenModal = (id) => {
        setSelectedAtm(id);
        setOpenModal(true);
    };

    const handleSubmitRange = ({ fromDate, toDate }) => {
        const atmId = selectedAtm;
        if (!atmId || !fromDate || !toDate) return;

        navigate(`/atm/${atmId}/report?from=${fromDate}&to=${toDate}`);
        setOpenModal(false);
    };

    const n = (v) => Number(v ?? 0).toLocaleString();

    const calcExpenseTjs = (row) =>
        (row.tjs200 ?? 0) * 200 +
        (row.tjs100 ?? 0) * 100 +
        (row.tjs50 ?? 0) * 50 +
        (row.tjs20 ?? 0) * 20 +
        (row.tjs10 ?? 0) * 10;

    const rows = useMemo(() => data.map(transformAtm), [data]);

    const filteredRows = useMemo(() => {
        const q = String(idQuery || "").trim();
        if (!q) return rows;
        return rows.filter((r) => String(r.id ?? "").includes(q));
    }, [rows, idQuery]);

    const sortedRows = useMemo(() => {
        const arr = [...filteredRows];
        const { key, dir } = sort;
        if (!dir) return arr;

        const mul = dir === "asc" ? 1 : -1;

        arr.sort((a, b) => {
            let cmp = 0;

            if (key === "total") cmp = calcExpenseTjs(a) - calcExpenseTjs(b);
            else if (key === "id") cmp = compareId(a.id, b.id);
            else if (key === "errors") {
                const ae = (a.errors?.length || 0) > 0 ? 1 : 0;
                const be = (b.errors?.length || 0) > 0 ? 1 : 0;
                cmp = ae - be;
            } else if (key === "warnings") {
                const aw = (a.warnings?.length || 0) > 0 ? 1 : 0;
                const bw = (b.warnings?.length || 0) > 0 ? 1 : 0;
                cmp = aw - bw;
            }

            cmp = cmp * mul;
            if (cmp === 0) cmp = compareId(a.id, b.id);
            return cmp;
        });

        return arr;
    }, [filteredRows, sort]);

    const exportToExcel = () => {
        const sheetRows = sortedRows.map((r) => ({
            Локация: r.location,
            ID: r.id,
            Область: r.region,
            Адрес: r.address,

            "USD 100": r.usd100,
            "TJS 200": r.tjs200,
            "TJS 100": r.tjs100,
            "TJS 50": r.tjs50,
            "TJS 20": r.tjs20,
            "TJS 10": r.tjs10,

            "Всего (TJS)": calcExpenseTjs(r),
        }));

        const ws = XLSX.utils.json_to_sheet(sheetRows);

        const keys = Object.keys(sheetRows[0] || {});
        ws["!cols"] = keys.map((k) => {
            const maxLen = Math.max(k.length, ...sheetRows.map((r) => String(r[k] ?? "").length));
            const wch = Math.min(Math.max(maxLen + 2, 10), 60);
            return { wch };
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ATM");
        const name = `atm_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, name);
    };

    // Определяем номиналы в зависимости от размера экрана
    const denomCols = useMemo(() => {
        const full = [
            { key: "usd100", label: "100$" },
            { key: "tjs200", label: "200tjs" },
            { key: "tjs100", label: "100tjs" },
            { key: "tjs50", label: "50tjs" },
            { key: "tjs20", label: "20tjs" },
            { key: "tjs10", label: "10tjs" },
        ];

        if (isXs) {
            return [
                { key: "tjs200", label: "200tjs" },
                { key: "tjs100", label: "100tjs" },
                { key: "tjs50", label: "50tjs" },
            ];
        }

        if (isSm) {
            return [
                { key: "tjs200", label: "200tjs" },
                { key: "tjs100", label: "100tjs" },
                { key: "tjs50", label: "50tjs" },
                { key: "tjs20", label: "20tjs" },
            ];
        }

        return full;
    }, [isSm, isXs]);

    const clickSort = (key) => {
        setSort((prev) => {
            if (prev.key !== key) return { key, dir: "desc" };
            return { key, dir: cycleDir(prev.dir) };
        });
    };

    const sortMark = (key) => {
        if (sort.key !== key) return "";
        if (sort.dir === "desc") return " ↓";
        if (sort.dir === "asc") return " ↑";
        return "";
    };

    if (error) {
        return (
            <div className="error-container">
                <div className="error-message">Ошибка: {error}</div>
                <button
                    onClick={() => window.location.reload()}
                    className="retry-button"
                >
                    Повторить попытку
                </button>
            </div>
        );
    }

    return (
        <div className="table-container">
            <div className="table-controls">
                <input
                    type="text"
                    className="search-input"
                    value={idQuery}
                    onChange={(e) => setIdQuery(e.target.value)}
                    placeholder="Поиск по ID банкомата"
                />

                <button className="export-button" onClick={exportToExcel}>
                    Экспорт в Excel
                </button>
            </div>

            <div className="table-wrapper">
                <table className="sticky-table">
                    <thead>
                    {/* ====== HEAD ROW 1 ====== */}
                    <tr className="table-header-row">
                        <th
                            className="table-header table-header-location"
                            colSpan={2}
                        >
                            Расположение банкоматов
                        </th>

                        <th
                            className="table-header table-header-id sortable"
                            onClick={() => clickSort("id")}
                            title="Нажми для сортировки"
                        >
                            ID банкомата{sortMark("id")}
                        </th>

                        <th className="table-header table-header-region">
                            Область
                        </th>

                        <th className="table-header table-header-address">
                            Адрес
                        </th>

                        <th className="table-header" colSpan={denomCols.length}>
                            Количество
                        </th>

                        <th
                            className="table-header table-header-total sortable"
                            onClick={() => clickSort("total")}
                            title="Нажми для сортировки"
                        >
                            Всего (TJS){sortMark("total")}
                        </th>

                        <th
                            className="table-header table-header-issues sortable"
                            onClick={() => clickSort("errors")}
                            title="Сначала банкоматы с ошибками"
                        >
                            Ошибки{sortMark("errors")}
                        </th>

                        <th
                            className="table-header table-header-issues sortable"
                            onClick={() => clickSort("warnings")}
                            title="Сначала банкоматы с предупреждениями"
                        >
                            Предупреждения{sortMark("warnings")}
                        </th>

                        <th className="table-header table-header-actions">
                            Действия
                        </th>
                    </tr>

                    {/* ====== HEAD ROW 2 (номиналы) ====== */}
                    <tr className="table-subheader-row">
                        <th className="table-subheader table-header-location" colSpan={2} />
                        <th className="table-subheader table-header-id" />
                        <th className="table-subheader table-header-region" />
                        <th className="table-subheader table-header-address" />

                        {denomCols.map((c) => (
                            <th key={c.key} className="table-subheader table-header-denom">
                                {c.label}
                            </th>
                        ))}

                        <th className="table-subheader table-header-total" />
                        <th className="table-subheader table-header-issues" />
                        <th className="table-subheader table-header-issues" />
                        <th className="table-subheader table-header-actions" />
                    </tr>
                    </thead>

                    <tbody>
                    {loading && (
                        <tr>
                            <td className="table-cell" colSpan={15} align="center">
                                Загрузка...
                            </td>
                        </tr>
                    )}

                    {!loading && sortedRows.length === 0 && (
                        <tr>
                            <td className="table-cell" colSpan={15} align="center">
                                Нет данных
                            </td>
                        </tr>
                    )}

                    {!loading &&
                        sortedRows.map((row) => {
                            const total = calcExpenseTjs(row);

                            return (
                                <tr className="table-row" key={String(row.id)}>
                                    <td className="table-cell table-cell-location" colSpan={2}>
                                        {row.location}
                                    </td>

                                    <td className="table-cell table-cell-id">
                                        <div>{row.id}</div>
                                        <div className="atm-state">{row.atmState}</div>
                                    </td>

                                    <td className="table-cell table-cell-region">
                                        {row.region}
                                    </td>

                                    <td className="table-cell table-cell-address">{row.address}</td>

                                    {denomCols.map((c) => (
                                        <td key={c.key} className="table-cell table-cell-denom">
                                            {row[c.key] ?? 0}
                                        </td>
                                    ))}

                                    <td className="table-cell table-cell-total">
                                        {n(total)} TJS
                                    </td>

                                    <td className="table-cell table-cell-issues">
                                        <ListChips items={row.errors} kind="error" />
                                    </td>

                                    <td className="table-cell table-cell-issues">
                                        <ListChips items={row.warnings} kind="warning" />
                                    </td>

                                    <td className="table-cell table-cell-actions">
                                        <button
                                            className="action-button"
                                            onClick={() => handleOpenModal(row.id)}
                                        >
                                            выписка
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <DateRangeModal open={openModal} onClose={() => setOpenModal(false)} onSubmit={handleSubmitRange} />
        </div>
    );
}
