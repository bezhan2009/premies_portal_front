import React, { useEffect } from "react";
import { toast } from "react-toastify";

const shownToastsKey = "activ-daily-shown-top-toasts";

function toastFingerprint(message, type) {
    return `${type || "error"}:${String(message || "").trim()}`;
}

function shouldShowToastOnce(message, type) {
    if (!message || typeof window === "undefined") return Boolean(message);
    const fingerprint = toastFingerprint(message, type);
    try {
        const shown = JSON.parse(window.sessionStorage.getItem(shownToastsKey) || "[]");
        if (Array.isArray(shown) && shown.includes(fingerprint)) return false;
        const next = Array.isArray(shown) ? [fingerprint, ...shown].slice(0, 200) : [fingerprint];
        window.sessionStorage.setItem(shownToastsKey, JSON.stringify(next));
        return true;
    } catch {
        return true;
    }
}

export default function AlertMessage({ message, type = "error", duration = 3000, onClick }) {

    useEffect(() => {
        if (!message) return;
        if (!shouldShowToastOnce(message, type)) return;

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
