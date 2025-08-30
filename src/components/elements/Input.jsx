export default function Input({
  id,
  title,
  error,
  onChange,
  value,
  placeholder,
  className = "",
  type = "text",
}) {
  return (
    <label className={`input ${className}`} htmlFor={id}>
      {title ||
        (placeholder && type === "date" && !value && (
          <span>{title || placeholder}</span>
        ))}
      <input
        // style={{ display: type === "date" && "none" }}
        id={id}
        // type={type}
        type="month"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className={error?.[id] && "error-input"}>{error?.[id]}</p>}
    </label>
  );
}
