import React from 'react';

export default function CheckBox({ 
  id, 
  title, 
  className = "", 
  onChange, 
  value, 
  yes = "Да", 
  no = "Нет", 
  error, 
  required,
  disabled = false
}) {
  const errorMessage = typeof error === 'object' ? error?.[id] : error;

  return (
    <div className={`check-box-container ${className} ${errorMessage ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}>
      {title && (
        <label className="check-box-label" htmlFor={id}>
          {title} {required && <span className="required-star">*</span>}
        </label>
      )}
      <div className="check-box-wrapper">
        <label className={`check-box-option ${value === true ? 'active' : ''}`} onClick={() => !disabled && onChange(true)}>
          <span className={`radio-circle ${value === true ? 'checked' : ''}`}></span>
          <span className="option-text">{yes}</span>
        </label>
        <label className={`check-box-option ${value === false ? 'active' : ''}`} onClick={() => !disabled && onChange(false)}>
          <span className={`radio-circle ${value === false ? 'checked' : ''}`}></span>
          <span className="option-text">{no}</span>
        </label>
      </div>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
}
