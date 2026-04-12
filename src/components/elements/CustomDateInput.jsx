import PropTypes from "prop-types";
import { ConfigProvider, DatePicker, TimePicker } from "antd";
import ruRU from "antd/locale/ru_RU";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/ru";
import { CalendarDays, Clock3 } from "lucide-react";
import "../../styles/components/CustomDateInput.scss";
import useThemeStore from "../../store/useThemeStore";
import { useMemo } from "react";

dayjs.extend(customParseFormat);
dayjs.locale("ru");

const DISPLAY_FORMATS = {
  date: "DD.MM.YYYY",
  "datetime-local": "DD.MM.YYYY HH:mm",
  time: "HH:mm",
};

const VALUE_FORMATS = {
  date: "YYYY-MM-DD",
  "datetime-local": "YYYY-MM-DDTHH:mm",
  time: "HH:mm",
};

const BASE_THEME_CONFIG = {
  token: {
    borderRadius: 12,
    fontFamily: "inherit",
  },
};

const normalizeValue = (rawValue, type) => {
  if (rawValue == null || rawValue === "") {
    return "";
  }

  if (typeof rawValue !== "string") {
    return rawValue;
  }

  if (type === "date" && rawValue.includes("T")) {
    return rawValue.slice(0, 10);
  }

  if (type === "time") {
    const timeMatch = rawValue.match(/(\d{2}:\d{2})/);
    return timeMatch ? timeMatch[1] : rawValue;
  }

  if (type === "datetime-local") {
    const dateTimeMatch = rawValue.match(/(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
    if (dateTimeMatch) {
      return `${dateTimeMatch[1]}T${dateTimeMatch[2]}`;
    }
  }

  return rawValue;
};

const parsePickerValue = (rawValue, type) => {
  const normalizedValue = normalizeValue(rawValue, type);

  if (!normalizedValue) {
    return null;
  }

  if (dayjs.isDayjs(normalizedValue)) {
    return normalizedValue;
  }

  if (normalizedValue instanceof Date) {
    const parsedDate = dayjs(normalizedValue);
    return parsedDate.isValid() ? parsedDate : null;
  }

  const formatsByType = {
    date: [VALUE_FORMATS.date, DISPLAY_FORMATS.date],
    "datetime-local": [
      VALUE_FORMATS["datetime-local"],
      "YYYY-MM-DD HH:mm",
      DISPLAY_FORMATS["datetime-local"],
    ],
    time: [VALUE_FORMATS.time, "HH:mm:ss"],
  };

  const candidateFormats = formatsByType[type] || [];

  for (const format of candidateFormats) {
    const parsed = dayjs(normalizedValue, format, true);
    if (parsed.isValid()) {
      return parsed;
    }
  }

  const fallback = dayjs(normalizedValue);
  return fallback.isValid() ? fallback : null;
};

export default function CustomDateInput({
  id,
  value,
  onChange,
  placeholder,
  className = "",
  type = "date",
  disabled = false,
  onEnter,
  style,
  error = false,
  onClick,
  autoFocus = false,
  variant = "default",
}) {
  const { primaryColor } = useThemeStore();

  const dynamicTheme = useMemo(
    () => ({
      ...BASE_THEME_CONFIG,
      token: {
        ...BASE_THEME_CONFIG.token,
        colorPrimary: primaryColor,
      },
      components: {
        DatePicker: {
          activeBorderColor: primaryColor,
          hoverBorderColor: primaryColor,
          activeShadow: `0 0 0 4px rgba(${primaryColor.replace("#", "")}, 0.12)`,
        },
        TimePicker: {
          activeBorderColor: primaryColor,
          hoverBorderColor: primaryColor,
          activeShadow: `0 0 0 4px rgba(${primaryColor.replace("#", "")}, 0.12)`,
        },
      },
    }),
    [primaryColor],
  );
  const isTime = type === "time";
  const isDateTime = type === "datetime-local";
  const pickerValue = parsePickerValue(value, type);
  const displayFormat = DISPLAY_FORMATS[type] || DISPLAY_FORMATS.date;
  const valueFormat = VALUE_FORMATS[type] || VALUE_FORMATS.date;
  const resolvedPlaceholder =
    placeholder ||
    (isTime
      ? "Выберите время"
      : isDateTime
        ? "Выберите дату и время"
        : "Выберите дату");
  const pickerClassName = [
    "custom-date-control",
    `custom-date-control--${variant}`,
    error ? "custom-date-control--error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleChange = (nextValue) => {
    if (!nextValue || !nextValue.isValid()) {
      onChange("");
      return;
    }

    onChange(nextValue.format(valueFormat));
  };

  const sharedProps = {
    id,
    value: pickerValue,
    disabled,
    style,
    className: pickerClassName,
    placeholder: resolvedPlaceholder,
    allowClear: true,
    inputReadOnly: true,
    popupClassName: "site-calendar-dropdown",
    autoFocus,
    onClick,
    onKeyDown: (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onEnter?.(value);
      }
    },
    // Ключевое исправление: рендерим popup в body, чтобы избежать overflow: hidden
    getPopupContainer: (triggerNode) => document.body,
    needConfirm: false,
  };

  return (
    <ConfigProvider locale={ruRU} theme={dynamicTheme}>
      {isTime ? (
        <TimePicker
          {...sharedProps}
          format={displayFormat}
          minuteStep={5}
          suffixIcon={<Clock3 size={16} />}
          onChange={(nextValue) => handleChange(nextValue)}
        />
      ) : (
        <DatePicker
          {...sharedProps}
          format={displayFormat}
          showTime={
            isDateTime
              ? {
                format: "HH:mm",
                minuteStep: 5,
              }
              : false
          }
          suffixIcon={isDateTime ? <Clock3 size={16} /> : <CalendarDays size={16} />}
          onChange={(nextValue) => handleChange(nextValue)}
        />
      )}
    </ConfigProvider>
  );
}

CustomDateInput.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  id: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  onEnter: PropTypes.func,
  placeholder: PropTypes.string,
  style: PropTypes.object,
  type: PropTypes.oneOf(["date", "datetime-local", "time"]),
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date),
    PropTypes.object,
  ]),
  variant: PropTypes.oneOf(["default", "compact"]),
};
