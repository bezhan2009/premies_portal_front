import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { FaCheckCircle, FaHourglassHalf, FaTimesCircle, FaPaperPlane, FaUser, FaPhone, FaBriefcase, FaMoneyBillWave, FaMapMarkerAlt } from "react-icons/fa";
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
        <style>{`
          .req-loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 80vh;
            background: radial-gradient(circle at center, #1e1b1b 0%, #0f0e0e 100%);
          }
        `}</style>
        <Spinner size="large" label="Синхронизация профиля..." />
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
          <style>{`
            .status-screen-container {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 85vh;
              padding: 24px;
              background: radial-gradient(circle at center, #1e1212 0%, #0c0808 100%);
            }
            .status-card {
              background: #140b0b;
              border: 1px solid rgba(239, 68, 68, 0.3);
              border-radius: 28px;
              padding: 48px 40px;
              max-width: 600px;
              width: 100%;
              text-align: center;
              box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(239, 68, 68, 0.1);
              animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .status-icon-wrapper {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 28px auto;
              background: rgba(239, 68, 68, 0.08);
              border: 2px solid #ef4444;
              box-shadow: 0 0 30px rgba(239, 68, 68, 0.25);
            }
            .status-icon {
              color: #ef4444;
              font-size: 42px;
            }
            .pulse-animation {
              animation: rotatePulse 3s infinite ease-in-out;
            }
            @keyframes rotatePulse {
              0% { transform: scale(1) rotate(0deg); }
              50% { transform: scale(1.1) rotate(180deg); }
              100% { transform: scale(1) rotate(360deg); }
            }
            .status-card h2 {
              font-size: 28px;
              font-weight: 800;
              color: #ffffff;
              letter-spacing: -0.5px;
              margin-bottom: 12px;
            }
            .status-subtitle {
              color: #fca5a5;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 32px;
              font-weight: 500;
            }
            .request-summary-box {
              background: rgba(15, 10, 10, 0.7);
              border-radius: 20px;
              padding: 24px;
              margin-bottom: 32px;
              text-align: left;
              border: 1px solid rgba(239, 68, 68, 0.1);
            }
            .summary-item {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            }
            .summary-item:last-child {
              border-bottom: none;
            }
            .summary-item .label {
              color: #fca3a3;
              font-weight: 500;
              font-size: 14px;
            }
            .summary-item .value {
              color: #ffffff;
              font-weight: 600;
              max-width: 70%;
              text-align: right;
              font-size: 14px;
            }
            .helper-note {
              font-size: 14px;
              color: #fca5a5;
              line-height: 1.6;
              margin-bottom: 36px;
              opacity: 0.8;
            }
            .refresh-button {
              background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
              color: #ffffff;
              border: none;
              border-radius: 14px;
              padding: 16px 36px;
              font-size: 16px;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
              box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
            }
            .refresh-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 12px 32px rgba(239, 68, 68, 0.45);
              filter: brightness(1.1);
            }
            @keyframes slideUpFade {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
          <div className="status-card pending">
            <div className="status-icon-wrapper">
              <FaHourglassHalf className="status-icon pulse-animation" />
            </div>
            <h2>Заявка отправлена</h2>
            <p className="status-subtitle">
              Ваш запрос на получение доступов успешно зарегистрирован в Active Directory и ожидает подтверждения оператором.
            </p>
            <div className="request-summary-box">
              <div className="summary-item">
                <span className="label">Сотрудник:</span>
                <span className="value">{request.full_name}</span>
              </div>
              <div className="summary-item">
                <span className="label">Номер телефона:</span>
                <span className="value">{request.phone}</span>
              </div>
              <div className="summary-item">
                <span className="label">Запрошенные доступы:</span>
                <span className="value">
                  {request.requested_role_ids
                    .map((id) => roles.find((r) => r.ID === id)?.Name || `Роль ${id}`)
                    .join(", ")}
                </span>
              </div>
            </div>
            <div className="helper-note">
              СМС-уведомление направлено ответственным лицам. Как только оператор одобрит заявку, ваш интерфейс автоматически переключится.
            </div>
            <button className="refresh-button" onClick={fetchMyRequest}>
              Обновить статус доступов
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
          <style>{`
            .status-screen-container {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 85vh;
              padding: 24px;
              background: radial-gradient(circle at center, #1e1212 0%, #0c0808 100%);
            }
            .status-card {
              background: #140b0b;
              border: 1px solid rgba(239, 68, 68, 0.35);
              border-radius: 28px;
              padding: 48px 40px;
              max-width: 600px;
              width: 100%;
              text-align: center;
              box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
              animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .status-icon-wrapper.rejected {
              background: rgba(220, 38, 38, 0.1);
              border: 2px solid #dc2626;
              box-shadow: 0 0 30px rgba(220, 38, 38, 0.25);
              width: 100px;
              height: 100px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 28px auto;
            }
            .status-icon.rejected-icon {
              color: #dc2626;
              font-size: 42px;
            }
            .status-card h2 {
              font-size: 28px;
              font-weight: 800;
              color: #ffffff;
              margin-bottom: 12px;
            }
            .status-subtitle.rejected-sub {
              color: #fca5a5;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 32px;
            }
            .retry-button {
              background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
              color: #ffffff;
              border: none;
              border-radius: 14px;
              padding: 16px 36px;
              font-size: 16px;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
              box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
            }
            .retry-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 12px 32px rgba(239, 68, 68, 0.45);
            }
          `}</style>
          <div className="status-card rejected">
            <div className="status-icon-wrapper rejected">
              <FaTimesCircle className="status-icon rejected-icon" />
            </div>
            <h2>Заявка отклонена</h2>
            <p className="status-subtitle rejected-sub">
              К сожалению, ваша заявка на получение доступов к системе была отклонена оператором.
            </p>
            <div className="helper-note" style={{ color: "#fca5a5", opacity: 0.8 }}>
              Вы можете отредактировать свои данные, исправить ошибки и отправить запрос повторно.
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
          .access-form-container {
            max-width: 900px;
            margin: 40px auto;
            padding: 24px;
            animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .form-header-card {
            text-align: center;
            margin-bottom: 40px;
          }
          .form-header-card h1 {
            font-size: 32px;
            font-weight: 900;
            color: #1a1010;
            letter-spacing: -1px;
            margin-top: 20px;
          }
          .form-header-card p {
            color: #ef4444;
            font-weight: 600;
            margin-top: 8px;
            font-size: 16px;
            opacity: 0.9;
          }
          .form-card {
            background: #140b0b;
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 28px;
            padding: 48px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
          }
          .section-title {
            font-size: 19px;
            font-weight: 800;
            color: #ef4444;
            margin-bottom: 24px;
            border-left: 4px solid #ef4444;
            padding-left: 14px;
            letter-spacing: -0.3px;
          }
          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 40px;
          }
          @media (max-width: 768px) {
            .form-grid {
              grid-template-columns: 1fr;
            }
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            position: relative;
          }
          .form-group label {
            color: #fca5a5;
            font-size: 14px;
            font-weight: 600;
          }
          .input-with-icon {
            position: relative;
            display: flex;
            align-items: center;
          }
          .input-icon {
            position: absolute;
            left: 16px;
            color: #ef4444;
            font-size: 16px;
            opacity: 0.85;
          }
          .form-group input, .form-group textarea {
            width: 100%;
            background: rgba(15, 10, 10, 0.6);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 14px;
            padding: 14px 16px 14px 44px;
            color: #ffffff;
            font-size: 15px;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .form-group input:focus, .form-group textarea:focus {
            border-color: #ef4444;
            outline: none;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25), 0 0 15px rgba(239, 68, 68, 0.1);
          }
          .roles-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 40px;
          }
          @media (max-width: 600px) {
            .roles-grid {
              grid-template-columns: 1fr;
            }
          }
          .role-checkbox-item {
            background: rgba(15, 10, 10, 0.4);
            border: 1px solid rgba(239, 68, 68, 0.1);
            border-radius: 16px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .role-checkbox-item:hover {
            background: rgba(239, 68, 68, 0.08);
            border-color: rgba(239, 68, 68, 0.3);
            transform: translateY(-1px);
          }
          .role-checkbox-item input {
            cursor: pointer;
            accent-color: #ef4444;
            width: 20px;
            height: 20px;
          }
          .role-checkbox-item label {
            cursor: pointer;
            color: #ffffff;
            font-size: 15px;
            font-weight: 600;
          }
          .extra-fields-section {
            background: rgba(20, 10, 10, 0.4);
            border-radius: 20px;
            padding: 32px;
            margin-bottom: 40px;
            border: 1px solid rgba(239, 68, 68, 0.15);
            animation: fadeIn 0.4s ease-out;
          }
          .error-box {
            background: #2a1010;
            border: 1px solid #ef4444;
            border-radius: 14px;
            padding: 16px 24px;
            color: #ffcccc;
            font-size: 15px;
            margin-bottom: 32px;
            text-align: center;
            font-weight: 600;
          }
          .submit-button {
            width: 100%;
            background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
            color: #ffffff;
            border: none;
            border-radius: 14px;
            padding: 18px;
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
          }
          .submit-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(239, 68, 68, 0.45);
            filter: brightness(1.1);
          }
          .submit-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          @keyframes slideUpFade {
            from {
              opacity: 0;
              transform: translateY(30px);
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
          <h1>Активация доступов к порталу</h1>
          <p>
            Введите ваши данные и выберите роли. После подтверждения оператором вам откроются соответствующие модули.
          </p>
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          <div className="section-title">Личные сведения сотрудника</div>
          <div className="form-grid">
            <div className="form-group">
              <label>ФИО полностью *</label>
              <div className="input-with-icon">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Номер мобильного телефона *</label>
              <div className="input-with-icon">
                <FaPhone className="input-icon" />
                <input
                  type="tel"
                  placeholder="992XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="section-title">Запрашиваемые роли *</div>
          {loadingRoles ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 40 }}>
              <Spinner size="small" />
              <span style={{ color: "#fca5a5" }}>Получение списка ролей из БД...</span>
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
              <div className="section-title" style={{ borderLeftColor: "#ef4444", color: "#ffffff" }}>
                💼 Данные сотрудника (Карточник / Кредитник)
              </div>
              <div className="form-grid" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label>Должность *</label>
                  <div className="input-with-icon">
                    <FaBriefcase className="input-icon" />
                    <input
                      type="text"
                      placeholder="Главный специалист"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Сумма оклада *</label>
                  <div className="input-with-icon">
                    <FaMoneyBillWave className="input-icon" />
                    <input
                      type="number"
                      placeholder="Оклад в сомони"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>План *</label>
                  <div className="input-with-icon">
                    <FaPaperPlane className="input-icon" />
                    <input
                      type="number"
                      placeholder="Месячный план продаж"
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>ЗП проект *</label>
                  <div className="input-with-icon">
                    <FaMoneyBillWave className="input-icon" />
                    <input
                      type="number"
                      placeholder="Сумма ЗП проекта"
                      value={salaryProject}
                      onChange={(e) => setSalaryProject(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Место работы *</label>
                  <Select
                    value={placeWork}
                    onChange={(val) => setplaceWork(val)}
                    options={[
                      { value: "", label: "Выберите обслуживающий офис" },
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
              <div className="section-title" style={{ borderLeftColor: "#ef4444", color: "#ffffff" }}>
                🏢 Параметры нового филиала (Директор)
              </div>
              <div className="form-grid" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label>Название филиала *</label>
                  <div className="input-with-icon">
                    <FaMapMarkerAlt className="input-icon" />
                    <input
                      type="text"
                      placeholder="Душанбе - Сеть 1"
                      value={officeTitle}
                      onChange={(e) => setOfficeTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Код филиала *</label>
                  <div className="input-with-icon">
                    <FaMapMarkerAlt className="input-icon" />
                    <input
                      type="text"
                      placeholder="001"
                      value={officeCode}
                      onChange={(e) => setOfficeCode(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 8 }}>
                  <label>Описание и адрес *</label>
                  <textarea
                    placeholder="Укажите точный адрес и краткое описание филиала..."
                    value={officeDesc}
                    onChange={(e) => setOfficeDesc(e.target.value)}
                    rows={3}
                    style={{ paddingLeft: 16 }}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
          {success && (
            <div className="error-box" style={{ background: "rgba(239, 68, 68, 0.08)", borderColor: "#ef4444", color: "#ffffff" }}>
              {success}
            </div>
          )}

          <button type="submit" className="submit-button" disabled={submitting || loadingRoles}>
            {submitting ? (
              <Spinner size="small" />
            ) : (
              <>
                <FaPaperPlane />
                <span>Отправить заявку на доступы</span>
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
