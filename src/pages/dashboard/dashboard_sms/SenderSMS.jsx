import { useState } from "react";
import "../../../styles/components/BlockInfo.scss";
import HeaderAgentSMS from "../../../components/dashboard/dashboard_agent_sms/MenuAgentSMS";
import useSidebar from "../../../hooks/useSideBar.js";
import Sidebar from "../../../components/general/DynamicMenu.jsx";

export default function SendSmsForm() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [status, setStatus] = useState("");
  const backendUrl = import.meta.env.VITE_BACKEND_SMS_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Отправка...");

    try {
      const res = await fetch(`${backendUrl}/api/SendSmsToTelegramNum/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, messageContent }),
      });

      if (!res.ok) throw new Error("Ошибка при отправке");
      setStatus("✅ Сообщение успешно отправлено!");
      setPhoneNumber("");
      setMessageContent("");
    } catch (err) {
      setStatus("❌ Ошибка: " + err.message);
    }
  };

  return (
    <>
      <div
        className={`dashboard-container ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}
      >
        <Sidebar
          activeLink="sms_send"
          isOpen={isSidebarOpen}
          toggle={toggleSidebar}
        />
        <div className="block_info_prems content-page" align="center">
          <div style={{ maxWidth: 400, margin: "50px auto" }}>
            <h2>Отправка SMS</h2>
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div className="input">
                <label>Номер телефона</label>
                <input
                  type="text"
                  placeholder="Например: 992937394747"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>

              <div className="input">
                <label>Текст сообщения</label>
                <input
                  type="text"
                  placeholder="Привет, как дела?"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                style={{
                  height: "40px",
                  backgroundColor: "#e21a1c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
              >
                Отправить
              </button>
            </form>

            {status && (
              <p
                style={{
                  marginTop: "20px",
                  color: status.startsWith("✅") ? "green" : "red",
                }}
              >
                {status}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
