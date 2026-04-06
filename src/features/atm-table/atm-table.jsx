import { useEffect, useMemo, useState } from "react";
import DateRangeModal from "../../components/dialog/dialog";
import "../../styles/components/table-controls.scss";
import { fetchATM, fetchHistory } from "../../api/atm/atm.js";
import { ATM_ERRORS_RU, ATM_WARNINGS_RU } from "../../shared/atm-errors/atm-errors";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
import { Table } from "../../components/table/FlexibleAntTable.jsx";

/** ====== ПЕРЕВОДЫ ====== */
const normalizeKey = (s) => String(s ?? "").trim().replace(/\s+/g, " ");

const translateIssue = (x, kind = "error") => {
  if (x == null) return "";
  const raw = typeof x === "string" || typeof x === "number" ? String(x) : (x?.message ?? x?.text ?? x?.code ?? JSON.stringify(x));
  const key = normalizeKey(raw);
  if (!key) return "";
  return kind === "warning" ? ATM_WARNINGS_RU[key] || key : ATM_ERRORS_RU[key] || key;
};

const getDispCount = (dispenser = [], currency, denom) => {
  const item = dispenser.find((d) => d.currency === currency && d.denomination === denom);
  return item?.currentBanknotes ?? 0;
};

const sumBalance = (dispenser = [], currency) =>
  dispenser.filter((d) => d.currency === currency).reduce((acc, d) => acc + (d.currentBanknotes ?? 0) * (d.denomination ?? 0), 0);

const ListChips = ({ items = [], kind = "error" }) => {
  if (!items?.length) return <span className="empty-value">—</span>;
  return (
    <div className="chips-container" style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {items.map((it, i) => (
        <div key={`${kind}-${i}`} className={`chip ${kind === "error" ? "chip-error" : "chip-warning"}`} style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "11px", background: kind === "error" ? "#fee2e2" : "#fef3c7" }}>
          {translateIssue(it, kind) || "—"}
        </div>
      ))}
    </div>
  );
};

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
    warnings: Array.isArray(atm?.Warning) ? atm.Warning : Array.isArray(atm?.Warnings) ? atm.Warnings : [],
  };
};

export default function AtmStickyTable() {
  const [openModal, setOpenModal] = useState(false);
  const [selectedAtm, setSelectedAtm] = useState(null);
  const [atmData, setAtmData] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [idQuery, setIdQuery] = useState("");
  const navigate = useNavigate();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isSm = windowWidth <= 900;
  const isXs = windowWidth <= 700;

  useEffect(() => {
    const onResizeWin = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResizeWin);
    return () => window.removeEventListener("resize", onResizeWin);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const todayStr = new Date().toISOString().slice(0, 10);
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const [atms, hist] = await Promise.all([fetchATM(), fetchHistory(yesterdayStr, todayStr)]);
        setAtmData(atms || []);
        setHistory(hist || []);
      } catch (e) {
        setError(e?.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const turnoverMap = useMemo(() => {
    const map = new Map();
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const atmIds = new Set((atmData || []).map(a => a?.TID));
    (history || []).forEach((trans) => {
      if (atmIds.has(trans.atmId) && Number(trans.amount) > 0 && trans.reversal !== 1 && (trans.responseCode === "-1" || String(trans.responseDescription || "").includes("Успешно")) && trans.localTransactionDate === yesterdayStr) {
        map.set(trans.atmId, (map.get(trans.atmId) || 0) + Number(trans.amount) / 100);
      }
    });
    return map;
  }, [history, atmData]);

  const avgSpentPerDayMap = useMemo(() => {
    const tmp = new Map();
    const atmIds = new Set((atmData || []).map(a => a?.TID));
    (history || []).forEach((trans) => {
      if (atmIds.has(trans.atmId) && Number(trans.amount) > 0 && trans.reversal !== 1 && (trans.responseCode === "-1" || String(trans.responseDescription || "").includes("Успешно"))) {
        const day = String(trans.localTransactionDate || "").slice(0, 10);
        if (!day) return;
        if (!tmp.has(trans.atmId)) tmp.set(trans.atmId, { sum: 0, days: new Set() });
        const obj = tmp.get(trans.atmId);
        obj.sum += Number(trans.amount) / 100;
        obj.days.add(day);
      }
    });
    const res = new Map();
    for (const [atmId, obj] of tmp.entries()) res.set(atmId, obj.sum / Math.max(1, obj.days.size));
    return res;
  }, [history, atmData]);

  const rows = useMemo(() => {
    return (atmData || []).map((atm) => {
      const base = transformAtm(atm);
      const turnover = turnoverMap.get(atm?.TID) || 0;
      const avgSpentPerDay = avgSpentPerDayMap.get(atm?.TID) || 0;
      return {
        ...base,
        turnoverYesterday: turnover,
        balancePlusTurnover: base.balanceTjs + turnover,
        avgSpentPerDay,
      };
    }).filter(r => !idQuery || String(r.id).includes(idQuery));
  }, [atmData, turnoverMap, avgSpentPerDayMap, idQuery]);

  const denomCols = useMemo(() => {
    const full = [
      { key: "usd100", label: "100$" }, { key: "tjs200", label: "200т" }, { key: "tjs100", label: "100т" },
      { key: "tjs50", label: "50т" }, { key: "tjs20", label: "20т" }, { key: "tjs10", label: "10т" },
    ];
    if (isXs) return full.slice(1, 4);
    if (isSm) return full.slice(1, 5);
    return full;
  }, [isSm, isXs]);

  const exportToExcel = () => {
    const sheetRows = rows.map((r) => ({
      Локация: r.location, ID: r.id, Область: r.region, Адрес: r.address,
      "Всего (TJS)": (r.tjs200 * 200 + r.tjs100 * 100 + r.tjs50 * 50 + r.tjs20 * 20 + r.tjs10 * 10),
      "Остаток (TJS)": r.balanceTjs, "Оборот (вчера)": r.turnoverYesterday,
      "Хватит (дней)": r.avgSpentPerDay > 0 ? (r.balanceTjs / r.avgSpentPerDay).toFixed(1) : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ATM");
    XLSX.writeFile(wb, `atm_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (error) return <div className="error-container">Ошибка: {error} <button onClick={() => window.location.reload()}>Повторить</button></div>;

  return (
    <div className="table-container" style={{ padding: "20px" }}>
      <div className="table-controls" style={{ marginBottom: "16px", display: "flex", gap: "12px" }}>
        <input type="text" className="search-input" value={idQuery} onChange={(e) => setIdQuery(e.target.value)} placeholder="Поиск по ID" style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }} />
        <button className="export-button" onClick={exportToExcel} style={{ padding: "8px 16px", borderRadius: "6px", background: "#10b981", color: "#fff", border: "none" }}>Экспорт Excel</button>
      </div>

      <Table dataSource={rows} rowKey="id" bordered loading={loading} scroll={{ x: "max-content" }} pagination={{ pageSize: 15 }}>
        <Table.ColumnGroup title="Расположение банкоматов">
          <Table.Column title="Локация" dataIndex="location" sortable fixed="left" />
          <Table.Column title="ID" key="id_state" render={(_, r) => <div><div>{r.id}</div><small style={{ color: "#888" }}>{r.atmState}</small></div>} />
          <Table.Column title="Область" dataIndex="region" />
          <Table.Column title="Адрес" dataIndex="address" />
        </Table.ColumnGroup>
        
        <Table.ColumnGroup title="Номиналы">
          {denomCols.map(c => <Table.Column key={c.key} title={c.label} dataIndex={c.key} align="center" />)}
        </Table.ColumnGroup>

        <Table.Column title="Всего (TJS)" key="total" sortable render={(_, r) => <strong>{(r.tjs200 * 200 + r.tjs100 * 100 + r.tjs50 * 50 + r.tjs20 * 20 + r.tjs10 * 10).toLocaleString()}</strong>} />
        <Table.Column title="Оборот (вчера)" dataIndex="turnoverYesterday" sortable render={(v) => `${v.toLocaleString()} TJS`} />
        <Table.Column title="Остаток + Оборот" key="bpt" sortable render={(_, r) => <div><div>{r.balancePlusTurnover.toLocaleString()}</div><small style={{ color: "#888" }}>ост: {r.balanceTjs.toLocaleString()}</small></div>} />
        <Table.Column title="Хватит (дней)" key="daysEmoji" sortable render={(_, r) => r.avgSpentPerDay > 0 ? <div>{(r.balanceTjs / r.avgSpentPerDay).toFixed(1)} <small style={{ display: "block", color: "#888" }}>~{Math.round(r.avgSpentPerDay).toLocaleString()}/день</small></div> : "—"} />
        
        <Table.Column title="Ошибки" key="errors" render={(_, r) => <ListChips items={r.errors} kind="error" />} />
        <Table.Column title="Предупреждение" key="warnings" render={(_, r) => <ListChips items={r.warnings} kind="warning" />} />
        
        <Table.Column title="Действия" key="actions" fixed="right" render={(_, r) => <button className="button" onClick={() => { setSelectedAtm(r.id); setOpenModal(true); }}>выписка</button>} />
      </Table>

      <DateRangeModal open={openModal} onClose={() => setOpenModal(false)} onSubmit={({ fromDate, toDate }) => { navigate(`/atm/${selectedAtm}/report?from=${fromDate}&to=${toDate}`); setOpenModal(false); }} />
    </div>
  );
}
