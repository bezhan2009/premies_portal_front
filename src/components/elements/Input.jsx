export default function Input({
  title,
  error,
  id,
  onChange,
  value,
  placeholder,
}) {
  return (
    <label className="input" htmlFor={id}>
      <span>{title}</span>
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
