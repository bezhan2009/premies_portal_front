import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { FaUserShield, FaCheck, FaTimes, FaEdit, FaUserCheck, FaSpinner } from "react-icons/fa";
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
        <style>{`
          .admin-requests-container {
            padding: 24px;
            max-width: 1200px;
            margin: 0 auto;
            animation: fadeIn 0.4s ease-in-out;
          }
          .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
          }
          .admin-header h1 {
            font-size: 26px;
            font-weight: 800;
            color: #f8fafc;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .admin-header h1 svg {
            color: #3b82f6;
          }
          
          /* Tabs */
          .tabs-wrapper {
            display: flex;
            gap: 8px;
            background: rgba(15, 23, 42, 0.4);
            padding: 6px;
            border-radius: 12px;
            margin-bottom: 24px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            max-width: fit-content;
          }
          .tab-btn {
            background: transparent;
            color: #94a3b8;
            border: none;
            padding: 8px 18px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .tab-btn:hover {
            color: #f8fafc;
          }
          .tab-btn.active {
            background: #3b82f6;
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(59, 130, 246, 0.25);
          }
          
          /* Requests List */
          .requests-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .request-list-card {
            background: rgba(30, 41, 59, 0.5);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 16px;
            padding: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            transition: all 0.3s ease;
          }
          .request-list-card:hover {
            border-color: rgba(59, 130, 246, 0.2);
            background: rgba(30, 41, 59, 0.6);
            transform: translateY(-2px);
          }
          @media (max-width: 768px) {
            .request-list-card {
              flex-direction: column;
              align-items: flex-start;
            }
          }
          .req-info-block {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .req-user-row {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .req-name {
            font-size: 18px;
            font-weight: 700;
            color: #f8fafc;
          }
          .req-username {
            font-size: 13px;
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: 600;
          }
          .req-details-row {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            color: #94a3b8;
            font-size: 14px;
            margin-top: 4px;
          }
          .req-roles-badge-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
          }
          .role-badge {
            font-size: 12px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.05);
            color: #cbd5e1;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          
          /* Actions */
          .action-btn-group {
            display: flex;
            gap: 10px;
          }
          .btn-action {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: none;
            border-radius: 10px;
            padding: 10px 18px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-approve {
            background: #10b981;
            color: #ffffff;
          }
          .btn-approve:hover {
            background: #059669;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
          }
          .btn-reject {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.2);
          }
          .btn-reject:hover {
            background: #ef4444;
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
          }
          .btn-edit {
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.2);
          }
          .btn-edit:hover {
            background: #3b82f6;
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
          }
          
          /* Editor modal / Panel */
          .edit-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            z-index: 1000;
          }
          .edit-modal {
            background: rgba(30, 41, 59, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 32px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: scaleIn 0.3s ease-out;
          }
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 16px;
          }
          .modal-header h2 {
            font-size: 22px;
            color: #f8fafc;
            font-weight: 700;
          }
          .close-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 20px;
            cursor: pointer;
            transition: color 0.2s;
          }
          .close-btn:hover {
            color: #f8fafc;
          }
          
          /* Form layout inside modal */
          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .form-group label {
            font-size: 13px;
            color: #94a3b8;
            font-weight: 500;
          }
          .form-group input, .form-group textarea {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            padding: 10px 14px;
            color: #f8fafc;
            font-size: 14px;
          }
          .roles-checklist {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            background: rgba(15, 23, 42, 0.3);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            margin-bottom: 24px;
          }
          .checkbox-item {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
          }
          .checkbox-item input {
            cursor: pointer;
            width: 16px;
            height: 16px;
          }
          .checkbox-item label {
            cursor: pointer;
            color: #cbd5e1;
            font-size: 13px;
          }
          
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            background: rgba(30, 41, 59, 0.2);
            border-radius: 16px;
            border: 1px dashed rgba(255, 255, 255, 0.08);
            color: #64748b;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <div className="admin-header">
          <h1>
            <FaUserShield />
            <span>Заявки на доступы</span>
          </h1>
        </div>

        {/* Status Filter Tabs */}
        <div className="tabs-wrapper">
          <button className={`tab-btn ${statusTab === "pending" ? "active" : ""}`} onClick={() => setStatusTab("pending")}>
            Ожидающие одобрения
          </button>
          <button className={`tab-btn ${statusTab === "approved" ? "active" : ""}`} onClick={() => setStatusTab("approved")}>
            Одобренные
          </button>
          <button className={`tab-btn ${statusTab === "rejected" ? "active" : ""}`} onClick={() => setStatusTab("rejected")}>
            Отклоненные
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Spinner size="large" label="Загрузка списка заявок..." />
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <h3>Заявки не найдены</h3>
            <p>В этой категории в настоящее время нет активных заявок.</p>
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
                    <span>📱 {req.phone}</span>
                    {req.position && <span>💼 {req.position}</span>}
                    {req.place_work && <span>🏢 {req.place_work}</span>}
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
                <h2>Рассмотрение и редактирование заявки</h2>
                <button type="button" className="close-btn" onClick={() => setEditingRequest(null)}>
                  <FaTimes />
                </button>
              </div>

              {error && (
                <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: 10, padding: 12, color: "#f87171", marginBottom: 20, textAlign: "center", fontSize: 14 }}>
                  {error}
                </div>
              )}

              <div style={{ color: "#3b82f6", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                1. Проверка личных данных
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>ФИО</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Телефон</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>

              <div style={{ color: "#3b82f6", fontWeight: 700, fontSize: 15, marginBottom: 12, marginTop: 24 }}>
                2. Запрашиваемые роли в системе
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
                <div style={{ border: "1px solid rgba(16, 185, 129, 0.2)", background: "rgba(16, 185, 129, 0.03)", padding: 20, borderRadius: 16, marginBottom: 24 }}>
                  <div style={{ color: "#10b981", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                    💼 Параметры сотрудника (Карточник / Кредитник)
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Должность *</label>
                      <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Оклад *</label>
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
                      <label>Место работы *</label>
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
                <div style={{ border: "1px solid rgba(168, 85, 247, 0.2)", background: "rgba(168, 85, 247, 0.03)", padding: 20, borderRadius: 16, marginBottom: 24 }}>
                  <div style={{ color: "#a855f7", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                    🏢 Параметры офиса (Директор)
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Название офиса *</label>
                      <input type="text" value={officeTitle} onChange={(e) => setOfficeTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Код офиса *</label>
                      <input type="text" value={officeCode} onChange={(e) => setOfficeCode(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                      <label>Описание офиса *</label>
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

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 30 }}>
                <button type="button" className="btn-action" style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8" }} onClick={() => setEditingRequest(null)} disabled={actionLoading}>
                  Отмена
                </button>
                <button type="submit" className="btn-action btn-approve" disabled={actionLoading}>
                  {actionLoading ? (
                    <FaSpinner className="pulse-animation" />
                  ) : (
                    <>
                      <FaUserCheck />
                      <span>Подтвердить и предоставить доступы</span>
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
