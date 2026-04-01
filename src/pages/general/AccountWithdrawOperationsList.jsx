import React, { useMemo, useState, useEffect, useCallback } from "react";
import Input from "../../components/elements/Input.jsx";
import { FcOk, FcProcess } from "react-icons/fc";
import { BsArrowUp, BsArrowDown, BsArrowDownUp } from "react-icons/bs";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import PayIcon from "../../assets/pay_icon.png";
import PayedIcon from "../../assets/payed_icon.png";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/components/StatsEQMS.scss";

const ACCOUNT_NUMBER = "26202972381810638175";

const formatDateForQuery = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
};

const today = () => new Date().toISOString().split("T")[0];

export default function AbsWithdrawsList() {
  const backendABS = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
  const token = localStorage.getItem("access_token");

  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());

  const [statementData, setStatementData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const [sortField, setSortField] = useState("doper");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterText, setFilterText] = useState("");
  const [filterPaid, setFilterPaid] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [payingKeys, setPayingKeys] = useState(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showSingleConfirm, setShowSingleConfirm] = useState(false);
  const [singleTarget, setSingleTarget] = useState(null);

  const [alert, setAlert] = useState(null);
  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const flatRows = useMemo(
    () =>
      statementData.flatMap((day) =>
        (day.Transactions || []).map((tx) => ({
          ...tx,
          doper: day.DOPER,
          kurs: day.Kurs,
          sumBalOut: day.SumBalOut,
          sumMovD: day.SumMovD,
          sumMovC: day.SumMovC,
          _key: `${day.DOPER}__${tx.NUMDOC}__${tx.REFER}`,
        })),
      ),
    [statementData],
  );

  const handleFetch = useCallback(
    async ({ showSuccess = false } = {}) => {
      setLoading(true);
      setFetched(false);
      setSelectedKeys([]);
      setSelectAll(false);
      try {
        const sd = formatDateForQuery(startDate);
        const ed = formatDateForQuery(endDate);
        const url = `${backendABS}/abs-withdraw/operations?startDate=${sd}&endDate=${ed}&accountNumber=${ACCOUNT_NUMBER}`;
        const resp = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        setStatementData(json || []);
        setFetched(true);
        if (showSuccess) {
          showAlert(
            `Загружено ${(json || []).reduce((sum, day) => sum + (day.Transactions?.length || 0), 0)} транзакций`,
            "success",
          );
        }
      } catch (err) {
        console.error(err);
        showAlert("Ошибка загрузки выписки. Проверьте сервер.", "error");
      } finally {
        setLoading(false);
      }
    },
    [backendABS, token, startDate, endDate],
  );

  const silentRefresh = async () => {
    try {
      const sd = formatDateForQuery(startDate);
      const ed = formatDateForQuery(endDate);
      const url = `${backendABS}/abs-withdraw/operations?startDate=${sd}&endDate=${ed}&accountNumber=${ACCOUNT_NUMBER}`;
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) return;
      const json = await resp.json();
      setStatementData(json || []);
    } catch (_) {
      // silent refresh
    }
  };

  useEffect(() => {
    handleFetch();
  }, [handleFetch]);

  const filteredRows = useMemo(() => {
    let rows = flatRows;
    if (filterPaid === "paid") rows = rows.filter((row) => row.IsPayed);
    if (filterPaid === "unpaid") rows = rows.filter((row) => !row.IsPayed);
    if (filterText.trim()) {
      const query = filterText.toLowerCase();
      rows = rows.filter((row) =>
        [row.NUMDOC, row.CLIENTCOR, row.TXTDSCR, row.REFER, row.ACCCOR, row.NAMEBCR, row.doper].some(
          (value) => value && String(value).toLowerCase().includes(query),
        ),
      );
    }
    return rows;
  }, [flatRows, filterPaid, filterText]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      const cmp = String(av).localeCompare(String(bv), "ru", { numeric: true });
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filteredRows, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleRow = (key, checked) => {
    if (checked) {
      setSelectedKeys((prev) => [...prev, key]);
      return;
    }
    setSelectedKeys((prev) => prev.filter((item) => item !== key));
    setSelectAll(false);
  };

  const toggleAll = () => {
    if (selectAll) {
      setSelectedKeys([]);
      setSelectAll(false);
      return;
    }
    setSelectedKeys(sortedRows.map((row) => row._key));
    setSelectAll(true);
  };

  const selectUnpaid = () => {
    setSelectedKeys(sortedRows.filter((row) => !row.IsPayed).map((row) => row._key));
    setSelectAll(false);
  };

  const totalPaid = useMemo(() => flatRows.filter((row) => row.IsPayed).length, [flatRows]);
  const totalUnpaid = useMemo(() => flatRows.filter((row) => !row.IsPayed).length, [flatRows]);

  const payOne = async (row) => {
    const params = new URLSearchParams({
      date: row.doper || "",
      execdt: row.EXECDT || "",
      txtdscr: row.TXTDSCR || "",
      txnumdoc: row.NUMDOC || "",
    });
    const url = `${backendABS}/abs-withdraw/transactions/pay?${params.toString()}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ payer_iban: ACCOUNT_NUMBER }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json.error || `Ошибка сервера: ${resp.status}`);
    if (json.error) throw new Error(json.error);
    return json;
  };

  const handlePayClick = (row) => {
    if (row.IsPayed) {
      showAlert("Транзакция уже оплачена", "warning");
      return;
    }
    setSingleTarget(row);
    setShowSingleConfirm(true);
  };

  const performSinglePayment = async () => {
    if (!singleTarget) return;
    setShowSingleConfirm(false);
    const row = singleTarget;
    setSingleTarget(null);
    setPayingKeys((prev) => new Set([...prev, row._key]));
    try {
      await payOne(row);
      showAlert("Оплата успешно отправлена!", "success");
      setTimeout(silentRefresh, 800);
    } catch (err) {
      console.error(err);
      showAlert(`Ошибка оплаты: ${err.message}`, "error");
    } finally {
      setPayingKeys((prev) => {
        const next = new Set(prev);
        next.delete(row._key);
        return next;
      });
    }
  };

  const handlePayAll = () => {
    const toPay = sortedRows.filter((row) => selectedKeys.includes(row._key) && !row.IsPayed);
    if (toPay.length === 0) {
      showAlert("Нет выбранных неоплаченных транзакций", "warning");
      return;
    }
    setShowBulkConfirm(true);
  };

  const performBulkPayment = async () => {
    setShowBulkConfirm(false);
    const toPay = sortedRows.filter((row) => selectedKeys.includes(row._key) && !row.IsPayed);
    setPayingKeys((prev) => new Set([...prev, ...toPay.map((row) => row._key)]));

    let ok = 0;
    const fails = [];
    const batchSize = 50;
    const delay = 3000;

    for (let i = 0; i < toPay.length; i += batchSize) {
      const batch = toPay.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (row) => {
          try {
            await payOne(row);
            ok += 1;
          } catch (err) {
            fails.push({ numdoc: row.NUMDOC, error: err.message });
          }
        }),
      );

      if (i + batchSize < toPay.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    showAlert(`Успешно: ${ok}. Ошибок: ${fails.length}.`, fails.length === 0 ? "success" : "warning");
    if (fails.length) {
      console.error("Ошибки оплаты:", fails);
    }

    setPayingKeys((prev) => {
      const next = new Set(prev);
      toPay.forEach((row) => next.delete(row._key));
      return next;
    });
    setTimeout(silentRefresh, 800);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <BsArrowDownUp className="eqms-th__icon--idle" />;
    return sortDirection === "asc" ? <BsArrowUp /> : <BsArrowDown />;
  };

  const columns = [
    { key: "doper", label: "Дата операции" },
    { key: "DOCDOPER", label: "Дата документа" },
    { key: "EXECDT", label: "Время" },
    { key: "NUMDOC", label: "Номер документа" },
    { key: "TXTDSCR", label: "Описание" },
    { key: "CLIENTCOR", label: "Клиент-корреспондент" },
    { key: "ACCCOR", label: "Счёт-корреспондент" },
    { key: "NAMEBCR", label: "Банк-корреспондент" },
    { key: "MOVD", label: "Дебет" },
    { key: "MOVC", label: "Кредит" },
    { key: "sumBalOut", label: "Баланс (конец)" },
    { key: "REFER", label: "Референс" },
    { key: "DVAL", label: "Валютная дата" },
    { key: "kurs", label: "Курс" },
  ];

  return (
    <>
      <div className="page-content-wrapper content-page">
        <div className="applications-list" style={{ flexDirection: "column", gap: "20px", height: "auto" }}>
          <main>
            <div className="my-applications-header">
              <button
                className={!showFilters ? "filter-toggle" : "Unloading"}
                onClick={() => setShowFilters((value) => !value)}
                disabled={!fetched}
              >
                Фильтры
              </button>

              <pre> </pre>

              <button
                className="save"
                onClick={handlePayAll}
                disabled={selectedKeys.length === 0 || payingKeys.size > 0}
              >
                Оплатить выбранные
              </button>

              <button onClick={toggleAll} className={selectAll ? "selectAll-toggle" : ""} disabled={!fetched}>
                {selectAll ? "Снять выделение" : "Выбрать все"}
              </button>

              <button className="edit" onClick={selectUnpaid} disabled={!fetched}>
                Выбрать неоплаченные
              </button>

              {fetched && (
                <div className="selection-stats-card">
                  <div className="stat">
                    <span className="label">Выбрано</span>
                    <strong className="value">{selectedKeys.length}</strong>
                  </div>
                  <div className="divider" />
                  <div className="stat">
                    <span className="label">Оплачено</span>
                    <strong className="value paid">{totalPaid}</strong>
                  </div>
                  <div className="divider" />
                  <div className="stat">
                    <span className="label">Не оплачено</span>
                    <strong className="value">{totalUnpaid}</strong>
                  </div>
                  <div className="divider" />
                  <div className="stat highlight">
                    <span className="label">Всего транзакций</span>
                    <strong className="value amount">{flatRows.length}</strong>
                  </div>
                </div>
              )}
            </div>

            {showFilters && fetched && (
              <div className="filters animate-slideIn">
                <input
                  placeholder="Поиск (документ, клиент, описание, референс…)"
                  style={{ minWidth: 280 }}
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                <select
                  value={filterPaid}
                  onChange={(e) => setFilterPaid(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}
                >
                  <option value="all">Все статусы</option>
                  <option value="paid">Оплачено</option>
                  <option value="unpaid">Не оплачено</option>
                </select>
              </div>
            )}

            <div className="my-applications-sub-header">
              <div>
                Начало&nbsp;
                <Input type="date" value={startDate} onChange={(value) => setStartDate(value)} style={{ width: 150 }} />
              </div>
              <div>
                Конец&nbsp;
                <Input type="date" value={endDate} onChange={(value) => setEndDate(value)} style={{ width: 150 }} />
              </div>
              {loading && <Spinner size="small" />}
              {loading && <span style={{ color: "#666" }}>Загрузка…</span>}
            </div>

            <div className="my-applications-content" style={{ position: "relative" }}>
              {!fetched && !loading && (
                <div style={{ textAlign: "center", padding: "3rem", color: "gray" }}>
                  Выберите период для загрузки выписки
                </div>
              )}

              {loading && (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <Spinner center label="Загружаем выписку" />
                  Загрузка…
                </div>
              )}

              {fetched && !loading && sortedRows.length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem", color: "gray" }}>
                  Нет транзакций за выбранный период
                </div>
              )}

              {fetched && !loading && sortedRows.length > 0 && (
                <table className="eqms-table">
                  <thead>
                    <tr>
                      <th className="eqms-th eqms-th--checkbox">
                        <input type="checkbox" className="custom-checkbox" checked={selectAll} onChange={toggleAll} />
                      </th>

                      {columns.map(({ key, label }) => (
                        <th
                          key={key}
                          className={`eqms-th eqms-th--sortable${sortField === key ? " eqms-th--active" : ""}`}
                          onClick={() => handleSort(key)}
                        >
                          <span className="eqms-th__label">{label}</span>
                          <span className="eqms-th__icon"><SortIcon field={key} /></span>
                        </th>
                      ))}

                      <th className="eqms-th">Статус оплаты</th>
                      <th className="eqms-th active-table">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => {
                      const isPaying = payingKeys.has(row._key);
                      const isPaid = Boolean(row.IsPayed);

                      return (
                        <tr key={row._key} style={{ backgroundColor: isPaid ? "#e6ffe6" : "transparent" }}>
                          <td>
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={selectedKeys.includes(row._key)}
                              onChange={(e) => toggleRow(row._key, e.target.checked)}
                            />
                          </td>

                          {columns.map(({ key }) => (
                            <td key={key}>{row[key] ?? "—"}</td>
                          ))}

                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {isPaid ? (
                                <>
                                  <FcOk style={{ fontSize: 20 }} />
                                  <span style={{ color: "green", fontWeight: 500 }}>Оплачено</span>
                                </>
                              ) : (
                                <>
                                  <FcProcess style={{ fontSize: 20 }} />
                                  <span style={{ color: "#999" }}>Ожидает</span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="active-table">
                            <button
                              className={`pay-button ${isPaid ? "paid" : ""}`}
                              onClick={() => handlePayClick(row)}
                              disabled={isPaying || isPaid}
                              style={{
                                padding: "8px 12px",
                                borderRadius: 6,
                                border: "none",
                                cursor: isPaid || isPaying ? "not-allowed" : "pointer",
                                opacity: isPaid || isPaying ? 0.6 : 1,
                                fontWeight: 500,
                                transition: "all 0.2s",
                                minWidth: 120,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                              }}
                            >
                              {isPaying ? (
                                <>Оплачивается…</>
                              ) : isPaid ? (
                                <>
                                  <img src={PayedIcon} width={24} height={24} alt="Оплачено" />
                                  Оплачено
                                </>
                              ) : (
                                <>
                                  <img src={PayIcon} width={24} height={24} alt="Оплатить" />
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

        {alert && <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}

        {showBulkConfirm && (
          <div className="logout-confirmation">
            <div className="confirmation-box">
              <div>
                <h1>Подтверждение оплаты</h1>
                <p>
                  Вы уверены, что хотите оплатить все выбранные неоплаченные транзакции?
                  <br />
                  Количество: <strong>{sortedRows.filter((row) => selectedKeys.includes(row._key) && !row.IsPayed).length}</strong>
                  <br />
                  <br />
                  После подтверждения отменить операцию будет невозможно.
                </p>
              </div>
              <div className="confirmation-buttons">
                <button className="confirm-btn" onClick={performBulkPayment}>Да, оплатить</button>
                <button className="cancel-btn" onClick={() => setShowBulkConfirm(false)}>Отмена</button>
              </div>
            </div>
          </div>
        )}

        {showSingleConfirm && singleTarget && (
          <div className="logout-confirmation">
            <div className="confirmation-box">
              <div>
                <h1>Подтверждение оплаты</h1>
                <p>
                  Вы уверены, что хотите оплатить транзакцию?
                  <br />
                  <strong>Документ:</strong> {singleTarget.NUMDOC || "—"}
                  <br />
                  <strong>Описание:</strong> {singleTarget.TXTDSCR || "—"}
                  <br />
                  <strong>Дата:</strong> {singleTarget.doper || "—"}
                  <br />
                  <br />
                  После подтверждения отменить операцию будет невозможно.
                </p>
              </div>
              <div className="confirmation-buttons">
                <button className="confirm-btn" onClick={performSinglePayment}>Да, оплатить</button>
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowSingleConfirm(false);
                    setSingleTarget(null);
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
