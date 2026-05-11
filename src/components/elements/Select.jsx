import CustomSelect from "./CustomSelect";

export default function Select({
  id,
  error,
  onChange,
  value,
  options = [],
  className = "",
  style,
  title,
  placeholder,
  disabled,
  dropdownPosition,
  required,
}) {
  const errorMessage = typeof error === 'object' ? error?.[id] : error;

  return (
    <CustomSelect
      id={id}
      title={title}
      value={value}
      onChange={onChange}
      options={options}
      error={errorMessage}
      className={className}
      style={style}
      placeholder={placeholder}
      disabled={disabled}
      dropdownPosition={dropdownPosition}
      required={required}
    />
  );
}

