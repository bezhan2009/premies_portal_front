"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="state-page"><span className="state-icon is-warning"><TriangleAlert size={30} /></span><span className="page-eyebrow">Что-то пошло не так</span><h1>Не удалось открыть раздел</h1><p>Мы сохранили контекст. Повторите загрузку — ваши данные не потеряны.</p><button className="primary-button" type="button" onClick={reset}><RefreshCw size={16} /> Повторить</button></div>;
}
