"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { DynamicDocxButton } from "@/components/next/frontovik/dynamic-docx-button";

export function FrontovikAbsSearchPage() {
  const [accountNumber, setAccountNumber] = useState("");
  const [clientName, setClientName] = useState("");

  return (
    <div className="frontovik-page">
      <section className="frontovik-hero">
        <div>
          <span className="page-eyebrow"><Search size={14} /> Фронтовик</span>
          <h1>Поиск клиента в АБС</h1>
          <p>Рабочая область фронтовика для поиска клиента и формирования выписок по счёту.</p>
        </div>
      </section>

      <section className="frontovik-grid">
        <article className="panel frontovik-search-card">
          <span className="card-overline">Данные для выписки</span>
          <label>
            <span>Номер счёта</span>
            <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Введите номер счёта" />
          </label>
          <label>
            <span>Клиент</span>
            <input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="ФИО клиента, если нужно для шаблона" />
          </label>
        </article>

        <DynamicDocxButton accountNumber={accountNumber} clientName={clientName} />
      </section>
    </div>
  );
}
