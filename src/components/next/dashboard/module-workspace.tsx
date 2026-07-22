import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleGauge, LockKeyhole, Sparkles } from "lucide-react";
import { concretePath, type PortalRoute } from "@/config/next-navigation";

export function ModuleWorkspace({ route, related }: { route: PortalRoute; related: PortalRoute[] }) {
  return (
    <div className="module-page">
      <section className="module-hero">
        <div className="module-hero-copy">
          <span className="page-eyebrow"><Sparkles size={14} /> {route.group}</span>
          <h1>{route.title}</h1>
          <p>{route.description}. Раздел работает внутри новой защищённой оболочки и готов к подключению предметных виджетов.</p>
          <div className="module-status-row"><span><CheckCircle2 size={15} /> Маршрут доступен</span><span><LockKeyhole size={15} /> Сессия защищена</span><span><CircleGauge size={15} /> API под контролем</span></div>
        </div>
      </section>
      <section className="module-grid">
        <article className="panel module-primary-card"><span className="card-overline">Рабочая область</span><h2>Единый, предсказуемый поток</h2><p>Навигация, ошибки, загрузка и повторные запросы теперь обрабатываются одинаково во всех модулях портала.</p><button type="button" className="primary-button">Начать работу <ArrowRight size={16} /></button></article>
        <article className="panel module-checklist"><span className="card-overline">Статус интеграции</span><ul><li><i className="is-ready" /><span><strong>Авторизация</strong><small>HTTP-only сессия</small></span></li><li><i className="is-ready" /><span><strong>Навигация</strong><small>App Router</small></span></li><li><i /><span><strong>Предметные операции</strong><small>Подключаются поэтапно</small></span></li></ul></article>
      </section>
      {related.length > 0 && <section className="related-section"><div className="panel-heading"><div><span>{route.group}</span><h2>Связанные разделы</h2></div></div><div className="related-grid">{related.slice(0, 4).map((item) => <Link href={concretePath(item.path)} key={item.path}><span>{item.title}</span><ArrowRight size={16} /></Link>)}</div></section>}
    </div>
  );
}
