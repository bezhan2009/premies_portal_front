import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import "../../styles/components/CustomSelect.scss";

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
  const containerRef = useRef(null);
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

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      return;
    }

    const updateDropdownDirection = () => {
      if (!containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUpward =
        dropdownPosition === "top" ||
        (dropdownPosition === "auto" &&
          spaceBelow < 260 &&
          spaceAbove > spaceBelow);

      setOpenUpward(shouldOpenUpward);
    };

    updateDropdownDirection();
    window.addEventListener("resize", updateDropdownDirection);
    window.addEventListener("scroll", updateDropdownDirection, true);

    return () => {
      window.removeEventListener("resize", updateDropdownDirection);
      window.removeEventListener("scroll", updateDropdownDirection, true);
    };
  }, [dropdownPosition, isOpen]);

  const handleToggle = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
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
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <span className={`selected-value ${!selectedOption ? "placeholder" : ""}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="select-icon"
        >
          <ChevronDown size={18} />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: openUpward ? -5 : 5, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`custom-select-dropdown ${openUpward ? "top" : "bottom"}`}
          >
            <div className="options-list">
              {options.length > 0 ? (
                options.map((option, index) => (
                  <motion.div
                    key={option.value || index}
                    className={`option-item ${String(option.value) === String(value) ? "selected" : ""}`}
                    onClick={() => handleSelect(option.value)}
                    whileHover={{ backgroundColor: "rgba(226, 26, 28, 0.08)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {option.label}
                  </motion.div>
                ))
              ) : (
                <div className="no-options">Нет доступных вариантов</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="custom-select-error">{error}</p>}
    </div>
  );
};

export default CustomSelect;
