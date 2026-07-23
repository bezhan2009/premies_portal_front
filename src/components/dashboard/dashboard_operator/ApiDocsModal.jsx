import React, { useRef, useState, useMemo } from "react";
import { X, Download, FileJson, Link as LinkIcon, Info, CheckCircle2 } from "lucide-react";
import html2pdf from "html2pdf.js";

const ApiDocsModal = ({ isOpen, onClose, template }) => {
  const contentRef = useRef(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  const variants = template?.parsedVariants || (typeof template?.variants === 'string' ? JSON.parse(template.variants) : template?.variants) || [];
  const activeVariant = variants[selectedVariantIdx] || null;

  const simpleJsonExample = useMemo(() => {
    return {
      clientCode: "00012345",
      templateId: template?.ID || template?.id || 1,
      format: "pdf",
      fromDate: "2026-01-01",
      toDate: "2026-12-31"
    };
  }, [template]);

  const customJsonExample = useMemo(() => {
    if (!activeVariant) return {};

    const dataObj = {};
    const keys = Array.isArray(activeVariant.keys) ? activeVariant.keys : [];

    keys.forEach(k => {
      const keyName = k.docxKey || k.systemKey;
      if (!keyName) return;

      const sysKey = k.systemKey || "";
      const isArray = sysKey.includes(".map(") || sysKey.startsWith("transactions.") || sysKey.startsWith("schedule.");

      if (isArray) {
        dataObj[keyName] = ["значение1", "значение2"];
      } else {
        dataObj[keyName] = k.defaultValue || "значение";
      }
    });

    return {
      templateId: template?.ID || template?.id || 1,
      format: "pdf",
      data: dataObj
    };
  }, [activeVariant, template]);

  const handleDownloadPdf = () => {
    const element = contentRef.current;
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `API_Doc_${template?.name || "template"}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (!isOpen || !template) return null;

  return (
    <div className="docx-modal-layer" onClick={onClose}>
      <div 
        className="docx-modal docx-modal--large" 
        style={{ maxWidth: "840px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#ffffff", borderRadius: "16px", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="docx-modal__header" style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>Документация API: {template.name}</h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Генерация PDF / DOCX документов по коду клиента</span>
          </div>
          <button className="docx-icon-btn" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <X size={20} />
          </button>
        </div>
        
        <div className="docx-modal__body" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", background: "#f8fafc", padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>Вариант шаблона:</span>
              <select 
                value={selectedVariantIdx} 
                onChange={e => setSelectedVariantIdx(Number(e.target.value))}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff" }}
              >
                {variants.map((v, idx) => (
                  <option key={idx} value={idx}>{v.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleDownloadPdf}
              className="docx-btn docx-btn--primary"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", fontSize: "13px" }}
            >
              <Download size={16} />
              Скачать спецификацию (PDF)
            </button>
          </div>

          <div ref={contentRef} style={{ padding: "10px", background: "#fff", color: "#1e293b", fontFamily: "sans-serif" }}>
            <h1 style={{ fontSize: "22px", marginBottom: "8px", color: "#0f172a" }}>Спецификация API генерации документа</h1>
            <p style={{ color: "#64748b", marginBottom: "20px", fontSize: "14px", lineHeight: "1.5" }}>
              Шаблон: <strong>{template.name}</strong> <br/>
              Описание: {template.description || "Автоматическая генерация документа по данным Фронтовика."}
            </p>

            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                <LinkIcon size={18} style={{ color: "#2563eb" }} /> HTTP Эндпоинт
              </h2>
              <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: "14px" }}>
                <span style={{ color: "#2563eb", fontWeight: "bold", marginRight: "10px" }}>POST</span>
                <span>/api/docx/generate</span>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                <Info size={18} style={{ color: "#2563eb" }} /> Заголовки (Headers)
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px", borderBottom: "2px solid #cbd5e1" }}>Заголовок</th>
                    <th style={{ padding: "8px 12px", borderBottom: "2px solid #cbd5e1" }}>Значение</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>Authorization</td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>Bearer &lt;token&gt;</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>Content-Type</td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>application/json</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                <CheckCircle2 size={18} style={{ color: "#16a34a" }} /> Способ 1 (Рекомендуемый): По коду клиента (clientCode)
              </h2>
              <p style={{ fontSize: "13.5px", color: "#475569", marginBottom: "12px", lineHeight: 1.5 }}>
                Передайте параметр <code>clientCode</code>. Система автоматически соберет все данные из Фронтовика (персональные данные, счета, карты, кредиты, графики платежей, депозиты, выписки транзакций), подставит в шаблон, сгенерирует и вернет PDF-файл.
              </p>
              <pre style={{ background: "#0f172a", color: "#f8fafc", padding: "16px", borderRadius: "10px", overflowX: "auto", fontSize: "13px", lineHeight: "1.5" }}>
                {JSON.stringify(simpleJsonExample, null, 2)}
              </pre>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                <FileJson size={18} style={{ color: "#64748b" }} /> Способ 2: Кастомные данные (data object)
              </h2>
              <p style={{ fontSize: "13.5px", color: "#475569", marginBottom: "12px", lineHeight: 1.5 }}>
                Если необходимо передать собственные значения полей напрямую, передайте объект <code>data</code>:
              </p>
              <pre style={{ background: "#1e293b", color: "#f8fafc", padding: "16px", borderRadius: "10px", overflowX: "auto", fontSize: "13px", lineHeight: "1.5" }}>
                {JSON.stringify(customJsonExample, null, 2)}
              </pre>
            </div>
            
            <div style={{ fontSize: "12px", color: "#94a3b8", borderTop: "1px dashed #cbd5e1", paddingTop: "12px", marginTop: "30px" }}>
              Сгенерировано системой генерации документов DOCX/PDF.
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ApiDocsModal;
