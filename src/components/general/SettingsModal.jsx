import React from "react";
import Modal from "./Modal.jsx";
import useThemeStore from "../../store/useThemeStore.js";
import { Sun, Moon, Type, Palette, RotateCcw, Check } from "lucide-react";
import "../../styles/components/SettingsModal.scss";

const PRESET_COLORS = [
  "#e21a1c", // Default Red
  "#2563eb", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#0ea5e9", // Sky
  "#64748b", // Slate
];

const SettingsModal = ({ isOpen, onClose }) => {
  const {
    theme,
    setTheme,
    primaryColor,
    setPrimaryColor,
    fontSize,
    setFontSize,
  } = useThemeStore();

  const handleSizeChange = (e) => {
    setFontSize(parseInt(e.target.value));
  };

  const handleReset = () => {
    setTheme("light");
    setPrimaryColor("#e21a1c");
    setFontSize(16);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Настройки интерфейса">
      <div className="settings-container">
        {/* Theme Settings */}
        <section className="settings-section">
          <div className="section-header">
            <Sun className="icon" size={20} />
            <span>Тема оформления</span>
          </div>
          <div className="theme-options">
            <button
              className={`theme-btn ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme("light")}
            >
              <div className="theme-icon-wrapper">
                <Sun size={20} />
              </div>
              <div className="theme-details">
                <span className="name">Светлая</span>
                <span className="desc">Классический вид</span>
              </div>
              {theme === "light" && <Check className="check-icon" size={16} />}
            </button>
            <button
              className={`theme-btn ${theme === "dark" ? "active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              <div className="theme-icon-wrapper">
                <Moon size={20} />
              </div>
              <div className="theme-details">
                <span className="name">Темная</span>
                <span className="desc">Для ночной работы</span>
              </div>
              {theme === "dark" && <Check className="check-icon" size={16} />}
            </button>
          </div>
        </section>

        {/* Color Settings */}
        <section className="settings-section">
          <div className="section-header">
            <Palette className="icon" size={20} />
            <span>Цвет элементов</span>
          </div>
          <div className="color-options">
            <div className="presets-grid">
              {PRESET_COLORS.map((color) => (
                <div
                  key={color}
                  className={`color-swatch ${primaryColor === color ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setPrimaryColor(color)}
                >
                  {primaryColor === color && <Check size={14} color="white" />}
                </div>
              ))}
              <div className="custom-color-wrapper">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="custom-color-picker"
                  title="Выбрать свой цвет"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Size Settings */}
        <section className="settings-section">
          <div className="section-header">
            <Type className="icon" size={20} />
            <span>Размер интерфейса</span>
          </div>
          <div className="size-control">
            <div className="slider-container">
              <input
                type="range"
                min="12"
                max="22"
                step="1"
                value={fontSize}
                onChange={handleSizeChange}
                className="size-slider"
              />
              <span className="size-label">{fontSize}px</span>
            </div>
          </div>
          <div className="size-presets">
            <button
              onClick={() => setFontSize(14)}
              className={fontSize === 14 ? "active" : ""}
            >
              Убористый
            </button>
            <button
              onClick={() => setFontSize(16)}
              className={fontSize === 16 ? "active" : ""}
            >
              Стандарт
            </button>
            <button
              onClick={() => setFontSize(20)}
              className={fontSize === 20 ? "active" : ""}
            >
              Крупный
            </button>
          </div>
        </section>

        <div className="settings-footer size-presets ">
          <button className="reset-btn" onClick={handleReset}>
            <RotateCcw size={14} /> Сбросить настройки
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
