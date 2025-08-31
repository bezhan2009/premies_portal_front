import React, { useEffect, useState, useRef } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import { fetchReportCards } from "../../../../api/operator/reports/report_cards.js";
import SearchBar from "../../../general/SearchBar.jsx";
import Input from "../../../elements/Input.jsx";
import { cardDetailPatch } from "../../../../api/workers/cardDetailPatch.js";

const TableReportsCards = ({ month, year }) => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const observer = useRef(null);
  const lastElementRef = useRef(null);
  const [edit, setEdit] = useState(null);

  /**
   * 🔥 Подзагрузка “всех” данных для поиска – ОГРАНИЧЕНА MAX_PAGES,
   * чтобы не ходить в бек вечность при очень большом объёме
   */
  useEffect(() => {
    const loadAllData = async () => {
      const MAX_PAGES = 10; // <-- грузим не больше 10 страниц
      let all = [];
      let after = null;
      let page = 0;

      while (page < MAX_PAGES) {
        const chunk = await fetchReportCards(month, year, after);
        if (!chunk || chunk.length === 0) break;

        all = [...all, ...chunk];
        after = chunk[chunk.length - 1]?.ID;
        page++;

        if (chunk.length < 10) break; // меньше страницы — нормально выходим
      }

      setAllData(all);
    };

    loadAllData();
  }, [month, year]);

  /**
   * Загрузка первой страницы
   */
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setIsSearching(false);
      setHasMore(true);
      setData([]);
      try {
        const chunk = await fetchReportCards(month, year, null);
        setData(chunk);
        if (chunk.length < 10) setHasMore(false);
      } catch (e) {
        console.error("Ошибка при загрузке данных:", e);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [month, year]);

  /**
   * Настраиваем IntersectionObserver один раз
   */
  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        hasMore &&
        !loadingMore &&
        !isSearching
      ) {
        loadMore();
      }
    });

    return () => {
      observer.current?.disconnect();
    };
  }, [hasMore, loadingMore, isSearching]);

  /**
   * Наблюдаем за последним элементом таблицы
   */
  useEffect(() => {
    const node = lastElementRef.current;
    if (node) observer.current?.observe(node);
    return () => {
      if (node) observer.current?.unobserve(node);
    };
  }, [data]);

  /**
   * Загрузка следующей страницы с защитой от зацикливания
   */
  const loadMore = async () => {
    if (loadingMore || !hasMore || isSearching) return;

    setLoadingMore(true);
    try {
      const lastId = data[data.length - 1]?.ID;
      const chunk = await fetchReportCards(month, year, lastId);

      if (!chunk || chunk.length === 0) {
        setHasMore(false);
        return;
      }

      const newLastId = chunk[chunk.length - 1]?.ID;
      if (newLastId === lastId) {
        console.warn("Получены дубли — остановка пагинации");
        setHasMore(false);
        return;
      }

      setData((prev) => [...prev, ...chunk]);
      if (chunk.length < 10) setHasMore(false);
    } catch (e) {
      console.error("Ошибка при догрузке:", e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  /**
   * Поиск внутри загруженных allData
   */
  const handleSearch = async (filtered) => {
    if (!filtered) {
      setIsSearching(false);
      setLoading(true);
      try {
        const chunk = await fetchReportCards(month, year, null);
        setData(chunk);
        setHasMore(chunk.length >= 10);
      } finally {
        setLoading(false);
      }
      return;
    }
    setIsSearching(true);
    setData(filtered);
    setHasMore(false);
  };

  const handleChange = (key, value) => {
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

  const saveChange = async (edit) => {
    try {
      await cardDetailPatch(edit);
      setEdit({ ID: null });
    } catch (e) {
      console.error(e);
    }
  };

  console.log("data", data);

  return (
    <div className="report-table-container">
      <SearchBar
        allData={allData}
        onSearch={handleSearch}
        placeholder="Поиск по ФИО, номеру карты..."
        searchFields={[
          (item) => item.worker?.user?.Username || "",
          (item) => item.code || "",
          (item) => item.card_type || "",
        ]}
      />
      <div
        className="table-reports-div"
        style={{ maxHeight: "calc(100vh - 480px)" }}
      >
        <table className="table-reports">
          <thead>
            <tr>
              <th>ФИО сотрудника</th>
              <th>Тип карты</th>
              <th>Номер счета</th>
              <th>Оборот по дебету</th>
              <th>Остаток</th>
              <th>Дата выдачи</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0
              ? data.map((row, idx) => {
                  const isLast = idx === data.length - 1;
                  return (
                    <tr
                      key={row.ID}
                      ref={isLast && !isSearching ? lastElementRef : null}
                    >
                      <td onClick={() => !edit && setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={
                              edit?.worker?.user?.full_name ||
                              row.worker?.user?.full_name
                            }
                            type="text"
                            value={edit?.worker?.user?.full_name}
                            onChange={(e) =>
                              handleChange("worker.user.full_name", e)
                            }
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.worker?.user?.full_name || ""
                        )}
                      </td>
                      <td onClick={() => !edit && setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.card_type || row.card_type}
                            type="text"
                            value={edit?.card_type}
                            onChange={(e) => handleChange("card_type", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.card_type || ""
                        )}
                      </td>
                      <td onClick={() => !edit && setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.code || row.code}
                            type="text"
                            value={edit?.code}
                            onChange={(e) => handleChange("code", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.code || ""
                        )}
                      </td>
                      <td onClick={() => !edit && setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.debt_osd || row.debt_osd}
                            type="text"
                            value={edit?.debt_osd}
                            onChange={(e) => handleChange("debt_osd", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.debt_osd || ""
                        )}
                      </td>
                      <td onClick={() => !edit && setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.out_balance || row.out_balance}
                            type="text"
                            value={edit?.out_balance}
                            onChange={(e) => handleChange("out_balance", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.out_balance || ""
                        )}
                      </td>
                      <td onClick={() => !edit && setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.issue_date || row.issue_date}
                            value={edit?.issue_date}
                            type="date"
                            onChange={(e) => handleChange("issue_date", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.issue_date?.split("T")[0] || ""
                        )}
                      </td>
                    </tr>
                  );
                })
              : !loading && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center" }}>
                      <h1>Нет данных за выбранный период</h1>
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>

      {loading && (
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
      )}

      {loadingMore && (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <Spinner />
        </div>
      )}
    </div>
  );
};

export default TableReportsCards;
