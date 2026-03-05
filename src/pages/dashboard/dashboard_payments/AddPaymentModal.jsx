import React from "react";
import Modal from "../../../components/general/Modal.jsx";
import Input from "../../../components/elements/Input.jsx";
import {bankOptions} from "../../../const/defConst.js";


const AddPaymentModal = ({
                             isOpen,
                             onClose,
                             newItem,
                             setNewItem,
                             onSave,
                             fields,
                             paymentType,
                             setPaymentType,
                         }) => {
    const handleChange = (key, value) => {
        setNewItem((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Новый платеж">
            <div className="add-payment-modal-content">
                <div className="add-payment-modal-content-bts">
          <span
              className={`${paymentType === "internal" ? "activeL" : "activeR"}`}
          ></span>
                    <button
                        className={`${paymentType === "internal" ? "active" : ""}`}
                        onClick={() => setPaymentType("internal")}
                    >
                        Внутри банка
                    </button>
                    <button
                        className={`${paymentType === "domestic" ? "active" : ""}`}
                        onClick={() => setPaymentType("domestic")}
                    >
                        Внутри страны
                    </button>
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginBottom: "24px",
                    }}
                >
                    {fields
                        .filter((f) => !["id", "created_at", "updated_at", "bic"].includes(f.key))
                        .map(({ key, label, type, step }) => (
                            <Input
                                key={key}
                                title={label}
                                type={key === "cashback_amount" ? "number" : type}
                                step={key === "cashback_amount" ? "0.01" : step}
                                value={newItem[key]}
                                onChange={(val) => handleChange(key, val)}
                                placeholder={label}
                            />
                        ))}

                    {/* Поле BIC отображается только для domestic */}
                    {paymentType === "domestic" && (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <label style={{ marginBottom: "4px", fontWeight: 500 }}>
                                БИК банка получателя
                            </label>
                            <select
                                value={newItem.bic || ""}
                                onChange={(e) => handleChange("bic", e.target.value)}
                                style={{
                                    padding: "8px",
                                    border: "1px solid #ced4da",
                                    borderRadius: "4px",
                                    fontSize: "14px",
                                }}
                            >
                                <option value="" disabled>Выберите банк</option>
                                {bankOptions.map((bank) => (
                                    <option key={bank.bic} value={bank.bic}>
                                        {bank.name} ({bank.bic})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
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
