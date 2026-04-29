import React, { useState } from "react";
import { LIMIT_NAMES_MAPPING } from "../../../const/defConst.js";
import { changeCardLimit } from "../../../api/processing/transactions.js";
import { toast } from "react-toastify";
import Spinner from "../../Spinner.jsx";

const LimitsChangeForm = () => {
  const [formData, setFormData] = useState({
    cardId: "",
    limitName: "",
    limitValue: "",
    cycleType: "4",
    currency: "972",
    cycleLength: "1"
  });
  const [isManualLimitName, setIsManualLimitName] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cardId || !formData.limitName || !formData.limitValue) {
      toast.error("Пожалуйста, заполните все обязательные поля");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        limitValue: `${formData.limitValue}00`
      };
      
      await changeCardLimit(payload);
      toast.success("Лимит успешно изменен");
      setFormData(prev => ({ ...prev, limitValue: "" }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Ошибка при изменении лимита");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="processing-limits-form-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div className="" style={{ position: 'relative', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <div className="graph-modal-header" style={{ background: '#e11d48', padding: '16px 24px' }}>
          <h2 className="graph-modal-title" style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600' }}>Изменение лимита</h2>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '0.9rem' }}>Айди карты</label>
            <input
              type="text"
              name="cardId"
              value={formData.cardId}
              onChange={handleInputChange}
              placeholder="Введите айди карты"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ color: '#666', fontSize: '0.9rem' }}>Тип лимита</label>
              <button 
                type="button"
                onClick={() => setIsManualLimitName(!isManualLimitName)}
                style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isManualLimitName ? "Выбрать из списка" : "Ввести вручную"}
              </button>
            </div>
            
            {isManualLimitName ? (
              <input
                type="text"
                name="limitName"
                value={formData.limitName}
                onChange={handleInputChange}
                placeholder="Напр. LMTTZ201"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                disabled={isLoading}
              />
            ) : (
              <select
                name="limitName"
                value={formData.limitName}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', background: 'white' }}
                disabled={isLoading}
              >
                <option value="">Выберите тип лимита</option>
                {Object.entries(LIMIT_NAMES_MAPPING).map(([key, value]) => (
                  <option key={key} value={key}>{key} - {value}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '0.9rem' }}>Значение лимита</label>
            <input
              type="number"
              name="limitValue"
              value={formData.limitValue}
              onChange={handleInputChange}
              placeholder="Введите значение лимита"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '0.9rem' }}>Период лимита</label>
            <select
              name="cycleType"
              value={formData.cycleType}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', background: 'white' }}
              disabled={isLoading}
            >
              <option value="0">День</option>
              <option value="4">Месяц</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '0.9rem' }}>Валюта</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', background: 'white' }}
              disabled={isLoading}
            >
              <option value="972">TJS</option>
              <option value="840">USD</option>
              <option value="978">EUR</option>
            </select>
          </div>

          <button
            type="submit"
            className="selectAll-toggle"
            style={{ 
              background: '#e11d48', 
              color: 'white', 
              padding: '14px', 
              borderRadius: '8px', 
              border: 'none', 
              fontSize: '1rem', 
              fontWeight: '600', 
              cursor: 'pointer',
              marginTop: '10px',
              transition: 'background 0.2s',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px'
            }}
            disabled={isLoading}
          >
            {isLoading ? <Spinner width="20px" height="20px" /> : "Выполнить"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LimitsChangeForm;
