import React, { useState, useEffect } from "react";
import { LIMIT_NAMES_MAPPING } from "../../../const/defConst.js";
import { changeCardLimit } from "../../../api/processing/transactions.js";
import Spinner from "../../Spinner.jsx";

const getCycleTypeName = (type) => {
  const t = String(type);
  if (t === "4") return "Месяц";
  if (t === "0") return "День";
  return type;
};

const getCurrencyName = (code) => {
  const c = String(code);
  if (c === "840") return "USD";
  if (c === "972") return "TJS";
  if (c === "978") return "EUR";
  return code;
};

const isQuantityLimit = (limitName, displayName) => {
  const nameLower = (displayName || "").toLowerCase();
  if (nameLower.includes("количество") || nameLower.includes("кол-во")) {
    return true;
  }
  const match = String(limitName).match(/LMTTZ(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num % 2 === 0) {
      return true;
    }
  }
  return false;
};

const formatCurrentValue = (val, isQuantity) => {
  if (val === undefined || val === null) return "0";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  if (num === 0) return "0";
  
  if (isQuantity) {
    return num.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  } else {
    const mainUnit = num / 100;
    return mainUnit.toLocaleString("ru-RU", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }
};

const formatLimitValue = (val, isQuantity) => {
  if (val === undefined || val === null) return "";
  const strVal = String(val).trim();
  if (strVal === "999999999" || strVal === "999999999999") {
    return strVal;
  }
  const num = Number(strVal);
  if (isNaN(num)) return strVal;
  
  if (isQuantity) {
    return num.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  } else {
    const mainUnit = num / 100;
    return mainUnit.toLocaleString("ru-RU", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }
};

const getPercentage = (currentValue, value) => {
  const valNum = Number(value);
  const curNum = Number(currentValue);
  if (isNaN(valNum) || isNaN(curNum) || valNum === 0) return 0;
  if (value === "999999999" || value === "999999999999") return 0;
  
  return Math.min((curNum / valNum) * 100, 100);
};

const CardLimitsModal = ({ isOpen, onClose, limits, isLoading, cardId, cardExId = "" }) => {
  const [hasEditRole, setHasEditRole] = useState(false);
  const [editingLimitIdx, setEditingLimitIdx] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editCycleLength, setEditCycleLength] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const roles = JSON.parse(localStorage.getItem("role_ids") || "[]");
      setHasEditRole(roles.map(String).includes("37"));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const startEditing = (idx, limit) => {
    setEditingLimitIdx(idx);
    const displayName = LIMIT_NAMES_MAPPING[limit.name] || limit.name || "";
    const isQuantity = isQuantityLimit(limit.name, displayName);
    const num = Number(limit.value);
    
    let initialValue = "";
    if (!isNaN(num) && limit.value !== "999999999" && limit.value !== "999999999999") {
      initialValue = String(isQuantity ? num : num / 100);
    } else if (limit.value === "999999999" || limit.value === "999999999999") {
      initialValue = limit.value;
    }
    setEditValue(initialValue);
    setEditCycleLength(String(limit.cycleLength || "1"));
  };

  const handleAction = async (limit, actionType) => {
    setIsSubmitting(true);
    try {
      let finalLimitValue = "0";
      let finalCycleLength = String(limit.cycleLength || "1");

      if (actionType === "set") {
        if (!editValue) return;
        
        if (editValue === "999999999999" || editValue === "999999999") {
          finalLimitValue = editValue;
        } else {
          const numVal = Number(editValue);
          if (!isNaN(numVal)) {
            finalLimitValue = String(Math.round(numVal * 100));
          } else {
            finalLimitValue = editValue + "00";
          }
        }
        finalCycleLength = String(editCycleLength || "1");
      } else if (actionType === "reset") {
        finalLimitValue = "0";
      }

      const payload = {
        cardId: String(cardId),
        cycleType: String(limit.cycleType || "0"),
        limitName: String(limit.name),
        limitValue: String(finalLimitValue),
        cycleLength: String(finalCycleLength),
        currency: String(limit.currency)
      };

      await changeCardLimit(payload);
      alert("Лимит успешно изменен! Пожалуйста, закройте и откройте заново окно для обновления данных.");
      setEditingLimitIdx(null);
      setEditValue("");
      setEditCycleLength("1");
    } catch (error) {
      console.error(error);
      alert("Ошибка при изменении лимита");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}
      style={{ zIndex: 9999 }}
    >
      <div
        className="limits-modal-container"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 50px rgba(0,0,0,0.15)",
          width: "98%",
          maxWidth: "100%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <style>{`
          @keyframes modalScaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .limits-modal-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .limits-modal-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .limits-modal-scrollbar::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 10px;
          }
          .limits-modal-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #94a3b8;
          }
        `}</style>

        <div 
          className="limits-modal-header" 
          style={{ 
            background: "#e11d48", 
            padding: "16px 24px", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}
        >
          <h2 
            className="limits-modal-title" 
            style={{ 
              color: "white", 
              margin: 0, 
              fontSize: "20px", 
              fontWeight: "700" 
            }}
          >
            Лимиты
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: "20px",
              cursor: "pointer",
              opacity: 0.8,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px"
            }}
            onMouseEnter={(e) => e.target.style.opacity = 1}
            onMouseLeave={(e) => e.target.style.opacity = 0.8}
          >
            x
          </button>
        </div>

        <div
          className="limits-modal-scrollbar"
          style={{
            padding: "24px",
            overflowY: "auto",
            flex: 1,
            maxHeight: "calc(85vh - 56px)"
          }}
        >
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
              <Spinner center />
              <p style={{ marginTop: "16px", color: "#6b7280" }}>Загрузка лимитов...</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 16px", color: "#4b5563", fontSize: "13px", fontWeight: "600", width: "35%" }}>Тип лимита</th>
                  <th style={{ padding: "12px 16px", color: "#4b5563", fontSize: "13px", fontWeight: "600", width: "12%" }}>Период</th>
                  <th style={{ padding: "12px 16px", color: "#4b5563", fontSize: "13px", fontWeight: "600", width: "10%" }}>Валюта</th>
                  <th style={{ padding: "12px 16px", color: "#4b5563", fontSize: "13px", fontWeight: "600", width: hasEditRole ? "25%" : "43%" }}>Значение</th>
                  {hasEditRole && (
                    <th style={{ padding: "12px 16px", color: "#4b5563", fontSize: "13px", fontWeight: "600", width: "18%" }}>Действия</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {limits && limits.length > 0 ? (
                  limits.map((limit, idx) => {
                    const displayName = LIMIT_NAMES_MAPPING[limit.name] || limit.name || "Неизвестный лимит";
                    const isQuantity = isQuantityLimit(limit.name, displayName);
                    const pct = getPercentage(limit.currentValue, limit.value);
                    const curNum = Number(limit.currentValue);
                    const isZero = isNaN(curNum) || curNum === 0;
                    const isInfinite = limit.value === "999999999" || limit.value === "999999999999";
                    const isOverlapping = pct > 80 && !isInfinite;

                    const trackStyle = {
                      backgroundColor: "#f3f4f6",
                      borderRadius: "9999px",
                      height: "26px",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      boxSizing: "border-box",
                      overflow: "hidden"
                    };

                    const barStyle = isZero ? {
                      backgroundColor: "#e11d48",
                      height: "100%",
                      borderRadius: "9999px",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      boxSizing: "border-box",
                      width: "26px",
                      minWidth: "26px",
                      justifyContent: "center",
                      padding: 0
                    } : {
                      backgroundColor: "#e11d48",
                      height: "100%",
                      borderRadius: "9999px",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      boxSizing: "border-box",
                      width: `${pct}%`,
                      minWidth: "max-content",
                      maxWidth: "100%",
                      paddingLeft: "12px",
                      paddingRight: "12px",
                      justifyContent: "flex-start",
                      transition: "width 0.3s ease"
                    };

                    const limitValueStyle = {
                      position: "absolute",
                      right: "12px",
                      color: isOverlapping ? "#ffffff" : "#1f2937",
                      fontSize: "12px",
                      fontWeight: "600",
                      pointerEvents: "none",
                      zIndex: 10
                    };

                    return (
                      <tr 
                        key={idx} 
                        style={{ 
                          borderBottom: "1px solid #f3f4f6",
                          transition: "background-color 0.2s",
                          cursor: hasEditRole ? "pointer" : "default"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onDoubleClick={() => {
                          if (hasEditRole && editingLimitIdx !== idx) {
                            startEditing(idx, limit);
                          }
                        }}
                      >
                        <td style={{ padding: "14px 16px", fontSize: "14px", color: "#1f2937", fontWeight: "500" }}>
                          {displayName}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: "14px", color: "#1f2937" }}>
                          {editingLimitIdx === idx ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={editCycleLength}
                                onChange={(e) => setEditCycleLength(e.target.value)}
                                placeholder="Длина"
                                style={{ width: "50px", padding: "4px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "4px" }}
                                disabled={isSubmitting}
                              />
                              <span style={{ fontSize: "11px", color: "#6b7280" }}>
                                {getCycleTypeName(limit.cycleType)}
                              </span>
                            </div>
                          ) : (
                            `${limit.cycleLength || "1"} ${getCycleTypeName(limit.cycleType)}`
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: "14px", color: "#1f2937" }}>
                          {getCurrencyName(limit.currency)}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={trackStyle}>
                            <div style={barStyle}>
                              {formatCurrentValue(limit.currentValue, isQuantity)}
                            </div>
                            <div style={limitValueStyle}>
                              {formatLimitValue(limit.value, isQuantity)}
                            </div>
                          </div>
                        </td>
                        {hasEditRole && (
                          <td style={{ padding: "14px 16px" }}>
                            {editingLimitIdx === idx ? (
                              <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  placeholder="Значение"
                                  style={{ width: "80px", padding: "4px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "4px" }}
                                  disabled={isSubmitting}
                                />
                                <button
                                  onClick={() => handleAction(limit, "set")}
                                  disabled={isSubmitting || !editValue}
                                  style={{ background: "#10b981", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setEditingLimitIdx(null)}
                                  disabled={isSubmitting}
                                  style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: "8px" }} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => startEditing(idx, limit)}
                                  disabled={isSubmitting}
                                  style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}
                                >
                                  Изменить
                                </button>
                                <button
                                  onClick={() => {
                                    if(window.confirm("Сбросить этот лимит до нуля?")) handleAction(limit, "reset");
                                  }}
                                  disabled={isSubmitting}
                                  style={{ background: "#6b7280", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}
                                >
                                  Сбросить
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={hasEditRole ? "5" : "4"}
                      style={{ textAlign: "center", padding: "40px", color: "#6b7280", fontSize: "14px" }}
                    >
                      Лимиты не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardLimitsModal;
