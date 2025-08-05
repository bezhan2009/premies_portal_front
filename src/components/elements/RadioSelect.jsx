import { useEffect } from "react";
import file from "../../assets/file.jpg";

export default function RadioSelect({ options, selectedValue, onChange }) {
  useEffect(() => {
    onChange(selectedValue || options[0]?.id);
  }, []);

  console.log("selectedValue", selectedValue);

  return (
    <div className="radio-select">
      {options.map((option, i) => (
        <label
          key={i}
          className="radio-select-item"
          onClick={() => onChange(option.id)}
        >
          <nav>
            <div
              className={option.id === selectedValue && "checked"}
              onClick={() => onChange(option.id)}
            ></div>
            <span>{option.name}</span>
          </nav>
          <img src={file} alt="file" width={16} />
        </label>
      ))}
    </div>
  );
}
