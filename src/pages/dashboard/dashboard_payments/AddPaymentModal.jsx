import React from "react";
import Modal from "../../../components/general/Modal.jsx";
import Input from "../../../components/elements/Input.jsx";

const AddPaymentModal = ({
                             isOpen,
                             onClose,
                             newItem,
                             setNewItem,
                             onSave,
                             fields,
                         }) => {
    const handleChange = (key, value) => {
        setNewItem((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Новый платеж">
            <div className="add-payment-modal-content">
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginBottom: "24px",
                    }}
                >
                    {fields
                        .filter((f) => !["id", "created_at", "updated_at"].includes(f.key))
                        .map(({ key, label, type, step }) => (
                            <Input
                                key={key}
                                title={label}
                                type={type}
                                step={step}
                                value={newItem[key]}
                                onChange={(val) => handleChange(key, val)}
                                placeholder={label}
                            />
                        ))}
                </div>
                <div
                    style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
                >
                    <button
                        onClick={onClose}
                        className="action-buttons__btn"
                        style={{ backgroundColor: "#6c757d", color: "#fff" }}
                    >
                        Отмена
                    </button>
                    <button onClick={onSave} className="action-buttons__btn">
                        Создать оплату
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AddPaymentModal;
