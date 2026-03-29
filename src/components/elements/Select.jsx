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
}) {
  return (
    <CustomSelect
      id={id}
      title={title}
      value={value}
      onChange={onChange}
      options={options}
      error={error?.[id]}
      className={className}
      style={style}
      placeholder={placeholder}
      disabled={disabled}
      dropdownPosition={dropdownPosition}
    />
  );
}
