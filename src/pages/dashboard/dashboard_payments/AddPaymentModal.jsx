import React from "react";
import Modal from "../../../components/general/Modal.jsx";
import Input from "../../../components/elements/Input.jsx";
import Select from "../../../components/elements/Select.jsx";
import { bankOptions } from "../../../const/defConst.js";

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

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);

    if (type === "internal") {
      setNewItem((prev) => ({ ...prev, bic: "" }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый платеж">
      <div className="add-payment-modal-content">
        <div className="add-payment-modal-content-bts">
          <span
            className={`${paymentType === "internal" ? "activeL" : "activeR"}`}
          ></span>
          <button
            type="button"
            className={`${paymentType === "internal" ? "active" : ""}`}
            onClick={() => handlePaymentTypeChange("internal")}
          >
            Внутри банка
          </button>
          <button
            type="button"
            className={`${paymentType === "domestic" ? "active" : ""}`}
            onClick={() => handlePaymentTypeChange("domestic")}
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

          {paymentType === "domestic" && (
            <Select
              title="БИК банка получателя"
              value={newItem.bic || ""}
              onChange={(val) => handleChange("bic", val)}
              options={[
                { value: "", label: "Выберите банк" },
                ...bankOptions.map((bank) => ({
                  value: bank.bic,
                  label: `${bank.name} (${bank.bic})`,
                })),
              ]}
            />
          )}
        </div>

        <div
          style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="action-buttons__btn"
            style={{ backgroundColor: "#6c757d", color: "#fff" }}
          >
            Отмена
          </button>
          <button type="button" onClick={onSave} className="action-buttons__btn">
            Создать оплату
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddPaymentModal;
