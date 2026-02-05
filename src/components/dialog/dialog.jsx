import { useState, useEffect, useRef } from "react";
import "../../styles/components/DateRangeModal.css";

export default function DateRangeModal({ open, onClose, onSubmit }) {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const modalRef = useRef(null);

    const handleSubmit = () => {
        if (!fromDate || !toDate) return;

        onSubmit({ fromDate, toDate });
        onClose();
    };

    const handleOverlayClick = (e) => {
        // Закрываем только при клике на overlay, а не на содержимое модалки
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    // Блокируем всплытие событий от элементов внутри модального окна
    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    // Фокусируемся на первом поле при открытии модального окна
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                const firstInput = document.getElementById("fromDate");
                if (firstInput) {
                    firstInput.focus();
                }
            }, 10);
        }
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="modal-overlay"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className="modal-container"
                ref={modalRef}
                onClick={stopPropagation}
            >
                <div className="modal-header">
                    <h2 className="modal-title" id="modal-title">Выбор периода</h2>
                </div>

                <div className="modal-content">
                    <div className="date-inputs">
                        <div className="input-group">
                            <label htmlFor="fromDate">С</label>
                            <input
                                id="fromDate"
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="date-input"
                                onClick={stopPropagation}
                                autoFocus
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="toDate">По</label>
                            <input
                                id="toDate"
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="date-input"
                                onClick={stopPropagation}
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="button"
                        type="button"
                        onClick={(e) => {
                            stopPropagation(e);
                            onClose();
                        }}
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        className="submit-button"
                        onClick={(e) => {
                            stopPropagation(e);
                            handleSubmit();
                        }}
                        disabled={!fromDate || !toDate}
                    >
                        Применить
                    </button>
                </div>
            </div>
        </div>
    );
}
