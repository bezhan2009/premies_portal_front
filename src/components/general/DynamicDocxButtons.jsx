import React, { useEffect, useState } from "react";
import axios from "axios";
import { ChevronRight, FileDown, Layers, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildDocxPayload,
  normalizeDocxRoles,
  normalizeDocxVariants,
  sanitizeDocxFileName,
} from "../../utils/docxTemplateHelpers";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

const DynamicDocxButtons = ({ page, section, data = {} }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);

  const getRoles = () => {
    const roleIds = normalizeDocxRoles(localStorage.getItem("role_ids"));
    if (roleIds.length > 0) {
      return roleIds;
    }

    return normalizeDocxRoles(localStorage.getItem("role_id"));
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/api/docx/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userRoles = getRoles();
        const filtered = (Array.isArray(res.data) ? res.data : [])
          .map((template) => ({
            ...template,
            parsedRoles: normalizeDocxRoles(template.roles),
            parsedVariants: normalizeDocxVariants(template.variants),
          }))
          .filter((template) => {
            if (template.page !== page || template.section !== section) {
              return false;
            }

            if (template.parsedRoles.length === 0) {
              return true;
            }

            return template.parsedRoles.some((role) => userRoles.includes(role));
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
    setGeneratingId(`${template.ID || template.id}_${variant.name}`);
    setShowVariantModal(false);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}/api/docx/generate`,
        {
          templatePath: variant.templatePath,
          data: buildDocxPayload(variant, data, {}, template.uniqueIdFormat || template.UniqueIdFormat),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      const downloadName = sanitizeDocxFileName(
        variant.outputFileName || `${template.name}_${variant.name}`,
        "generated",
      );

      link.href = url;
      link.setAttribute("download", `${downloadName}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Docx generation error:", error);
      alert("Ошибка при генерации документа. Проверьте шаблон и попробуйте еще раз.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleButtonClick = (template) => {
    const variants = template.parsedVariants || normalizeDocxVariants(template.variants);

    if (variants.length === 0) {
      alert("У данного шаблона нет настроенных вариантов генерации.");
      return;
    }

    if (variants.length === 1) {
      handleGenerate(template, variants[0]);
      return;
    }

    setSelectedTemplate({
      ...template,
      parsedVariants: variants,
    });
    setShowVariantModal(true);
  };

  if (loading) {
    return (
      <div className="docx-runtime-loading">
        <Loader2 className="docx-spin" size={16} />
        <span>Загрузка документов...</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <>
      <div className="docx-runtime-buttons">
        {templates.map((template) => {
          const variants = template.parsedVariants || [];
          const hasMultiple = variants.length > 1;
          const isWorking = generatingId && generatingId.startsWith(`${template.ID || template.id}_`);

          return (
            <button
              key={template.ID || template.id}
              type="button"
              onClick={() => handleButtonClick(template)}
              disabled={Boolean(generatingId)}
              className={`docx-runtime-btn ${hasMultiple ? "docx-runtime-btn--multi" : ""}`}
              title={template.description || template.name}
            >
              {isWorking ? (
                <Loader2 className="docx-spin" size={15} />
              ) : hasMultiple ? (
                <Layers size={15} />
              ) : (
                <FileDown size={15} />
              )}
              <span>{template.name}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {showVariantModal && selectedTemplate && (
          <div className="docx-modal-layer">
            <motion.div
              className="docx-modal docx-modal--compact"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: "spring", duration: 0.35 }}
            >
              <div className="docx-modal__header">
                <div>
                  <span className="docx-eyebrow">Вариант файла</span>
                  <h2>{selectedTemplate.name}</h2>
                  <p>У этого шаблона несколько видов генерации. Выберите нужный DOCX-файл.</p>
                </div>
                <button type="button" className="docx-icon-btn" onClick={() => setShowVariantModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="docx-variant-picker">
                {selectedTemplate.parsedVariants.map((variant, index) => (
                  <button
                    key={`${variant.name}-${index}`}
                    type="button"
                    className="docx-variant-picker__item"
                    onClick={() => handleGenerate(selectedTemplate, variant)}
                  >
                    <span>
                      <strong>{variant.name}</strong>
                      <small>
                        {variant.description || "Без описания"} · ключей: {variant.keys?.length || 0}
                      </small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>

              <div className="docx-modal__footer">
                <button type="button" className="docx-btn docx-btn--secondary" onClick={() => setShowVariantModal(false)}>
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
