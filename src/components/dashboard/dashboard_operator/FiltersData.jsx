import React from "react";
import "../../../styles/components/Filters.scss";

const FiltersDatas = ({ onSelect }) => {
  const buttons = [
    { text: "Отделения", class: "reports_filter__button--grey", key: "office" },
    {
      text: "Сотрудники",
      class: "reports_filter__button--purple",
      key: "employees",
    },
    { text: "Роли", class: "reports_filter__button--yellow", key: "roles" },
    {
      text: "Цены продуктов",
      class: "reports_filter__button--cyan",
      key: "prices",
    },
    { text: "Мерчанты", class: "reports_filter__button--grey", key: "margents" },
  ];

  return (
    <div className="reports_filter">
      <div className="filters__left">
        {buttons.map((btn) => (
          <button
            key={btn.key}
            className={`reports_filter__button ${btn.class}`}
            onClick={() => onSelect(btn.key)}
          >
            {btn.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FiltersDatas;
