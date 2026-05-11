import React, { useCallback, useEffect, useState } from "react";
import SearchBar from "../../../general/SearchBar.jsx";
import Input from "../../../elements/Input.jsx";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { fullUpdateWorkers } from "../../../../api/workers/fullUpdateWorkers.js";
import ModalRoles from "../../../modal/ModalRoles.jsx";
import { getAllUsers } from "../../../../api/users/get_user.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

const RolesTable = () => {
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [edit, setEdit] = useState(null);
  const [openRoles, setOpenRoles] = useState({ data: null, open: false });
  const [actionLoading, setActionLoading] = useState(null);

  const { exportToExcel } = useExcelExport();

  const lastIdRef = React.useRef(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);

    try {
      const { users } = await getAllUsers({});
      setEmployees(users || []);
      setHasMore(Boolean(users && users.length === 10));

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
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      let all = [];
      let afterID = null;

      while (true) {
        const { users } = await getAllUsers({ after: afterID });

        if (!users || users.length === 0) {
          break;
        }

        all = [...all, ...users];
        afterID = users[users.length - 1]?.ID;

        if (users.length < 10) {
          break;
        }
      }

      setAllEmployees(all);
    };

    loadAllData();
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

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

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isSearching) {
      return;
    }

    setLoadingMore(true);

    try {
      const { users } = await getAllUsers({ after: lastIdRef.current });

      if (users && users.length > 0) {
        setEmployees((previous) => [...previous, ...users]);
        setHasMore(users.length === 10);
        lastIdRef.current = users[users.length - 1].ID;
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Ошибка загрузки дополнительных данных:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, isSearching, loadingMore]);

  const handleChange = (key, value) => {
    setEdit((previous) => ({ ...previous, [key]: value }));
  };

  const saveChange = async () => {
    try {
      await fullUpdateWorkers({ ...edit, full_name: edit.full_name.trim() });
      await loadInitial();
      setEdit({ ID: null });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm("Вы уверены, что хотите деактивировать этого пользователя?")) {
      return;
    }

    setActionLoading(userId);

    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert("Пользователь успешно деактивирован");
        loadInitial();
      } else {
        alert("Ошибка при деактивации пользователя");
      }
    } catch (error) {
      console.error("Ошибка деактивации:", error);
      alert("Произошла ошибка при деактивации");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm("Вы уверены, что хотите сбросить пароль этого пользователя?")) {
      return;
    }

    setActionLoading(userId);

    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/reset/${userId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert("Пароль успешно сброшен");
      } else {
        alert("Ошибка при сбросе пароля");
      }
    } catch (error) {
      console.error("Ошибка сброса пароля:", error);
      alert("Произошла ошибка при сбросе пароля");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = () => {
    const columns = [
      { key: "full_name", label: "ФИО" },
      { key: "username", label: "Логин" },
      { key: "phone", label: "Номер телефона" },
      { key: "email", label: "Email" },
    ];

    exportToExcel(allEmployees, columns, "Роли_сотрудников");
  };

  const renderEditableCell = (record, field) => {
    const isEditing = edit?.ID === record.ID;

    if (isEditing) {
      return (
        <div onClick={(event) => event.stopPropagation()}>
          <Input
            type="text"
            value={edit?.[field] ?? ""}
            onChange={(value) => handleChange(field, value)}
            onEnter={saveChange}
          />
        </div>
      );
    }

    return (
      <div onClick={() => setEdit(record)} style={{ cursor: "pointer" }}>
        {record[field]}
      </div>
    );
  };

  return (
    <div className="report-table-container">
      <div className="table-header-actions">
        <SearchBar
          allData={allEmployees}
          onSearch={handleSearch}
          placeholder="Поиск по ФИО или названию офиса..."
          searchFields={[
            (item) => item.full_name || "",
            (item) => item.officeTitle || "",
          ]}
        />

        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>

      <Table
        tableId="operator-roles-table"
        dataSource={employees}
        rowKey={(record) => record.ID}
        loading={loading}
        bordered
        pagination={false}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Нет данных" }}
      >
        <Table.Column
          title="ФИО"
          dataIndex="full_name"
          key="full_name"
          render={(_, record) => renderEditableCell(record, "full_name")}
        />
        <Table.Column
          title="Логин"
          dataIndex="username"
          key="username"
          render={(_, record) => renderEditableCell(record, "username")}
        />
        <Table.Column
          title="Номер телефона"
          dataIndex="phone"
          key="phone"
          render={(_, record) => renderEditableCell(record, "phone")}
        />
        <Table.Column
          title="Email"
          dataIndex="email"
          key="email"
          render={(_, record) => renderEditableCell(record, "email")}
        />
        <Table.Column
          title="Перераспределение ролей"
          key="role-actions"
          sortable={false}
          render={(_, record) => (
            <button
              className="button-edit-roles"
              onClick={() => setOpenRoles({ data: record, open: true })}
            >
              Перераспределить
            </button>
          )}
        />
        <Table.Column
          title="Действия"
          key="actions"
          sortable={false}
          render={(_, record) => (
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              {record.is_active && (
                <button
                  className="button-edit-roles"
                  onClick={() => handleDeactivate(record.ID)}
                  disabled={actionLoading === record.ID}
                  style={{
                    backgroundColor: "#dc3545",
                    opacity: actionLoading === record.ID ? 0.6 : 1,
                  }}
                >
                  {actionLoading === record.ID ? "..." : "Деактивировать"}
                </button>
              )}
              <button
                className="button-edit-roles"
                onClick={() => handleResetPassword(record.ID)}
                disabled={actionLoading === record.ID}
                style={{
                  backgroundColor: "#ffc107",
                  opacity: actionLoading === record.ID ? 0.6 : 1,
                }}
              >
                {actionLoading === record.ID ? "..." : "Сбросить пароль"}
              </button>
            </div>
          )}
        />
      </Table>

      <div style={{ textAlign: "center", padding: "10px" }}>
        {!loadingMore && hasMore && !isSearching && (
          <button
            onClick={loadMore}
            className="button-edit-roles"
            style={{ margin: "10px 0" }}
          >
            Загрузить еще
          </button>
        )}

        {loadingMore && <div style={{ color: "#666" }}>Загрузка...</div>}

        {!hasMore && employees.length > 0 && !isSearching && (
          <div
            style={{
              color: "#666",
              fontStyle: "italic",
            }}
          >
            Все данные загружены
          </div>
        )}
      </div>

      {openRoles.open && (
        <ModalRoles data={openRoles.data} setOpenRoles={setOpenRoles} />
      )}
    </div>
  );
};

export default RolesTable;
