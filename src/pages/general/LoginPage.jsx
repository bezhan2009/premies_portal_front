import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/login.scss";
import LogoImageComponent from "../../components/Logo";
import Spinner from "../../components/Spinner";
import { login } from "../../api/auth";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Helmet } from "react-helmet";
import { getV2Token } from "../../api/getV2Token";

export default function LoginPage() {
  const [username, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(username, password);
      console.log("Logged in:", data);
      const v2Token = await getV2Token({ token: data.access_token });

      console.log("v2Token", v2Token);

      if (!v2Token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("username", username);
      }

      // Сохраняем ВЕСЬ массив ролей как JSON-строку
      if (data.role_ids && Array.isArray(data.role_ids)) {
        localStorage.setItem("role_ids", JSON.stringify(data.role_ids));
      } else if (data.role_ids !== undefined) {
        // На случай, если бэкенд вдруг пришлёт одну роль (число)
        localStorage.setItem("role_ids", JSON.stringify([data.role_ids]));
      }

      navigate(from, { replace: true });
    } catch (err) {
      if (err.message === "Failed to fetch") {
        setError("Сервис сейчас недоступен");
      } else {
        setError(err.message);
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
        <title>Логин</title>
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Логин"
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

          {error && (
            <div align="center" className="error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? (
              <div align="center">
                <Spinner />
              </div>
            ) : (
              "Войти"
            )}
          </button>
        </form>
      </div>
    </>
  );
}
