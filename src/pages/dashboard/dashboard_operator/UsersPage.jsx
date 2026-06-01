import { useEffect, useState } from "react";
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

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("users"); // "users" or "offices"
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roles, setRoles] = useState([]);
  const [workOffices, setWorkOffices] = useState([]);
  const [appOffices, setAppOffices] = useState([]);
  const [loadingOffices, setLoadingOffices] = useState(false);

  // User edit modal states
  const [editingUser, setEditingUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [complianceCode, setComplianceCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedAppOffices, setSelectedAppOffices] = useState([]);

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

  // Fetch all data
  const loadData = async () => {
    setLoadingUsers(true);
    try {
      // 1. Fetch Users
      const usersRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

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

  const handleOpenEdit = async (u) => {
    setError("");
    setSuccess("");
    setEditingUser(u);
    setFullName(u.full_name || "");
    setUsername(u.username || "");
    setEmail(u.email || "");
    setPhone(u.phone || "");
    setComplianceCode(u.compliance_code || "");
    setIsActive(u.is_active !== false);

    // Fetch user roles
    try {
      const userRolesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/user/${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRolesRes.ok) {
        const userRolesData = await userRolesRes.json();
        setSelectedRoles(userRolesData.map((r) => r.ID));
      }
    } catch (err) {
      console.error(err);
    }

    // Fetch user application offices
    try {
      const userAppOfficesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices/user/${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userAppOfficesRes.ok) {
        const userAppOfficesData = await userAppOfficesRes.json();
        setSelectedAppOffices(userAppOfficesData.map((o) => o.ID));
      }
    } catch (err) {
      console.error(err);
    }

    // Reset conditional parameters
    setPosition("");
    setSalary("");
    setPlan("");
    setSalaryProject("");
    setplaceWork("");
    setOfficeTitle("");
    setOfficeCode("");
    setOfficeDesc("");
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

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      // 1. Update basic profile
      const profileRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          username: username,
          email: email,
          phone: phone,
          compliance_code: complianceCode,
          is_active: isActive,
        }),
      });

      if (!profileRes.ok) {
        const errData = await profileRes.json();
        throw new Error(errData.error || "Не удалось обновить профиль");
      }

      // 2. Update roles and application offices
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
        const errData = await rolesRes.json();
        throw new Error(errData.error || "Не удалось обновить роли сотрудника");
      }

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
        const data = await response.json();
        throw new Error(data.error || "Не удалось создать офис");
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
        const data = await response.json();
        throw new Error(data.error || "Не удалось обновить офис");
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
        const data = await response.json();
        throw new Error(data.error || "Не удалось удалить офис");
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
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: 14, padding: 16, color: "#fca5a5", marginBottom: 24, textAlign: "center", fontSize: 14, fontWeight: 600 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", borderRadius: 14, padding: 16, color: "#a7f3d0", marginBottom: 24, textAlign: "center", fontSize: 14, fontWeight: 600 }}>
            {success}
          </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === "users" && (
          loadingUsers ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
              <Spinner size="large" label="Загрузка списка пользователей..." />
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <FaFolderOpen />
              <h3>Пользователи не найдены</h3>
            </div>
          ) : (
            <div className="requests-grid">
              {users.map((u) => (
                <div key={u.id} className="request-list-card" style={{ opacity: u.is_active === false ? 0.6 : 1 }}>
                  <div className="req-info-block">
                    <div className="req-user-row">
                      <span className="req-name">{u.full_name || "Без ФИО"}</span>
                      <span className="req-username">@{u.username}</span>
                      {u.is_active === false && (
                        <span style={{ fontSize: 11, background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                          Заблокирован
                        </span>
                      )}
                    </div>
                    <div className="req-details-row">
                      <span><FaPhoneAlt style={{ color: "#ef4444" }} /> {u.phone || "Без телефона"}</span>
                      {u.email && <span>Email: {u.email}</span>}
                      {u.compliance_code && <span>Комплаенс код: {u.compliance_code}</span>}
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
          )
        )}

        {/* --- OFFICES TAB --- */}
        {activeTab === "offices" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            {/* Create Office Form */}
            <form onSubmit={handleAddAppOffice} style={{ display: "flex", gap: 12, background: "#140b0b", border: "1px solid rgba(239, 68, 68, 0.25)", padding: 24, borderRadius: 20 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="text"
                  value={newOfficeTitle}
                  onChange={(e) => setNewOfficeTitle(e.target.value)}
                  placeholder="Введите название нового офиса приема заявок"
                  required
                  style={{ background: "rgba(15, 10, 10, 0.6)" }}
                />
              </div>
              <button type="submit" className="btn-action btn-approve" disabled={actionLoading} style={{ height: "100%", alignSelf: "flex-end" }}>
                <FaPlus />
                <span>Добавить офис</span>
              </button>
            </form>

            {loadingOffices ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
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
                  <div key={office.ID} className="request-list-card" style={{ padding: "16px 28px" }}>
                    <div style={{ flex: 1 }}>
                      {editingAppOffice && editingAppOffice.ID === office.ID ? (
                        <form onSubmit={handleUpdateAppOffice} style={{ display: "flex", gap: 12, width: "100%" }}>
                          <input
                            type="text"
                            value={editOfficeTitle}
                            onChange={(e) => setEditOfficeTitle(e.target.value)}
                            required
                            style={{ flex: 1, padding: "8px 12px", background: "rgba(15, 10, 10, 0.6)", border: "1px solid #ef4444", borderRadius: 8, color: "#fff" }}
                          />
                          <button type="submit" className="btn-action btn-approve" style={{ padding: "8px 16px" }}>ОК</button>
                          <button type="button" className="btn-action btn-reject" onClick={() => setEditingAppOffice(null)} style={{ padding: "8px 16px" }}>Отмена</button>
                        </form>
                      ) : (
                        <span style={{ fontSize: 18, color: "#fff", fontWeight: 700 }}>
                          {office.title}
                        </span>
                      )}
                    </div>

                    {!editingAppOffice && (
                      <div className="action-btn-group">
                        <button
                          className="btn-action btn-edit"
                          style={{ padding: "8px 16px" }}
                          onClick={() => { setEditingAppOffice(office); setEditOfficeTitle(office.title); }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn-action btn-reject"
                          style={{ padding: "8px 16px" }}
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
                <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: 14, padding: 16, color: "#fca5a5", marginBottom: 24, textAlign: "center", fontSize: 14, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 16, marginBottom: 16, borderLeft: "3px solid #ef4444", paddingLeft: 10 }}>
                1. Учетные данные сотрудника
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>ФИО сотрудника</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Имя пользователя (username)</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Номер телефона</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Код комплаенса</label>
                  <input type="text" value={complianceCode} onChange={(e) => setComplianceCode(e.target.value)} />
                </div>
                <div className="form-group" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24 }}>
                  <input
                    type="checkbox"
                    id="edit-isactive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#ef4444" }}
                  />
                  <label htmlFor="edit-isactive" style={{ cursor: "pointer", fontSize: 14, color: "#fff" }}>
                    Активный аккаунт (сотрудник разблокирован)
                  </label>
                </div>
              </div>

              <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 16, marginBottom: 16, marginTop: 28, borderLeft: "3px solid #ef4444", paddingLeft: 10 }}>
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

              <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 16, marginBottom: 16, marginTop: 28, borderLeft: "3px solid #ef4444", paddingLeft: 10 }}>
                3. Офисы приема заявок (для карточного/кредитного фронта)
              </div>
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

              {/* Conditional Worker Details */}
              {selectedRoles.some((r) => [6, 8].includes(r)) && (
                <div style={{ border: "1px solid rgba(239, 68, 68, 0.25)", background: "rgba(239, 68, 68, 0.03)", padding: 28, borderRadius: 20, marginBottom: 28, marginTop: 28 }}>
                  <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 15, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>💼 Рабочие сведение для карточного/кредитного отдела</span>
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
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
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
                <div style={{ border: "1px solid rgba(239, 68, 68, 0.25)", background: "rgba(239, 68, 68, 0.03)", padding: 28, borderRadius: 20, marginBottom: 28, marginTop: 28 }}>
                  <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 15, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
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
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
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

              <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", marginTop: 36 }}>
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
