import React from "react";
import { Check, Moon, Palette, RotateCcw, Settings2, Sun, Type } from "lucide-react";
import useThemeStore from "../../store/useThemeStore.js";
import "./SettingsPage.css";

const PRESET_COLORS = ["#e21a1c", "#c5161d", "#2563eb", "#0f766e", "#7c3aed", "#d97706"];

export default function SettingsPage() {
  const { theme, setTheme, primaryColor, setPrimaryColor, fontSize, setFontSize } = useThemeStore();

  const reset = () => {
    setTheme("light");
    setPrimaryColor("#e21a1c");
    setFontSize(16);
  };

  return (
    <div className="settings-page content-page">
      <header className="settings-page__header">
        <div className="settings-page__heading-icon"><Settings2 size={24} /></div>
        <div>
          <h1>Настройки интерфейса</h1>
          <p>Настройте внешний вид портала под свой рабочий процесс. Изменения сохраняются автоматически.</p>
        </div>
        <button type="button" className="settings-page__reset" onClick={reset}>
          <RotateCcw size={16} /> Сбросить
        </button>
      </header>

      <div className="settings-page__grid">
        <section className="settings-card settings-card--wide">
          <div className="settings-card__title"><Sun size={19} /><div><h2>Тема оформления</h2><p>Комфортный режим для дневной или ночной работы</p></div></div>
          <div className="settings-theme-options">
            {[
              { value: "light", name: "Светлая", description: "Чистый светлый интерфейс", icon: Sun },
              { value: "dark", name: "Тёмная", description: "Меньше нагрузки на глаза", icon: Moon },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button key={option.value} type="button" className={theme === option.value ? "active" : ""} onClick={() => setTheme(option.value)}>
                  <span className="settings-theme-options__preview" data-preview={option.value}><Icon size={22} /></span>
                  <span><strong>{option.name}</strong><small>{option.description}</small></span>
                  {theme === option.value && <Check className="settings-theme-options__check" size={18} />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__title"><Palette size={19} /><div><h2>Акцентный цвет</h2><p>Цвет активных элементов и действий</p></div></div>
          <div className="settings-colors">
            {PRESET_COLORS.map((color) => (
              <button key={color} type="button" aria-label={`Выбрать цвет ${color}`} className={primaryColor === color ? "active" : ""} style={{ backgroundColor: color }} onClick={() => setPrimaryColor(color)}>
                {primaryColor === color && <Check size={17} />}
              </button>
            ))}
            <label className="settings-colors__custom" title="Свой цвет">
              <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
              <Palette size={18} />
            </label>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__title"><Type size={19} /><div><h2>Размер интерфейса</h2><p>Масштаб текста и элементов</p></div></div>
          <div className="settings-size-value">{fontSize}<span> px</span></div>
          <input className="settings-size-slider" type="range" min="13" max="20" step="1" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
          <div className="settings-size-presets">
            {[{ value: 14, label: "Компактный" }, { value: 16, label: "Стандарт" }, { value: 18, label: "Крупный" }].map((item) => (
              <button key={item.value} type="button" className={fontSize === item.value ? "active" : ""} onClick={() => setFontSize(item.value)}>{item.label}</button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
