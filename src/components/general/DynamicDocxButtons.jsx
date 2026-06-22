import React, { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, FileDown, CheckCircle, AlertCircle, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

const DynamicDocxButtons = ({ page, section, data = {} }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);

  // Load user roles
  const getRoles = () => {
    try {
      const roleIdsJson = localStorage.getItem("role_ids");
      if (roleIdsJson) {
        const parsed = JSON.parse(roleIdsJson);
        if (Array.isArray(parsed)) {
          return parsed.map((id) => Number(id));
        }
      }
    } catch (e) {
      console.error("Error reading roles:", e);
    }
    return [];
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/api/docx/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Filter templates based on page, section, and user roles
        const userRoles = getRoles();
        const filtered = res.data.filter((tmpl) => {
          // Check page
          if (tmpl.page !== page) return false;
          // Check section
          if (tmpl.section !== section) return false;
          
          // Parse roles
          let allowedRoles = [];
          if (tmpl.roles) {
            if (typeof tmpl.roles === "string") {
              try { allowedRoles = JSON.parse(tmpl.roles); } catch(e) { }
            } else if (Array.isArray(tmpl.roles)) {
              allowedRoles = tmpl.roles;
            }
          }
          
          // If no roles specified, assume public, else check overlap
          if (allowedRoles.length === 0) return true;
          return allowedRoles.some((role) => userRoles.includes(role));
        });

        setTemplates(filtered);
      } catch (err) {
        console.error("Failed to load docx templates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [page, section]);

  const handleGenerate = async (template, variant) => {
    setGeneratingId(`${template.ID}_${variant.name}`);
    setShowVariantModal(false);

    // Compile payload
    const finalPayload = {};
    // Fill all mapped keys with data or default fallback
    if (Array.isArray(variant.keys)) {
      variant.keys.forEach((k) => {
        const val = data[k.key];
        // Use default value if null, undefined, or empty string
        finalPayload[k.key] = (val !== undefined && val !== null && val !== "") ? val : (k.defaultValue || "");
      });
    }

    // Add general system keys if not already provided
    if (!finalPayload["system.currentDate"]) {
      finalPayload["system.currentDate"] = new Date().toLocaleDateString("ru-RU");
    }
    if (!finalPayload["system.currentTime"]) {
      finalPayload["system.currentTime"] = new Date().toLocaleTimeString("ru-RU");
    }

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}/api/docx/generate`,
        {
          templatePath: variant.templatePath,
          data: finalPayload,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      // Output name based on template and variant names
      const downloadName = `${template.name}_${variant.name.replace(/\s+/g, "_")}.docx`;
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Docx generation error:", error);
      alert("Ошибка при генерации документа. Попробуйте еще раз.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleButtonClick = (template) => {
    // Parse variants
    let variants = [];
    if (template.variants) {
      if (typeof template.variants === "string") {
        try { variants = JSON.parse(template.variants); } catch (e) {}
      } else if (Array.isArray(template.variants)) {
        variants = template.variants;
      }
    }

    if (variants.length === 0) {
      alert("У данного шаблона нет настроенных вариантов генерации.");
      return;
    }

    if (variants.length === 1) {
      // Generate immediately if there's only 1 variant
      handleGenerate(template, variants[0]);
    } else {
      // Show modal to choose variant
      setSelectedTemplate(template);
      setShowVariantModal(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span>Загрузка доступных документов...</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return null; // Don't render anything if no templates are configured
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center" style={{ animation: "fadeIn 0.2s ease" }}>
        {templates.map((tmpl) => {
          let parsedVariants = [];
          try {
            parsedVariants = typeof tmpl.variants === "string" ? JSON.parse(tmpl.variants) : tmpl.variants;
          } catch(e) {}
          
          const isMultiple = Array.isArray(parsedVariants) && parsedVariants.length > 1;
          const isWorking = generatingId && generatingId.startsWith(`${tmpl.ID}_`);

          return (
            <button
              key={tmpl.ID}
              onClick={() => handleButtonClick(tmpl)}
              disabled={!!generatingId}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer ${
                isMultiple
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-[1px] active:translate-y-0`}
              title={tmpl.description}
            >
              {isWorking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isMultiple ? (
                <Layers className="w-3.5 h-3.5" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{tmpl.name}</span>
            </button>
          );
        })}
      </div>

      {/* Variant Selection Modal */}
      <AnimatePresence>
        {showVariantModal && selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Выберите вариант генерации
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Для документа <strong>{selectedTemplate.name}</strong> доступно несколько видов генерации. Пожалуйста, выберите нужный:
                </p>

                <div className="space-y-3">
                  {(typeof selectedTemplate.variants === "string"
                    ? JSON.parse(selectedTemplate.variants)
                    : selectedTemplate.variants
                  ).map((variant, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleGenerate(selectedTemplate, variant)}
                      className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 group flex justify-between items-center cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm group-hover:text-blue-600">
                          {variant.name}
                        </span>
                        <div className="text-xs text-slate-400 mt-1">
                          Ключей для замены: {Array.isArray(variant.keys) ? variant.keys.length : 0}
                        </div>
                      </div>
                      <FileDown className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-[2px] transition-all" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 flex justify-end">
                <button
                  onClick={() => setShowVariantModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-xl transition-all cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DynamicDocxButtons;
