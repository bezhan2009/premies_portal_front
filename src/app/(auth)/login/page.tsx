import type { Metadata } from "next";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";
import { LoginForm } from "@/components/next/auth/login-form";
import { AnimatedSphere } from "@/components/next/visual/animated-sphere";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  return (
    <main className="login-page" id="main-content">
      <section className="login-visual-panel">
        <div className="login-noise" />
        <header className="login-brand"><span className="brand-mark light"><span>ad</span></span><div><strong>Activ Daily</strong><small>by ActivBank</small></div></header>
        <div className="login-visual-copy">
          <span className="visual-kicker"><Sparkles size={14} /> Ежедневная эффективность</span>
          <h2>Премии, которые<br /><em>видно и понятно.</em></h2>
          <p>Единое пространство для показателей, расчётов и решений — без лишних шагов и перегруженных экранов.</p>
          <div className="login-benefits"><span><ShieldCheck size={17} /> Защищённая сессия</span><span><Zap size={17} /> Быстрые операции</span></div>
        </div>
        <AnimatedSphere />
        <footer className="login-visual-footer"><span>ActivBank · внутренний портал</span><span>v2.0</span></footer>
      </section>
      <section className="login-form-panel"><div className="login-form-container"><LoginForm returnTo={returnTo} /><footer className="login-legal">© {new Date().getFullYear()} ActivBank <span>·</span> Только для сотрудников банка</footer></div></section>
    </main>
  );
}
