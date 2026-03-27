// pages/PVN/AddPvnModal.jsx
import React, { useState, useEffect } from "react";
import Modal from "../../components/general/Modal.jsx";
import Input from "../../components/elements/Input.jsx";
import Select from "../../components/elements/Select.jsx";

const currencyOptions = [
    { value: 810, label: "RUB" },
    { value: 840, label: "USD" },
    { value: 978, label: "EUR" },
    { value: 398, label: "KZT" },
    { value: 972, label: "TJS" },
];

const emptyForm = {
    atm_id: "",
    currency: 972,
    cashbox_inn: "",
    cashbox_name: "",
    cashbox_account: "",
    atm_inn: "",
    atm_name: "",
    atm_account: "",
};

const AddPvnSettingModal = ({
                                isOpen,
                                onClose,
                                data,
                                onSave,
                                onUpdate,
                                isEdit = false,
                            }) => {
    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => {
        if (isOpen) {
            // Если data существует и не пустой, используем его, иначе пустую форму
            setFormData(data && Object.keys(data).length > 0 ? { ...data } : { ...emptyForm });
        }
    }, [isOpen, data]);

    const handleChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = () => {
        if (isEdit) {
            onUpdate(formData);
        } else {
            onSave(formData);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? "Редактирование настройки ПВН" : "Новая настройка ПВН"}
        >
            <div className="add-payment-modal-content">
                <div style={{ marginBottom: "20px", fontWeight: "bold", color: "#555" }}>
                    Параметры ПВН
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginBottom: "24px",
                    }}
                >
                    <Input
                        title="ID ПВН (atm_id)"
                        type="text"
                        value={formData.atm_id || ""}
                        onChange={(val) => handleChange("atm_id", val)}
                        placeholder="Например: ATM001"
                    />
                    <Select
                        title="Валюта"
                        value={formData.currency || 972}
                        onChange={(val) => handleChange("currency", parseInt(val, 10))}
                        options={currencyOptions.map(opt => ({
                            value: opt.value,
                            label: `${opt.label} (${opt.value})`
                        }))}
                    />
                </div>

                <div style={{ marginBottom: "20px", fontWeight: "bold", color: "#555" }}>
                    Реквизиты кассы (плательщик)
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginBottom: "24px",
                    }}
                >
                    <Input
                        title="ИНН кассы"
                        type="text"
                        value={formData.cashbox_inn || ""}
                        onChange={(val) => handleChange("cashbox_inn", val)}
                        placeholder="ИНН"
                    />
                    <Input
                        title="Наименование кассы"
                        type="text"
                        value={formData.cashbox_name || ""}
                        onChange={(val) => handleChange("cashbox_name", val)}
                        placeholder="Наименование"
                    />
                    <Input
                        title="Счёт кассы"
                        type="text"
                        value={formData.cashbox_account || ""}
                        onChange={(val) => handleChange("cashbox_account", val)}
                        placeholder="Номер счёта"
                    />
                </div>

                <div style={{ marginBottom: "20px", fontWeight: "bold", color: "#555" }}>
                    Реквизиты ПВН (получатель)
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginBottom: "24px",
                    }}
                >
                    <Input
                        title="ИНН ПВН"
                        type="text"
                        value={formData.atm_inn || ""}
                        onChange={(val) => handleChange("atm_inn", val)}
                        placeholder="ИНН"
                    />
                    <Input
                        title="Наименование ПВН"
                        type="text"
                        value={formData.atm_name || ""}
                        onChange={(val) => handleChange("atm_name", val)}
                        placeholder="Наименование"
                    />
                    <Input
                        title="Счёт ПВН"
                        type="text"
                        value={formData.atm_account || ""}
                        onChange={(val) => handleChange("atm_account", val)}
                        placeholder="Номер счёта"
                    />
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button
                        onClick={onClose}
                        className="action-buttons__btn"
                        style={{ backgroundColor: "#6c757d", color: "#fff" }}
                    >
                        Отмена
                    </button>
                    <button onClick={handleSubmit} className="action-buttons__btn">
                        {isEdit ? "Сохранить изменения" : "Создать настройку"}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AddPvnSettingModal;
