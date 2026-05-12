import CustomDateInput from "./CustomDateInput.jsx";

export default function Input({
  id,
  title,
  error,
  onChange,
  value,
  placeholder,
  className = "",
  type = "text",
  disabled = false,
  onEnter,
  style,
  required,
  ...rest
}) {
  const isCustomDateType =
    type === "date" || type === "datetime-local" || type === "time";

  const errorMessage = typeof error === 'object' ? error?.[id] : error;

  return (
    <div className={`input-container ${className} ${errorMessage ? 'has-error' : ''}`} style={style}>
      {title && (
        <label className="input-label" htmlFor={id}>
          {title} {required && <span className="required-star">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {isCustomDateType ? (
          <CustomDateInput
            id={id}
            type={type}
            placeholder={placeholder}
            value={value ?? ""}
            disabled={disabled}
            onChange={onChange}
            onEnter={onEnter}
            error={Boolean(errorMessage)}
            variant="compact"
            {...rest}
          />
        ) : (
          <input
            {...rest}
            id={id}
            type={type}
            placeholder={placeholder}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnter?.(value);
              }
            }}
          />
        )}
      </div>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
}

