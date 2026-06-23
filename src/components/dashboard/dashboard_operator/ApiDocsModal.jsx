import React, { useRef, useState, useMemo } from "react";
import { X, Download, FileJson, Link as LinkIcon, Info } from "lucide-react";
import html2pdf from "html2pdf.js";

const ApiDocsModal = ({ isOpen, onClose, template }) => {
  const contentRef = useRef(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  const variants = template?.parsedVariants || (typeof template?.variants === 'string' ? JSON.parse(template.variants) : template?.variants) || [];
  const activeVariant = variants[selectedVariantIdx] || null;

  const jsonExample = useMemo(() => {
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
      templatePath: activeVariant.templatePath || "путь/к/шаблону.docx",
      data: dataObj
    };
  }, [activeVariant]);

  const handleDownloadPdf = () => {
    const element = contentRef.current;
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `API_Doc_${template.name}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (!isOpen || !template) return null;

  return (
    <div className="docx-modal-overlay">
      <div className="docx-modal docx-modal--large" style={{ maxWidth: "800px" }}>
        <div className="docx-modal__header">
          <h3>Документация API: {template.name}</h3>
          <button className="docx-modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="docx-modal__content" style={{ maxHeight: "70vh", overflowY: "auto", padding: "20px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: 600, fontSize: "14px" }}>Вариант генерации:</span>
              <select 
                value={selectedVariantIdx} 
                onChange={e => setSelectedVariantIdx(Number(e.target.value))}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                {variants.map((v, idx) => (
                  <option key={idx} value={idx}>{v.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleDownloadPdf}
              className="docx-btn docx-btn--primary"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Download size={16} />
              Скачать PDF
            </button>
          </div>

          <div ref={contentRef} style={{ padding: "20px", background: "#fff", color: "#1e293b", fontFamily: "sans-serif" }}>
            <h1 style={{ fontSize: "24px", marginBottom: "8px", color: "#0f172a" }}>Спецификация API для генерации</h1>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>
              Шаблон: <strong>{template.name}</strong> <br/>
              Описание: {template.description || "Нет описания"}
            </p>

            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <LinkIcon size={18} /> Эндпоинт
              </h2>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: "14px" }}>
                <span style={{ color: "#2563eb", fontWeight: "bold" }}>POST</span> http://10.65.10.20:7575/api/docx/generate
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Info size={18} /> Заголовки (Headers)
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "10px", borderBottom: "2px solid #cbd5e1" }}>Ключ</th>
                    <th style={{ padding: "10px", borderBottom: "2px solid #cbd5e1" }}>Значение</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "10px", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>Authorization</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Bearer &lt;token&gt;</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>Content-Type</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #e2e8f0" }}>application/json</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileJson size={18} /> Пример запроса (JSON Body)
              </h2>
              <p style={{ fontSize: "14px", color: "#475569", marginBottom: "12px" }}>
                В объекте <code>data</code> необходимо передать все ключи, которые используются в шаблоне. Для списков и таблиц передавайте массивы.
              </p>
              <pre style={{ background: "#1e293b", color: "#f8fafc", padding: "16px", borderRadius: "8px", overflowX: "auto", fontSize: "13px", lineHeight: "1.5" }}>
                {JSON.stringify(jsonExample, null, 2)}
              </pre>
            </div>
            
            <div style={{ fontSize: "13px", color: "#94a3b8", borderTop: "1px dashed #cbd5e1", paddingTop: "12px", marginTop: "40px" }}>
              Сгенерировано автоматически системой управления шаблонами DOCX.
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ApiDocsModal;
