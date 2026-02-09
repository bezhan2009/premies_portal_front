import React, { useEffect, useState, useRef, useCallback } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import Input from "../../../elements/Input.jsx";
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

    const tableContainerRef = useRef();
    const lastIdRef = useRef(null);

    // Загрузка первоначальных данных
    const loadInitial = async () => {
        setLoading(true);
        try {
            const { users } = await getAllUsers({});
            setEmployees(users || []);
            setHasMore(users && users.length === 10);

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
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || isSearching) return;

        setLoadingMore(true);
        try {
            const { users } = await getAllUsers({ after: lastIdRef.current });

            if (users && users.length > 0) {
                setEmployees((prev) => [...prev, ...users]);
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
    }, [loadingMore, hasMore, isSearching]);

    // Обработчик скролла для бесконечной прокрутки
    const handleScroll = useCallback(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const isBottom = scrollTop + clientHeight >= scrollHeight - 50;

        if (isBottom && !loadingMore && hasMore && !isSearching) {
            loadMore();
        }
    }, [loadingMore, hasMore, isSearching, loadMore]);

    useEffect(() => {
        const container = tableContainerRef.current;
        if (container) {
            container.addEventListener("scroll", handleScroll);
            return () => container.removeEventListener("scroll", handleScroll);
        }
    }, [handleScroll]);

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

    // Деактивация пользователя
    const handleDeactivate = async (userId) => {
        if (!window.confirm("Вы уверены, что хотите деактивировать этого пользователя?")) {
            return;
        }

        setActionLoading(userId);
        try {
            const response = await fetch(`/users/${userId}`, {
                method: "DELETE",
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

    // Сброс пароля
    const handleResetPassword = async (userId) => {
        if (!window.confirm("Вы уверены, что хотите сбросить пароль этого пользователя?")) {
            return;
        }

        setActionLoading(userId);
        try {
            const response = await fetch(`/users/reset/${userId}`, {
                method: "PATCH",
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
                                        <th>Действия</th>
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
                                            <td>
                                                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                                    {row.is_active && (
                                                        <button
                                                            className="button-edit-roles"
                                                            onClick={() => handleDeactivate(row.ID)}
                                                            disabled={actionLoading === row.ID}
                                                            style={{
                                                                backgroundColor: "#dc3545",
                                                                opacity: actionLoading === row.ID ? 0.6 : 1
                                                            }}
                                                        >
                                                            {actionLoading === row.ID ? "..." : "Деактивировать"}
                                                        </button>
                                                    )}
                                                    <button
                                                        className="button-edit-roles"
                                                        onClick={() => handleResetPassword(row.ID)}
                                                        disabled={actionLoading === row.ID}
                                                        style={{
                                                            backgroundColor: "#ffc107",
                                                            opacity: actionLoading === row.ID ? 0.6 : 1
                                                        }}
                                                    >
                                                        {actionLoading === row.ID ? "..." : "Сбросить пароль"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

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
