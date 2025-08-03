export default function Select({
  id,
  error,
  onChange,
  value,
  options = [],
  className = "",
}) {
  return (
    <label className={`select ${className}`} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-error`}
      >
        {options.map((item, i) => (
          <option value={item.value} key={i}>
            {item.label}
          </option>
        ))}
      </select>
      <p className={error?.[id] && "error-input"}>{error?.[id]}</p>
    </label>
  );
}
