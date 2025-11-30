import React, { useEffect, useState, useRef, useCallback } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import Input from "../../../elements/Input.jsx";
import { fullUpdateWorkers } from "../../../../api/workers/FullUpdateWorkers.js";
import ModalRoles from "../../../modal/ModalRoles.jsx";
import { getAllUsers } from "../../../../api/users/get_user.js";

const RolesTable = () => {
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [edit, setEdit] = useState(null);
  const [openRoles, setOpenRoles] = useState({ data: null, open: false });
  
  const tableContainerRef = useRef();
  const observer = useRef();
  const lastIdRef = useRef(null);

  // Загрузка первоначальных данных
  const loadInitial = async () => {
    setLoading(true);
    try {
      const { users } = await getAllUsers({});
      setEmployees(users || []);
      setHasMore(users && users.length === 10);
      
      // Сохраняем последний ID для пагинации
      if (users && users.length > 0) {
        lastIdRef.current = users[users.length - 1].ID;
      }
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setEmployees([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка всех данных для поиска
  useEffect(() => {
    const loadAllData = async () => {
      let all = [];
      let afterID = null;

      while (true) {
        const { users } = await getAllUsers({ after: afterID });
        if (!users || users.length === 0) break;

        all = [...all, ...users];
        afterID = users[users.length - 1]?.ID;
        if (users.length < 10) break;
      }

      setAllEmployees(all);
    };

    loadAllData();
  }, []);

  useEffect(() => {
    loadInitial();
  }, []);

  // Обработчик поиска
  const handleSearch = (filtered) => {
    if (!filtered) {
      setIsSearching(false);
      loadInitial();
      return;
    }

    setIsSearching(true);
    setEmployees(filtered);
    setHasMore(false);
  };

  // Загрузка дополнительных данных
  const loadMore = async () => {
    if (loadingMore || !hasMore || isSearching) return;

    setLoadingMore(true);
    try {
      const { users } = await getAllUsers({ after: lastIdRef.current });
      
      if (users && users.length > 0) {
        setEmployees(prev => [...prev, ...users]);
        setHasMore(users.length === 10);
        
        // Обновляем последний ID
        lastIdRef.current = users[users.length - 1].ID;
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Ошибка загрузки дополнительных данных:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Обработчик скролла для бесконечной прокрутки
  const handleScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isBottom = scrollTop + clientHeight >= scrollHeight - 50;

    if (isBottom && !loadingMore && hasMore && !isSearching) {
      loadMore();
    }
  }, [loadingMore, hasMore, isSearching]);

  // Добавляем обработчик скролла
  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Также добавляем кнопку для ручной загрузки (на случай проблем со скроллом)
  const handleLoadMoreClick = () => {
    loadMore();
  };

  const handleChange = (key, value) => {
    setEdit({ ...edit, [key]: value });
  };

  const saveChange = async () => {
    try {
      await fullUpdateWorkers({ ...edit, full_name: edit.full_name.trim() });
      loadInitial();
      setEdit({ ID: null });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="report-table-container">
      <SearchBar
        allData={allEmployees}
        onSearch={handleSearch}
        placeholder="Поиск по ФИО или названию офиса..."
        searchFields={[
          (item) => item.full_name || "",
          (item) => item.officeTitle || "",
        ]}
      />

      {loading ? (
        <Spinner />
      ) : (
        <>
          {employees && employees.length > 0 ? (
            <>
              <div
                ref={tableContainerRef}
                className="table-reports-div"
                style={{ maxHeight: "calc(100vh - 480px)", overflow: "auto" }}
              >
                <table className="table-reports">
                  <thead>
                    <tr>
                      <th>ФИО</th>
                      <th>Логин</th>
                      <th>Номер телефона</th>
                      <th>Email</th>
                      <th>Перераспределение ролей</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((row, idx) => (
                      <tr key={`${row.ID}-${idx}`}>
                        <td onClick={() => setEdit(row)}>
                          {edit?.ID === row.ID ? (
                            <Input
                              defValue={edit?.full_name || row.full_name}
                              type="text"
                              value={edit?.full_name}
                              onChange={(e) => handleChange("full_name", e)}
                              onEnter={() => saveChange(edit)}
                            />
                          ) : (
                            row.full_name
                          )}
                        </td>
                        <td onClick={() => setEdit(row)}>
                          {edit?.ID === row.ID ? (
                            <Input
                              defValue={edit?.username || row.username}
                              type="text"
                              value={edit?.username}
                              onChange={(e) => handleChange("username", e)}
                              onEnter={() => saveChange(edit)}
                            />
                          ) : (
                            row.username
                          )}
                        </td>
                        <td onClick={() => setEdit(row)}>
                          {edit?.ID === row.ID ? (
                            <Input
                              defValue={edit?.phone || row.phone}
                              type="text"
                              value={edit?.phone}
                              onChange={(e) => handleChange("phone", e)}
                              onEnter={() => saveChange(edit)}
                            />
                          ) : (
                            row.phone
                          )}
                        </td>
                        <td onClick={() => setEdit(row)}>
                          {edit?.ID === row.ID ? (
                            <Input
                              defValue={edit?.email || row.email}
                              type="text"
                              value={edit?.email}
                              onChange={(e) => handleChange("email", e)}
                              onEnter={() => saveChange(edit)}
                            />
                          ) : (
                            row.email
                          )}
                        </td>
                        <td>
                          <button
                            className="button-edit-roles"
                            onClick={() =>
                              setOpenRoles({ data: row, open: true })
                            }
                          >
                            Перераспределить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Кнопка и индикаторы загрузки */}
              <div style={{ textAlign: "center", padding: "10px" }}>
                {loadingMore && <Spinner size="small" />}
                
                {!loadingMore && hasMore && !isSearching && (
                  <button 
                    onClick={handleLoadMoreClick}
                    className="button-edit-roles"
                    style={{ margin: "10px 0" }}
                  >
                    Загрузить еще
                  </button>
                )}
                
                {!hasMore && employees.length > 0 && !isSearching && (
                  <div style={{ 
                    color: "#666",
                    fontStyle: "italic"
                  }}>
                    Все данные загружены
                  </div>
                )}
              </div>
            </>
          ) : (
            <h2>Нет данных</h2>
          )}
        </>
      )}
      
      {openRoles.open && (
        <ModalRoles data={openRoles.data} setOpenRoles={setOpenRoles} />
      )}
    </div>
  );
};

export default RolesTable;