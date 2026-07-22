"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { concretePath, type PortalRoute } from "@/config/next-navigation";
import { useUiStore } from "@/stores/ui-store";
import { NavIcon } from "@/components/next/navigation/nav-icon";

export function CommandPalette({ routes }: { routes: PortalRoute[] }) {
  const { commandOpen, setCommandOpen } = useUiStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => setCommandOpen(false), [pathname, setCommandOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, setCommandOpen]);

  useEffect(() => {
    if (commandOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandOpen]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    const unique = routes.filter((item) => !item.path.includes(":"));
    if (!normalized) return unique.slice(0, 9);
    return unique.filter((item) => `${item.title} ${item.group} ${item.description}`.toLocaleLowerCase("ru").includes(normalized)).slice(0, 12);
  }, [query, routes]);

  if (!commandOpen) return null;

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={() => setCommandOpen(false)}>
      <section className="command-dialog" role="dialog" aria-modal="true" aria-label="Быстрый переход" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input-wrap">
          <Search size={19} aria-hidden="true" />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти раздел или действие…" aria-label="Поиск по порталу" />
          <button type="button" className="icon-button subtle" onClick={() => setCommandOpen(false)} aria-label="Закрыть поиск"><X size={18} /></button>
        </div>
        <div className="command-results">
          <p className="command-label">{query ? "Результаты" : "Быстрый доступ"}</p>
          {filtered.length ? filtered.map((item) => (
            <Link href={concretePath(item.path)} className="command-result" key={item.path}>
              <span className="command-result-icon"><NavIcon name={item.icon} /></span>
              <span><strong>{item.title}</strong><small>{item.group}</small></span>
              <kbd>↵</kbd>
            </Link>
          )) : <div className="command-empty">Ничего не найдено. Попробуйте другое название.</div>}
        </div>
        <footer className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> навигация</span><span><kbd>esc</kbd> закрыть</span></footer>
      </section>
    </div>
  );
}
