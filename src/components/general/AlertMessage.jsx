import React, { useEffect, useState } from "react";
import "../../styles/components/AlertMessage.scss";

export default function AlertMessage({ message, type = "error", onClose, duration = 3000 }) {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Таймер для автоматического закрытия
        const closeTimer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => {
            clearTimeout(closeTimer);
        };
    }, [duration]);

    const handleClose = () => {
        if (!isClosing) {
            setIsClosing(true);
            // Даем время для анимации исчезновения
            setTimeout(() => {
                onClose();
            }, 500); // Совпадает с длительностью alertSlideOut
        }
    };

    const handleCloseClick = (e) => {
        e.stopPropagation();
        handleClose();
    };

    return (
        <div className={`alert alert--${type} ${isClosing ? 'alert--closing' : ''}`}>
            {message}
            <button
                className="alert-close"
                onClick={handleCloseClick}
                aria-label="Закрыть уведомление"
                type="button"
            />
        </div>
    );
}
