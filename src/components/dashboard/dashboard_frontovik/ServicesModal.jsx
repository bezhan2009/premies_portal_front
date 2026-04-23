import React, { useState, useEffect } from "react";
import Spinner from "../../Spinner.jsx";

const ServicesModal = ({ isOpen, onClose, onConfirm, cardId, initialServices, isLoading }) => {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [tdsEnabled, setTdsEnabled] = useState(false);

    useEffect(() => {
        if (isOpen && initialServices) {
            const smsService = initialServices.find(s => s.identification?.serviceId === "300");
            const tdsService = initialServices.find(s => s.identification?.serviceId === "330");
            
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

        const smsService = initialServices.find(s => s.identification?.serviceId === "300");
        const tdsService = initialServices.find(s => s.identification?.serviceId === "330");

        const actions = [];

        // SMS Logic
        if (smsService && !smsEnabled) {
            actions.push({ serviceType: "7", serviceId: "300", serviceObjectType: "SERVICE_OBJECT_CARD", actionCode: "ACTION_CODE_DELETE", cardId, phoneNumber });
        } else if (!smsService && smsEnabled) {
            actions.push({ serviceType: "7", serviceId: "300", serviceObjectType: "SERVICE_OBJECT_CARD", actionCode: "ACTION_CODE_ADD", cardId, phoneNumber });
        } else if (smsService && smsEnabled && smsService.extNumber !== phoneNumber) {
            actions.push({ serviceType: "7", serviceId: "300", serviceObjectType: "SERVICE_OBJECT_CARD", actionCode: "ACTION_CODE_UPDATE", cardId, phoneNumber });
        }

        // 3DS Logic
        if (tdsService && !tdsEnabled) {
            actions.push({ serviceType: "27", serviceId: "330", serviceObjectType: "SERVICE_OBJECT_CARD", actionCode: "ACTION_CODE_DELETE", cardId, phoneNumber });
        } else if (!tdsService && tdsEnabled) {
            actions.push({ serviceType: "27", serviceId: "330", serviceObjectType: "SERVICE_OBJECT_CARD", actionCode: "ACTION_CODE_ADD", cardId, phoneNumber });
        } else if (tdsService && tdsEnabled && tdsService.extNumber !== phoneNumber) {
            actions.push({ serviceType: "27", serviceId: "330", serviceObjectType: "SERVICE_OBJECT_CARD", actionCode: "ACTION_CODE_UPDATE", cardId, phoneNumber });
        }

        if (actions.length === 0) {
            onClose();
            return;
        }

        onConfirm(actions);
    };

    return (
        <div className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}>
            <div className="graph-modal-container" style={{ maxWidth: '400px' }}>
                <div className="graph-modal-header" style={{ background: '#e11d48' }}>
                    <h2 className="graph-modal-title" style={{ color: 'white' }}>Уведомления</h2>
                    <button className="graph-modal-close" onClick={onClose} style={{ color: 'white' }}>
                        &times;
                    </button>
                </div>

                <div className="graph-modal-content" style={{ padding: '20px' }}>
                    {isLoading ? (
                        <div className="graph-modal-loading">
                            <Spinner center />
                            <p>Обновление сервисов...</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Номер телефона</label>
                                <input 
                                    type="text"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="992XXXXXXXXX"
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>SMS (300)</span>
                                <label className="switch">
                                    <input type="checkbox" checked={smsEnabled} onChange={(e) => setSmsEnabled(e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>3DS (330)</span>
                                <label className="switch">
                                    <input type="checkbox" checked={tdsEnabled} onChange={(e) => setTdsEnabled(e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="graph-modal-footer">
                    <button className="graph-modal-close-btn" onClick={onClose}>Закрыть</button>
                    <button 
                        className="selectAll-toggle" 
                        onClick={handleExecute}
                        disabled={isLoading || !phoneNumber}
                        style={{ background: '#e11d48', marginLeft: '10px' }}
                    >
                        Выполнить
                    </button>
                </div>
            </div>
            <style>{`
                .switch { position: relative; display: inline-block; width: 44px; height: 22px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
                .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
                input:checked + .slider { background-color: #e11d48; }
                input:focus + .slider { box-shadow: 0 0 1px #e11d48; }
                input:checked + .slider:before { transform: translateX(22px); }
                .slider.round { border-radius: 34px; }
                .slider.round:before { border-radius: 50%; }
            `}</style>
        </div>
    );
};

export default ServicesModal;
