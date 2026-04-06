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
  ...rest
}) {
  const isCustomDateType =
    type === "date" || type === "datetime-local" || type === "time";

  return (
    <label className={`input ${className}`} style={style} htmlFor={id}>
      {title && <span>{title}</span>}
      {isCustomDateType ? (
        <CustomDateInput
          id={id}
          type={type}
          placeholder={placeholder}
          value={value ?? ""}
          disabled={disabled}
          onChange={onChange}
          onEnter={onEnter}
          error={Boolean(error?.[id])}
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
      {error && <p className={error?.[id] ? "error-input" : ""}>{error?.[id]}</p>}
    </label>
  );
}
