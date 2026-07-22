import React, { useState } from "react";
import { Modal, Button, message } from "antd";

const TEMPLATES = [
  { id: 'pechat_FIO', label: 'С печатью и паспортными данными', include_fio: true, include_stamp: true },
  { id: 'FIO', label: 'Без печати с паспортными данными', include_fio: true, include_stamp: false },
  { id: 'base', label: 'Без печати без паспортных данных', include_fio: false, include_stamp: false },
  { id: 'pechat', label: 'С печатью без паспортных данных', include_fio: false, include_stamp: true },
];

const DebtCertificateModal = ({ open, handleClose, clientData }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async (template) => {
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      // Helper to safely extract client name from complex objects
      let clientName = "";
      if (clientData?.client_name) clientName = clientData.client_name;
      else if (clientData?.name) clientName = clientData.name;
      else if (clientData?.FullName) clientName = clientData.FullName;
      else if (clientData?.LongName) clientName = clientData.LongName;
      else if (clientData?.surname || clientData?.name) {
        clientName = `${clientData.surname || ""} ${clientData.name || ""} ${clientData.patronymic || ""}`.trim();
      }

      let uniqNumber = "";
      if (clientData?.pin) uniqNumber = clientData.pin;
      else if (clientData?.uniq_number) uniqNumber = clientData.uniq_number;
      else if (clientData?.Uniq) uniqNumber = clientData.Uniq;
      else if (clientData?.tax_code) uniqNumber = clientData.tax_code;

      let birthDate = "";
      if (clientData?.birth_date) birthDate = clientData.birth_date;
      else if (clientData?.BirthDate) birthDate = clientData.BirthDate;
      else if (clientData?.birthDate) birthDate = clientData.birthDate;

      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
      };

      const payload = {
        include_fio: template.include_fio,
        include_stamp: template.include_stamp,
        uniq_number: String(uniqNumber),
        client_name: String(clientName),
        birth_date: formatDate(birthDate),
        pass_series: String(clientData?.RegistrationDocuments?.[0]?.Serie || ""),
        pass_num: String(clientData?.RegistrationDocuments?.[0]?.Number || ""),
        inn: String(clientData?.TaxIdentificationNumber || ""),
        address: String(clientData?.AddressString || ""),
        passt_dt: formatDate(clientData?.RegistrationDocuments?.[0]?.IssueDate)
      };

      const response = await fetch(`${backendUrl}/automation/debt_certificate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Ошибка генерации справки");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Справка_об_отсутствии_долгов_${uniqNumber}.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success("Справка успешно сгенерирована!");
      handleClose();
    } catch (error) {
      console.error(error);
      message.error("Произошла ошибка при генерации справки");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title="Справка об отсутствии долгов"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={isLoading}>
          Отмена
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ padding: "16px 0", marginBottom: "8px" }}>
        Выберите нужный формат справки для скачивания:
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "16px" }}>
        {TEMPLATES.map((template) => (
          <Button
            key={template.id}
            disabled={isLoading}
            onClick={() => handleGenerate(template)}
            style={{ 
              height: "auto", 
              padding: "12px 16px", 
              justifyContent: "flex-start",
              textAlign: "left" 
            }}
          >
            {template.label}
          </Button>
        ))}
      </div>
    </Modal>
  );
};

export default DebtCertificateModal;
