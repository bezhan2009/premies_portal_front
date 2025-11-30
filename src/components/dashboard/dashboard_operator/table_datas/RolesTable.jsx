import React, { useEffect, useState, useCallback } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import { fetchOffices } from "../../../../api/offices/all_offices.js";
import { translate_role_id } from "../../../../api/utils/translate_role_id.js";
import Input from "../../../elements/Input.jsx";
import { fullUpdateWorkers } from "../../../../api/workers/FullUpdateWorkers.js";
import ModalRoles from "../../../modal/ModalRoles.jsx";
import { getAllUsers } from "../../../../api/users/get_user.js";

const RolesTable = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [edit, setEdit] = useState(null);
  const [openRoles, setOpenRoles] = useState({ data: null, open: false });

  const loadData = async ({ reset = false } = {}) => {
    if (reset) {
      setEmployees([]);
      setHasMore(true);
    }

    const loadingState = reset ? setLoading : setLoadingMore;
    loadingState(true);

    try {
      const lastId = reset ? null : employees?.[employees?.length - 1]?.ID;
      const { users } = await getAllUsers({
        after: lastId,
      });

      if (users && users.length > 0) {
        if (reset) {
          setEmployees(users);
          setFilteredEmployees(users);
        } else {
          setEmployees(prev => [...prev, ...users]);
          setFilteredEmployees(prev => [...prev, ...users]);
        }
        
        // Если получено меньше данных, чем ожидалось, значит это последняя страница
        if (users.length < 20) { // Предполагаем, что размер страницы 20
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setHasMore(false);
    } finally {
      loadingState(false);
    }
  };

  // Обработчик скролла для бесконечной прокрутки
  const handleScroll = useCallback(() => {
    const tableDiv = document.querySelector('.table-reports-div');
    if (!tableDiv) return;

    const { scrollTop, scrollHeight, clientHeight } = tableDiv;
    const isBottom = scrollTop + clientHeight >= scrollHeight - 10;

    if (isBottom && !loadingMore && hasMore) {
      loadData();
    }
  }, [loadingMore, hasMore, employees]);

  useEffect(() => {
    loadData({ reset: true });
  }, []);

  // Добавляем обработчик скролла
  useEffect(() => {
    const tableDiv = document.querySelector('.table-reports-div');
    if (tableDiv) {
      tableDiv.addEventListener('scroll', handleScroll);
      return () => tableDiv.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleChange = (key, value) => {
    setEdit({ ...edit, [key]: value });
  };

  const saveChange = async () => {
    try {
      await fullUpdateWorkers({ ...edit, full_name: edit.full_name.trim() });
      // Обновляем данные сбросом к первой странице
      loadData({ reset: true });
      setEdit({ ID: null });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = (filtered) => {
    setFilteredEmployees(filtered || []);
  };

  return (
    <div className="report-table-container">
      <SearchBar
        allData={employees}
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
          {filteredEmployees && filteredEmployees.length > 0 ? (
            <div
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
                  {filteredEmployees.map((row, idx) => (
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
              
              {/* Индикатор загрузки дополнительных данных */}
              {loadingMore && (
                <div style={{ textAlign: "center", padding: "10px" }}>
                  <Spinner size="small" />
                </div>
              )}
              
              {/* Сообщение о конце данных */}
              {!hasMore && employees.length > 0 && (
                <div style={{ 
                  textAlign: "center", 
                  padding: "10px", 
                  color: "#666",
                  fontStyle: "italic"
                }}>
                  Все данные загружены
                </div>
              )}
            </div>
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
