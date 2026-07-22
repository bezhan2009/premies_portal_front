import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { FaUserShield, FaCheck, FaTimes, FaEdit, FaUserCheck, FaSpinner, FaUsers, FaFolderOpen, FaAddressCard, FaPhoneAlt, FaRegBuilding, FaBriefcase } from "react-icons/fa";
import Select from "../../../components/elements/Select.jsx";
import Spinner from "../../../components/Spinner";

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("pending");
  const [editingRequest, setEditingRequest] = useState(null);

  // Form states for the modal/editing interface
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [placeWork, setplaceWork] = useState("");
  const [salary, setSalary] = useState("");
  const [plan, setPlan] = useState("");
  const [salaryProject, setSalaryProject] = useState("");
  const [officeTitle, setOfficeTitle] = useState("");
  const [officeCode, setOfficeCode] = useState("");
  const [officeDesc, setOfficeDesc] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);

  const [roles, setRoles] = useState([]);
  const [offices, setOffices] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  // Load requests based on current tab
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/access-requests/?status=${statusTab}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Не удалось загрузить заявки");
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Ошибка при получении списка заявок");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusTab, token]);

  // Load roles & offices
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const rolesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(rolesData.filter((r) => r.ID !== 1));
        }

        const officesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/office`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (officesRes.ok) {
          const officesData = await officesRes.json();
          if (Array.isArray(officesData)) {
            setOffices(officesData.map((o) => o.title));
          }
        }
      } catch (err) {
        console.error("Ошибка инициализации справочников:", err);
      }
    };
    loadConfig();
  }, [token]);

  const handleOpenEdit = (req) => {
    setEditingRequest(req);
    setFullName(req.full_name || "");
    setPhone(req.phone || "");
    setPosition(req.position || "");
    setplaceWork(req.place_work || "");
    setSalary(req.salary ? String(req.salary) : "");
    setPlan(req.plan ? String(req.plan) : "");
    setSalaryProject(req.salary_project ? String(req.salary_project) : "");
    setOfficeTitle(req.office_title || "");
    setOfficeCode(req.office_code || "");
    setOfficeDesc(req.office_desc || "");
    setSelectedRoles(req.requested_role_ids || []);
    setError("");
  };

  const handleRoleChange = (e, roleId) => {
    if (e.target.checked) {
      if ((roleId === 6 && selectedRoles.includes(8)) || (roleId === 8 && selectedRoles.includes(6))) {
        setError("Нельзя одновременно выбрать роли: Карточник и Кредитник");
        return;
      }
      setSelectedRoles([...selectedRoles, roleId]);
    } else {
      setSelectedRoles(selectedRoles.filter((id) => id !== roleId));
    }
    setError("");
  };

  const handleApprove = async (e) => {
    if (e) e.preventDefault();
    if (!editingRequest) return;
    setError("");

    if (selectedRoles.length === 0) {
      setError("Выберите хотя бы одну роль для пользователя");
      return;
    }

    setActionLoading(true);

    const payload = {
      full_name: fullName,
      phone: phone,
      requested_role_ids: selectedRoles,
      salary: Number(salary),
      position: position,
      plan: Number(plan),
      salary_project: Number(salaryProject),
      place_work: placeWork,
      office_title: officeTitle,
      office_code: officeCode,
      office_desc: officeDesc,
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/access-requests/${editingRequest.ID}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Не удалось одобрить заявку");
      }

      setEditingRequest(null);
      fetchRequests();
    } catch (err) {
      setError(err.message || "Ошибка при одобрении заявки");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reqId) => {
    if (!window.confirm("Вы уверены, что хотите отклонить эту заявку?")) return;
    setError("");
    setActionLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/access-requests/${reqId}/reject`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Не удалось отклонить заявку");
      }

      setEditingRequest(null);
      fetchRequests();
    } catch (err) {
      setError(err.message || "Ошибка при отклонении заявки");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Управление заявками на доступы</title>
      </Helmet>
      <div className="admin-requests-container">
        <div className="admin-header">
          <h1>
            <FaUserShield />
            <span>Заявки на доступы (Панель оператора)</span>
          </h1>
        </div>

        {/* Status Filter Tabs */}
        <div className="tabs-wrapper">
          <button className={`tab-btn ${statusTab === "pending" ? "active" : ""}`} onClick={() => setStatusTab("pending")}>
            Ожидающие
          </button>
          <button className={`tab-btn ${statusTab === "approved" ? "active" : ""}`} onClick={() => setStatusTab("approved")}>
            Одобренные
          </button>
          <button className={`tab-btn ${statusTab === "rejected" ? "active" : ""}`} onClick={() => setStatusTab("rejected")}>
            Отклоненные
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
            <Spinner size="large" label="Синхронизация списка..." />
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <FaFolderOpen />
            <h3>Заявки отсутствуют</h3>
            <p>В выбранной категории в настоящее время нет зарегистрированных заявок.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {requests.map((req) => (
              <div key={req.ID} className="request-list-card">
                <div className="req-info-block">
                  <div className="req-user-row">
                    <span className="req-name">{req.full_name}</span>
                    <span className="req-username">@{req.User?.email ? req.User.email.split("@")[0] : "user"}</span>
                  </div>
                  <div className="req-details-row">
                    <span><FaPhoneAlt style={{ color: "#ef4444" }} /> {req.phone}</span>
                    {req.position && <span><FaBriefcase style={{ color: "#ef4444" }} /> {req.position}</span>}
                    {req.place_work && <span><FaRegBuilding style={{ color: "#ef4444" }} /> {req.place_work}</span>}
                  </div>
                  <div className="req-roles-badge-list">
                    {req.requested_role_ids?.map((id) => (
                      <span key={id} className="role-badge">
                        {roles.find((r) => r.ID === id)?.Name || `Роль ${id}`}
                      </span>
                    ))}
                  </div>
                </div>

                {statusTab === "pending" && (
                  <div className="action-btn-group">
                    <button className="btn-action btn-edit" onClick={() => handleOpenEdit(req)}>
                      <FaEdit />
                      <span>Редактировать и одобрить</span>
                    </button>
                    <button className="btn-action btn-reject" onClick={() => handleReject(req.ID)}>
                      <FaTimes />
                      <span>Отклонить</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Editing / Approval Overlay */}
        {editingRequest && (
          <div className="edit-overlay">
            <form className="edit-modal" onSubmit={handleApprove}>
              <div className="modal-header">
                <h2>Рассмотрение и одобрение прав</h2>
                <button type="button" className="close-btn" onClick={() => setEditingRequest(null)}>
                  <FaTimes />
                </button>
              </div>

              {error && (
                <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: 14, padding: 16, color: "#fca5a5", marginBottom: 24, textAlign: "center", fontSize: 14, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 16, marginBottom: 16, borderLeft: "3px solid #ef4444", paddingLeft: 10 }}>
                1. Проверка личных данных
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>ФИО сотрудника</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Номер телефона</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>

              <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 16, marginBottom: 16, marginTop: 28, borderLeft: "3px solid #ef4444", paddingLeft: 10 }}>
                2. Назначаемые роли в системе
              </div>
              <div className="roles-checklist">
                {roles.map((role) => (
                  <div key={role.ID} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`modal-role-${role.ID}`}
                      checked={selectedRoles.includes(role.ID)}
                      onChange={(e) => handleRoleChange(e, role.ID)}
                    />
                    <label htmlFor={`modal-role-${role.ID}`}>{role.Name}</label>
                  </div>
                ))}
              </div>

              {/* Conditional Worker Details */}
              {selectedRoles.some((r) => [6, 8].includes(r)) && (
                <div style={{ border: "1px solid rgba(239, 68, 68, 0.25)", background: "rgba(239, 68, 68, 0.03)", padding: 28, borderRadius: 20, marginBottom: 28 }}>
                  <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 15, marginBottom: 18, display: "flex", alignParagraph: "center", gap: 8 }}>
                    <span>💼 Сведения для карточного/кредитного отдела</span>
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
                          ...offices.map((o) => ({ value: o, label: o })),
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Office Details */}
              {selectedRoles.includes(5) && (
                <div style={{ border: "1px solid rgba(239, 68, 68, 0.25)", background: "rgba(239, 68, 68, 0.03)", padding: 28, borderRadius: 20, marginBottom: 28 }}>
                  <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 15, marginBottom: 18, display: "flex", alignParagraph: "center", gap: 8 }}>
                    <span>🏢 Сведения о новом филиале</span>
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
                <button type="button" className="btn-action btn-reject" onClick={() => setEditingRequest(null)} disabled={actionLoading}>
                  Отмена
                </button>
                <button type="submit" className="btn-action btn-approve" disabled={actionLoading}>
                  {actionLoading ? (
                    <FaSpinner className="pulse-animation" />
                  ) : (
                    <>
                      <FaUserCheck />
                      <span>Подтвердить и выдать роли</span>
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
