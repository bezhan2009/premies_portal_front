"use client";

import { CalendarDays, Download, FileText, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

interface DocxTemplateVariant {
  name?: string;
  templatePath?: string;
  path?: string;
}

interface DocxTemplate {
  ID?: number;
  id?: number;
  name?: string;
  page?: string;
  section?: string;
  templatePath?: string;
  variants?: DocxTemplateVariant[] | string;
}

interface DynamicDocxButtonProps {
  accountNumber: string;
  clientName?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthAgo(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 10);
}

function parseVariants(value: DocxTemplate["variants"]): DocxTemplateVariant[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pickStatementTemplate(templates: DocxTemplate[]): DocxTemplate | null {
  return templates.find((template) => {
    const haystack = `${template.name || ""} ${template.page || ""} ${template.section || ""}`.toLocaleLowerCase("ru");
    return haystack.includes("frontovik") || haystack.includes("abs") || haystack.includes("выписк") || haystack.includes("фронтов");
  }) || templates[0] || null;
}

function templatePath(template: DocxTemplate): string {
  const direct = template.templatePath;
  if (direct) return direct;
  const firstVariant = parseVariants(template.variants)[0];
  return firstVariant?.templatePath || firstVariant?.path || "";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DynamicDocxButton({ accountNumber, clientName }: DynamicDocxButtonProps) {
  const [dateFrom, setDateFrom] = useState(monthAgo());
  const [dateTo, setDateTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canGenerate = useMemo(() => {
    return accountNumber.trim().length > 0 && dateFrom.trim().length > 0 && dateTo.trim().length > 0 && dateFrom <= dateTo;
  }, [accountNumber, dateFrom, dateTo]);

  async function generateDocx() {
    if (!canGenerate) {
      setMessage("Укажите счёт и корректный период выписки.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const templatesResponse = await fetch("/api/backend/api/docx/templates", { headers: { Accept: "application/json" } });
      const templates = await templatesResponse.json().catch(() => []) as DocxTemplate[];
      const template = pickStatementTemplate(Array.isArray(templates) ? templates : []);
      if (!template) throw new Error("Не найден шаблон DOCX для выписки.");

      const path = templatePath(template);
      const response = await fetch("/api/backend/api/docx/generate", {
        method: "POST",
        headers: {
          Accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: template.ID ?? template.id,
          templatePath: path,
          data: {
            account: accountNumber.trim(),
            accountNumber: accountNumber.trim(),
            clientName: clientName || "",
            dateFrom,
            dateTo,
            dt1: dateFrom,
            dt2: dateTo,
          },
        }),
      });

      if (!response.ok) {
        const problem = await response.text().catch(() => "");
        throw new Error(problem || "Не удалось сформировать выписку.");
      }

      const blob = await response.blob();
      downloadBlob(blob, `statement-${accountNumber.trim()}-${dateFrom}-${dateTo}.docx`);
      setMessage("Выписка сформирована.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сформировать выписку.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dynamic-docx-card">
      <div className="dynamic-docx-head">
        <span className="dynamic-docx-icon"><FileText size={19} /></span>
        <div>
          <h2>Выписка по счёту</h2>
          <p>Период отображается аккуратно: дата от слева, дата до справа.</p>
        </div>
      </div>

      <div className="docx-date-range">
        <label className="docx-date-field is-from">
          <span><CalendarDays size={14} /> От</span>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="docx-date-field is-to">
          <span>До <CalendarDays size={14} /></span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
      </div>

      <div className="docx-period-preview">
        <span>Период</span>
        <strong>{dateFrom || "—"} — {dateTo || "—"}</strong>
      </div>

      {message && <p className="dynamic-docx-message">{message}</p>}

      <button type="button" className="primary-button full-button" onClick={() => void generateDocx()} disabled={loading || !canGenerate}>
        {loading ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
        Сформировать DOCX
      </button>
    </section>
  );
}
