import { useState, useEffect } from "react";
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
    const [restoringSession, setRestoringSession] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";

    // Функция для восстановления сессии
    const restoreSession = async (token) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/restore`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Если токен недействителен, удаляем его
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    localStorage.removeItem("role_ids");
                    localStorage.removeItem("username");
                    return null;
                }
                throw new Error(`Ошибка восстановления: ${response.status}`);
            }

            const data = await response.json();
            console.log("Сессия восстановлена:", data);
            return data;
        } catch (err) {
            console.error("Ошибка при восстановлении сессии:", err);
            return null;
        }
    };

    // Проверяем наличие токена при загрузке страницы
    useEffect(() => {
        const checkAndRestoreSession = async () => {
            const token = localStorage.getItem("access_token");

            if (token) {
                setRestoringSession(true);
                console.log("Найден access_token, пытаемся восстановить сессию...");

                const sessionData = await restoreSession(token);

                if (sessionData) {
                    // Обрабатываем восстановленные данные так же, как при обычном логине
                    await handleSessionRestoration(sessionData);
                } else {
                    setRestoringSession(false);
                }
            }
        };

        checkAndRestoreSession();
    }, []);

    // Обработка данных восстановленной сессии
    const handleSessionRestoration = async (data) => {
        try {
            // Попробуем обменять на v2 токен. Если обмен прошёл — используем v2, иначе — исходные токены.
            let finalAccess = data.access_token;
            let finalRefresh = data.refresh_token;
            try {
                const v2Token = await getV2Token({ token: data.access_token });
                if (v2Token && v2Token.access_token) {
                    finalAccess = v2Token.access_token;
                    if (v2Token.refresh_token) finalRefresh = v2Token.refresh_token;
                }
            } catch (err) {
                // Если обмен не прошёл — просто используем исходные токены (и логируем ошибку).
                console.warn("getV2Token failed, using original tokens", err);
            }

            // Сохраняем актуальные токены всегда
            localStorage.setItem("access_token", finalAccess);
            if (finalRefresh) localStorage.setItem("refresh_token", finalRefresh);

            // Сохраняем имя пользователя, если оно есть в ответе
            if (data.username) {
                localStorage.setItem("username", data.username);
            }

            // Сохраняем ВЕСЬ массив ролей как JSON-строку
            if (data.role_ids && Array.isArray(data.role_ids)) {
                localStorage.setItem("role_ids", JSON.stringify(data.role_ids));
            } else if (data.role_ids !== undefined) {
                // На случай, если бэкенд вдруг пришлёт одну роль (число)
                localStorage.setItem("role_ids", JSON.stringify([data.role_ids]));
            }

            // Перенаправляем на предыдущую страницу или главную
            navigate(from, { replace: true });
        } catch (err) {
            console.error("Ошибка при обработке восстановленной сессии:", err);
            setError("Ошибка восстановления сессии");
            setRestoringSession(false);

            // Очищаем недействительные токены
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("role_ids");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const data = await login(username, password);
            console.log("Logged in:", data);

            // Попробуем обменять на v2 токен. Если обмен прошёл — используем v2, иначе — исходные токены.
            let finalAccess = data.access_token;
            let finalRefresh = data.refresh_token;
            try {
                const v2Token = await getV2Token({ token: data.access_token });
                if (v2Token && v2Token.access_token) {
                    finalAccess = v2Token.access_token;
                    if (v2Token.refresh_token) finalRefresh = v2Token.refresh_token;
                }
            } catch (err) {
                // Если обмен не прошёл — просто используем исходные токены (и логируем ошибку).
                console.warn("getV2Token failed, using original tokens", err);
            }

            // Сохраняем актуальные токены всегда
            localStorage.setItem("access_token", finalAccess);
            if (finalRefresh) localStorage.setItem("refresh_token", finalRefresh);
            localStorage.setItem("username", username);

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

    // Если идет восстановление сессии, показываем только спиннер
    if (restoringSession) {
        return (
            <div className="login-container">
                <div className="restoring-session">
                    <Spinner />
                    <p>Восстановление сессии...</p>
                </div>
            </div>
        );
    }

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
                            disabled={loading}
                        />
                    </label>

                    <label style={{ position: "relative" }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Пароль"
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="toggle-password-visibility"
                            onClick={togglePasswordVisibility}
                            disabled={loading}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </label>

                    {error && (
                        <div align="center" className="error">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading || restoringSession}>
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
