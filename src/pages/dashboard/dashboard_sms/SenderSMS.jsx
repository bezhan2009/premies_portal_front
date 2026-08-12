import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

export default function SendSmsForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [status, setStatus] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setIsSending(true);

    try {
      const res = await fetch(`${backendUrl}/sms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ""),
          messageContent: messageContent.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Ошибка при отправке");
      }
      setStatus({ type: "success", message: "Сообщение успешно отправлено" });
      setPhoneNumber("");
      setMessageContent("");
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Не удалось отправить сообщение" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
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
              <textarea
                placeholder="Привет, как дела?"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                required
                rows={5}
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              style={{
                height: "40px",
                backgroundColor: "var(--primary-color)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "0.2s",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isSending ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
              {isSending ? "Отправка..." : "Отправить"}
            </button>
          </form>

          {status && (
            <p
              style={{
                marginTop: "20px",
                color: status.type === "success" ? "green" : "red",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {status.message}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
