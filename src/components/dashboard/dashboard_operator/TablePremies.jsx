import React, { useEffect, useState, useRef, useCallback } from "react";
import Spinner from "../../Spinner.jsx";
import "../../../styles/components/Table.scss";
import { fetchWorkers } from "../../../api/operator/reports/operator_premies.js";
import SearchBar from "../../general/SearchBar.jsx";
import { calculateTotalPremia } from "../../../api/utils/calculate_premia.js";
import { DownloadCloud } from "lucide-react";
import Input from "../../elements/Input.jsx";
import { fullUpdateWorkers } from "../../../api/workers/FullUpdateWorkers.js";

const TablePremies = ({ month, year }) => {
  const [workers, setWorkers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [edit, setEdit] = useState({ ID: null });
  const observer = useRef();

  // NEW: State for modal
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadUser, setDownloadUser] = useState(null);
  const [downloadMonth, setDownloadMonth] = useState("");
  const [downloadYear, setDownloadYear] = useState(new Date().getFullYear());

  const monthOptions = [
    { name: "Январь", value: 1 },
    { name: "Февраль", value: 2 },
    { name: "Март", value: 3 },
    { name: "Апрель", value: 4 },
    { name: "Май", value: 5 },
    { name: "Июнь", value: 6 },
    { name: "Июль", value: 7 },
    { name: "Август", value: 8 },
    { name: "Сентябрь", value: 9 },
    { name: "Октябрь", value: 10 },
    { name: "Ноябрь", value: 11 },
    { name: "Декабрь", value: 12 },
  ];

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWorkers(month, year);
        setWorkers(data);
        setHasMore(data.length === 10);
      } catch (err) {
        setError("Не удалось загрузить данные.");
        setWorkers([]);
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, [month, year]);

  const handleSearch = async (filtered) => {
    if (!filtered) {
      setIsSearching(false);
      setLoading(true);
      try {
        const data = await fetchWorkers(month, year);
        setWorkers(data);
        setHasMore(data.length === 10);
      } catch {
        setError("Не удалось загрузить данные.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setIsSearching(true);
    setWorkers(filtered);
    setHasMore(false);
  };

  useEffect(() => {
    const loadAllData = async () => {
      let all = [];
      let afterID = null;

      while (true) {
        const chunk = await fetchWorkers(month, year, afterID);
        if (!chunk || chunk.length === 0) break;

        all = [...all, ...chunk];
        afterID = chunk[chunk.length - 1]?.ID;
        if (chunk.length < 10) break;
      }

      setAllWorkers(all);
    };

    loadAllData();
  }, [month, year]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || workers.length === 0 || isSearching) return;

    setLoadingMore(true);
    setError(null);
    try {
      const lastId = workers[workers.length - 1]?.ID;
      const data = await fetchWorkers(month, year, lastId);
      setWorkers((prev) => [...prev, ...data]);
      setHasMore(data.length === 10);
    } catch (err) {
      setError("Не удалось загрузить дополнительные данные.");
      console.log(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const lastRowRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loadingMore, hasMore, workers]
  );

  const upDateUserWorkers = async () => {
    try {
      await fullUpdateWorkers(edit, false);
      setEdit({ ID: null });
      const data = await fetchWorkers(month, year);
      setWorkers(data);
      setHasMore(data.length === 10);
    } catch (e) {
      console.error(e);
    }
  };
  const onChangeEdit = (key, value) => {
    setEdit((prev) => {
      const keys = key.split(".");

      let newState = { ...prev };
      let current = newState;

      keys.forEach((k, i) => {
        const arrayMatch = k.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
          const [, arrKey, indexStr] = arrayMatch;
          const index = Number(indexStr);

          if (!Array.isArray(current[arrKey])) {
            current[arrKey] = [];
          }

          current[arrKey] = [...current[arrKey]];
          if (!current[arrKey][index]) {
            current[arrKey][index] = {};
          }

          if (i === keys.length - 1) {
            current[arrKey][index] = value;
          } else {
            current[arrKey][index] = { ...current[arrKey][index] };
            current = current[arrKey][index];
          }
        } else {
          if (i === keys.length - 1) {
            current[k] = value;
          } else {
            current[k] = { ...current[k] };
            current = current[k];
          }
        }
      });

      return newState;
    });
  };

  // NEW: open modal for choosing month/year
  const openDownloadModal = (user) => {
    setDownloadUser(user);
    setShowDownloadModal(true);
    setDownloadMonth("");
    setDownloadYear(new Date().getFullYear());
  };

  // NEW: execute download
  const executeDownload = async () => {
    if (!downloadMonth || !downloadYear) {
      alert("Выберите месяц и год");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const url = `${import.meta.env.VITE_BACKEND_URL}/automation/reports/${
        downloadUser.ID
      }?month=${downloadMonth}&year=${downloadYear}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ошибка скачивания отчета.");
      }

      const blob = await res.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = urlBlob;
      link.download = `report_${downloadUser.Username || downloadUser.ID}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlBlob);

      setShowDownloadModal(false);
      setDownloadUser(null);
      setDownloadMonth("");
      setDownloadYear(new Date().getFullYear());
    } catch (e) {
      console.error(e);
      alert(`Не удалось скачать отчет: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          transform: "scale(2)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "100px",
          width: "auto",
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="report-table-container"
        style={{ textAlign: "center", padding: "1rem", color: "red" }}
      >
        <p>{error}</p>
      </div>
    );
  }

  console.log("edit", edit);

  return (
    <div className="report-table-container">
      <SearchBar allData={allWorkers} onSearch={handleSearch} />

      <div className="table-reports-div">
        <table className="table-reports">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>План продаж (TJS)</th>
              <th>Продано карт (шт)</th>
              <th>Карт за всё время</th>
              <th>Моб. банк (шт)</th>
              <th>ЗП проект (шт)</th>
              <th>Оборот по дебету (TJS)</th>
              <th>Остатки по картам (TJS)</th>
              <th>Активные карты (шт)</th>
              <th>Оценка КЦ (балл)</th>
              <th>Жалобы (шт)</th>
              <th>Тесты (балл)</th>
              <th>Итого (TJS)</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w, idx) => {
              const user = w.user || {};
              const turnover = w.CardTurnovers?.[0] || {};
              const service = w.ServiceQuality?.[0] || {};
              const card_sales = w.CardSales?.[0] || {};
              const mobile_bank = w.MobileBank?.[0] || {};

              const totalPremia = calculateTotalPremia(w);
              const isLast = idx === workers.length - 1;

              return (
                <tr key={w.ID} ref={isLast ? lastRowRef : null}>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={edit?.user?.full_name || user.full_name}
                        onChange={(e) => onChangeEdit("user.full_name", e)}
                        value={edit?.user?.full_name}
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      <div className="fio-cell">
                        <span className="fio-text">{user.full_name}</span>
                        <button
                          className="download-report-btn"
                          title="Скачать отчет рабочего"
                          onClick={() => openDownloadModal(user)}
                        >
                          <DownloadCloud size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={edit?.plan || w.plan}
                        onChange={(e) => onChangeEdit("plan", e)}
                        value={edit?.plan}
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      w.plan
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={
                          edit?.CardSales?.[0]?.cards_sailed ||
                          card_sales.cards_sailed
                        }
                        onChange={(e) =>
                          onChangeEdit("CardSales[0].cards_sailed", e)
                        }
                        value={edit?.CardSales?.[0]?.cards_sailed || ""}
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      card_sales.cards_sailed
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={
                          edit?.CardSales?.[0]?.cards_sailed_in_general ||
                          card_sales.cards_sailed_in_general
                        }
                        onChange={(e) =>
                          onChangeEdit(
                            "CardSales[0].cards_sailed_in_general",
                            e
                          )
                        }
                        value={
                          edit?.CardSales?.[0]?.cards_sailed_in_general || ""
                        }
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      card_sales.cards_sailed_in_general
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={
                          edit?.MobileBank?.[0]?.mobile_bank_connects ||
                          mobile_bank.mobile_bank_connects
                        }
                        onChange={(e) =>
                          onChangeEdit("MobileBank[0].mobile_bank_connects", e)
                        }
                        value={edit?.MobileBank?.[0]?.mobile_bank_connects}
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      mobile_bank.mobile_bank_connects
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={edit?.salary_project || w.salary_project}
                        onChange={(e) => onChangeEdit("salary_project", e)}
                        value={edit?.salary_project || ""}
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      w.salary_project
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={
                          edit?.CardSales?.[0]?.deb_osd || card_sales.deb_osd
                        }
                        onChange={(e) =>
                          onChangeEdit("CardSales[0].deb_osd", e)
                        }
                        value={edit?.CardSales?.[0]?.deb_osd || ""}
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      card_sales.deb_osd
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={
                          edit?.CardSales?.[0]?.out_balance ||
                          card_sales.out_balance
                        }
                        onChange={(e) =>
                          onChangeEdit("CardSales[0].out_balance", e)
                        }
                        value={edit?.CardSales?.[0]?.out_balance || ""}
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      card_sales.out_balance
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={
                          edit?.CardTurnovers?.[0]?.active_cards_perms ||
                          turnover.active_cards_perms?.toFixed(0)
                        }
                        onChange={(e) =>
                          onChangeEdit("CardTurnovers[0].active_cards_perms", e)
                        }
                        value={
                          edit?.CardTurnovers?.[0]?.active_cards_perms || ""
                        }
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      turnover.active_cards_perms?.toFixed(0)
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={
                          edit?.ServiceQuality?.[0]?.call_center ||
                          service.call_center
                        }
                        onChange={(e) =>
                          onChangeEdit("ServiceQuality[0].call_center", e)
                        }
                        value={edit?.ServiceQuality?.[0]?.call_center || ""}
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      service.call_center
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={
                          edit?.ServiceQuality?.[0]?.complaint ||
                          service.complaint
                        }
                        onChange={(e) =>
                          onChangeEdit("ServiceQuality[0].complaint", e)
                        }
                        value={edit?.ServiceQuality?.[0]?.complaint || ""}
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      service.complaint
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {edit?.user?.ID === user.ID ? (
                      <Input
                        type="text"
                        defValue={
                          edit?.ServiceQuality?.[0]?.tests || service.tests
                        }
                        onChange={(e) =>
                          onChangeEdit("ServiceQuality[0].tests", e)
                        }
                        value={edit?.ServiceQuality?.[0]?.tests || ""}
                        onEnter={upDateUserWorkers}
                      />
                    ) : (
                      service.tests
                    )}
                  </td>
                  <td onClick={() => !edit?.user?.ID && setEdit(w)}>
                    {totalPremia.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && workers.length === 0 && (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <p>Ничего не найдено</p>
        </div>
      )}

      {loadingMore && (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <Spinner />
        </div>
      )}

      {/* NEW: Download Modal */}
      {showDownloadModal && (
        <div className="filters__modal">
          <div className="filters__modal-content">
            <h3>Выгрузка отчёта для {downloadUser?.full_name}</h3>

            <div className="filters__date-selection">
              <select
                value={downloadMonth}
                onChange={(e) => setDownloadMonth(e.target.value)}
              >
                <option value="">-- Выберите месяц --</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.name}
                  </option>
                ))}
              </select>

              <input
                // type="text"
                type="number"
                placeholder="Год"
                value={downloadYear}
                onChange={(e) => setDownloadYear(e.target.value)}
                className="filters__year-input"
              />
            </div>

            <div className="filters__modal-actions">
              <button onClick={executeDownload}>Выгрузить</button>
              <button onClick={() => setShowDownloadModal(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablePremies;
