import { useState } from "react";
import "../../styles/components/DateRangeModal.css";

export default function DateRangeModal({ open, onClose, onSubmit }) {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const handleSubmit = () => {
        if (!fromDate || !toDate) return;

        onSubmit({ fromDate, toDate });
        onClose();
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container">
                <div className="modal-header">
                    <h2 className="modal-title">Выбор периода</h2>
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
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        onClick={onClose}
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        className="submit-button"
                        onClick={handleSubmit}
                        disabled={!fromDate || !toDate}
                    >
                        Применить
                    </button>
                </div>
            </div>
        </div>
    );
}
