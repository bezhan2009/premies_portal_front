import { useEffect, useState } from "react";
import { buildUserAccessPayload, selectApproverDepartment, readUserManagementResponse, saveUserPermissions } from "./userAccessSettings";
import { Helmet } from "react-helmet";
import {
  FaUserShield,
  FaEdit,
  FaUserCheck,
  FaSpinner,
  FaUsers,
  FaFolderOpen,
  FaAddressCard,
  FaPhoneAlt,
  FaRegBuilding,
  FaBriefcase,
  FaShieldAlt,
  FaBuilding,
  FaPlus,
  FaTrash
} from "react-icons/fa";
import Select from "../../../components/elements/Select.jsx";
import Spinner from "../../../components/Spinner";
import UserProfileLink from "../../../components/general/UserProfileLink.jsx";

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("users"); // "users" or "offices"
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roles, setRoles] = useState([]);
  const [workOffices, setWorkOffices] = useState([]);
  const [appOffices, setAppOffices] = useState([]);
  const [customerDepartments, setCustomerDepartments] = useState([]);
  const [loadingOffices, setLoadingOffices] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // User edit modal states
  const [editingUser, setEditingUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [complianceCode, setComplianceCode] = useState("");
  const [absName, setABSName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [internalPhone, setInternalPhone] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedAppOffices, setSelectedAppOffices] = useState([]);
  const [selectedCustomerDepartments, setSelectedCustomerDepartments] = useState([]);
  const [approverDepartments,setApproverDepartments]=useState([]);
  const [creatorRestriction,setCreatorRestriction]=useState("");

  // Worker/Office details
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [plan, setPlan] = useState("");
  const [salaryProject, setSalaryProject] = useState("");
  const [placeWork, setplaceWork] = useState("");

  const [officeTitle, setOfficeTitle] = useState("");
  const [officeCode, setOfficeCode] = useState("");
  const [officeDesc, setOfficeDesc] = useState("");

  // Application office management states
  const [newOfficeTitle, setNewOfficeTitle] = useState("");
  const [editingAppOffice, setEditingAppOffice] = useState(null);
  const [editOfficeTitle, setEditOfficeTitle] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("access_token");
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!normalizedUserSearch) return true;

    const searchableFields = [
      user.full_name,
      user.first_name,
      user.last_name,
      user.username,
      user.email,
      user.phone,
      user.compliance_code,
      user.abs_name,
      user.position,
      user.internal_phone,
      ...(Array.isArray(user.roles) ? user.roles.map((role) => role?.Name) : []),
    ];

    return searchableFields.some((value) =>
      String(value || "").toLowerCase().includes(normalizedUserSearch)
    );
  });
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const fetchAllUsers = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const firstResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users?all=true`, { headers });
    if (!firstResponse.ok) {
      throw new Error(`Не удалось загрузить пользователей: ${firstResponse.status}`);
    }

    const firstData = await firstResponse.json();
    const firstUsers = Array.isArray(firstData.users) ? firstData.users : [];

    // New backend returns total with the complete list. Older deployments ignore
    // `all=true`, so continue with the existing cursor endpoint in that case.
    if (typeof firstData.total === "number" && firstUsers.length >= firstData.total) {
      return firstUsers;
    }

    const allUsers = [...firstUsers];
    let afterID = Number(allUsers.at(-1)?.id || 0);
    while (allUsers.length && afterID > 0) {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users?after=${afterID}`, { headers });
      if (!response.ok) throw new Error(`Не удалось загрузить пользователей: ${response.status}`);
      const data = await response.json();
      const nextUsers = Array.isArray(data.users) ? data.users : [];
      if (!nextUsers.length) break;

      const nextAfterID = Number(nextUsers.at(-1)?.id || 0);
      const knownUserIds = new Set(allUsers.map((user) => user.id));
      const uniqueNextUsers = nextUsers.filter((user) => !knownUserIds.has(user.id));
      allUsers.push(...uniqueNextUsers);
      if (typeof firstData.total === "number" && allUsers.length >= firstData.total) break;
      if (!nextAfterID || nextAfterID <= afterID) break;
      afterID = nextAfterID;
    }

    return allUsers;
  };

  // Fetch all data
  const loadData = async () => {
    setLoadingUsers(true);
    try {
      // 1. Fetch Users
      setUsers(await fetchAllUsers());

      // 2. Fetch Roles
      const rolesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.filter((r) => r.ID !== 1)); // Filter out admin role if needed
      }

      // 3. Fetch Work Offices
      const workOfficesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/office`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (workOfficesRes.ok) {
        const officesData = await workOfficesRes.json();
        if (Array.isArray(officesData)) {
          setWorkOffices(officesData.map((o) => o.title));
        }
      }

      // 4. Fetch Application Offices
      await fetchAppOffices();

      const customerDepartmentsRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (customerDepartmentsRes.ok) {
        const customerDepartmentsData = await customerDepartmentsRes.json();
        setCustomerDepartments(Array.isArray(customerDepartmentsData) ? customerDepartmentsData : []);
      }
    } catch (err) {
      console.error(err);
      setError("Ошибка при загрузке данных");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAppOffices = async () => {
    setLoadingOffices(true);
    try {
      const appOfficesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (appOfficesRes.ok) {
        const appOfficesData = await appOfficesRes.json();
        setAppOffices(Array.isArray(appOfficesData) ? appOfficesData : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOffices(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch]);

  useEffect(() => {
    if (currentPage > totalUserPages) {
      setCurrentPage(totalUserPages);
    }
  }, [currentPage, totalUserPages]);

  const handleOpenEdit = async (u) => {
    setError("");
    setSuccess("");
    setEditingUser(u);
    setActionLoading(true);
    setFullName(u.full_name || "");
    setFirstName(u.first_name || "");
    setLastName(u.last_name || "");
    setUsername(u.username || "");
    setEmail(u.email || "");
    setPhone(u.phone || "");
    setComplianceCode(u.compliance_code || "");
    setABSName(u.abs_name || "");
    setBirthDate(u.birth_date || "");
    setMaritalStatus(u.marital_status || "");
    setInternalPhone(u.internal_phone || "");
    setPhotoURL(u.photo_url || "");
    setPhotoFile(null);

    // Fetch user roles
    try {
      const userRolesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/user/${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userRolesData = await readUserManagementResponse(userRolesRes, "Не удалось загрузить роли сотрудника");
      setSelectedRoles(userRolesData.map((r) => r.ID));
    } catch (err) {
      setError(err.message); setEditingUser(null); setActionLoading(false); return;
    }

    try {
      const customerAccessRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/access/${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const customerAccessData = await readUserManagementResponse(customerAccessRes, "Не удалось загрузить доступы сотрудника");
      setSelectedCustomerDepartments(customerAccessData.department_codes || []);
      setApproverDepartments(customerAccessData.approver_departments || []);
      setCreatorRestriction(customerAccessData.creator_username || "");
    } catch (err) {
      setError(err.message); setEditingUser(null); setActionLoading(false); return;
    }

    // Fetch user application offices
    try {
      const userAppOfficesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices/user/${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userAppOfficesData = await readUserManagementResponse(userAppOfficesRes, "Не удалось загрузить офисы сотрудника");
      if (userAppOfficesData !== null && !Array.isArray(userAppOfficesData)) throw new Error("Не удалось загрузить офисы сотрудника: неверный формат списка");
      setSelectedAppOffices((userAppOfficesData || []).map((o) => o.ID));
    } catch (err) {
      setError(err.message); setEditingUser(null); setActionLoading(false); return;
    }

    // Reset conditional parameters
    setPosition(u.position || "");
    setSalary("");
    setPlan("");
    setSalaryProject("");
    setplaceWork("");
    setOfficeTitle("");
    setOfficeCode("");
    setOfficeDesc("");
    setActionLoading(false);
  };

  const handleRoleChange = (e, roleId) => {
    if (e.target.checked) {
      if ((roleId === 6 && selectedRoles.includes(8)) || (roleId === 8 && selectedRoles.includes(6))) {
        setError("Нельзя одновременно назначить роли: Карточник и Кредитник");
        return;
      }
      setSelectedRoles([...selectedRoles, roleId]);
    } else {
      setSelectedRoles(selectedRoles.filter((id) => id !== roleId));
      if (roleId === 49) setApproverDepartments([]);
    }
    setError("");
  };

  const handleAppOfficeChange = (e, officeId) => {
    if (e.target.checked) {
      setSelectedAppOffices([...selectedAppOffices, officeId]);
    } else {
      setSelectedAppOffices(selectedAppOffices.filter((id) => id !== officeId));
    }
  };

  const handleCustomerDepartmentChange = (e, departmentCode) => {
    if (e.target.checked) {
      setSelectedCustomerDepartments((current) => [...current, departmentCode]);
    } else {
      setSelectedCustomerDepartments((current) => current.filter((code) => code !== departmentCode));
      setApproverDepartments((current) => current.filter((code) => code !== departmentCode));
    }
  };

  const handleSanctionDepartmentChange = (e, departmentCode) => {
    if (e.target.checked) {
      setSelectedRoles((current) => current.includes(49) ? current : [...current, 49]);
      setSelectedCustomerDepartments((current) => selectApproverDepartment(current, departmentCode));
      setApproverDepartments((current) => current.includes(departmentCode) ? current : [...current, departmentCode]);
    } else {
      setApproverDepartments((current) => current.filter((code) => code !== departmentCode));
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      // 1. Update basic profile
      const accessPayload = buildUserAccessPayload(selectedCustomerDepartments, approverDepartments, selectedRoles.includes(49), creatorRestriction);
      // Fail before changing anything if this session cannot save client access.
      const preflight = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/access/${editingUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      await readUserManagementResponse(preflight, "Не удалось проверить право изменения доступов");
      const profileRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          username: username,
          email: email,
          phone: phone,
          compliance_code: complianceCode,
          abs_name: absName,
          birth_date: birthDate,
          marital_status: maritalStatus,
          position,
          internal_phone: internalPhone,
        }),
      });

      if (!profileRes.ok) {
        await readUserManagementResponse(profileRes, "Не удалось обновить профиль");
      }

      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        const photoRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${editingUser.id}/photo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!photoRes.ok) {
          await readUserManagementResponse(photoRes, "Не удалось загрузить фото сотрудника");
        }
      }

      // 2. Update roles and application offices
      const saveRoles = async () => {
      const rolesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/user/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role_ids: selectedRoles,
          application_office_ids: selectedAppOffices,
          salary: Number(salary),
          position: position,
          plan: Number(plan),
          salary_project: Number(salaryProject),
          place_work: placeWork,
          office_title: officeTitle,
          office_code: officeCode,
          office_desc: officeDesc,
        }),
      });

      if (!rolesRes.ok) {
        await readUserManagementResponse(rolesRes, "Не удалось обновить роли сотрудника");
      }
      };

      const saveAccess = async () => {
      const accessRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/customers/access/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(accessPayload),
      });

      if (!accessRes.ok) {
        await readUserManagementResponse(accessRes, "Не удалось обновить доступ к клиентам");
      }
      };
      // Set scope before granting approval; revoke approval before clearing scope.
      await saveUserPermissions(selectedRoles.includes(49), saveRoles, saveAccess);

      setSuccess("Данные сотрудника успешно обновлены");
      setEditingUser(null);
      loadData();
    } catch (err) {
      setError(err.message || "Произошла ошибка при сохранении");
    } finally {
      setActionLoading(false);
    }
  };

  // Application office list management
  const handleAddAppOffice = async (e) => {
    e.preventDefault();
    if (!newOfficeTitle.trim()) return;
    setError("");
    setActionLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newOfficeTitle.trim() }),
      });

      if (!response.ok) {
        await readUserManagementResponse(response, "Не удалось создать офис");
      }

      setNewOfficeTitle("");
      fetchAppOffices();
    } catch (err) {
      setError(err.message || "Ошибка при создании офиса");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAppOffice = async (e) => {
    e.preventDefault();
    if (!editingAppOffice || !editOfficeTitle.trim()) return;
    setError("");
    setActionLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices/${editingAppOffice.ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: editOfficeTitle.trim() }),
      });

      if (!response.ok) {
        await readUserManagementResponse(response, "Не удалось обновить офис");
      }

      setEditingAppOffice(null);
      setEditOfficeTitle("");
      fetchAppOffices();
    } catch (err) {
      setError(err.message || "Ошибка при изменении офиса");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAppOffice = async (officeId) => {
    if (!window.confirm("Вы действительно хотите удалить этот офис заявок?")) return;
    setError("");
    setActionLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices/${officeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        await readUserManagementResponse(response, "Не удалось удалить офис");
      }

      fetchAppOffices();
    } catch (err) {
      setError(err.message || "Ошибка при удалении офиса");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Управление пользователями</title>
      </Helmet>
      <div className="admin-requests-container">
        <div className="admin-header">
          <h1>
            <FaUsers />
            <span>Панель оператора</span>
          </h1>
        </div>

        {/* Tab Selection */}
        <div className="tabs-wrapper">
          <button
            className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
            onClick={() => { setActiveTab("users"); setError(""); }}
          >
            Сотрудники банка
          </button>
          <button
            className={`tab-btn ${activeTab === "offices" ? "active" : ""}`}
            onClick={() => { setActiveTab("offices"); setError(""); }}
          >
            Офисы приема заявок
          </button>
          <button
            className={`tab-btn ${activeTab === "monitoring" ? "active" : ""}`}
            onClick={() => { setActiveTab("monitoring"); setError(""); }}
          >
            Пользователи мониторинга
          </button>
        </div>

        {activeTab === "monitoring" && (
          <section className="admin-tab-content">
            <p>Управление доступом к мониторингу API. Войдите под учётной записью администратора мониторинга.</p>
            <iframe
              title="Пользователи мониторинга API"
              src={`http://${window.location.hostname}:8989/?tab=users&embed=1`}
              style={{ width: "100%", height: "75vh", minHeight: 620, border: "1px solid #e5e7eb", borderRadius: 12 }}
            />
          </section>
        )}

        {error && (
          <div className="admin-alert admin-alert-danger">
            {error}
          </div>
        )}
        {success && (
          <div className="admin-alert admin-alert-success">
            {success}
          </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === "users" && (
          <div className="admin-tab-content">
            {loadingUsers ? (
              <div className="admin-loading-spinner">
                <Spinner size="large" label="Загрузка списка пользователей..." />
              </div>
            ) : users.length === 0 ? (
              <div className="empty-state">
                <FaFolderOpen />
                <h3>Пользователи не найдены</h3>
              </div>
            ) : (
              <>
                <div className="users-toolbar">
                  <input
                    type="search"
                    className="users-search-input"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Поиск по ФИО, username, email, телефону, роли"
                  />
                  <div className="users-toolbar-summary">
                    Показано: {filteredUsers.length} из {users.length}
                  </div>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="empty-state">
                    <FaFolderOpen />
                    <h3>По вашему запросу ничего не найдено</h3>
                  </div>
                ) : (
                  <>
                <div className="requests-grid users-management-grid">
                  {paginatedUsers.map((u) => (
                    <div key={u.id} className="request-list-card">
                      <div className="req-info-block">
                        <div className="req-user-row">
                          <UserProfileLink userId={u.id} displayName={u.full_name || `${u.last_name || ""} ${u.first_name || ""}`.trim() || "Без ФИО"} className="req-name" />
                          <span className="req-username">@{u.username}</span>
                        </div>
                        <div className="req-details-row">
                          <span><FaPhoneAlt /> {u.phone || "Без телефона"}</span>
                          {u.email && <span>Email: {u.email}</span>}
                          {u.compliance_code && <span>Комплаенс код: {u.compliance_code}</span>}
                          {u.internal_phone && <span>Внутренний: {u.internal_phone}</span>}
                          <span>{u.work_status || "Отсутствует на работе"}</span>
                        </div>
                        <div className="req-roles-badge-list">
                          {u.roles?.map((r) => (
                            <span key={r.ID} className="role-badge">
                              {r.Name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="action-btn-group">
                        <button className="btn-action btn-edit" onClick={() => handleOpenEdit(u)}>
                          <FaEdit />
                          <span>Редактировать</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalUserPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      ← Первая
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      ← Предыдущая
                    </button>

                    <div className="pagination-pages">
                      {Array.from({ length: totalUserPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`page-num-btn ${currentPage === page ? "active" : ""}`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalUserPages, currentPage + 1))}
                      disabled={currentPage === totalUserPages}
                      className="pagination-btn"
                    >
                      Следующая →
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalUserPages)}
                      disabled={currentPage === totalUserPages}
                      className="pagination-btn"
                    >
                      Последняя →
                    </button>

                    <div className="pagination-info">
                      Стр. {currentPage} из {totalUserPages} • Всего: {filteredUsers.length}
                    </div>
                  </div>
                )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* --- OFFICES TAB --- */}
        {activeTab === "offices" && (
          <div className="admin-tab-content" style={{ gap: 30 }}>
            {/* Create Office Form */}
            <form onSubmit={handleAddAppOffice} className="admin-card-form">
              <div className="form-group">
                <input
                  type="text"
                  value={newOfficeTitle}
                  onChange={(e) => setNewOfficeTitle(e.target.value)}
                  placeholder="Введите название нового офиса приема заявок"
                  required
                />
              </div>
              <button type="submit" className="btn-action btn-approve" disabled={actionLoading}>
                <FaPlus />
                <span>Добавить офис</span>
              </button>
            </form>

            {loadingOffices ? (
              <div className="admin-loading-spinner" style={{ padding: 40 }}>
                <Spinner size="medium" label="Загрузка списка офисов..." />
              </div>
            ) : appOffices.length === 0 ? (
              <div className="empty-state">
                <FaFolderOpen />
                <h3>Офисы отсутствуют</h3>
              </div>
            ) : (
              <div className="requests-grid">
                {appOffices.map((office) => (
                  <div key={office.ID} className="request-list-card office-card">
                    <div className="office-card-content">
                      {editingAppOffice && editingAppOffice.ID === office.ID ? (
                        <form onSubmit={handleUpdateAppOffice} className="office-edit-inline-form">
                          <input
                            type="text"
                            value={editOfficeTitle}
                            onChange={(e) => setEditOfficeTitle(e.target.value)}
                            required
                            className="admin-edit-inline-input"
                          />
                          <button type="submit" className="btn-action btn-approve">ОК</button>
                          <button type="button" className="btn-action btn-reject" onClick={() => setEditingAppOffice(null)}>Отмена</button>
                        </form>
                      ) : (
                        <span className="office-title">
                          {office.title}
                        </span>
                      )}
                    </div>

                    {!editingAppOffice && (
                      <div className="action-btn-group">
                        <button
                          className="btn-action btn-edit btn-small"
                          onClick={() => { setEditingAppOffice(office); setEditOfficeTitle(office.title); }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn-action btn-reject btn-small"
                          onClick={() => handleDeleteAppOffice(office.ID)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- EDIT USER MODAL --- */}
        {editingUser && (
          <div className="edit-overlay">
            <form className="edit-modal" onSubmit={handleSaveUser}>
              <div className="modal-header">
                <h2>Редактирование сотрудника: {editingUser.username}</h2>
                <button type="button" className="close-btn" onClick={() => setEditingUser(null)}>
                  &times;
                </button>
              </div>

              {error && (
                <div className="admin-alert admin-alert-danger">
                  {error}
                </div>
              )}

              <div className="modal-section-title">
                1. Учетные данные сотрудника
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Фамилия</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Имя</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="form-group span-2">
                  <label>ФИО (полное имя)</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Автозаполнение из Фамилии и Имени" />
                </div>
                <div className="form-group">
                  <label>Имя пользователя (username)</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Номер телефона</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Код комплаенса</label>
                  <input type="text" value={complianceCode} onChange={(e) => setComplianceCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Имя в АБС</label>
                  <input type="text" value={absName} onChange={(e) => setABSName(e.target.value)} placeholder="Например, SSHAKHROM" />
                </div>
                <div className="form-group">
                  <label>Дата рождения</label>
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Семейное положение</label>
                  <input type="text" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Должность</label>
                  <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Внутренний номер телефона</label>
                  <input type="text" value={internalPhone} onChange={(e) => setInternalPhone(e.target.value)} placeholder="Например, 1234" />
                </div>
                <div className="form-group span-2">
                  <label>Фото сотрудника</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {photoURL && <img src={`${import.meta.env.VITE_BACKEND_URL}${photoURL}`} alt="Фото" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                  </div>
                </div>
              </div>

              <div className="modal-section-title">
                2. Роли сотрудника
              </div>
              <div className="roles-checklist">
                {roles.map((role) => (
                  <div key={role.ID} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`edit-role-${role.ID}`}
                      checked={selectedRoles.includes(role.ID)}
                      onChange={(e) => handleRoleChange(e, role.ID)}
                    />
                    <label htmlFor={`edit-role-${role.ID}`}>{role.Name}</label>
                  </div>
                ))}
              </div>

              <div className="modal-section-title">
                3. Офисы приема заявок (для карточного/кредитного фронта)
              </div>
              <p>Ничего не выбрано — доступны все офисы. Если выбрать офисы, будут доступны только выбранные.</p>
              <div className="roles-checklist">
                {appOffices.map((office) => (
                  <div key={office.ID} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`edit-appoffice-${office.ID}`}
                      checked={selectedAppOffices.includes(office.ID)}
                      onChange={(e) => handleAppOfficeChange(e, office.ID)}
                    />
                    <label htmlFor={`edit-appoffice-${office.ID}`}>{office.title}</label>
                  </div>
                ))}
              </div>

              <div className="modal-section-title">
                4. Доступ к подразделениям клиентов
              </div>
              <p>Ничего не выбрано — доступны клиенты всех подразделений. Если выбрать подразделения, доступны только выбранные.</p>
              <div className="roles-checklist customer-department-checklist">
                {customerDepartments.map((department) => (
                  <div key={department.department_code} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`edit-customer-department-${department.department_code}`}
                      checked={selectedCustomerDepartments.includes(department.department_code)}
                      onChange={(e) => handleCustomerDepartmentChange(e, department.department_code)}
                    />
                    <label htmlFor={`edit-customer-department-${department.department_code}`}>
                      {department.department_code} - {department.department_name}
                    </label>
                  </div>
                ))}
              </div>

              <div className="modal-section-title">5. Санкции</div>
              <div className="checkbox-item"><input type="checkbox" id="sanction-approver" checked={selectedRoles.includes(49)} onChange={e => handleRoleChange(e,49)} /><label htmlFor="sanction-approver">Может подтверждать заявки на просмотр и изменение данных</label></div>
              <p>При включённом праве согласования пустой список означает все доступные подразделения; выбранные галочки ограничивают согласование. Собственные заявки подтверждать нельзя.</p>
              <div className="roles-checklist customer-department-checklist">
                {customerDepartments.map((department) => {
                  const code = department.department_code;
                  return <label className="checkbox-item" key={code}>
                    <input type="checkbox" checked={approverDepartments.includes(code)} onChange={(e) => handleSanctionDepartmentChange(e, code)} />
                    {code} - {department.department_name}
                  </label>;
                })}
              </div>
              <div className="modal-section-title">6. Страница «Клиенты»</div>
              <div className="form-group"><label htmlFor="creator-restriction">Оформил — логин сотрудника в АБС</label><input id="creator-restriction" maxLength={255} value={creatorRestriction} onChange={e => setCreatorRestriction(e.target.value)} placeholder="Пусто — все сотрудники в разрешённых подразделениях" /><small>При заполнении видны только клиенты этого сотрудника. Пользователь не сможет изменить закреплённый фильтр.</small></div>
              {/* Conditional Worker Details */}
              {selectedRoles.some((r) => [6, 8].includes(r)) && (
                <div className="conditional-details-block">
                  <div className="block-title">
                    <span>💼 Рабочие сведения для карточного/кредитного отдела</span>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Должность *</label>
                      <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Сумма оклада *</label>
                      <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>План *</label>
                      <input type="number" value={plan} onChange={(e) => setPlan(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>ЗП проект *</label>
                      <input type="number" value={salaryProject} onChange={(e) => setSalaryProject(e.target.value)} required />
                    </div>
                    <div className="form-group span-2">
                      <label>Обслуживающий офис *</label>
                      <Select
                        value={placeWork}
                        onChange={(val) => setplaceWork(val)}
                        options={[
                          { value: "", label: "Выберите офис" },
                          ...workOffices.map((o) => ({ value: o, label: o })),
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Director Office Details */}
              {selectedRoles.includes(5) && (
                <div className="conditional-details-block">
                  <div className="block-title">
                    <span>🏢 Сведения о филиале (директор филиала)</span>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Название филиала *</label>
                      <input type="text" value={officeTitle} onChange={(e) => setOfficeTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Код филиала *</label>
                      <input type="text" value={officeCode} onChange={(e) => setOfficeCode(e.target.value)} required />
                    </div>
                    <div className="form-group span-2">
                      <label>Описание и адрес филиала *</label>
                      <textarea
                        value={officeDesc}
                        onChange={(e) => setOfficeDesc(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-action btn-reject" onClick={() => setEditingUser(null)} disabled={actionLoading}>
                  Отмена
                </button>
                <button type="submit" className="btn-action btn-approve" disabled={actionLoading}>
                  {actionLoading ? (
                    <FaSpinner className="pulse-animation" />
                  ) : (
                    <>
                      <FaUserCheck />
                      <span>Сохранить изменения</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
