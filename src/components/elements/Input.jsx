export default function Input({
  id,
  title,
  error,
  onChange,
  value,
  placeholder,
  className = "",
  type = "text",
  defValue,
  onEnter,
  style,
}) {
  return (
    <label className={`input ${className}`} style={style} htmlFor={id}>
      {title ||
        (placeholder && type === "date" && !value && (
          <span>{title || placeholder}</span>
        ))}
      <input
        // style={{ display: type === "date" && "none" }}
        id={id}
        type={type}
        // type="month"
        defaultValue={defValue}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter?.(value);
          }
        }}
      />
      {error && <p className={error?.[id] && "error-input"}>{error?.[id]}</p>}
    </label>
  );
}
