import React from "react";
import { FaSearch } from "react-icons/fa";
import { TYPE_SEARCH_CLIENT } from "../../../const/defConst.js";

const SearchForm = ({
  selectTypeSearchClient,
  setSelectTypeSearchClient,
  displayPhone,
  handlePhoneChange,
  isLoading,
  handleSearchClient,
  handleClear,
  phoneNumber,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && phoneNumber) {
      handleSearchClient();
    }
  };

  return (
    <div className="abs-search-form-card">
      <div className="search-form-section">
        <label className="search-form-label">Тип поиска</label>
        <div className="search-type-tags">
          {TYPE_SEARCH_CLIENT.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectTypeSearchClient(opt.value)}
              className={`search-type-tag-btn ${
                selectTypeSearchClient === opt.value ? "active" : ""
              }`}
              disabled={isLoading}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="search-input-row">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            value={displayPhone}
            onChange={handlePhoneChange}
            placeholder={
              "Введите " +
              (TYPE_SEARCH_CLIENT.find(
                (e) => e.value === selectTypeSearchClient
              )?.inputLabel || "значение").toLocaleLowerCase() + "..."
            }
            className="search-input-field"
            maxLength={100}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
        </div>
        <div className="search-action-btns">
          <button
            onClick={handleSearchClient}
            disabled={!phoneNumber || isLoading}
            className={`btn-search-action btn-search-submit ${
              isLoading ? "btn-search-submit--loading" : ""
            }`}
          >
            {isLoading ? "Поиск..." : "Найти"}
          </button>
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="btn-search-action btn-search-clear"
          >
            Очистить
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchForm;
