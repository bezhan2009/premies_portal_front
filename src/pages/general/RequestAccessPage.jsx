import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { FaCheckCircle, FaHourglassHalf, FaTimesCircle, FaPaperPlane } from "react-icons/fa";
import Select from "../../components/elements/Select.jsx";
import LogoImageComponent from "../../components/Logo";
import Spinner from "../../components/Spinner";

export default function RequestAccessPage() {
  const [request, setRequest] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(true);

  // Form states
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

  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [offices, setOffices] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();

  // Load existing request status
  const fetchMyRequest = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/access-requests/my`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status !== "none") {
          setRequest(data);
          // Prefill if rejected
          if (data.status === "rejected") {
            setFullName(data.full_name || "");
            setPhone(data.phone || "");
            setPosition(data.position || "");
            setplaceWork(data.place_work || "");
            setSalary(data.salary ? String(data.salary) : "");
            setPlan(data.plan ? String(data.plan) : "");
            setSalaryProject(data.salary_project ? String(data.salary_project) : "");
            setOfficeTitle(data.office_title || "");
            setOfficeCode(data.office_code || "");
            setOfficeDesc(data.office_desc || "");
            setSelectedRoles(data.requested_role_ids || []);
          }
        }
      }
    } catch (err) {
      console.error("Ошибка загрузки заявки:", err);
    } finally {
      setLoadingRequest(false);
    }
  };

  useEffect(() => {
    fetchMyRequest();
  }, [token]);

  // Load roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Не удалось загрузить список ролей");
        }
        const data = await response.json();
        // Exclude role 1 (New user) and 3 (Operator - operators manage requests)
        const filteredRoles = data.filter((role) => role.ID !== 1);
        setRoles(filteredRoles);
      } catch (err) {
        console.error(err);
        setError("Ошибка загрузки списка ролей");
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, [token]);

  // Load offices conditionally
  useEffect(() => {
    const hasEmployeeRole = selectedRoles.some((r) => [6, 8].includes(r));
    if (hasEmployeeRole && offices.length === 0) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/office`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Ошибка загрузки офисов");
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setOffices(data.map((item) => item.title));
          }
        })
        .catch((err) => console.error(err));
    }
  }, [selectedRoles, token, offices.length]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (selectedRoles.length === 0) {
      setError("Выберите хотя бы одну желаемую роль");
      return;
    }

    setSubmitting(true);

    const payload = {
      full_name: fullName,
      phone: phone,
      requested_role_ids: selectedRoles,
      salary: 0,
      plan: 0,
      salary_project: 0,
    };

    const hasEmployeeRole = selectedRoles.some((r) => [6, 8].includes(r));
    if (hasEmployeeRole) {
      payload.salary = Number(salary);
      payload.position = position;
      payload.plan = Number(plan);
      payload.salary_project = Number(salaryProject);
      payload.place_work = placeWork;
    }

    if (selectedRoles.includes(5)) {
      payload.office_title = officeTitle;
      payload.office_code = officeCode;
      payload.office_desc = officeDesc;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/access-requests/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Не удалось отправить заявку");
      }

      setSuccess("Заявка успешно отправлена!");
      fetchMyRequest();
    } catch (err) {
      setError(err.message || "Произошла ошибка при отправке заявки");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRequest = () => {
    setRequest(null);
  };

  if (loadingRequest) {
    return (
      <div className="req-loading-container">
        <Spinner size="large" label="Загрузка данных авторизации..." />
      </div>
    );
  }

  // Render pending request status screen
  if (request && request.status === "pending") {
    return (
      <>
        <Helmet>
          <title>Заявка на рассмотрении</title>
        </Helmet>
        <div className="status-screen-container">
          <div className="status-card pending">
            <div className="status-icon-wrapper">
              <FaHourglassHalf className="status-icon pulse-animation" />
            </div>
            <h2>Заявка на доступы отправлена</h2>
            <p className="status-subtitle">
              Ваша заявка находится на рассмотрении у оператора. СМС-уведомление уже направлено ответственным лицам.
            </p>
            <div className="request-summary-box">
              <div className="summary-item">
                <span className="label">ФИО:</span>
                <span className="value">{request.full_name}</span>
              </div>
              <div className="summary-item">
                <span className="label">Телефон:</span>
                <span className="value">{request.phone}</span>
              </div>
              <div className="summary-item">
                <span className="label">Выбранные роли:</span>
                <span className="value">
                  {request.requested_role_ids
                    .map((id) => roles.find((r) => r.ID === id)?.Name || `Роль ${id}`)
                    .join(", ")}
                </span>
              </div>
            </div>
            <div className="helper-note">
              После подтверждения оператором вы получите полный доступ к системе. Пожалуйста, подождите или обновите страницу позже.
            </div>
            <button className="refresh-button" onClick={fetchMyRequest}>
              Обновить статус
            </button>
          </div>
        </div>
      </>
    );
  }

  // Render rejected screen
  if (request && request.status === "rejected") {
    return (
      <>
        <Helmet>
          <title>Заявка отклонена</title>
        </Helmet>
        <div className="status-screen-container">
          <div className="status-card rejected">
            <div className="status-icon-wrapper">
              <FaTimesCircle className="status-icon error-icon" />
            </div>
            <h2>Заявка отклонена оператором</h2>
            <p className="status-subtitle text-danger">
              К сожалению, ваша заявка на получение доступов была отклонена.
            </p>
            <div className="helper-note">
              Вы можете отредактировать свои данные, выбрать другие роли и отправить заявку заново.
            </div>
            <button className="retry-button" onClick={handleResetRequest}>
              Заполнить заново
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Заявка на доступ к системе</title>
      </Helmet>
      <div className="access-form-container">
        <style>{`
          .req-loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 80vh;
          }
          .status-screen-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 75vh;
            padding: 20px;
          }
          .status-card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: fadeInUp 0.6s ease-out;
          }
          .status-card h2 {
            font-size: 24px;
            font-weight: 700;
            color: #f8fafc;
            margin: 20px 0 10px 0;
          }
          .status-subtitle {
            color: #94a3b8;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .status-icon-wrapper {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
          }
          .pending .status-icon-wrapper {
            background: rgba(245, 158, 11, 0.15);
            border: 2px solid #f59e0b;
          }
          .pending .status-icon {
            color: #f59e0b;
            font-size: 36px;
          }
          .rejected .status-icon-wrapper {
            background: rgba(239, 68, 68, 0.15);
            border: 2px solid #ef4444;
          }
          .rejected .status-icon {
            color: #ef4444;
            font-size: 36px;
          }
          .pulse-animation {
            animation: pulse 2s infinite ease-in-out;
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          .request-summary-box {
            background: rgba(15, 23, 42, 0.6);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 24px;
            text-align: left;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .summary-item:last-child {
            border-bottom: none;
          }
          .summary-item .label {
            color: #64748b;
            font-weight: 500;
          }
          .summary-item .value {
            color: #e2e8f0;
            font-weight: 600;
            max-width: 70%;
            text-align: right;
          }
          .helper-note {
            font-size: 14px;
            color: #64748b;
            line-height: 1.5;
            margin-bottom: 30px;
          }
          .refresh-button, .retry-button {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          .refresh-button:hover, .retry-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          }
          
          /* Form Styles */
          .access-form-container {
            max-width: 800px;
            margin: 40px auto;
            padding: 24px;
            animation: fadeInUp 0.6s ease-out;
          }
          .form-header-card {
            text-align: center;
            margin-bottom: 30px;
          }
          .form-header-card h1 {
            font-size: 28px;
            font-weight: 800;
            color: #f8fafc;
            margin-top: 16px;
          }
          .form-card {
            background: rgba(30, 41, 59, 0.6);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          }
          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #3b82f6;
            margin-bottom: 20px;
            border-left: 4px solid #3b82f6;
            padding-left: 10px;
          }
          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          @media (max-width: 600px) {
            .form-grid {
              grid-template-columns: 1fr;
            }
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .form-group label {
            color: #94a3b8;
            font-size: 14px;
            font-weight: 500;
          }
          .form-group input, .form-group textarea {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 16px;
            color: #f8fafc;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .form-group input:focus, .form-group textarea:focus {
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
          .roles-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 30px;
          }
          @media (max-width: 600px) {
            .roles-grid {
              grid-template-columns: 1fr;
            }
          }
          .role-checkbox-item {
            background: rgba(15, 23, 42, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .role-checkbox-item:hover {
            background: rgba(59, 130, 246, 0.05);
            border-color: rgba(59, 130, 246, 0.2);
          }
          .role-checkbox-item input {
            cursor: pointer;
            width: 18px;
            height: 18px;
          }
          .role-checkbox-item label {
            cursor: pointer;
            color: #e2e8f0;
            font-size: 14px;
            font-weight: 500;
          }
          .extra-fields-section {
            background: rgba(15, 23, 42, 0.3);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            animation: fadeIn 0.4s ease-in-out;
          }
          .error-box {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            border-radius: 12px;
            padding: 14px 20px;
            color: #fca5a5;
            font-size: 14px;
            margin-bottom: 30px;
            text-align: center;
          }
          .submit-button {
            width: 100%;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          .submit-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          }
          .submit-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        <div className="form-header-card">
          <LogoImageComponent width={120} height={100} />
          <h1>Подача заявки на получение доступов</h1>
          <p style={{ color: "#94a3b8", marginTop: 8 }}>
            Пожалуйста, заполните ваш профиль и выберите роли, необходимые для вашей работы.
          </p>
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          <div className="section-title">Личные данные</div>
          <div className="form-grid">
            <div className="form-group">
              <label>ФИО полностью *</label>
              <input
                type="text"
                placeholder="Иванов Иван Иванович"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Номер мобильного телефона *</label>
              <input
                type="tel"
                placeholder="992XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="section-title">Выбор желаемых ролей *</div>
          {loadingRoles ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 30 }}>
              <Spinner size="small" />
              <span style={{ color: "#94a3b8" }}>Загружаем доступные роли...</span>
            </div>
          ) : (
            <div className="roles-grid">
              {roles.map((role) => (
                <div key={role.ID} className="role-checkbox-item">
                  <input
                    type="checkbox"
                    id={`role-box-${role.ID}`}
                    checked={selectedRoles.includes(role.ID)}
                    onChange={(e) => handleRoleChange(e, role.ID)}
                  />
                  <label htmlFor={`role-box-${role.ID}`}>{role.Name}</label>
                </div>
              ))}
            </div>
          )}

          {/* Conditional extra worker fields */}
          {selectedRoles.some((r) => [6, 8].includes(r)) && (
            <div className="extra-fields-section">
              <div className="section-title" style={{ borderLeftColor: "#10b981", color: "#10b981" }}>
                Данные сотрудника (Карточник / Кредитник)
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Должность *</label>
                  <input
                    type="text"
                    placeholder="Специалист отдела"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Сумма оклада *</label>
                  <input
                    type="number"
                    placeholder="Оклад в сомони"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>План *</label>
                  <input
                    type="number"
                    placeholder="Месячный план"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>ЗП проект *</label>
                  <input
                    type="number"
                    placeholder="ЗП проект"
                    value={salaryProject}
                    onChange={(e) => setSalaryProject(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Место работы *</label>
                  <Select
                    value={placeWork}
                    onChange={(val) => setplaceWork(val)}
                    options={[
                      { value: "", label: "Выберите офис" },
                      ...offices.map((title) => ({ value: title, label: title })),
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional extra office fields (Director) */}
          {selectedRoles.includes(5) && (
            <div className="extra-fields-section">
              <div className="section-title" style={{ borderLeftColor: "#a855f7", color: "#a855f7" }}>
                Данные нового офиса (Директор)
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Название офиса *</label>
                  <input
                    type="text"
                    placeholder="Название нового отделения"
                    value={officeTitle}
                    onChange={(e) => setOfficeTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Код офиса *</label>
                  <input
                    type="text"
                    placeholder="Код офиса (например, 002)"
                    value={officeCode}
                    onChange={(e) => setOfficeCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Описание офиса *</label>
                  <textarea
                    placeholder="Подробное описание офиса"
                    value={officeDesc}
                    onChange={(e) => setOfficeDesc(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
          {success && (
            <div className="error-box" style={{ background: "rgba(16, 185, 129, 0.1)", borderColor: "#10b981", color: "#a7f3d0" }}>
              {success}
            </div>
          )}

          <button type="submit" className="submit-button" disabled={submitting || loadingRoles}>
            {submitting ? (
              <Spinner size="small" />
            ) : (
              <>
                <FaPaperPlane />
                <span>Отправить заявку оператору</span>
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
