import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { ChevronRight, FileDown, Layers, Loader2, X, FileText, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildDocxPayload,
  normalizeDocxRoles,
  normalizeDocxVariants,
  sanitizeDocxFileName,
  evaluateDocxTemplateConditions,
} from "../../utils/docxTemplateHelpers";
import { fetchCreditGraphs } from "../../api/ABS_frotavik/getUserCredits";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

const DynamicDocxButtons = ({ page, section, data = {} }) => {
  const [allTemplates, setAllTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [paramsModal, setParamsModal] = useState({
    isOpen: false,
    variant: null,
    template: null,
    type: null,
    fromDate: "",
    toDate: "",
  });

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

        setAllTemplates(filtered);
      } catch (err) {
        console.error("Failed to load docx templates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [page, section]);

  const templates = useMemo(() => {
    return allTemplates.filter((template) => {
      return evaluateDocxTemplateConditions(
        template.conditions || template.Conditions,
        data,
        template.uniqueIdFormat || template.UniqueIdFormat
      );
    });
  }, [allTemplates, data]);

  const handleGenerate = async (template, variant, format = "pdf", skipParamsCheck = false) => {
    if (!skipParamsCheck) {
      const hasTransactions = variant.keys.some((k) => {
        const sk = k.systemKey || '';
        return sk.startsWith("transactions.") || (sk.startsWith("eval:") && sk.includes("transactions"));
      });
      const hasSchedule = variant.keys.some((k) => {
        const sk = k.systemKey || '';
        return sk.startsWith("schedule.") || (sk.startsWith("eval:") && sk.includes("schedule"));
      });

      // Skip params modal if schedule data is already available in the data prop
      const scheduleAlreadyAvailable = hasSchedule && Array.isArray(data.schedule) && data.schedule.length > 0;
      const needsParams = hasTransactions || (hasSchedule && !scheduleAlreadyAvailable);

      if (needsParams) {
        setParamsModal({
          isOpen: true,
          variant,
          template,
          type: hasTransactions ? "transactions" : "schedule",
          fromDate: "",
          toDate: "",
        });
        setShowVariantModal(false);
        return;
      }
    }

    setGeneratingId(`${template.ID || template.id}_${variant.name}`);
    setShowVariantModal(false);
    setParamsModal((prev) => ({ ...prev, isOpen: false }));

    console.log("=== DOCX Generation Debug ===");
    console.log("Template:", template);
    console.log("Variant:", variant);
    console.log("Input data passed to button:", data);

    let finalData = { ...data };

    // Fetch dynamic data if required
    try {
      if (paramsModal.type === "transactions") {
        const cardId = finalData.card?.cardId || finalData.cardId;
        if (cardId) {
          const procUrl = import.meta.env.VITE_BACKEND_PROCESSING_URL || "http://10.64.20.84:5003";
          const res = await axios.get(`${procUrl}/api/Transactions/by-cards`, {
            params: {
              cardIds: cardId,
              fromDate: paramsModal.fromDate || undefined,
              toDate: paramsModal.toDate || undefined,
            },
          });
          finalData.transactions = res.data?.data || res.data || [];
        }
      } else if (paramsModal.type === "schedule") {
        // Use schedule data already in the data prop if available (e.g. from CreditDetails page)
        if (Array.isArray(finalData.schedule) && finalData.schedule.length > 0) {
          console.log("Schedule data already present in data prop, using it directly:", finalData.schedule.length, "items");
        } else {
          // Fallback: try to fetch schedule from API
          const creditId = finalData["credit.referenceId"] || finalData.credit?.referenceId || finalData.creditId;
          if (creditId) {
            const graphs = await fetchCreditGraphs(creditId);
            const scheduleMap = {};
            if (Array.isArray(graphs)) {
              graphs.forEach(g => {
                const date = g.PaymentDate;
                if (!date) return;
                if (!scheduleMap[date]) {
                  scheduleMap[date] = { date, amount: 0, interest: 0, principal: 0, status: g.Status, type: g.Type };
                }
                const amt = Number(g.Amount || 0);
                if (g.Code === "CR_PD") {
                  scheduleMap[date].principal += amt;
                  scheduleMap[date].amount += amt;
                } else if (g.Code === "CR_INTER") {
                  scheduleMap[date].interest += amt;
                  scheduleMap[date].amount += amt;
                }
                if (g.Status && g.Status !== "Выплачен") scheduleMap[date].status = g.Status;
              });
            }
            const scheduleList = Object.values(scheduleMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            finalData.schedule = scheduleList;
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch dynamic docx table data:", err);
    }

    const finalPayload = buildDocxPayload(variant, finalData, {}, template.uniqueIdFormat || template.UniqueIdFormat);
    console.log("Built Final Payload:", finalPayload);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}/api/docx/generate`,
        {
          templatePath: variant.templatePath,
          templateId: template.ID || template.id,
          data: finalPayload,
          format: format,
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
      link.setAttribute("download", `${downloadName}.${format}`);
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

  const handleButtonClick = (template, format = "pdf") => {
    const variants = template.parsedVariants || normalizeDocxVariants(template.variants);

    if (variants.length === 0) {
      alert("У данного шаблона нет настроенных вариантов генерации.");
      return;
    }

    if (variants.length === 1) {
      handleGenerate(template, variants[0], format);
      return;
    }

    setSelectedFormat(format);
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

  const userRoles = getRoles();

  return (
    <>
      <div className="docx-runtime-buttons">
        {templates.map((template) => {
          const variants = template.parsedVariants || [];
          const hasMultiple = variants.length > 1;
          const isWorking = generatingId && generatingId.startsWith(`${template.ID || template.id}_`);

          const pdfRoles = normalizeDocxRoles(template.pdfRoles || template.PdfRoles);
          const docxRoles = normalizeDocxRoles(template.docxRoles || template.DocxRoles);
          
          const canPdf = pdfRoles.length === 0 || pdfRoles.some(r => userRoles.includes(r));
          const canDocx = docxRoles.length === 0 || docxRoles.some(r => userRoles.includes(r));

          if (!canPdf && !canDocx) return null;

          return (
            <div key={template.ID || template.id} className="docx-generate-group" style={{display: "inline-flex", marginRight: "8px", verticalAlign: "middle", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)"}}>
              {canPdf && (
                <button
                  type="button"
                  onClick={() => handleButtonClick(template, "pdf")}
                  className="docx-runtime-btn"
                  disabled={Boolean(generatingId)}
                  title={template.description || template.name}
                  style={{ borderTopRightRadius: canDocx ? 0 : "8px", borderBottomRightRadius: canDocx ? 0 : "8px", borderRight: canDocx ? "1px solid rgba(255,255,255,0.2)" : "none", margin: 0, boxShadow: "none" }}
                >
                  {isWorking ? (
                    <Loader2 className="docx-spin" size={15} />
                  ) : hasMultiple ? (
                    <Layers size={15} />
                  ) : (
                    <FileText size={15} />
                  )}
                  <span>{template.name} {canDocx ? "" : "(PDF)"}</span>
                </button>
              )}
              {canDocx && (
                <button
                  type="button"
                  onClick={() => handleButtonClick(template, "docx")}
                  className="docx-runtime-btn"
                  disabled={Boolean(generatingId)}
                  style={{ borderTopLeftRadius: canPdf ? 0 : "8px", borderBottomLeftRadius: canPdf ? 0 : "8px", paddingLeft: canPdf ? "10px" : "15px", paddingRight: canPdf ? "10px" : "15px", margin: 0, boxShadow: "none", backgroundColor: "#334155" }}
                  title="Скачать в DOCX"
                >
                  <Download size={15} />
                  <span style={{ fontSize: "11px", marginLeft: "2px" }}>DOCX</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showVariantModal && selectedTemplate && (
            <motion.div
              className="docx-modal-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
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
                      onClick={() => handleGenerate(selectedTemplate, variant, selectedFormat)}
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {paramsModal.isOpen && paramsModal.template && (
            <motion.div
              className="docx-modal-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="docx-modal docx-modal--compact"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: "spring", duration: 0.35 }}
              >
                <div className="docx-modal__header">
                  <div>
                    <span className="docx-eyebrow">Дополнительные параметры</span>
                    <h2>{paramsModal.template.name}</h2>
                    <p>
                      {paramsModal.type === "transactions" 
                        ? "Для этого шаблона необходимо указать период транзакций." 
                        : "Для этого шаблона необходимо указать период графика платежей."}
                    </p>
                  </div>
                  <button type="button" className="docx-icon-btn" onClick={() => setParamsModal(prev => ({ ...prev, isOpen: false }))}>
                    <X size={18} />
                  </button>
                </div>

                <div className="docx-variant-picker" style={{ padding: "1.5rem 1rem" }}>
                  <div className="docx-form-group">
                    <label>Дата начала (От)</label>
                    <input 
                      type="date" 
                      className="docx-form-input"
                      value={paramsModal.fromDate}
                      onChange={(e) => setParamsModal(prev => ({ ...prev, fromDate: e.target.value }))}
                    />
                  </div>
                  <div className="docx-form-group">
                    <label>Дата конца (До)</label>
                    <input 
                      type="date" 
                      className="docx-form-input"
                      value={paramsModal.toDate}
                      onChange={(e) => setParamsModal(prev => ({ ...prev, toDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="docx-modal__footer">
                  <button type="button" className="docx-btn docx-btn--secondary" onClick={() => setParamsModal(prev => ({ ...prev, isOpen: false }))}>
                    Отмена
                  </button>
                  <button 
                    type="button" 
                    className="docx-btn docx-btn--primary" 
                    onClick={() => handleGenerate(paramsModal.template, paramsModal.variant, selectedFormat, true)}
                  >
                    Сгенерировать
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default DynamicDocxButtons;
