import React, { useState, useEffect, useCallback } from "react";
import "../../../../styles/components/ProcessingIntegration.scss";
import "../../../../styles/components/BlockInfo.scss";
import AlertMessage from "../../../general/AlertMessage.jsx";
import { getCurrencyCode } from "../../../../api/utils/getCurrencyCode.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

// Функция для получения человеко-читаемого названия лимита
const getLimitDescription = (limitId) => {
  const descriptions = {
    LMTTZ285: "Чужой ВПН в месяц(сумма)",
    LMTTZ292: "Чужой ПОС в день(кол-во)",
    LMTTZ272: "Наш АТМ в день(кол-во)",
    LMTTZ288: "Чужой АТМ в день(кол-во)",
    LMTTZ362: "Корректировка лимита",
    LMTTZ363: "Корректировка лимита",
    LMTTZ271: "Наш АТМ в день(сумма)",
    LMTTZ273: "Наш АТМ в месяц(сумма)",
    LMTTZ280: "Наш ЕПОС в день(кол-во)",
    LMTTZ281: "Наш ЕПОС в месяц(сумма)",
    LMTTZ268: "Наш ПВН в день(кол-во)",
    LMTTZ270: "Наш ПВН в месяц(кол-во)",
    LMTTZ283: "Чужой ПВН в день(сумма)",
    LMTTZ290: "Чужой АТМ в месяц(кол-во)",
    LMTTZ274: "Наш АТМ в месяц(кол-во)",
    LMTTZ294: "Чужой ПОС в месяц(кол-во)",
    LMTTZ371: "Наш АТМ в день(сумма)",
    LMTTZ276: "Наш ПОС в день(кол-во)",
    LMTTZ278: "Наш ПОС в месяц(кол-во)",
    LMTTZ282: "Наш ЕПОС в месяц(кол-во)",
    LMTTZ297: "Чужой ЕПОС в месяц(сумма)",
    LMTTZ269: "Наш ПВН в месяц(сумма)",
    LMTTZ279: "Наш ЕПОС в день(сумма)",
    LMTTZ286: "Чужой ВПН в месяц(кол-во)",
    LMTTZ298: "Чужой ЕПОС в месяц(кол-во)",
    LMTTZ289: "Чужой АТМ в месяц(сумма)",
    LMTTZ291: "Чужой ПОС в день(сумма)",
    LMTTZ296: "Чужой ЕПОС в день(кол-во)",
    LMTTZ275: "Наш ПОС в день(сумма)",
    LMTTZ287: "Чужой АТМ в день(сумма)",
    LMTTZ293: "Чужой ПОС в месяц(сумма)",
    LMTTZ369: "Технический лимит системы",
    LMTTZ284: "Чужой ПВН в день(кол-во)",
    LMTTZ370: "Системный лимит безопасности",
    LMTTZ372: "Общий лимит расходов(кол-во)",
    LMTTZ267: "Наш ПВН в день(сумма)",
    LMTTZ295: "Чужой ЕПОС в день(сумма)",
    LMTTZ277: "Наш ПОС в месяц(сумма)",
  };

  return descriptions[limitId] || `Лимит ${limitId}`;
};

// API функции
const API_BASE_URL = import.meta.env.VITE_BACKEND_PROCESSING_URL;

const api = {
  getLimits: async (cardNumber) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Transactions/limits/${cardNumber}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Ошибка получения лимитов:", error);
      throw error;
    }
  },

  updateLimit: async (cardNumber, limitName, limitValue) => {
    try {
      // Используем query параметры для GET запроса
      const url = `${API_BASE_URL}/api/Transactions/${cardNumber}?limitName=${encodeURIComponent(limitName)}&limitValue=${encodeURIComponent(limitValue)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Ошибка обновления лимита:", error);
      throw error;
    }
  },
};

// Компонент кастомного селекта
const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  useEffect(() => {
    const selected = options.find((opt) => opt.value === value);
    setSelectedLabel(selected ? selected.label : "");
  }, [value, options]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="custom-select">
      <div
        className={`custom-select__trigger ${isOpen ? "custom-select__trigger--open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="custom-select__value">{selectedLabel}</span>
        <span
          className={`custom-select__arrow ${isOpen ? "custom-select__arrow--open" : ""}`}
        >
          ▼
        </span>
      </div>
      {isOpen && (
        <>
          <div
            className="custom-select__backdrop"
            onClick={() => setIsOpen(false)}
          />
          <div className="custom-select__dropdown">
            {options.map((option) => (
              <div
                key={option.value}
                className={`custom-select__option ${value === option.value ? "custom-select__option--selected" : ""}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Компонент модалки для изменения лимита
const LimitEditModal = ({ isOpen, onClose, limit, onSave }) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen && limit) {
      setValue((limit.newValue || limit.value).toString());
      setError("");
    }
  }, [isOpen, limit]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleSave = () => {
    const numValue = parseFloat(value.replace(/\s/g, ""));

    if (!value.trim()) {
      setError("Значение не может быть пустым");
      return;
    }

    if (isNaN(numValue) || numValue < 0) {
      setError("Введите корректное числовое значение");
      return;
    }

    if (numValue > 999999999999) {
      setError("Значение не может превышать 999,999,999,999");
      return;
    }

    onSave(limit.name, numValue);
    handleClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSave();
    }
    if (e.key === "Escape") {
      handleClose();
    }
  };

  const formatNumberWithSpaces = (val) => {
    // Удаляем всё кроме цифр
    const digitsOnly = val.replace(/\D/g, "");
    // Добавляем пробелы каждые 3 цифры справа
    return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  if (!isOpen) return null;

  return (
    <div
      className={`modal-overlay-processing ${isClosing ? "modal-overlay-processing--closing" : ""}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`modal-processing ${isClosing ? "modal-processing--closing" : ""}`}
      >
        <button
          className="modal-processing__close"
          onClick={handleClose}
          aria-label="Закрыть"
        >
          ×
        </button>

        <div className="modal-processing__header">
          <h3 className="modal-processing__title">Изменение лимита</h3>
          <p className="modal-processing__subtitle">
            {getLimitDescription(limit?.name)}
          </p>
          <p className="modal-processing__info">ID: {limit?.name}</p>
        </div>

        <div className="modal-processing__body">
          <label className="modal-processing__label" htmlFor="limitValue">
            Новое значение лимита
          </label>
          <input
            id="limitValue"
            type="text"
            className={`modal-processing__input ${error ? "modal-processing__input--error" : ""}`}
            value={formatNumberWithSpaces(value)}
            onChange={(e) => {
              setValue(e.target.value.replace(/\s/g, ""));
              if (error) setError("");
            }}
            onKeyPress={handleKeyPress}
            placeholder="Введите новое значение"
            autoFocus
          />
          {error && <div className="modal-processing__error">{error}</div>}

          <div className="modal-processing__info">
            Текущее значение:{" "}
            <strong>
              {limit?.currentValue?.toLocaleString("ru-RU")}{" "}
              {limit?.currency ? getCurrencyCode(limit.currency) : ""}
            </strong>
          </div>
          <div className="modal-processing__info">
            Значение лимита:{" "}
            <strong>
              {limit?.value?.toLocaleString("ru-RU")}{" "}
              {limit?.currency ? getCurrencyCode(limit.currency) : ""}
            </strong>
          </div>
        </div>

        <div className="modal-processing__footer">
          <button
            className="modal-processing__btn modal-processing__btn--secondary"
            onClick={handleClose}
          >
            Отмена
          </button>
          <button
            className="modal-processing__btn modal-processing__btn--primary"
            onClick={handleSave}
            disabled={!value.trim()}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ProcessingIntegrationLimits() {
  const [cardNumber, setCardNumber] = useState("");
  const [displayCardNumber, setDisplayCardNumber] = useState("");
  const [limitData, setLimitData] = useState([]);
  const [filteredLimitData, setFilteredLimitData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { exportToExcel } = useExcelExport();
  const [editModal, setEditModal] = useState({
    isOpen: false,
    limit: null,
  });
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const sortOptions = [
    { value: "asc", label: "По возрастанию (по ID)" },
    { value: "desc", label: "По убыванию (по ID)" },
  ];

  // Функция для показа уведомления
  const showAlert = (message, type = "success") => {
    setAlert({
      show: true,
      message,
      type,
    });
  };

  // Функция для скрытия уведомления
  const hideAlert = () => {
    setAlert({
      show: false,
      message: "",
      type: "success",
    });
  };

  // Функция для форматирования номера карты
  const formatCardNumber = (value) => {
    const digitsOnly = value.replace(/\D/g, "");
    const formatted = digitsOnly.replace(/(\d{4})(?=\d)/g, "$1 ");
    return formatted;
  };

  // Обработка изменения номера карты
  const handleCardNumberChange = (e) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, "").slice(0, 16);

    setCardNumber(digitsOnly);
    setDisplayCardNumber(formatCardNumber(digitsOnly));
  };

  // Функция для извлечения числа из ID лимита
  const extractLimitNumber = useCallback((limitName) => {
    const match = limitName.match(/\d+$/);
    return match ? parseInt(match[0]) : 0;
  }, []);

  // Функция для сортировки лимитов
  const sortLimits = useCallback(
    (limits, order) => {
      return [...limits].sort((a, b) => {
        const numA = extractLimitNumber(a.name);
        const numB = extractLimitNumber(b.name);
        return order === "asc" ? numA - numB : numB - numA;
      });
    },
    [extractLimitNumber],
  );

  // Функция для фильтрации и сортировки данных
  useEffect(() => {
    let filtered = limitData;

    // Фильтрация по поисковому запросу
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (limit) =>
          limit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          limit.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Сортировка
    filtered = sortLimits(filtered, sortOrder);

    setFilteredLimitData(filtered);
  }, [limitData, searchQuery, sortOrder, sortLimits]);

  // Функция для обработки изменения лимита
  const handleLimitChange = (limitName, newValue) => {
    setLimitData((prevData) =>
      prevData.map((item) =>
        item.name === limitName ? { ...item, newValue } : item,
      ),
    );
  };

  // Функция для поиска данных по номеру карты
  const handleCardNumberSearch = useCallback(async () => {
    if (cardNumber.trim()) {
      setIsLoading(true);
      try {
        const limits = await api.getLimits(cardNumber);

        // Преобразуем данные API в нужный формат
        const formattedLimits = limits.map((limit) => ({
          name: limit.name,
          description: getLimitDescription(limit.name),
          currentValue: parseInt(limit.currentValue) || 0,
          value: parseInt(limit.value) || 0,
          newValue: null,
          cycleType: limit.cycleType,
          cycleLength: limit.cycleLength,
          currency: limit.currency,
        }));

        setLimitData(formattedLimits);
        showAlert(`Загружено ${formattedLimits.length} лимитов`, "success");
      } catch (error) {
        showAlert("Ошибка при загрузке данных: " + error.message, "error");
        setLimitData([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [cardNumber]);

  // Функция для сохранения всех изменений
  const handleSaveAll = useCallback(async () => {
    const changes = limitData.filter(
      (item) => item.newValue !== null && item.newValue !== item.value,
    );

    if (changes.length === 0) {
      showAlert("Нет изменений для сохранения", "info");
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Выполняем все запросы последовательно
      for (const change of changes) {
        try {
          await api.updateLimit(
            cardNumber,
            change.name,
            change.newValue.toString(),
          );
          successCount++;
        } catch (error) {
          console.error(`Ошибка обновления лимита ${change.name}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        // Обновляем состояние для успешно сохраненных лимитов
        setLimitData((prevData) =>
          prevData.map((item) => {
            if (item.newValue !== null && item.newValue !== item.value) {
              return {
                ...item,
                value: item.newValue,
                newValue: null,
              };
            }
            return item;
          }),
        );

        showAlert(
          `Успешно сохранено ${successCount} лимитов` +
            (errorCount > 0 ? `, ошибок: ${errorCount}` : ""),
          errorCount > 0 ? "warning" : "success",
        );
      } else {
        showAlert("Не удалось сохранить изменения", "error");
      }
    } catch (error) {
      showAlert("Критическая ошибка при сохранении: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  }, [limitData, cardNumber]);

  // Функция для открытия модалки редактирования
  const handleEditLimit = (limit) => {
    setEditModal({
      isOpen: true,
      limit: limit,
    });
  };

  // Функция для закрытия модалки
  const handleCloseModal = () => {
    setEditModal({
      isOpen: false,
      limit: null,
    });
  };

  // Получаем количество изменений
  const changesCount = limitData.filter(
    (item) => item.newValue !== null && item.newValue !== item.value,
  ).length;

  const handleExport = () => {
    const columns = [
      { key: "name", label: "ID лимита" },
      { key: "description", label: "Описание" },
      {
        key: (row) => `${row.currentValue} ${getCurrencyCode(row.currency)}`,
        label: "Текущее значение",
      },
      {
        key: (row) => `${row.value} ${getCurrencyCode(row.currency)}`,
        label: "Значение лимита",
      },
      {
        key: (row) =>
          row.newValue !== null
            ? `${row.newValue} ${getCurrencyCode(row.currency)}`
            : "Не изменено",
        label: "Новое значение",
      },
    ];
    exportToExcel(filteredLimitData, columns, `Лимиты_${cardNumber}`);
  };

  return (
    <div className="block_info_prems content-page" align="center">
      {/* Компонент AlertMessage */}
      {alert.show && (
        <AlertMessage
          message={alert.message}
          type={alert.type}
          onClose={hideAlert}
          duration={3000}
        />
      )}

      <div className="processing-integration">
        <div className="processing-integration__container">
          {/* Заголовок */}
          <div className="processing-integration__header">
            <h1 className="processing-integration__title">
              Управление лимитами карт
            </h1>
            <p className="processing-integration__subtitle">
              Поиск и изменение лимитов по номеру банковской карты
            </p>
          </div>

          {/* Поиск по номеру карты */}
          <div className="processing-integration__search-card">
            <div className="search-card">
              <div className="search-card__content">
                <div className="search-card__input-group">
                  <label htmlFor="cardNumber" className="search-card__label">
                    Номер банковской карты
                  </label>
                  <input
                    type="text"
                    id="cardNumber"
                    value={displayCardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="0000 0000 0000 0000"
                    className="search-card__input"
                    maxLength={19}
                    disabled={isLoading || isSaving}
                  />
                </div>
                <button
                  onClick={handleCardNumberSearch}
                  disabled={cardNumber.length !== 16 || isLoading || isSaving}
                  className={`search-card__button ${isLoading ? "search-card__button--loading" : ""}`}
                >
                  {isLoading ? "Поиск..." : "Найти"}
                </button>
              </div>
            </div>
          </div>

          {/* Таблица лимитов */}
          {limitData.length > 0 && (
            <div className="processing-integration__limits-table">
              <div className="limits-table">
                <div className="limits-table__header">
                  <h2 className="limits-table__title">
                    Текущие лимиты карты {displayCardNumber}
                  </h2>
                  <div className="limits-table__actions">
                    <button
                      onClick={handleExport}
                      className="export-excel-btn"
                      style={{ marginRight: "10px" }}
                    >
                      Экспорт в Excel
                    </button>
                    <button
                      onClick={handleSaveAll}
                      className="limits-table__action-btn limits-table__action-btn--primary"
                      disabled={changesCount === 0 || isSaving}
                    >
                      {isSaving ? "Сохранение..." : "Сохранить все"}
                    </button>
                  </div>
                </div>

                {/* Фильтры */}
                <div className="limits-table__filters">
                  <div className="filters-group">
                    <div className="filter-item">
                      <label className="filter-item__label">
                        Поиск по лимитам
                      </label>
                      <input
                        type="text"
                        className="filter-item__input"
                        placeholder="Введите ID или название..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="filter-item">
                      <label className="filter-item__label">Сортировка</label>
                      <CustomSelect
                        value={sortOrder}
                        onChange={setSortOrder}
                        options={sortOptions}
                      />
                    </div>
                  </div>
                </div>

                <div className="limits-table__wrapper">
                  <table className="limits-table">
                    <thead className="limits-table__head">
                      <tr>
                        <th className="limits-table__th limits-table__th--id">
                          ID и Наименование лимита
                        </th>
                        <th className="limits-table__th limits-table__th--current">
                          Текущее значение
                        </th>
                        <th className="limits-table__th limits-table__th--default">
                          Значение лимита
                        </th>
                        <th className="limits-table__th limits-table__th--new">
                          Новое значение
                        </th>
                        <th className="limits-table__th limits-table__th--actions">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody className="limits-table__body">
                      {filteredLimitData.map((limit) => (
                        <tr key={limit.name} className="limits-table__row">
                          <td className="limits-table__td limits-table__td--info">
                            <div className="limit-info">
                              <div className="limit-info__name">
                                {limit.description}
                              </div>
                              <div className="limit-info__id">
                                ID: {limit.name}
                              </div>
                            </div>
                          </td>
                          <td className="limits-table__td limits-table__td--value">
                            <span className="current-value">
                              {limit.currentValue.toLocaleString("ru-RU")}{" "}
                              {getCurrencyCode(limit.currency)}
                            </span>
                          </td>
                          <td className="limits-table__td limits-table__td--value">
                            <span className="default-value">
                              {limit.value.toLocaleString("ru-RU")}{" "}
                              {getCurrencyCode(limit.currency)}
                            </span>
                          </td>
                          <td className="limits-table__td limits-table__td--value">
                            {limit.newValue !== null ? (
                              <span className="new-value new-value--changed">
                                {limit.newValue.toLocaleString("ru-RU")}{" "}
                                {getCurrencyCode(limit.currency)}
                              </span>
                            ) : (
                              <span className="new-value new-value--empty">
                                Не изменено
                              </span>
                            )}
                          </td>
                          <td className="limits-table__td limits-table__td--actions">
                            <div className="action-buttons">
                              <button
                                onClick={() => handleEditLimit(limit)}
                                className="action-buttons__btn action-buttons__btn--edit"
                                disabled={isSaving}
                              >
                                Изменить
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Статистика */}
                <div className="limits-table__footer">
                  <div className="limits-table__stats">
                    <span className="limits-table__stat">
                      Всего записей: {limitData.length}
                    </span>
                    <span className="limits-table__stat">
                      Показано: {filteredLimitData.length}
                    </span>
                    <span className="limits-table__stat">
                      Изменено: {changesCount}
                    </span>
                    <span className="limits-table__stat">
                      Карта: {displayCardNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Индикатор загрузки */}
          {isLoading && (
            <div className="processing-integration__loading">
              <div className="loading-spinner"></div>
            </div>
          )}

          {/* Сообщение об отсутствии данных */}
          {!isLoading && limitData.length === 0 && cardNumber.length === 16 && (
            <div className="processing-integration__no-data">
              <div className="no-data">
                <h3>Данные не найдены</h3>
                <p>
                  Для карты {displayCardNumber} не найдено лимитов или произошла
                  ошибка загрузки.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модалка для изменения лимита */}
      <LimitEditModal
        isOpen={editModal.isOpen}
        onClose={handleCloseModal}
        limit={editModal.limit}
        onSave={handleLimitChange}
      />
    </div>
  );
}
