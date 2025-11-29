import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/login.scss";
import "../../styles/extraForm.scss";
import LogoImageComponent from "../../components/Logo";
import Spinner from "../../components/Spinner";
import { Helmet } from "react-helmet";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { registerUser } from "../../api/auth";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(3);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [salary, setSalary] = useState("");
  const [position, setPosition] = useState("");
  const [plan, setPlan] = useState("");
  const [salaryProject, setSalaryProject] = useState("");
  const [placeWork, setPlaceWork] = useState("");
  const [offices, setOffices] = useState([]);

  const [officeTitle, setOfficeTitle] = useState("");
  const [officeDesc, setOfficeDesc] = useState("");

  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();

  // Загрузка ролей из API
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
        }

        const rolesData = await response.json();
        setRoles(rolesData);
      } catch (err) {
        console.error('Ошибка загрузки ролей:', err);
        setError('Не удалось загрузить список ролей');
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [token]);

  // Загрузка офисов для определенных ролей
  useEffect(() => {
    const fetchOffices = async () => {
      if ((roleId === 6 || roleId === 8) && offices.length === 0) {
        try {
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/office`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          if (Array.isArray(data)) {
            const titles = data.map((item) => item.title);
            setOffices(titles);
          } else {
            console.error("Сервер вернул не массив:", data);
          }
        } catch (err) {
          console.error("Ошибка загрузки офисов:", err);
        }
      }
    };

    fetchOffices();
  }, [roleId, token, offices.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      Username: username,
      Email: email,
      Phone: phone,
      full_name: fullName,
      Password: password,
      role_ids: [roleId],
    };

    // Добавляем дополнительные поля для ролей 6 и 8
    if (roleId === 6 || roleId === 8) {
      payload.Salary = salary ? Number(salary) : 0;
      payload.position = position || "";
      payload.plan = plan ? Number(plan) : 0;
      payload.salary_project = salaryProject ? Number(salaryProject) : 0;
      payload.place_work = placeWork || "";
    }

    // Добавляем поля для директора (роль 5)
    if (roleId === 5) {
      payload.office_title = officeTitle;
      payload.office_desc = officeDesc;
    }

    try {
      await registerUser(payload);
      navigate("/operator/reports", { replace: true });
    } catch (err) {
      if (err.message === "Failed to fetch") {
        setError("Сервис сейчас недоступен");
      } else {
        setError(err.message || "Ошибка регистрации");
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <Helmet>
        <title>Регистрация</title>
      </Helmet>
      <div className="login-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <div align="center" className="image-logo-login">
            <LogoImageComponent width={125} height={105} />
          </div>

          <label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Логин"
              required
            />
          </label>

          <label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
          </label>

          <label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Телефон"
              required
            />
          </label>

          <label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ФИО"
              required
            />
          </label>

          <label style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              required
            />
            <button
              type="button"
              className="toggle-password-visibility"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </label>

          <label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(Number(e.target.value))}
              required
              disabled={loadingRoles}
            >
              {loadingRoles ? (
                <option value="">Загрузка ролей...</option>
              ) : (
                roles.map((role) => (
                  <option key={role.ID} value={role.ID}>
                    {role.Name}
                  </option>
                ))
              )}
            </select>
          </label>

          {(roleId === 6 || roleId === 8) && (
            <div className="extra-form visible">
              <label>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="Сумма оклада"
                />
              </label>
              <label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Позиция"
                />
              </label>
              <label>
                <input
                  type="number"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  placeholder="План"
                />
              </label>
              <label>
                <input
                  type="number"
                  value={salaryProject}
                  onChange={(e) => setSalaryProject(e.target.value)}
                  placeholder="ЗП проект"
                />
              </label>
              <label>
                <select
                  value={placeWork}
                  onChange={(e) => setPlaceWork(e.target.value)}
                >
                  <option value="">Выберите место работы</option>
                  {offices.map((title, idx) => (
                    <option key={idx} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {roleId === 5 && (
            <div className="extra-form visible">
              <label>
                <input
                  type="text"
                  value={officeTitle}
                  onChange={(e) => setOfficeTitle(e.target.value)}
                  placeholder="Название офиса"
                  required
                />
              </label>
              <label>
                <textarea
                  value={officeDesc}
                  onChange={(e) => setOfficeDesc(e.target.value)}
                  placeholder="Описание офиса"
                  required
                  rows={3}
                />
              </label>
            </div>
          )}

          {error && (
            <div align="center" className="error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || loadingRoles}>
            {loading ? (
              <div align="center">
                <Spinner />
              </div>
            ) : (
              "Зарегистрировать"
            )}
          </button>
        </form>
      </div>
    </>
  );
}
