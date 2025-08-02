export default function CheckBox({ title, onChange, value }) {
  return (
    <div className="check-box">
      <h1>{title}</h1>
      <div>
        <label onClick={() => onChange(true)}>
          <span className={value && "checked"}></span>
          Да
        </label>
        <label onClick={() => onChange(false)}>
          <span className={!value && "checked"}></span>
          Нет
        </label>
      </div>
    </div>
  );
}
