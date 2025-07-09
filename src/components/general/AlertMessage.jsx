import React, { useEffect } from "react";
import "../../styles/components/AlertMessage.scss";

export default function AlertMessage({ message, type = "error", onClose, duration = 3000 }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
        <div className={`alert alert--${type}`}>
            {message}
        </div>
    );
}
