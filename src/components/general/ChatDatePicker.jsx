import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const MONTH_LABELS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const toDayKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDayKey = (dayKey) => {
  if (!dayKey) return null;
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function ChatDatePicker({
  isOpen,
  availableDayKeys = [],
  selectedDay,
  onSelect,
  onClose,
  className = "",
}) {
  const availableSet = useMemo(() => new Set(availableDayKeys), [availableDayKeys]);
  const sortedDays = useMemo(() => [...availableSet].sort(), [availableSet]);
  const [viewDate, setViewDate] = useState(() => {
    const fallback = sortedDays.length ? sortedDays[sortedDays.length - 1] : null;
    return parseDayKey(selectedDay || fallback) || new Date();
  });

  useEffect(() => {
    if (!isOpen) return;
    const fallback = sortedDays.length ? sortedDays[sortedDays.length - 1] : null;
    setViewDate(parseDayKey(selectedDay || fallback) || new Date());
  }, [isOpen, selectedDay, sortedDays]);

  const visibleDays = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = toDayKey(date);
      return {
        key,
        date,
        inCurrentMonth: date.getMonth() === viewDate.getMonth(),
        hasMessages: availableSet.has(key),
        selected: selectedDay === key,
      };
    });
  }, [availableSet, selectedDay, viewDate]);

  const availableMonths = useMemo(() => new Set(sortedDays.map((day) => day.slice(0, 7))), [sortedDays]);
  const previousMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  const canGoPrevious = [...availableMonths].some((key) => key <= monthKey(previousMonth));
  const canGoNext = [...availableMonths].some((key) => key >= monthKey(nextMonth));

  if (!isOpen) return null;

  return (
    <div className={`chat-date-popover ${className}`} onMouseDown={(event) => event.stopPropagation()}>
      <div className="chat-date-popover__header">
        <div className="chat-date-popover__title">
          <CalendarDays size={15} />
          <span>{MONTH_LABELS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
        </div>
        <div className="chat-date-popover__actions">
          <button
            type="button"
            onClick={() => setViewDate(previousMonth)}
            disabled={!canGoPrevious}
            title="Предыдущий месяц"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => setViewDate(nextMonth)}
            disabled={!canGoNext}
            title="Следующий месяц"
          >
            <ChevronRight size={15} />
          </button>
          <button type="button" onClick={onClose} title="Закрыть календарь">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="chat-date-popover__weekdays">
        {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
      </div>

      <div className="chat-date-popover__grid">
        {visibleDays.map((day) => (
          <button
            key={day.key}
            type="button"
            className={[
              day.inCurrentMonth ? "" : "is-muted",
              day.hasMessages ? "has-messages" : "is-disabled",
              day.selected ? "is-selected" : "",
            ].filter(Boolean).join(" ")}
            disabled={!day.hasMessages}
            onClick={() => {
              if (!day.hasMessages) return;
              onSelect(day.key);
              onClose();
            }}
            title={day.hasMessages ? "Показать сообщения за этот день" : "В этот день сообщений нет"}
          >
            {day.date.getDate()}
          </button>
        ))}
      </div>

      {selectedDay && (
        <button
          type="button"
          className="chat-date-popover__clear"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
        >
          Сбросить фильтр
        </button>
      )}
    </div>
  );
}
