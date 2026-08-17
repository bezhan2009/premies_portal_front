import React, { useState, useEffect, useMemo } from "react";
import { FaHistory, FaSearch } from "react-icons/fa";
import { TYPE_SEARCH_CLIENT } from "../../../const/defConst.js";

const SEARCH_HISTORY_LIMIT = 10;

const getSearchHistoryStorageKey = () => {
  const userId = String(localStorage.getItem("user_id") || "").trim();
  const username = String(localStorage.getItem("username") || "").trim().toLowerCase();
  const userKey = userId ? `id-${userId}` : username ? `username-${username}` : "";
  return userKey ? `frontovik_search_history:${userKey}` : "";
};

const normalizeHistoryEntry = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  const value = String(entry.value || "").trim();
  const searchType = String(entry.searchType || "").trim();
  if (!value || !searchType) return null;

  return {
    value,
    displayValue: String(entry.displayValue || value).trim(),
    searchType,
    searchedAt: entry.searchedAt || new Date().toISOString(),
  };
};

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
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyStorageKey = useMemo(getSearchHistoryStorageKey, []);

  useEffect(() => {
    if (!historyStorageKey) {
      setHistory([]);
      return;
    }

    const saved = localStorage.getItem(historyStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(
          (Array.isArray(parsed) ? parsed : [])
            .map(normalizeHistoryEntry)
            .filter(Boolean)
            .slice(0, SEARCH_HISTORY_LIMIT),
        );
      } catch {
        setHistory([]);
      }
    }
  }, [historyStorageKey]);

  const saveToHistory = ({ value, displayValue, searchType }) => {
    if (!historyStorageKey) return;
    const nextEntry = normalizeHistoryEntry({
      value,
      displayValue,
      searchType,
      searchedAt: new Date().toISOString(),
    });
    if (!nextEntry) return;

    setHistory((currentHistory) => {
      const latest = currentHistory[0];
      if (latest?.value === nextEntry.value && latest?.searchType === nextEntry.searchType) {
        return currentHistory;
      }

      const nextHistory = [nextEntry, ...currentHistory].slice(0, SEARCH_HISTORY_LIMIT);
      localStorage.setItem(historyStorageKey, JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  const saveCurrentSearch = () => saveToHistory({
    value: phoneNumber,
    displayValue: displayPhone,
    searchType: selectTypeSearchClient,
  });

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && phoneNumber) {
      saveCurrentSearch();
      setIsHistoryOpen(false);
      handleSearchClient();
    }
    if (e.key === "Escape") setIsHistoryOpen(false);
  };

  const onSearchClick = () => {
    saveCurrentSearch();
    setIsHistoryOpen(false);
    handleSearchClient();
  };

  const handleHistorySelect = (entry) => {
    handlePhoneChange({ target: { value: entry.value } });
    setSelectTypeSearchClient(entry.searchType);
    saveToHistory(entry);
    setIsHistoryOpen(false);
    handleSearchClient(entry.value, entry.searchType);
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
        <div
          className="search-input-wrapper"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsHistoryOpen(false);
            }
          }}
        >
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
            onFocus={() => setIsHistoryOpen(true)}
            disabled={isLoading}
            aria-expanded={isHistoryOpen && history.length > 0}
            aria-controls="frontovik-search-history"
            autoComplete="off"
          />
          {isHistoryOpen && history.length > 0 && (
            <div className="search-history-dropdown" id="frontovik-search-history" role="listbox">
              <div className="search-history-dropdown__header">
                <FaHistory aria-hidden="true" />
                <span>Последние запросы</span>
              </div>
              <div className="search-history-dropdown__list">
                {history.map((entry, idx) => {
                  const typeLabel = TYPE_SEARCH_CLIENT.find((item) => item.value === entry.searchType)?.label;
                  return (
                    <button
                      key={`${entry.searchType}-${entry.searchedAt}-${idx}`}
                      type="button"
                      className="search-history-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleHistorySelect(entry)}
                      role="option"
                    >
                      <FaHistory aria-hidden="true" />
                      <span className="search-history-item__copy">
                        <strong>{entry.displayValue}</strong>
                        {typeLabel && <small>{typeLabel}</small>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="search-action-btns">
          <button
            onClick={onSearchClick}
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
