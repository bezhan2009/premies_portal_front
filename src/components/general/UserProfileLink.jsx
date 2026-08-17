import React, { useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function UserProfileLink({
  userId,
  username,
  absName,
  displayName,
  children,
  className = "",
  style = {},
}) {
  const [resolvedName, setResolvedName] = useState(displayName || "");

  useEffect(() => {
    setResolvedName(displayName || "");
  }, [displayName]);

  useEffect(() => {
    if (!absName || displayName) return undefined;
    const controller = new AbortController();
    const token = localStorage.getItem("access_token");
    fetch(`${backendUrl}/users/profile/by-abs-name?abs_name=${encodeURIComponent(absName)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((profile) => {
        if (profile?.full_name) setResolvedName(profile.full_name);
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.error("Не удалось определить сотрудника АБС:", error);
      });
    return () => controller.abort();
  }, [absName, displayName]);

  const label = children ?? (resolvedName || displayName || username || absName || "Пользователь");
  const canOpen = Boolean(userId || username || absName);

  return (
    <button
      type="button"
      className={`user-profile-link ${className}`.trim()}
      disabled={!canOpen}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!canOpen) return;
        window.dispatchEvent(new CustomEvent("open-user-profile", {
          detail: { userId, username, absName },
        }));
      }}
      style={{
        appearance: "none",
        border: 0,
        padding: 0,
        margin: 0,
        background: "transparent",
        color: "inherit",
        font: "inherit",
        fontWeight: "inherit",
        textAlign: "inherit",
        cursor: canOpen ? "pointer" : "default",
        textDecoration: canOpen ? "underline" : "none",
        textDecorationStyle: "dotted",
        textUnderlineOffset: "3px",
        ...style,
      }}
    >
      {label}
    </button>
  );
}
