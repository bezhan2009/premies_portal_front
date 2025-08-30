import { useNavigate } from "react-router-dom";
import LogoutImageComponent from "./LogoutLogo";
import { useState } from "react";
import "../../styles/components/Logout.scss";

function LogoutButton() {
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  };

  const handleConfirm = () => {
    handleLogout();
    setShowConfirmation(false);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="logout-container">
      <button
        className="logout-button"
        title="Выход"
        onClick={() => setShowConfirmation(true)}
      >
        <LogoutImageComponent width={57} height={37} />
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
            </div>
            <div className="confirmation-buttons">
              <button className="confirm-btn" onClick={handleConfirm}>
                Выйти
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
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
