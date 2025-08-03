export default function CheckBox({ title, className, onChange, value, yes = "Да", no = "Нет" }) {
  return (
    <div className={`check-box ${className}`}>
      <h1>{title}</h1>
      <div>
        <label onClick={() => onChange(true)}>
          <span className={value && "checked"}></span>
          {yes}
        </label>
        <label onClick={() => onChange(false)}>
          <span className={!value && "checked"}></span>
          {no}
        </label>
      </div>
    </div>
  );
}
