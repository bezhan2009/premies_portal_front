import React, { useEffect } from "react";
import { toast } from "react-toastify";

export default function AlertMessage({ message, type = "error", duration = 3000 }) {

    useEffect(() => {
        if (!message) return;

        if (type === "success") {
            toast.success(message, { autoClose: duration });
        } else if (type === "info") {
            toast.info(message, { autoClose: duration });
        } else if (type === "warning") {
            toast.warning(message, { autoClose: duration });
        } else {
            const handleRedirect = () => {
                const errorMsg = encodeURIComponent(message);
                const page = encodeURIComponent(window.location.pathname);
                window.location.href = `/feedback?errorMsg=${errorMsg}&page=${page}`;
            };

            toast.error(
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ fontWeight: "500" }}>{message}</div>
                    <div 
                        style={{ 
                            fontSize: "11px", 
                            textDecoration: "underline", 
                            cursor: "pointer", 
                            color: "#ffffff",
                            background: "rgba(255,255,255,0.18)",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            textAlign: "center",
                            marginTop: "4px",
                            fontWeight: "bold"
                        }} 
                        onClick={handleRedirect}
                    >
                        Сообщить об ошибке в Обратную связь
                    </div>
                </div>,
                { autoClose: duration }
            );
        }

    }, [message, type, duration]);

    return null;
}
