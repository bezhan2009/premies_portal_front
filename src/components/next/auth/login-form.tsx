"use client";

import anime from "animejs";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiRequest, ApiError } from "@/lib/next/api-client";
import { useReducedMotion } from "@/hooks/next/use-reduced-motion";

export function LoginForm({ returnTo = "/" }: { returnTo?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const reducedMotion = useReducedMotion();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (reducedMotion || !formRef.current) return;
    anime({
      targets: formRef.current.querySelectorAll(".login-animate"),
      opacity: [0, 1],
      translateY: [14, 0],
      delay: anime.stagger(70),
      duration: 520,
      easing: "easeOutCubic",
    });
  }, [reducedMotion]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const safeTarget = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
      window.location.assign(safeTarget);
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : "Сервис авторизации временно недоступен";
      setError(message);
      if (!reducedMotion && formRef.current) {
        anime({ targets: formRef.current, translateX: [-7, 6, -4, 2, 0], duration: 360, easing: "easeInOutSine" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} className="login-form" onSubmit={submit} noValidate>
      <div className="login-animate login-form-heading">
        <span className="section-chip"><LockKeyhole size={14} /> Внутренний портал</span>
        <h1>Вход в систему</h1>
        <p>Введите учётные данные, чтобы продолжить работу.</p>
      </div>

      <label className="login-animate field-label" htmlFor="username">Имя пользователя</label>
      <div className="login-animate input-shell">
        <UserRound size={18} aria-hidden="true" />
        <input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Например, i.rahmon" autoComplete="username" required disabled={loading} />
      </div>

      <div className="login-animate password-label-row">
        <label className="field-label" htmlFor="password">Пароль</label>
        <span>Единая учётная запись банка</span>
      </div>
      <div className="login-animate input-shell">
        <LockKeyhole size={18} aria-hidden="true" />
        <input id="password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Введите пароль" autoComplete="current-password" required disabled={loading} />
        <button type="button" className="password-visibility" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className={`login-message ${error ? "has-error" : ""}`} role="alert" aria-live="polite">
        {error || "Ваши данные передаются по защищённому соединению."}
      </div>

      <button className="login-animate primary-button login-submit" type="submit" disabled={loading || !username.trim() || !password}>
        {loading ? <><LoaderCircle className="spin" size={18} /> Проверяем…</> : <>Войти в портал <span>→</span></>}
      </button>

      <div className="login-animate login-support"><span className="status-pulse" /> Доступ выдаёт администратор системы.</div>
    </form>
  );
}
