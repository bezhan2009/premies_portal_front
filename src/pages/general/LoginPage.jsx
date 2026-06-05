import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoImageComponent from "../../components/Logo";
import Spinner from "../../components/Spinner";
import { login } from "../../api/auth";
import { FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa";
import { Helmet } from "react-helmet";
import { getV2Token } from "../../api/getV2Token";

// Константа для времени автоматического выхода (30 минут в миллисекундах)
const AUTO_LOGOUT_TIME = 30 * 60 * 1000;

// Функция для сохранения важных ключей перед очисткой
const preserveImportantKeys = () => {
    const keysToPreserve = ['last_password_change', 'password_check_done'];
    const preserved = {};

    keysToPreserve.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            preserved[key] = value;
        }
    });

    return preserved;
};

// Функция для восстановления важных ключей после очистки
const restoreImportantKeys = (preserved) => {
    Object.keys(preserved).forEach(key => {
        localStorage.setItem(key, preserved[key]);
    });
};

const logout = async () => {
    const token = localStorage.getItem("access_token");

    // Сохраняем важные ключи перед очисткой
    const preserved = preserveImportantKeys();

    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/logout`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        console.warn(`Logout request failed with status: ${response.status}`);
    }

    localStorage.clear();

    // Восстанавливаем важные ключи после очистки
    restoreImportantKeys(preserved);
}

// Функция для установки таймера автоматического выхода
const setupAutoLogout = async () => {
    const existingTimer = localStorage.getItem("logout_timer_id");
    if (existingTimer) {
        clearTimeout(Number(existingTimer));
    }

    // Устанавливаем новый таймер
    const timerId = setTimeout(() => {
        logout();
        window.location.href = "/login";
    }, AUTO_LOGOUT_TIME);

    // Сохраняем ID таймера и время установки
    localStorage.setItem("logout_timer_id", String(timerId));
    localStorage.setItem("login_time", String(Date.now()));
};

export default function LoginPage() {
    const [username, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";

    // Проверяем при загрузке страницы, не истекло ли время сессии
    useEffect(() => {
        const loginTime = localStorage.getItem("login_time");
        const accessToken = localStorage.getItem("access_token");

        if (loginTime && accessToken) {
            const elapsed = Date.now() - Number(loginTime);

            if (elapsed >= AUTO_LOGOUT_TIME) {
                // Сохраняем важные ключи перед очисткой
                const preserved = preserveImportantKeys();
                // Время истекло - очищаем localStorage
                localStorage.clear();
                // Восстанавливаем важные ключи
                restoreImportantKeys(preserved);
            } else {
                // Время еще не истекло - устанавливаем таймер на оставшееся время
                const remainingTime = AUTO_LOGOUT_TIME - elapsed;
                const timerId = setTimeout(() => {
                    const preserved = preserveImportantKeys();
                    localStorage.clear();
                    restoreImportantKeys(preserved);
                    window.location.href = "/login";
                }, remainingTime);

                localStorage.setItem("logout_timer_id", String(timerId));
            }
        }
    }, []);

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

            // Сохраняем важные ключи перед очисткой
            const preserved = preserveImportantKeys();

            // Очищаем localStorage перед сохранением новых данных
            localStorage.clear();

            // Восстанавливаем важные ключи
            restoreImportantKeys(preserved);

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

            // Устанавливаем таймер автоматического выхода
            setupAutoLogout();

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
            <div className="login-wrapper">
                <div className="login-content">
                    {/* Bank branding */}
                    <div className="login-header">
                        <div className="login-logo">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield text-white"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                        </div>
                        <h1 className="login-title">Active Daily</h1>
                        <p className="login-subtitle">ActivBank — Банковский портал</p>
                    </div>

                    <div className="login-card">
                        <div className="login-card-header">
                            <h3 className="login-card-title">Вход в систему</h3>
                            <p className="login-card-description">
                                Введите учётные данные для доступа к порталу
                            </p>
                        </div>
                        
                        <div className="login-card-content">
                            <form
                                className="login-form"
                                onSubmit={handleSubmit}
                                autoComplete="off"
                            >
                                {/* Скрытое поле для обхода автозаполнения */}
                                <input
                                    type="text"
                                    style={{ display: 'none' }}
                                    autoComplete="new-password"
                                />

                                <div className="form-group">
                                    <label className="form-label">Имя пользователя</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={username}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Введите логин"
                                        required
                                        disabled={loading}
                                        autoComplete="username"
                                        name="username"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Пароль</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-input password-input"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Введите пароль"
                                            required
                                            disabled={loading}
                                            autoComplete="current-password"
                                            name="current-password"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={togglePasswordVisibility}
                                            disabled={loading}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="login-error">
                                        {error}
                                    </div>
                                )}

                                <button type="submit" className="login-submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <FaSpinner className="spin" /> Вход...
                                        </>
                                    ) : (
                                        "Войти"
                                    )}
                                </button>
                            </form>

                            <div className="login-footer">
                                <p>© {new Date().getFullYear()} ActivBank. Все права защищены.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
