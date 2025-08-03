export default function Input({
  id,
  title,
  error,
  onChange,
  value,
  placeholder,
  className = "",
}) {
  return (
    <label className={`input ${className}`} htmlFor={id}>
      {title && <span>{title}</span>}
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className={error?.[id] && "error-input"}>{error?.[id]}</p>
    </label>
  );
}
