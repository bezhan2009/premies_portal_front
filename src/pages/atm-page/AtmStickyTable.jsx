import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DateRangeModal from "../../components/dialog/dialog";
import { fetchATM } from "../../api/atm";
import { ATM_ERRORS_RU, ATM_WARNINGS_RU } from "../../shared/atm-errors/atm-errors";

/* ===== helpers ===== */

const normalizeKey = (s) =>
    String(s ?? "").trim().replace(/\s+/g, " ");

const translateIssue = (x, kind = "error") => {
    if (x == null) return "";

    const raw =
        typeof x === "string" || typeof x === "number"
            ? String(x)
            : x?.message ?? x?.text ?? x?.code ?? "";

    const key = normalizeKey(raw);
    if (!key) return "";

    return kind === "warning"
        ? ATM_WARNINGS_RU[key] || key
        : ATM_ERRORS_RU[key] || key;
};

const getDispCount = (disp = [], currency, denom) =>
    disp.find(
        (d) => d.currency === currency && d.denomination === denom
    )?.currentBanknotes ?? 0;

const sumBalance = (disp = [], currency) =>
    disp
        .filter((d) => d.currency === currency)
        .reduce(
            (acc, d) =>
                acc + (d.currentBanknotes ?? 0) * (d.denomination ?? 0),
            0
        );

const transformAtm = (atm) => {
    const disp = atm?.Dispenser ?? [];
    const info = atm?.info ?? {};

    return {
        id: atm?.TID ?? "—",
        atmState: atm?.ATMState ?? "—",

        location: info?.name ?? "—",
        region: info?.region ?? "—",
        address: info?.address ?? "—",

        usd100: getDispCount(disp, "USD", 100),
        tjs200: getDispCount(disp, "TJS", 200),
        tjs100: getDispCount(disp, "TJS", 100),
        tjs50: getDispCount(disp, "TJS", 50),
        tjs20: getDispCount(disp, "TJS", 20),
        tjs10: getDispCount(disp, "TJS", 10),

        balanceUsd: sumBalance(disp, "USD"),
        balanceTjs: sumBalance(disp, "TJS"),

        errors: Array.isArray(atm?.Errors) ? atm.Errors : [],
        warnings: Array.isArray(atm?.Warnings)
            ? atm.Warnings
            : Array.isArray(atm?.Warning)
                ? atm.Warning
                : [],
    };
};

const ListChips = ({ items = [], kind }) => {
    if (!items.length) return <span>—</span>;

    return (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {items.map((it, i) => (
                <span
                    key={i}
                    title={String(it)}
                    style={{
                        padding: "2px 6px",
                        borderRadius: 6,
                        background: kind === "error" ? "#ffd6d6" : "#fff3cd",
                        fontSize: 12,
                    }}
                >
          {translateIssue(it, kind)}
        </span>
            ))}
        </div>
    );
};

/* ===== component ===== */

export default function AtmStickyTable() {
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [openModal, setOpenModal] = useState(false);
    const [selectedAtm, setSelectedAtm] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const atmList = await fetchATM();
                setData(Array.isArray(atmList) ? atmList : []);
                setError(null);
                // eslint-disable-next-line no-unused-vars
            } catch (e) {
                setError("Не удалось загрузить банкоматы");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const rows = useMemo(
        () =>
            Array.isArray(data)
                ? data.map(transformAtm)
                : [],
        [data]
    );

    const calcTotal = (r) =>
        r.tjs200 * 200 +
        r.tjs100 * 100 +
        r.tjs50 * 50 +
        r.tjs20 * 20 +
        r.tjs10 * 10;

    if (error) {
        return (
            <div style={{ padding: 20 }}>
                <b>{error}</b>
                <br />
                <button onClick={() => window.location.reload()}>
                    Перезагрузить
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: 12 }}>
            {loading && <div>Загрузка…</div>}

            {!loading && (
                <table border="1" cellPadding="6" width="100%">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Локация</th>
                        <th>TJS всего</th>
                        <th>Ошибки</th>
                        <th>Предупреждения</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>{r.location}</td>
                            <td>{calcTotal(r).toLocaleString()} TJS</td>
                            <td>
                                <ListChips items={r.errors} kind="error" />
                            </td>
                            <td>
                                <ListChips items={r.warnings} kind="warning" />
                            </td>
                            <td>
                                <button
                                    className="button"
                                    onClick={() => {
                                        setSelectedAtm(r.id);
                                        setOpenModal(true);
                                    }}
                                >
                                    выписка
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}

            <DateRangeModal
                open={openModal}
                onClose={() => setOpenModal(false)}
                onSubmit={({ fromDate, toDate }) => {
                    navigate(
                        `/atm/${selectedAtm}/report?from=${fromDate}&to=${toDate}`
                    );
                    setOpenModal(false);
                }}
            />
        </div>
    );
}
