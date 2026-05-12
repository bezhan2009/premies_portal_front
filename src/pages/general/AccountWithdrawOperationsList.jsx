import React, { useMemo, useState, useEffect, useCallback } from "react";
import Input from "../../components/elements/Input.jsx";
import { FcOk, FcProcess } from "react-icons/fc";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import PayIcon from "../../assets/pay_icon.png";
import PayedIcon from "../../assets/payed_icon.png";
import Spinner from "../../components/Spinner.jsx";
import { Table } from "../../components/table/FlexibleAntTable.jsx";

// Счёт, по которому загружается выписка (остаётся для GET-запроса)
const STATEMENT_ACCOUNT_NUMBER = "26202972381810638175";

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

  // Формируем плоский список транзакций, добавляя поля из родительского дня
  // и ОБЯЗАТЕЛЬНО account (номер счёта, который нужен для оплаты)
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
          account: day.Account, // ← ключевое поле для payer_iban
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
        const url = `${backendABS}/abs-withdraw/operations?start_date=${sd}&end_date=${ed}&accountNumber=${STATEMENT_ACCOUNT_NUMBER}`;
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

  // Исправлен silentRefresh: параметры теперь start_date / end_date (как в handleFetch)
  const silentRefresh = async () => {
    try {
      const sd = formatDateForQuery(startDate);
      const ed = formatDateForQuery(endDate);
      const url = `${backendABS}/abs-withdraw/operations?start_date=${sd}&end_date=${ed}&accountNumber=${STATEMENT_ACCOUNT_NUMBER}`;
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) return;
      const json = await resp.json();
      setStatementData(json || []);
    } catch (_) {
      // silent refresh – подавляем ошибки
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
        [
          row.NUMDOC,
          row.CLIENTCOR,
          row.TXTDSCR,
          row.REFER,
          row.ACCCOR,
          row.NAMEBCR,
          row.doper,
        ].some((value) => value && String(value).toLowerCase().includes(query)),
      );
    }
    return rows;
  }, [flatRows, filterPaid, filterText]);

  const toggleAll = () => {
    if (selectAll) {
      setSelectedKeys([]);
      setSelectAll(false);
      return;
    }
    setSelectedKeys(filteredRows.map((row) => row._key));
    setSelectAll(true);
  };

  const selectUnpaid = () => {
    setSelectedKeys(
      filteredRows.filter((row) => !row.IsPayed).map((row) => row._key),
    );
    setSelectAll(false);
  };

  const totalPaid = useMemo(
    () => flatRows.filter((row) => row.IsPayed).length,
    [flatRows],
  );
  const totalUnpaid = useMemo(
    () => flatRows.filter((row) => !row.IsPayed).length,
    [flatRows],
  );

  // Функция оплаты одной транзакции – использует account из строки
  const payOne = async (row) => {
    // Защита: если account отсутствует – ошибка
    if (!row.account) {
      throw new Error("Не найден номер счёта (account) для этой транзакции");
    }

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
      body: JSON.stringify({ payer_iban: row.account }), // ← ИСПРАВЛЕНО: берём account из транзакции
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok)
      throw new Error(json.error || `Ошибка сервера: ${resp.status}`);
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
    const toPay = filteredRows.filter(
      (row) => selectedKeys.includes(row._key) && !row.IsPayed,
    );
    if (toPay.length === 0) {
      showAlert("Нет выбранных неоплаченных транзакций", "warning");
      return;
    }
    setShowBulkConfirm(true);
  };

  const performBulkPayment = async () => {
    setShowBulkConfirm(false);
    const toPay = filteredRows.filter(
      (row) => selectedKeys.includes(row._key) && !row.IsPayed,
    );
    setPayingKeys(
      (prev) => new Set([...prev, ...toPay.map((row) => row._key)]),
    );

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

    showAlert(
      `Успешно: ${ok}. Ошибок: ${fails.length}.`,
      fails.length === 0 ? "success" : "warning",
    );
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

  const rowSelection = {
    selectedRowKeys: selectedKeys,
    onChange: (keys) => {
      setSelectedKeys(keys);
      setSelectAll(
        keys.length === filteredRows.length && filteredRows.length > 0,
      );
    },
  };

  return (
    <>
      <div className="page-content-wrapper content-page">
        <div
          className="applications-list"
          style={{ flexDirection: "column", gap: "20px", height: "auto" }}
        >
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

              <button
                onClick={toggleAll}
                className={selectAll ? "selectAll-toggle" : ""}
                disabled={!fetched}
              >
                {selectAll ? "Снять выделение" : "Выбрать все"}
              </button>

              <button
                className="edit"
                onClick={selectUnpaid}
                disabled={!fetched}
              >
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
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                  }}
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
                <Input
                  type="date"
                  value={startDate}
                  onChange={(value) => setStartDate(value)}
                  style={{ width: 150 }}
                />
              </div>
              <div>
                Конец&nbsp;
                <Input
                  type="date"
                  value={endDate}
                  onChange={(value) => setEndDate(value)}
                  style={{ width: 150 }}
                />
              </div>
              {loading && <Spinner size="small" />}
              {loading && <span style={{ color: "#666" }}>Загрузка…</span>}
            </div>

            <div
              className="my-applications-content"
              style={{ position: "relative" }}
            >
              {!fetched && !loading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "gray",
                  }}
                >
                  Выберите период для загрузки выписки
                </div>
              )}

              {loading && (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <Spinner center label="Загружаем выписку" />
                  Загрузка…
                </div>
              )}

              {fetched && !loading && filteredRows.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "gray",
                  }}
                >
                  Нет транзакций за выбранный период
                </div>
              )}

              {fetched && !loading && filteredRows.length > 0 && (
                <Table
                  dataSource={filteredRows}
                  rowKey="_key"
                  rowSelection={rowSelection}
                  bordered
                  scroll={{ x: 2500 }}
                  pagination={{ pageSize: 15 }}
                  onRow={(record) => ({
                    style: {
                      backgroundColor: record.IsPayed
                        ? "#e6ffe6"
                        : "transparent",
                    },
                  })}
                >
                  <Table.Column
                    title="Дата операции"
                    dataIndex="doper"
                    key="doper"
                    sortable
                  />
                  <Table.Column
                    title="Дата документа"
                    dataIndex="DOCDOPER"
                    key="DOCDOPER"
                    sortable
                  />
                  <Table.Column
                    title="Время"
                    dataIndex="EXECDT"
                    key="EXECDT"
                    sortable
                  />
                  <Table.Column
                    title="Номер документа"
                    dataIndex="NUMDOC"
                    key="NUMDOC"
                    sortable
                  />
                  <Table.Column
                    title="Описание"
                    dataIndex="TXTDSCR"
                    key="TXTDSCR"
                    width={300}
                  />
                  <Table.Column
                    title="Клиент-корреспондент"
                    dataIndex="CLIENTCOR"
                    key="CLIENTCOR"
                    width={250}
                  />
                  <Table.Column
                    title="Счёт-корреспондент"
                    dataIndex="ACCCOR"
                    key="ACCCOR"
                  />
                  <Table.Column
                    title="Банк-корреспондент"
                    dataIndex="NAMEBCR"
                    key="NAMEBCR"
                    width={250}
                  />
                  <Table.Column
                    title="Дебет"
                    dataIndex="MOVD"
                    key="MOVD"
                    sortable
                    align="right"
                  />
                  <Table.Column
                    title="Кредит"
                    dataIndex="MOVC"
                    key="MOVC"
                    sortable
                    align="right"
                  />
                  <Table.Column
                    title="Баланс (конец)"
                    dataIndex="sumBalOut"
                    key="sumBalOut"
                    sortable
                    align="right"
                  />
                  <Table.Column
                    title="Референс"
                    dataIndex="REFER"
                    key="REFER"
                    sortable
                  />
                  <Table.Column
                    title="Валютная дата"
                    dataIndex="DVAL"
                    key="DVAL"
                  />
                  <Table.Column title="Курс" dataIndex="kurs" key="kurs" />
                  <Table.Column
                    title="Статус оплаты"
                    key="status"
                    render={(_, row) => (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {row.IsPayed ? (
                          <>
                            <FcOk style={{ fontSize: 20 }} />
                            <span style={{ color: "green", fontWeight: 500 }}>
                              Оплачено
                            </span>
                          </>
                        ) : (
                          <>
                            <FcProcess style={{ fontSize: 20 }} />
                            <span style={{ color: "#999" }}>Ожидает</span>
                          </>
                        )}
                      </div>
                    )}
                  />
                  <Table.Column
                    title="Действия"
                    key="actions"
                    fixed="right"
                    render={(_, row) => {
                      const isPaying = payingKeys.has(row._key);
                      const isPaid = Boolean(row.IsPayed);
                      return (
                        <div className="active-table">
                          <button
                            className={`pay-button ${isPaid ? "paid" : ""}`}
                            onClick={() => handlePayClick(row)}
                            disabled={isPaying || isPaid}
                          >
                            {isPaying ? (
                              <>Оплачивается…</>
                            ) : isPaid ? (
                              <>
                                <img
                                  src={PayedIcon}
                                  width={24}
                                  height={24}
                                  alt="Оплачено"
                                />
                                Оплачено
                              </>
                            ) : (
                              <>
                                <img
                                  src={PayIcon}
                                  width={24}
                                  height={24}
                                  alt="Оплатить"
                                />
                                Оплатить
                              </>
                            )}
                          </button>
                        </div>
                      );
                    }}
                  />
                </Table>
              )}
            </div>
          </main>
        </div>

        {alert && (
          <AlertMessage
            message={alert.message}
            type={alert.type}
            onClose={() => setAlert(null)}
          />
        )}

        {showBulkConfirm && (
          <div className="logout-confirmation">
            <div className="confirmation-box">
              <div>
                <h1>Подтверждение оплаты</h1>
                <p>
                  Вы уверены, что хотите оплатить все выбранные неоплаченные
                  транзакции?
                  <br />
                  Количество:{" "}
                  <strong>
                    {
                      filteredRows.filter(
                        (row) =>
                          selectedKeys.includes(row._key) && !row.IsPayed,
                      ).length
                    }
                  </strong>
                  <br />
                  <br />
                  После подтверждения отменить операцию будет невозможно.
                </p>
              </div>
              <div className="confirmation-buttons">
                <button className="confirm-btn" onClick={performBulkPayment}>
                  Да, оплатить
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => setShowBulkConfirm(false)}
                >
                  Отмена
                </button>
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
                <button className="confirm-btn" onClick={performSinglePayment}>
                  Да, оплатить
                </button>
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

      <style>{`
        .pay-button {
          padding: 8px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          min-width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background-color: #f0f0f0;
          color: var(--text-color);
        }
/* .pay-button:hover удален */
        .pay-button.paid {
          background-color: #e6ffe6;
          color: #2c6e2c;
          cursor: default;
          opacity: 0.8;
        }
        .pay-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
