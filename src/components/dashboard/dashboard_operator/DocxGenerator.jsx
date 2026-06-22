import React, { useState, useEffect } from "react";
import axios from "axios";
import { docxDictionary } from "../../../utils/docxDictionary";
import { 
  Plus, Trash2, Edit2, Download, Upload, X, Check, FileText, 
  ChevronRight, Info, Shield, MapPin, Layers, Search, Play, ArrowLeft, PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

// Standard roles list from the system
const SYSTEM_ROLES = [
  { id: 3, name: "Оператор" },
  { id: 17, name: "Фронтовик" },
  { id: 33, name: "Комплайнс" },
  { id: 8, name: "Кредитник" },
  { id: 6, name: "Карточник" },
  { id: 5, name: "Директор" },
  { id: 9, name: "Председатель" },
  { id: 10, name: "Агент по картам" },
  { id: 11, name: "Агент по кредитам" },
];

const PAGES_LIST = [
  { id: "CreditDetails", name: "Детали кредита (CreditDetails)" },
  { id: "ClientDetails", name: "Детали клиента (ClientDetails)" },
  { id: "CardDetails", name: "Детали карты (CardDetails)" },
  { id: "VsmSearch", name: "Поиск по VSM (VsmSearch)" },
];

const DocxGenerator = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Edit State
  const [editorMode, setEditorMode] = useState(null); // 'add' | 'edit' | null (dashboard)
  const [activeTemplate, setActiveTemplate] = useState(null);
  
  // UI Panels
  const [searchQuery, setSearchQuery] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);
  const [testTemplate, setTestTemplate] = useState(null);
  const [testVariantIdx, setTestVariantIdx] = useState(0);
  const [testInputs, setTestInputs] = useState({});
  const [isTestGenerating, setIsTestGenerating] = useState(false);

  // Key selector drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState(null);

  // Load templates
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await axios.get(`${API_URL}/api/docx/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
      alert("Не удалось загрузить шаблоны");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Form Initial State Helper
  const getInitialFormState = () => ({
    name: "",
    description: "",
    page: "CreditDetails",
    section: "Документы и график платежей",
    roles: [3, 17], // default operators and frontovik
    variants: [
      {
        name: "Основной вариант",
        templatePath: "",
        keys: []
      }
    ]
  });

  const handleStartAdd = () => {
    setActiveTemplate(getInitialFormState());
    setEditorMode("add");
  };

  const handleStartEdit = (tmpl) => {
    let roles = [];
    let variants = [];

    try {
      roles = typeof tmpl.roles === "string" ? JSON.parse(tmpl.roles) : tmpl.roles || [];
    } catch (e) {
      roles = [];
    }

    try {
      variants = typeof tmpl.variants === "string" ? JSON.parse(tmpl.variants) : tmpl.variants || [];
    } catch (e) {
      variants = [];
    }

    setActiveTemplate({
      ...tmpl,
      roles,
      variants
    });
    setEditorMode("edit");
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот шаблон?")) return;
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      await axios.delete(`${API_URL}/api/docx/templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadTemplates();
    } catch (err) {
      console.error(err);
      alert("Ошибка при удалении шаблона");
    }
  };

  // Upload template handler for a specific variant
  const handleUploadFile = async (variantIndex, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("template", file);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await axios.post(`${API_URL}/api/docx/templates/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const updated = { ...activeTemplate };
      updated.variants[variantIndex].templatePath = res.data.url;
      setActiveTemplate(updated);
    } catch (err) {
      console.error(err);
      alert("Ошибка при загрузке файла");
    }
  };

  // Add/Remove variants
  const addVariant = () => {
    const updated = { ...activeTemplate };
    updated.variants.push({
      name: `Вариант ${updated.variants.length + 1}`,
      templatePath: "",
      keys: []
    });
    setActiveTemplate(updated);
  };

  const removeVariant = (idx) => {
    if (activeTemplate.variants.length <= 1) {
      alert("Шаблон должен содержать как минимум один вариант генерации");
      return;
    }
    const updated = { ...activeTemplate };
    updated.variants.splice(idx, 1);
    setActiveTemplate(updated);
  };

  // Key mapping operations
  const removeKey = (variantIdx, keyIdx) => {
    const updated = { ...activeTemplate };
    updated.variants[variantIdx].keys.splice(keyIdx, 1);
    setActiveTemplate(updated);
  };

  const updateKeyDefaultValue = (variantIdx, keyIdx, val) => {
    const updated = { ...activeTemplate };
    updated.variants[variantIdx].keys[keyIdx].defaultValue = val;
    setActiveTemplate(updated);
  };

  const openKeyDrawer = (variantIdx) => {
    setActiveVariantIndex(variantIdx);
    setShowDrawer(true);
  };

  const selectKeyFromDrawer = (keyName) => {
    const updated = { ...activeTemplate };
    const variant = updated.variants[activeVariantIndex];
    
    if (variant.keys.some((k) => k.key === keyName)) {
      alert("Этот ключ уже добавлен в данный вариант");
      return;
    }

    variant.keys.push({
      key: keyName,
      defaultValue: ""
    });
    
    setActiveTemplate(updated);
    setShowDrawer(false);
  };

  // Save template configuration
  const handleSaveTemplate = async () => {
    if (!activeTemplate.name.trim()) return alert("Укажите название шаблона");
    
    for (let i = 0; i < activeTemplate.variants.length; i++) {
      const v = activeTemplate.variants[i];
      if (!v.name.trim()) return alert(`Заполните название варианта #${i + 1}`);
      if (!v.templatePath) return alert(`Загрузите файл шаблона для варианта "${v.name}"`);
    }

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const payload = {
        ...activeTemplate,
        roles: JSON.stringify(activeTemplate.roles),
        variants: JSON.stringify(activeTemplate.variants)
      };

      if (editorMode === "add") {
        await axios.post(`${API_URL}/api/docx/templates`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.put(`${API_URL}/api/docx/templates/${activeTemplate.ID}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setEditorMode(null);
      loadTemplates();
    } catch (err) {
      console.error(err);
      alert("Ошибка сохранения шаблона");
    }
  };

  // Testing Generator
  const handleOpenTest = (tmpl) => {
    let variants = [];
    try {
      variants = typeof tmpl.variants === "string" ? JSON.parse(tmpl.variants) : tmpl.variants || [];
    } catch(e) {}

    if (variants.length === 0) {
      alert("У шаблона нет настроенных вариантов для теста");
      return;
    }

    setTestTemplate(tmpl);
    setTestVariantIdx(0);
    
    const initialInputs = {};
    if (Array.isArray(variants[0]?.keys)) {
      variants[0].keys.forEach((k) => {
        initialInputs[k.key] = k.defaultValue || "";
      });
    }
    setTestInputs(initialInputs);
    setShowTestModal(true);
  };

  const handleTestVariantChange = (idx) => {
    setTestVariantIdx(idx);
    let variants = [];
    try {
      variants = typeof testTemplate.variants === "string" ? JSON.parse(testTemplate.variants) : testTemplate.variants || [];
    } catch(e) {}

    const initialInputs = {};
    if (variants[idx]?.keys) {
      variants[idx].keys.forEach((k) => {
        initialInputs[k.key] = k.defaultValue || "";
      });
    }
    setTestInputs(initialInputs);
  };

  const handleRunTestGenerate = async () => {
    setIsTestGenerating(true);
    let variants = [];
    try {
      variants = typeof testTemplate.variants === "string" ? JSON.parse(testTemplate.variants) : testTemplate.variants || [];
    } catch(e) {}
    
    const variant = variants[testVariantIdx];
    
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}/api/docx/generate`,
        {
          templatePath: variant.templatePath,
          data: testInputs,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `TEST_${testTemplate.name}_${variant.name}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert("Ошибка генерации тестового файла");
    } finally {
      setIsTestGenerating(false);
    }
  };

  const filteredTemplates = templates.filter(tmpl => 
    tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tmpl.page.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="block_info_prems content-page" style={{ textAlign: "left", width: "100%", padding: "10px 0" }}>
      
      {/* 1. Dashboard View */}
      {editorMode === null && (
        <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-color)]" style={{ letterSpacing: "-0.5px" }}>
                Шаблоны документов (DOCX)
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Создание и редактирование печатных форм Word для автоматической генерации из разделов системы.
              </p>
            </div>
            <button
              onClick={handleStartAdd}
              style={{ background: "linear-gradient(135deg, #c8102e 0%, #a00d24 100%)" }}
              className="flex items-center gap-2 text-white font-bold px-5 py-3.5 rounded-2xl shadow-md hover:brightness-105 hover:-translate-y-[1px] active:translate-y-0 transition-all cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Добавить шаблон</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Поиск по названию шаблона или страницы..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:border-[#c8102e] text-sm text-[var(--text-color)] placeholder:text-[var(--text-secondary)] transition-all"
            />
          </div>

          {/* Template Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
              <div className="w-10 h-10 border-4 border-[#c8102e]/20 border-t-[#c8102e] rounded-full animate-spin mb-4" />
              <p>Загрузка шаблонов...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-12 text-center text-[var(--text-secondary)] shadow-sm">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30 text-[#c8102e]" />
              <p className="text-base font-bold text-[var(--text-color)]">Шаблоны не найдены</p>
              <p className="text-xs mt-1">Добавьте новый шаблон, чтобы настроить автоматическую генерацию.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTemplates.map((tmpl) => {
                let roles = [];
                let variants = [];
                try {
                  roles = typeof tmpl.roles === "string" ? JSON.parse(tmpl.roles) : tmpl.roles || [];
                  variants = typeof tmpl.variants === "string" ? JSON.parse(tmpl.variants) : tmpl.variants || [];
                } catch(e) {}

                return (
                  <motion.div
                    key={tmpl.ID}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h3 className="text-sm font-bold text-[var(--text-color)] line-clamp-1">{tmpl.name}</h3>
                        <span className="bg-[#c8102e]/5 text-[#c8102e] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#c8102e]/10">
                          {variants.length} {variants.length === 1 ? "вариант" : variants.length < 5 ? "варианта" : "вариантов"}
                        </span>
                      </div>
                      
                      <p className="text-xs text-[var(--text-secondary)] mb-6 line-clamp-2 h-8 leading-relaxed">
                        {tmpl.description || "Описание отсутствует"}
                      </p>

                      <div className="space-y-3.5 mb-6 border-t border-[var(--border-color)] pt-4">
                        <div className="flex items-center gap-2.5 text-xs text-[var(--text-color)]">
                          <MapPin className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                          <div>
                            <span className="text-[var(--text-secondary)]">Страница:</span> <code className="bg-[var(--bg-secondary)] px-2 py-0.5 rounded text-[11px] font-mono text-[#c8102e]">{tmpl.page}</code>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-[var(--text-color)]">
                          <Layers className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                          <div>
                            <span className="text-[var(--text-secondary)]">Раздел:</span> <span className="font-semibold">{tmpl.section}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 text-xs text-[var(--text-color)]">
                          <Shield className="w-4 h-4 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[var(--text-secondary)] mr-1 mt-0.5">Доступно:</span>
                            {roles.length === 0 ? (
                              <span className="text-[var(--text-secondary)]">Все роли</span>
                            ) : (
                              roles.map(rid => {
                                const rname = SYSTEM_ROLES.find(r => r.id === rid)?.name || `ID ${rid}`;
                                return (
                                  <span key={rid} className="bg-[var(--bg-secondary)] text-[var(--text-color)] border border-[var(--border-color)] px-2 py-0.5 rounded text-[10px]">
                                    {rname}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 border-t border-[var(--border-color)] pt-4 mt-2">
                      <button
                        onClick={() => handleStartEdit(tmpl)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] text-[var(--text-color)] text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer border border-[var(--border-color)]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Изменить</span>
                      </button>
                      <button
                        onClick={() => handleOpenTest(tmpl)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#c8102e]/5 hover:bg-[#c8102e] text-[#c8102e] hover:text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer border border-[#c8102e]/20"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Тест</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.ID)}
                        className="flex items-center justify-center w-10 bg-red-500/5 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-all cursor-pointer border border-red-500/10"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Builder Mode (Add / Edit Form) */}
      {editorMode !== null && activeTemplate && (
        <div className="max-w-4xl mx-auto" style={{ animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          <button
            onClick={() => setEditorMode(null)}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-color)] font-bold text-sm mb-6 transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Вернуться в список</span>
          </button>

          <h2 className="text-xl font-bold text-[var(--text-color)] mb-6">
            {editorMode === "add" ? "Создание шаблона" : "Настройка шаблона"}
          </h2>

          <div className="space-y-6">
            
            {/* Step 1: Info */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text-color)] border-b border-[var(--border-color)] pb-3 mb-4 flex items-center gap-2">
                <Info className="w-4.5 h-4.5 text-[#c8102e]" />
                <span>Параметры кнопки</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Название кнопки *</label>
                  <input
                    type="text"
                    value={activeTemplate.name}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, name: e.target.value })}
                    placeholder="Например: Справка о кредите"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[#c8102e] text-sm text-[var(--text-color)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Краткое описание</label>
                  <input
                    type="text"
                    value={activeTemplate.description}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, description: e.target.value })}
                    placeholder="Подсказка при наведении на кнопку..."
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[#c8102e] text-sm text-[var(--text-color)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">На какой странице выводить *</label>
                  <select
                    value={activeTemplate.page}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, page: e.target.value })}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[#c8102e] text-sm text-[var(--text-color)] transition-all"
                  >
                    {PAGES_LIST.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Заголовок раздела страницы *</label>
                  <input
                    type="text"
                    value={activeTemplate.section}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, section: e.target.value })}
                    placeholder="Например: Документы и график платежей"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[#c8102e] text-sm text-[var(--text-color)] transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-color)]">
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Роли, которые могут видеть эту кнопку</label>
                <div className="flex flex-wrap gap-2.5">
                  {SYSTEM_ROLES.map((role) => {
                    const isChecked = activeTemplate.roles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          const updatedRoles = isChecked
                            ? activeTemplate.roles.filter(id => id !== role.id)
                            : [...activeTemplate.roles, role.id];
                          setActiveTemplate({ ...activeTemplate, roles: updatedRoles });
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-[#c8102e]/5 border-[#c8102e] text-[#c8102e]"
                            : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-color)] hover:border-[var(--text-secondary)]"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                        <span>{role.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 2: Variants */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="text-sm font-bold text-[var(--text-color)] flex items-center gap-2">
                  <Layers className="w-4.5 h-4.5 text-[#c8102e]" />
                  <span>Варианты шаблона (файлы и ключи замены)</span>
                </h3>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#c8102e] hover:brightness-110 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Добавить вариант</span>
                </button>
              </div>

              {activeTemplate.variants.map((variant, vIdx) => (
                <div key={vIdx} className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Название варианта</label>
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => {
                          const updated = { ...activeTemplate };
                          updated.variants[vIdx].name = e.target.value;
                          setActiveTemplate(updated);
                        }}
                        placeholder="Например: Вариант А: Физические лица"
                        className="bg-transparent border-b border-[var(--border-color)] focus:border-[#c8102e] outline-none font-bold text-sm text-[var(--text-color)] py-1 transition-colors w-full"
                      />
                    </div>
                    {activeTemplate.variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(vIdx)}
                        className="text-red-600 hover:text-white hover:bg-red-600 border border-red-500/20 p-2 rounded-xl transition-all cursor-pointer mt-3"
                        title="Удалить вариант"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* File Upload Section */}
                  <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-color)] rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#c8102e]/5 rounded-xl border border-[#c8102e]/10 text-[#c8102e]">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Шаблон DOCX файла</span>
                        {variant.templatePath ? (
                          <span className="text-xs text-[var(--text-color)] font-mono line-clamp-1 mt-0.5">
                            {variant.templatePath.split("/").pop()}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)] block mt-0.5">Файл не прикреплен</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {variant.templatePath && (
                        <a
                          href={`${API_URL}${variant.templatePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[var(--text-color)] bg-[var(--bg-surface)] hover:border-[var(--text-secondary)] px-3.5 py-2 rounded-xl transition-all border border-[var(--border-color)]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Скачать шаблон</span>
                        </a>
                      )}
                      <label className="flex items-center gap-1.5 text-xs text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer font-bold transform active:scale-[0.98]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{variant.templatePath ? "Изменить файл" : "Прикрепить файл"}</span>
                        <input
                          type="file"
                          accept=".docx"
                          onChange={(e) => handleUploadFile(vIdx, e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Keys mapping */}
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">JSON Ключи в файле</label>
                      <button
                        type="button"
                        onClick={() => openKeyDrawer(vIdx)}
                        className="text-xs font-bold text-[#c8102e] hover:brightness-110 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Выбрать ключи</span>
                      </button>
                    </div>

                    {variant.keys.length === 0 ? (
                      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-6 text-center text-[var(--text-secondary)] text-xs">
                        Не настроено ни одного ключа. Выберите ключи, которые используются в данном файле в формате {"{key.name}"}.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                        {variant.keys.map((k, kIdx) => (
                          <div key={kIdx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col justify-between gap-2.5">
                            <div className="flex justify-between items-center gap-2">
                              <code className="bg-[var(--bg-surface)] border border-[var(--border-color)] px-2.5 py-1 rounded text-[#c8102e] text-xs font-mono font-bold truncate">
                                {k.key}
                              </code>
                              <button
                                type="button"
                                onClick={() => removeKey(vIdx, kIdx)}
                                className="text-red-600 hover:bg-red-500/10 p-1 rounded-lg transition-colors cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Значение по умолчанию (если поле пустое)</label>
                              <input
                                type="text"
                                value={k.defaultValue}
                                onChange={(e) => updateKeyDefaultValue(vIdx, kIdx, e.target.value)}
                                placeholder="Например: Нет данных"
                                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#c8102e] text-xs text-[var(--text-color)]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Save Actions */}
            <div className="flex justify-end gap-3 border-t border-[var(--border-color)] pt-6">
              <button
                type="button"
                onClick={() => setEditorMode(null)}
                className="px-6 py-3.5 rounded-2xl text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                style={{ background: "linear-gradient(135deg, #c8102e 0%, #a00d24 100%)" }}
                className="text-white font-bold px-8 py-3.5 rounded-2xl shadow-md hover:brightness-105 transition-all cursor-pointer transform hover:-translate-y-[1px] active:translate-y-0"
              >
                Сохранить шаблон
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. Slide-out Dictionary Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            
            <div className="absolute inset-y-0 right-0 max-w-full flex">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="w-screen max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-color)] shadow-2xl flex flex-col h-full"
              >
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-color)]">Выберите ключ замены</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Ключ будет добавлен в ваш вариант шаблона</p>
                  </div>
                  <button
                    onClick={() => setShowDrawer(false)}
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {docxDictionary.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-2.5">
                      <h4 className="text-[10px] font-extrabold text-[#c8102e] uppercase tracking-widest border-b border-[var(--border-color)] pb-1.5">
                        {section.category}
                      </h4>
                      <div className="space-y-1.5">
                        {section.keys.map((item, j) => (
                          <button
                            key={j}
                            type="button"
                            onClick={() => selectKeyFromDrawer(item.key)}
                            className="w-full text-left p-3 bg-[var(--bg-secondary)] hover:bg-[#c8102e]/5 border border-[var(--border-color)] hover:border-[#c8102e]/30 rounded-xl transition-all duration-150 flex justify-between items-center group cursor-pointer"
                          >
                            <div className="flex-1 pr-4">
                              <code className="text-[#c8102e] text-xs font-mono font-bold block">
                                {item.key}
                              </code>
                              <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">{item.description}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Test Generation Modal */}
      <AnimatePresence>
        {showTestModal && testTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-color)]">Тестирование генерации</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Макет: {testTemplate.name}</p>
                </div>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                
                {/* Variant Selector */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Вариант шаблона</label>
                  <select
                    value={testVariantIdx}
                    onChange={(e) => handleTestVariantChange(Number(e.target.value))}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[#c8102e] text-sm text-[var(--text-color)]"
                  >
                    {(typeof testTemplate.variants === "string" ? JSON.parse(testTemplate.variants) : testTemplate.variants || []).map((v, idx) => (
                      <option key={idx} value={idx}>{v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Fill mock data */}
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-color)] pb-2">
                    Тестовые переменные
                  </label>
                  
                  {Object.keys(testInputs).length === 0 ? (
                    <div className="text-center py-6 text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                      В данном варианте нет ключей для подстановки.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {Object.keys(testInputs).map((key) => (
                        <div key={key}>
                          <div className="flex justify-between items-center mb-1">
                            <code className="text-[#c8102e] text-xs font-mono font-semibold">{key}</code>
                            <span className="text-[10px] text-[var(--text-secondary)]">
                              {docxDictionary.flatMap(s => s.keys).find(k => k.key === key)?.description || ""}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={testInputs[key]}
                            onChange={(e) => setTestInputs({ ...testInputs, [key]: e.target.value })}
                            placeholder="Напишите тестовое значение..."
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2 outline-none focus:border-[#c8102e] text-xs text-[var(--text-color)]"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div className="bg-[var(--bg-secondary)] px-6 py-4 flex justify-end gap-3 border-t border-[var(--border-color)]">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--border-color)] rounded-xl transition-all cursor-pointer"
                >
                  Закрыть
                </button>
                <button
                  onClick={handleRunTestGenerate}
                  disabled={isTestGenerating}
                  style={{ background: "linear-gradient(135deg, #c8102e 0%, #a00d24 100%)" }}
                  className="text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isTestGenerating ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Сгенерировать</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DocxGenerator;
