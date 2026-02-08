import { useEffect, useMemo, useState } from "react";
import { Resizable } from "react-resizable";
import "react-resizable/css/styles.css";

import DateRangeModal from "../../components/dialog/dialog";
import "../../styles/components/table-controls.scss";

import { fetchATM } from "../../api/atm/atm.js";
import { fetchHistory } from "../../api/atm/atm.js";

import {
  ATM_ERRORS_RU,
  ATM_WARNINGS_RU,
} from "../../shared/atm-errors/atm-errors";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import SortIcon from "../../components/general/SortIcon.jsx";
// import "../../styles/components/table-sorting.scss"; // If needed, but global.scss should have it

/** ====== ПЕРЕВОДЫ ====== */
const normalizeKey = (s) =>
  String(s ?? "")
    .trim()
    .replace(/\s+/g, " ");

const translateIssue = (x, kind = "error") => {
  if (x == null) return "";

  const raw =
    typeof x === "string" || typeof x === "number"
      ? String(x)
      : (x?.message ?? x?.text ?? x?.code ?? JSON.stringify(x));

  const key = normalizeKey(raw);
  if (!key) return "";

  if (kind === "warning") return ATM_WARNINGS_RU[key] || key;
  return ATM_ERRORS_RU[key] || key;
};

/** ====== RESIZABLE TH ====== */
const ResizableTh = ({
  width,
  onResize,
  className,
  children,
  colSpan,
  title,
}) => {
  if (!width) {
    return (
      <th className={className} colSpan={colSpan} title={title}>
        {children}
      </th>
    );
  }

  return (
    <Resizable
      width={width}
      height={0}
      resizeHandles={["e"]} // тянем только вправо
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
      handle={
        <span
          className="resize-handle"
          onMouseDown={(e) => {
            e.stopPropagation(); // 🔥 важно
          }}
          onClick={(e) => e.stopPropagation()}
        />
      }
    >
      <th
        className={className}
        colSpan={colSpan}
        title={title}
        style={{ width, maxWidth: width, position: "relative" }}
      >
        {children}
      </th>
    </Resizable>
  );
};

/** ====== МАППЕР СЕРВЕРА -> СТРОКА ДЛЯ ТАБЛИЦЫ ====== */
const getDispCount = (dispenser = [], currency, denom) => {
  const item = dispenser.find(
    (d) => d.currency === currency && d.denomination === denom,
  );
  return item?.currentBanknotes ?? 0;
};

const sumBalance = (dispenser = [], currency) =>
  dispenser
    .filter((d) => d.currency === currency)
    .reduce(
      (acc, d) => acc + (d.currentBanknotes ?? 0) * (d.denomination ?? 0),
      0,
    );

const ListChips = ({ items = [], kind = "error" }) => {
  if (!items?.length) return <span className="empty-value">—</span>;

  return (
    <div className="chips-container">
      {items.map((it, i) => {
        const ru = translateIssue(it, kind);
        const en = normalizeKey(
          typeof it === "string" || typeof it === "number"
            ? it
            : (it?.message ?? it?.text ?? it?.code ?? ""),
        );

        return (
          <div
            key={`${kind}-${i}`}
            className={`chip ${kind === "error" ? "chip-error" : "chip-warning"}`}
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

/** ===== sort helpers ===== */
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
  return A.value.localeCompare(B.value, "ru", {
    numeric: true,
    sensitivity: "base",
  });
}

export default function AtmStickyTable() {
  const [openModal, setOpenModal] = useState(false);
  const [selectedAtm, setSelectedAtm] = useState(null);

  const [atmData, setAtmData] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [idQuery, setIdQuery] = useState("");
  const [sort, setSort] = useState({ key: "total", direction: null });

  // Mapping for SortIcon compatibility
  const sortConfigForIcon = useMemo(
    () => ({
      key: sort.key,
      direction: sort.direction,
    }),
    [sort],
  );

  const navigate = useNavigate();

  /** ====== widths (resizable) ====== */
  const [colWidths, setColWidths] = useState({
    location: 320, // colSpan 2
    id: 150,
    region: 170,
    address: 320,
    total: 170,
    turnover: 170,
    bpt: 230,
    daysEnough: 170, // ✅ NEW
    errors: 260,
    warnings: 260,
    actions: 130,
  });

  const onResize =
    (key) =>
    (e, { size }) => {
      setColWidths((prev) => ({
        ...prev,
        [key]: Math.max(size.width, 90),
      }));
    };

  /** breakpoints (как в 1-й версии) */
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isSm = windowWidth <= 900;
  const isXs = windowWidth <= 700;

  useEffect(() => {
    const onResizeWin = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResizeWin);
    return () => window.removeEventListener("resize", onResizeWin);
  }, []);

  /** load data (без redux) */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const todayStr = new Date().toISOString().slice(0, 10);
        const yesterdayStr = new Date(Date.now() - 86400000)
          .toISOString()
          .slice(0, 10);

        const [atms, hist] = await Promise.all([
          fetchATM(),
          fetchHistory(yesterdayStr, todayStr),
        ]);

        setAtmData(atms || []);
        setHistory(hist || []);
        setError(null);
      } catch (e) {
        setError(e?.message || "Ошибка при загрузке данных");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
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

  /** denom columns */
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

  const yesterdayYYYYMMDD = new Date(Date.now() - 86400000)
    .toISOString()
    .slice(0, 10);
  const atmIds = useMemo(
    () => new Set((atmData || []).map((a) => a?.TID)),
    [atmData],
  );

  /** ✅ оборот вчера */
  const turnoverMap = useMemo(() => {
    const map = new Map();
    (history || []).forEach((trans) => {
      if (
        atmIds.has(trans.atmId) &&
        Number(trans.amount) > 0 &&
        trans.reversal !== 1 &&
        (trans.responseCode === "-1" ||
          String(trans.responseDescription || "").includes("Успешно")) &&
        trans.localTransactionDate === yesterdayYYYYMMDD
      ) {
        map.set(
          trans.atmId,
          (map.get(trans.atmId) || 0) + Number(trans.amount) / 100,
        );
      }
    });
    return map;
  }, [history, atmIds, yesterdayYYYYMMDD]);

  /** ✅ NEW: средний расход в день по каждому ATM (по тем дням, что пришли в history) */
  const avgSpentPerDayMap = useMemo(() => {
    // Map<atmId, {sum, days:Set}>
    const tmp = new Map();

    (history || []).forEach((trans) => {
      if (
        atmIds.has(trans.atmId) &&
        Number(trans.amount) > 0 &&
        trans.reversal !== 1 &&
        (trans.responseCode === "-1" ||
          String(trans.responseDescription || "").includes("Успешно"))
      ) {
        const day = String(trans.localTransactionDate || "").slice(0, 10);
        if (!day) return;

        const sum = Number(trans.amount) / 100;

        if (!tmp.has(trans.atmId))
          tmp.set(trans.atmId, { sum: 0, days: new Set() });
        const obj = tmp.get(trans.atmId);

        obj.sum += sum;
        obj.days.add(day);
      }
    });

    // Map<atmId, avgPerDay>
    const res = new Map();
    for (const [atmId, obj] of tmp.entries()) {
      const daysCount = Math.max(1, obj.days.size);
      res.set(atmId, obj.sum / daysCount);
    }

    return res;
  }, [history, atmIds]);

  const rows = useMemo(() => {
    return (atmData || []).map((atm) => {
      const base = transformAtm(atm);
      const turnover = turnoverMap.get(atm?.TID) || 0;

      const avgSpentPerDay = avgSpentPerDayMap.get(atm?.TID) || 0; // ✅ NEW

      return {
        ...base,
        turnoverYesterday: turnover,
        balancePlusTurnover: base.balanceTjs + turnover,
        avgSpentPerDay, // ✅ NEW
      };
    });
  }, [atmData, turnoverMap, avgSpentPerDayMap]);

  const filteredRows = useMemo(() => {
    const q = String(idQuery || "").trim();
    if (!q) return rows;
    return rows.filter((r) => String(r.id ?? "").includes(q));
  }, [rows, idQuery]);

  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    const { key, direction: dir } = sort;
    if (!dir) return arr;

    const mul = dir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      let cmp = 0;

      if (key === "total") cmp = calcExpenseTjs(a) - calcExpenseTjs(b);
      else if (key === "id") cmp = compareId(a.id, b.id);
      else if (key === "turnover")
        cmp = (a.turnoverYesterday || 0) - (b.turnoverYesterday || 0);
      else if (key === "balancePlusTurnover")
        cmp = (a.balancePlusTurnover || 0) - (b.balancePlusTurnover || 0);
      else if (key === "daysEnough") {
        const da = a.avgSpentPerDay > 0 ? a.balanceTjs / a.avgSpentPerDay : -1;
        const db = b.avgSpentPerDay > 0 ? b.balanceTjs / b.avgSpentPerDay : -1;
        cmp = da - db;
      } else if (key === "errors")
        cmp = (a.errors?.length ? 1 : 0) - (b.errors?.length ? 1 : 0);
      else if (key === "warnings")
        cmp = (a.warnings?.length ? 1 : 0) - (b.warnings?.length ? 1 : 0);

      cmp *= mul;
      if (cmp === 0) cmp = compareId(a.id, b.id);
      return cmp;
    });

    return arr;
  }, [filteredRows, sort]);

  const exportToExcel = () => {
    const sheetRows = sortedRows.map((r) => {
      const daysEnough =
        r.avgSpentPerDay > 0 ? r.balanceTjs / r.avgSpentPerDay : null;

      return {
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
        "Остаток (TJS)": r.balanceTjs,
        "Оборот (вчера)": r.turnoverYesterday,
        "Остаток+Оборот (вчера)": r.balancePlusTurnover,

        "Хватит (дней)":
          daysEnough == null ? "" : Number(daysEnough).toFixed(1), // ✅ NEW
        "Расход/день (средний)": r.avgSpentPerDay
          ? Number(r.avgSpentPerDay).toFixed(0)
          : "", // ✅ NEW
      };
    });

    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const keys = Object.keys(sheetRows[0] || {});
    ws["!cols"] = keys.map((k) => {
      const maxLen = Math.max(
        k.length,
        ...sheetRows.map((row) => String(row[k] ?? "").length),
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ATM");
    XLSX.writeFile(wb, `atm_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const clickSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "desc" };

      let nextDir = null;
      if (prev.direction === "desc") nextDir = "asc";
      else if (prev.direction === "asc") nextDir = null;
      else nextDir = "desc";

      return { key, direction: nextDir };
    });
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
              <ResizableTh
                width={colWidths.location}
                onResize={onResize("location")}
                className="table-header table-header-location"
                colSpan={2}
              >
                Расположение банкоматов
              </ResizableTh>

              <ResizableTh
                width={colWidths.id}
                onResize={onResize("id")}
                className="table-header table-header-id sortable-header"
                title="Нажми для сортировки"
              >
                <div onClick={() => clickSort("id")}>
                  ID банкомата{" "}
                  <SortIcon sortConfig={sortConfigForIcon} sortKey="id" />
                </div>
              </ResizableTh>

              <ResizableTh
                width={colWidths.region}
                onResize={onResize("region")}
                className="table-header table-header-region"
              >
                Область
              </ResizableTh>

              <ResizableTh
                width={colWidths.address}
                onResize={onResize("address")}
                className="table-header table-header-address"
              >
                Адрес
              </ResizableTh>

              <th className="table-header" colSpan={denomCols.length}>
                Количество
              </th>

              <ResizableTh
                width={colWidths.total}
                onResize={onResize("total")}
                className="table-header table-header-total sortable-header"
                title="Нажми для сортировки"
              >
                <div onClick={() => clickSort("total")}>
                  Всего (TJS){" "}
                  <SortIcon sortConfig={sortConfigForIcon} sortKey="total" />
                </div>
              </ResizableTh>

              <ResizableTh
                width={colWidths.turnover}
                onResize={onResize("turnover")}
                className="table-header table-header-turnover sortable-header"
                title="Нажми для сортировки"
              >
                <div onClick={() => clickSort("turnover")}>
                  Оборот (вчера){" "}
                  <SortIcon sortConfig={sortConfigForIcon} sortKey="turnover" />
                </div>
              </ResizableTh>

              <ResizableTh
                width={colWidths.bpt}
                onResize={onResize("bpt")}
                className="table-header table-header-bpt sortable-header"
                title="Нажми для сортировки"
              >
                <div onClick={() => clickSort("balancePlusTurnover")}>
                  Остаток + Оборот{" "}
                  <SortIcon
                    sortConfig={sortConfigForIcon}
                    sortKey="balancePlusTurnover"
                  />
                </div>
              </ResizableTh>

              {/* ✅ NEW COLUMN */}
              <ResizableTh
                width={colWidths.daysEnough}
                onResize={onResize("daysEnough")}
                className="table-header table-header-days sortable-header"
                title="Сколько дней хватит остатка (остаток / средний расход в день)"
              >
                <div onClick={() => clickSort("daysEnough")}>
                  Хватит (дней){" "}
                  <SortIcon
                    sortConfig={sortConfigForIcon}
                    sortKey="daysEnough"
                  />
                </div>
              </ResizableTh>

              <ResizableTh
                width={colWidths.errors}
                onResize={onResize("errors")}
                className="table-header table-header-issues sortable-header"
                title="Сначала банкоматы с ошибками"
              >
                <div onClick={() => clickSort("errors")}>
                  Ошибки{" "}
                  <SortIcon sortConfig={sortConfigForIcon} sortKey="errors" />
                </div>
              </ResizableTh>

              <ResizableTh
                width={colWidths.warnings}
                onResize={onResize("warnings")}
                className="table-header table-header-issues sortable-header"
                title="Сначала банкоматы с предупреждениями"
              >
                <div onClick={() => clickSort("warnings")}>
                  Предупреждения{" "}
                  <SortIcon sortConfig={sortConfigForIcon} sortKey="warnings" />
                </div>
              </ResizableTh>

              <ResizableTh
                width={colWidths.actions}
                onResize={onResize("actions")}
                className="table-header table-header-actions"
              >
                Действия
              </ResizableTh>
            </tr>

            {/* ====== HEAD ROW 2 (номиналы) ====== */}
            <tr className="table-subheader-row">
              <th
                className="table-subheader table-header-location"
                colSpan={2}
              />
              <th className="table-subheader table-header-id" />
              <th className="table-subheader table-header-region" />
              <th className="table-subheader table-header-address" />
              {denomCols.map((c) => (
                <th key={c.key} className="table-subheader table-header-denom">
                  {c.label}
                </th>
              ))}
              <th className="table-subheader table-header-total" />
              <th className="table-subheader table-header-turnover" />
              <th className="table-subheader table-header-bpt" />
              <th className="table-subheader table-header-days" />{" "}
              {/* ✅ NEW */}
              <th className="table-subheader table-header-issues" />
              <th className="table-subheader table-header-issues" />
              <th className="table-subheader table-header-actions" />
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td className="table-cell" colSpan={40} align="center">
                  Загрузка...
                </td>
              </tr>
            )}

            {!loading && sortedRows.length === 0 && (
              <tr>
                <td className="table-cell" colSpan={40} align="center">
                  Нет данных
                </td>
              </tr>
            )}

            {!loading &&
              sortedRows.map((row) => {
                const total = calcExpenseTjs(row);
                const daysEnough =
                  row.avgSpentPerDay > 0
                    ? row.balanceTjs / row.avgSpentPerDay
                    : null;

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
                    <td className="table-cell table-cell-address">
                      {row.address}
                    </td>

                    {denomCols.map((c) => (
                      <td key={c.key} className="table-cell table-cell-denom">
                        {row[c.key] ?? 0}
                      </td>
                    ))}

                    <td className="table-cell table-cell-total">
                      {n(total)} TJS
                    </td>

                    <td className="table-cell table-cell-turnover">
                      {n(row.turnoverYesterday)} TJS
                    </td>

                    <td className="table-cell table-cell-bpt">
                      {n(row.balancePlusTurnover)} TJS
                      <div className="bpt-sub">
                        остаток: {n(row.balanceTjs)} / оборот:{" "}
                        {n(row.turnoverYesterday)}
                      </div>
                    </td>

                    {/* ✅ NEW CELL */}
                    <td className="table-cell table-cell-days">
                      {daysEnough == null ? (
                        "—"
                      ) : (
                        <>
                          {Number(daysEnough).toFixed(1)}
                          <div className="bpt-sub">
                            расход/день: {n(row.avgSpentPerDay)} TJS
                          </div>
                        </>
                      )}
                    </td>

                    <td className="table-cell table-cell-issues">
                      <ListChips items={row.errors} kind="error" />
                    </td>

                    <td className="table-cell table-cell-issues">
                      <ListChips items={row.warnings} kind="warning" />
                    </td>

                    <td className="table-cell table-cell-actions">
                      <button
                        className="button"
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

      <DateRangeModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleSubmitRange}
      />
    </div>
  );
}
