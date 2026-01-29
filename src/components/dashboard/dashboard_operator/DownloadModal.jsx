import React from "react";

const DownloadModal = ({
  show,
  user,
  month,
  year,
  onMonthChange,
  onYearChange,
  onDownload,
  onClose,
  monthOptions,
}) => {
  if (!show) return null;

  return (
    <div className="filters__modal">
      <div className="filters__modal-content">
        <h3>Выгрузка отчёта для {user?.full_name}</h3>

        <div className="filters__date-selection">
          <select value={month} onChange={(e) => onMonthChange(e.target.value)}>
            <option value="">-- Выберите месяц --</option>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Год"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            className="filters__year-input"
          />
        </div>

        <div className="filters__modal-actions">
          <button onClick={onDownload}>Выгрузить</button>
          <button onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;
