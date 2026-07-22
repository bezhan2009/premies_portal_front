import type { Metadata } from "next";
import { LoginForm } from "@/components/next/auth/login-form";

export const metadata: Metadata = { title: "Вход в систему" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  return (
    <main className="login-page" id="main-content">
      <section className="login-visual-panel">
        <div className="login-noise" />
        <header className="login-brand"><span className="brand-mark light"><span>ad</span></span><div><strong>Activ Daily</strong><small>by ActivBank</small></div></header>
        <div className="login-visual-copy">
          <span className="visual-kicker">Внутренний портал</span>
          <h2>Activ Daily</h2>
          <p>Рабочее пространство для ежедневных банковских операций.</p>
        </div>
        <footer className="login-visual-footer"><span>ActivBank · внутренний портал</span></footer>
      </section>
      <section className="login-form-panel"><div className="login-form-container"><LoginForm returnTo={returnTo} /><footer className="login-legal">© {new Date().getFullYear()} ActivBank <span>·</span> Только для сотрудников банка</footer></div></section>
    </main>
  );
}
