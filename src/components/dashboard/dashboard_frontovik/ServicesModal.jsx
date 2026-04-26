import React, { useState, useEffect, useRef } from "react";
import Spinner from "../../Spinner.jsx";

const ServicesModal = ({
  isOpen,
  onClose,
  onConfirm,
  cardId,
  initialServices,
  isLoading,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [tdsEnabled, setTdsEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState("sms"); // "sms" or "tds"

  const phoneInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && initialServices) {
      const smsService = initialServices.find(
        (s) => s.identification?.serviceId === "300",
      );
      const tdsService = initialServices.find(
        (s) => s.identification?.serviceId === "330",
      );

      setSmsEnabled(!!smsService);
      setTdsEnabled(!!tdsService);

      if (smsService?.extNumber) setPhoneNumber(smsService.extNumber);
      else if (tdsService?.extNumber) setPhoneNumber(tdsService.extNumber);
      else setPhoneNumber("");
    }
  }, [isOpen, initialServices]);

  if (!isOpen) return null;

  const handleExecute = () => {
    if (!phoneNumber) {
      alert("Номер телефона обязателен для заполнения");
      return;
    }

    const smsService = initialServices.find(
      (s) => s.identification?.serviceId === "300",
    );
    const tdsService = initialServices.find(
      (s) => s.identification?.serviceId === "330",
    );

    const actions = [];

    // SMS Logic
    if (smsService && !smsEnabled) {
      actions.push({
        serviceType: "7",
        serviceId: "300",
        serviceObjectType: "SERVICE_OBJECT_CARD",
        actionCode: "ACTION_CODE_DELETE",
        cardId,
        phoneNumber,
      });
    } else if (!smsService && smsEnabled) {
      actions.push({
        serviceType: "7",
        serviceId: "300",
        serviceObjectType: "SERVICE_OBJECT_CARD",
        actionCode: "ACTION_CODE_ADD",
        cardId,
        phoneNumber,
      });
    } else if (
      smsService &&
      smsEnabled &&
      smsService.extNumber !== phoneNumber
    ) {
      actions.push({
        serviceType: "7",
        serviceId: "300",
        serviceObjectType: "SERVICE_OBJECT_CARD",
        actionCode: "ACTION_CODE_UPDATE",
        cardId,
        phoneNumber,
      });
    }

    // 3DS Logic
    if (tdsService && !tdsEnabled) {
      actions.push({
        serviceType: "27",
        serviceId: "330",
        serviceObjectType: "SERVICE_OBJECT_CARD",
        actionCode: "ACTION_CODE_DELETE",
        cardId,
        phoneNumber,
      });
    } else if (!tdsService && tdsEnabled) {
      actions.push({
        serviceType: "27",
        serviceId: "330",
        serviceObjectType: "SERVICE_OBJECT_CARD",
        actionCode: "ACTION_CODE_ADD",
        cardId,
        phoneNumber,
      });
    } else if (
      tdsService &&
      tdsEnabled &&
      tdsService.extNumber !== phoneNumber
    ) {
      actions.push({
        serviceType: "27",
        serviceId: "330",
        serviceObjectType: "SERVICE_OBJECT_CARD",
        actionCode: "ACTION_CODE_UPDATE",
        cardId,
        phoneNumber,
      });
    }

    if (actions.length === 0) {
      onClose();
      return;
    }

    onConfirm(actions);
  };

  const handleEditClick = () => {
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  };

  return (
    <div
      className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}
    >
      <div className="graph-modal-container services-modal-redesign">
        <div className="graph-modal-header">
          <h2 className="graph-modal-title">Уведомления</h2>
          <button className="graph-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="graph-modal-content">
          {isLoading ? (
            <div className="graph-modal-loading">
              <Spinner center />
              <p>Обновление сервисов...</p>
            </div>
          ) : (
            <div className="services-container">
              <div className="tab-selector">
                <button
                  className={`tab-item ${activeTab === "sms" ? "active" : ""}`}
                  onClick={() => setActiveTab("sms")}
                >
                  СМС
                </button>
                <button
                  className={`tab-item ${activeTab === "tds" ? "active" : ""}`}
                  onClick={() => setActiveTab("tds")}
                >
                  3DS
                </button>
              </div>

              <div className="service-description">
                {activeTab === "sms"
                  ? "СМС - уведомление об операциях"
                  : "3DS - уведомление об операциях"}
              </div>

              <div className="service-action-row">
                <input
                  ref={phoneInputRef}
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="992XXXXXXXXX"
                  className="phone-input"
                />
                <button className="edit-action" onClick={handleEditClick}>
                  Изменить
                </button>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={activeTab === "sms" ? smsEnabled : tdsEnabled}
                    onChange={(e) =>
                      activeTab === "sms"
                        ? setSmsEnabled(e.target.checked)
                        : setTdsEnabled(e.target.checked)
                    }
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="graph-modal-footer">
          <button
            className="execute-btn"
            onClick={handleExecute}
            disabled={isLoading || !phoneNumber}
          >
            Выполнить
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServicesModal;
