import React, { useState } from "react";
import Spinner from "../../Spinner.jsx";

const ChangePinModal = ({ isOpen, onClose, onConfirm, isLoading, defaultPhoneNumber = "" }) => {
    const [mode, setMode] = useState("generate"); // "generate" or "manual"
    const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
    const [pinValue, setPinValue] = useState("");

    if (!isOpen) return null;

    const handleExecute = () => {
        if (!phoneNumber) {
            alert("Номер телефона обязателен");
            return;
        }
        if (mode === "manual" && pinValue.length !== 4) {
            alert("ПИН-код должен состоять из 4 цифр");
            return;
        }
        
        onConfirm(phoneNumber, mode === "manual" ? pinValue : "");
    };

    return (
        <div className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}>
            <div className="graph-modal-container" style={{ maxWidth: '450px', borderRadius: '12px', overflow: 'hidden' }}>
                {/* Header */}
                <div className="graph-modal-header" style={{ background: '#e11d48', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none' }}>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Сменить Пин код</h2>
                    <button className="graph-modal-close" onClick={onClose} style={{ color: 'white', fontSize: '24px', opacity: 1 }}>
                        &times;
                    </button>
                </div>

                <div className="graph-modal-content" style={{ padding: '30px 25px', background: 'white' }}>
                    {isLoading ? (
                        <div className="graph-modal-loading">
                            <Spinner center />
                            <p>Выполнение операции...</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* Segmented Control (Tabs) */}
                            <div style={{ 
                                display: 'flex', 
                                background: '#e5e7eb', 
                                padding: '4px', 
                                borderRadius: '10px',
                                marginBottom: '10px'
                            }}>
                                <button 
                                    onClick={() => setMode("generate")}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        background: mode === "generate" ? 'white' : 'transparent',
                                        color: mode === "generate" ? '#374151' : '#6b7280',
                                        boxShadow: mode === "generate" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Сгенерировать ПИН
                                </button>
                                <button 
                                    onClick={() => setMode("manual")}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        background: mode === "manual" ? 'white' : 'transparent',
                                        color: mode === "manual" ? '#374151' : '#6b7280',
                                        boxShadow: mode === "manual" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Задать вручную
                                </button>
                            </div>

                            {/* <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#6b7280', fontSize: '14px' }}>Номер телефона для СМС</label>
                                <input 
                                    type="text" 
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="992XXXXXXXXX"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
                                />
                            </div> */}

                            {mode === "generate" ? (
                                <div style={{ minHeight: '80px', display: 'flex', alignItems: 'center' }}>
                                    <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>ПИН код придет в виде СМС клиенту</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Передайте клавиатуру клиенту, чтобы он установил Пин</p>
                                    <input 
                                        type="password" 
                                        maxLength={4}
                                        value={pinValue}
                                        onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                                        placeholder="Введите значение"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', textAlign: 'center', letterSpacing: '10px', fontSize: '18px' }}
                                    />
                                </div>
                            )}

                            <button 
                                className="selectAll-toggle" 
                                onClick={handleExecute}
                                disabled={isLoading || !phoneNumber || (mode === "manual" && pinValue.length !== 4)}
                                style={{ 
                                    background: '#e11d48', 
                                    width: '100%', 
                                    padding: '14px', 
                                    borderRadius: '10px', 
                                    fontSize: '16px', 
                                    fontWeight: 'bold', 
                                    marginTop: '10px',
                                    border: 'none',
                                    color: 'white'
                                }}
                            >
                                Выполнить
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangePinModal;
