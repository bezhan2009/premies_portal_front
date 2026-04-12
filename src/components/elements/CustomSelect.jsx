import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import "../../styles/components/CustomSelect.scss";

const DROPDOWN_MAX_HEIGHT = 260;
const VIEWPORT_OFFSET = 8;

const CustomSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Выберите...",
  error,
  title,
  className = "",
  style = {},
  disabled = false,
  dropdownPosition = "auto",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    if (disabled || options.length === 0) {
      return;
    }

    if (value !== undefined && value !== null && selectedOption) {
      return;
    }

    const firstOptionValue = options[0]?.value;
    if (String(firstOptionValue) !== String(value)) {
      onChange(firstOptionValue);
    }
  }, [disabled, onChange, options, selectedOption, value]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      const clickedInsideContainer = containerRef.current?.contains(event.target);
      const clickedInsideDropdown = dropdownRef.current?.contains(event.target);

      if (!clickedInsideContainer && !clickedInsideDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      return undefined;
    }

    const updateDropdownPosition = () => {
      if (!containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUpward =
        dropdownPosition === "top" ||
        (dropdownPosition === "auto" &&
          spaceBelow < DROPDOWN_MAX_HEIGHT &&
          spaceAbove > spaceBelow);

      const width = Math.min(rect.width, window.innerWidth - VIEWPORT_OFFSET * 2);
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_OFFSET),
        Math.max(VIEWPORT_OFFSET, window.innerWidth - width - VIEWPORT_OFFSET),
      );

      setOpenUpward(shouldOpenUpward);
      setDropdownStyle({
        left,
        width,
        zIndex: 3000,
        ...(shouldOpenUpward
          ? {
              bottom: Math.max(
                window.innerHeight - rect.top + 4,
                VIEWPORT_OFFSET,
              ),
            }
          : {
              top: Math.min(rect.bottom + 4, window.innerHeight - VIEWPORT_OFFSET),
            }),
      });
    };

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [dropdownPosition, isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((previous) => !previous);
    }
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const dropdown = (
    <AnimatePresence>
      {isOpen && (
        <Motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`custom-select-dropdown ${openUpward ? "top" : "bottom"}`}
          style={dropdownStyle}
        >
          <div className="options-list">
            {options.length > 0 ? (
              options.map((option, index) => (
                <Motion.div
                  key={option.value || index}
                  className={`option-item ${String(option.value) === String(value) ? "selected" : ""}`}
                  onClick={() => handleSelect(option.value)}
                  whileHover={{ backgroundColor: "rgba(var(--primary-rgb), 0.08)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  {option.label}
                </Motion.div>
              ))
            ) : (
              <div className="no-options">Нет доступных вариантов</div>
            )}
          </div>
        </Motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div
        className={`custom-select-container ${className} ${error ? "has-error" : ""} ${disabled ? "disabled" : ""}`}
        ref={containerRef}
        style={style}
      >
        {title && <label className="custom-select-label">{title}</label>}

        <div
          className={`custom-select-trigger ${isOpen ? "open" : ""}`}
          onClick={handleToggle}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleToggle();
            }

            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
        >
          <span className={`selected-value ${!selectedOption ? "placeholder" : ""}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <Motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="select-icon"
          >
            <ChevronDown size={18} />
          </Motion.div>
        </div>

        {error && <p className="custom-select-error">{error}</p>}
      </div>

      {typeof document !== "undefined" ? createPortal(dropdown, document.body) : null}
    </>
  );
};

export default CustomSelect;
