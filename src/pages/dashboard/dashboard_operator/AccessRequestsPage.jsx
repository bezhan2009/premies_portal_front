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
        <style>{`
          .admin-requests-container {
            padding: 32px;
            max-width: 1200px;
            margin: 0 auto;
            animation: fadeIn 0.4s ease-in-out;
          }
          .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 36px;
            border-bottom: 1px solid rgba(239, 68, 68, 0.1);
            padding-bottom: 20px;
          }
          .admin-header h1 {
            font-size: 28px;
            font-weight: 900;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 14px;
            letter-spacing: -0.5px;
          }
          .admin-header h1 svg {
            color: #ef4444;
            filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.3));
          }
          
          /* Tabs */
          .tabs-wrapper {
            display: flex;
            gap: 10px;
            background: rgba(15, 10, 10, 0.5);
            padding: 6px;
            border-radius: 16px;
            margin-bottom: 32px;
            border: 1px solid rgba(239, 68, 68, 0.15);
            max-width: fit-content;
          }
          .tab-btn {
            background: transparent;
            color: #fca5a5;
            border: none;
            padding: 10px 22px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .tab-btn:hover {
            color: #ffffff;
          }
          .tab-btn.active {
            background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
            color: #ffffff;
            box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
          }
          
          /* Requests Grid */
          .requests-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .request-list-card {
            background: #140b0b;
            border: 1px solid rgba(239, 68, 68, 0.25);
            border-radius: 20px;
            padding: 28px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 24px;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          }
          .request-list-card:hover {
            border-color: #ef4444;
            background: #1e1010;
            transform: translateY(-2px);
            box-shadow: 0 15px 35px rgba(239, 68, 68, 0.2);
          }
          @media (max-width: 900px) {
            .request-list-card {
              flex-direction: column;
              align-items: flex-start;
            }
          }
          .req-info-block {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .req-user-row {
            display: flex;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;
          }
          .req-name {
            font-size: 20px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.3px;
          }
          .req-username {
            font-size: 13px;
            background: rgba(239, 68, 68, 0.15);
            color: #fecaca;
            padding: 4px 10px;
            border-radius: 8px;
            font-weight: 700;
            border: 1px solid rgba(239, 68, 68, 0.1);
          }
          .req-details-row {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            color: #fca5a5;
            font-size: 14px;
            margin-top: 4px;
            font-weight: 500;
          }
          .req-details-row span {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .req-roles-badge-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
          }
          .role-badge {
            font-size: 12px;
            font-weight: 700;
            padding: 5px 12px;
            border-radius: 8px;
            background: rgba(15, 10, 10, 0.4);
            color: #ffffff;
            border: 1px solid rgba(239, 68, 68, 0.15);
          }
          
          /* Actions */
          .action-btn-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }
          .btn-action {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: none;
            border-radius: 12px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }
          .btn-approve {
            background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
            color: #ffffff;
            box-shadow: 0 6px 16px rgba(239, 68, 68, 0.25);
          }
          .btn-approve:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 22px rgba(239, 68, 68, 0.4);
            filter: brightness(1.1);
          }
          .btn-reject {
            background: rgba(239, 68, 68, 0.08);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.25);
          }
          .btn-reject:hover {
            background: #ef4444;
            color: #ffffff;
            box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
            border-color: transparent;
          }
          .btn-edit {
            background: rgba(239, 68, 68, 0.12);
            color: #ffffff;
            border: 1px solid rgba(239, 68, 68, 0.2);
          }
          .btn-edit:hover {
            background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
            border-color: transparent;
            box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
            transform: translateY(-1px);
          }
          
          /* Overlay / Modal */
          .edit-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 10, 10, 0.85);
            backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            z-index: 1000;
          }
          .edit-modal {
            background: #140b0b;
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 28px;
            max-width: 850px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 40px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(239, 68, 68, 0.15);
            animation: modalScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 28px;
            border-bottom: 1px solid rgba(239, 68, 68, 0.15);
            padding-bottom: 18px;
          }
          .modal-header h2 {
            font-size: 24px;
            color: #ffffff;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .close-btn {
            background: transparent;
            border: none;
            color: #fca5a5;
            font-size: 22px;
            cursor: pointer;
            transition: color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .close-btn:hover {
            color: #ffffff;
          }
          
          /* Form Controls */
          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .form-group label {
            font-size: 13px;
            color: #fca5a5;
            font-weight: 600;
          }
          .form-group input, .form-group textarea {
            background: rgba(15, 10, 10, 0.6);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 12px;
            padding: 12px 16px;
            color: #ffffff;
            font-size: 14px;
            transition: all 0.3s ease;
          }
          .form-group input:focus, .form-group textarea:focus {
            border-color: #ef4444;
            outline: none;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
          }
          .roles-checklist {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: rgba(15, 10, 10, 0.3);
            border-radius: 16px;
            padding: 20px;
            border: 1px solid rgba(239, 68, 68, 0.1);
            margin-bottom: 28px;
          }
          @media (max-width: 600px) {
            .roles-checklist {
              grid-template-columns: 1fr;
            }
          }
          .checkbox-item {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 8px;
            transition: background 0.2s;
          }
          .checkbox-item:hover {
            background: rgba(239, 68, 68, 0.05);
          }
          .checkbox-item input {
            cursor: pointer;
            accent-color: #ef4444;
            width: 18px;
            height: 18px;
          }
          .checkbox-item label {
            cursor: pointer;
            color: #ffffff;
            font-size: 14px;
            font-weight: 600;
          }
          
          .empty-state {
            text-align: center;
            padding: 80px 20px;
            background: rgba(30, 18, 18, 0.15);
            border-radius: 20px;
            border: 1px dashed rgba(239, 68, 68, 0.25);
            color: #fca5a5;
            animation: fadeIn 0.4s ease-out;
          }
          .empty-state svg {
            font-size: 48px;
            color: #ef4444;
            margin-bottom: 20px;
            opacity: 0.8;
          }
          .empty-state h3 {
            font-size: 20px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 8px;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes modalScaleIn {
            from { transform: scale(0.96); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

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
