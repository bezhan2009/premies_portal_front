import React, { useState } from "react";
import { Modal, Checkbox, Button, message } from "antd";

const DebtCertificateModal = ({ open, handleClose, clientData }) => {
  const [includeFio, setIncludeFio] = useState(false);
  const [includeStamp, setIncludeStamp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      // Helper to safely extract client name from complex objects
      let clientName = "";
      if (clientData?.client_name) clientName = clientData.client_name;
      else if (clientData?.name) clientName = clientData.name;
      else if (clientData?.FullName) clientName = clientData.FullName;
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

      const payload = {
        include_fio: includeFio,
        include_stamp: includeStamp,
        uniq_number: String(uniqNumber),
        client_name: String(clientName),
        birth_date: String(birthDate)
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
      link.setAttribute("download", "Справка_об_отсутствии_долгов.docx");
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
        <Button
          key="generate"
          type="primary"
          loading={isLoading}
          onClick={handleGenerate}
          style={{ background: "#2196f3", borderColor: "#2196f3" }}
        >
          Сгенерировать
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
        <Checkbox
          checked={includeFio}
          onChange={(e) => setIncludeFio(e.target.checked)}
        >
          С ФИО
        </Checkbox>
        <Checkbox
          checked={includeStamp}
          onChange={(e) => setIncludeStamp(e.target.checked)}
        >
          С печатью
        </Checkbox>
      </div>
    </Modal>
  );
};

export default DebtCertificateModal;
