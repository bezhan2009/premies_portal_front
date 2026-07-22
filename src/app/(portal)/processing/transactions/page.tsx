import Link from "next/link";

export const metadata = {
  title: "Процессинговые транзакции | Activ Daily",
};

export default function ProcessingTransactionsIndexPage() {
  return (
    <div className="module-page">
      <section className="module-hero">
        <div className="module-hero-copy">
          <span className="page-eyebrow">Процессинг</span>
          <h1>Выписки из ПЦ</h1>
          <p>Откройте страницу выписки, указав cardId или список cardId через запятую в адресе.</p>
          <div className="module-status-row">
            <span>Пример: /processing/transactions/100001942821,100001962708</span>
          </div>
          <Link className="primary-button" href="/processing/transactions/100001942821">Открыть пример</Link>
        </div>
      </section>
    </div>
  );
}
