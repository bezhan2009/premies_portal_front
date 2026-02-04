import { useNavigate } from "react-router-dom";
import LogoutImageComponent from "./LogoutLogo";
import { useState } from "react";
import "../../styles/components/Logout.scss";
import Spinner from "../Spinner.jsx";

function LogoutButton() {
    const navigate = useNavigate();
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogout = async () => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            // Если токена нет, просто очищаем локальное хранилище
            localStorage.clear();
            navigate("/login");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Отправляем запрос на сервер для выхода
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/logout`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            // Независимо от ответа сервера, очищаем локальное хранилище на фронтенде
            localStorage.clear();

            if (!response.ok) {
                // Логируем ошибку, но все равно продолжаем выход
                console.warn(`Logout request failed with status: ${response.status}`);
            }

            // Перенаправляем на страницу логина
            navigate("/login");

        } catch (err) {
            // В случае ошибки сети все равно очищаем хранилище
            console.error("Error during logout:", err);
            setError("Ошибка сети при выходе, но сессия очищена локально");
            localStorage.clear();
            navigate("/login");
        } finally {
            setIsLoading(false);
            setShowConfirmation(false);
        }
    };

    const handleConfirm = () => {
        handleLogout();
    };

    const handleCancel = () => {
        setShowConfirmation(false);
        setError(null);
    };

    return (
        <div className="logout-container">
            <button
                className="logout-button"
                title="Выход"
                onClick={() => setShowConfirmation(true)}
                disabled={isLoading}
            >
                {isLoading ? (
                    <Spinner />
                ) : (
                    <LogoutImageComponent width={40} height={26} />
                )}
            </button>
            {showConfirmation && (
                <div className="logout-confirmation">
                    <div className="confirmation-box">
                        <div>
                            <h1>Выход из системы!</h1>
                            <p>
                                После выхода потребуется повторная авторизация. Для входа в
                                систему вам понадобится логин и пароль от аккаунта.
                            </p>
                            {error && (
                                <div className="logout-error">
                                    {error}
                                </div>
                            )}
                        </div>
                        <div className="confirmation-buttons">
                            <button
                                className="confirm-btn"
                                onClick={handleConfirm}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="button-spinner"></div>
                                        Выход...
                                    </>
                                ) : "Выйти"}
                            </button>
                            <button
                                className="cancel-btn"
                                onClick={handleCancel}
                                disabled={isLoading}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LogoutButton;
