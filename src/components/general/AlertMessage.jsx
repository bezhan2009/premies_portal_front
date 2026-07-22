import React, { useEffect } from "react";
import { toast } from "react-toastify";

export default function AlertMessage({ message, type = "error", duration = 3000, onClick }) {

    useEffect(() => {
        if (!message) return;

        if (type === "success") {
            toast.success(message, { autoClose: duration, onClick });
        } else if (type === "info") {
            toast.info(message, { autoClose: duration, onClick });
        } else if (type === "warning") {
            toast.warning(message, { autoClose: duration, onClick });
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
                            textDecoration: "none", 
                            cursor: "pointer", 
                            color: "#ffffff",
                            background: "#eb2525",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            textAlign: "center",
                            marginTop: "6px",
                            fontWeight: "bold",
                            border: "1px solid #c21818"
                        }} 
                        onClick={handleRedirect}
                    >
                        Сообщить об ошибке в Обратную связь
                    </div>
                </div>,
                { autoClose: duration, onClick }
            );
        }

    }, [message, type, duration, onClick]);

    return null;
}
