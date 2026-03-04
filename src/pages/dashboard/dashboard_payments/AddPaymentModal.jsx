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
  const [sendUrl, setSendUrl] = React.useState();

  const handleChange = (key, value) => {
    // Для всех полей просто обновляем значение
    setNewItem((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый платеж">
      <div className="add-payment-modal-content">
        <div className="add-payment-modal-content-bts">
          <span
            className={`${sendUrl === "/payments" ? "activeL" : "activeR"}`}
          ></span>
          <button
            className={`${sendUrl === "/payments" ? "active" : ""}`}
            onClick={() => setSendUrl("/payments")}
          >
            Внутри банка
          </button>
          <button
            className={`${sendUrl !== "/payments" ? "active" : ""}`}
            onClick={() => setSendUrl("/payments/country")}
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
            .filter((f) => !["id", "created_at", "updated_at"].includes(f.key))
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
