import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { buildMockAtms } from "./geocodeAtms";

import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: shadow,
});

const ATMS = buildMockAtms(45);

function MapView({ atms, center, onMap }) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      whenCreated={onMap}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {atms.map((a) => (
        <Marker key={a.id} position={[a.lat, a.lng]}>
          <Popup>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 800 }}>{a.title}</div>
              <div style={{ marginTop: 6 }}>{a.address}</div>
              {a.workTime && (
                <div style={{ marginTop: 8, opacity: 0.8 }}>
                  Время: {a.workTime}
                </div>
              )}
              {a.services && (
                <div style={{ marginTop: 10 }}>
                  <div>CashOut: ✅</div>
                  <div>CashIn: {a.services.cashIn ? "✅" : "❌"}</div>
                  <div>Валюта: {a.services.currency?.join(", ")}</div>
                  <div style={{ marginTop: 6 }}>
                    Статус:{" "}
                    <b
                      style={{
                        color: a.status === "active" ? "green" : "crimson",
                      }}
                    >
                      {a.status}
                    </b>
                  </div>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default function AtmMap() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const normalWrapRef = useRef(null);
  const normalMapRef = useRef(null);
  const fullMapRef = useRef(null);

  const center = useMemo(() => [38.5598, 68.787], []);

  const invalidateUntilStable = (map, el, attempts = 45) => {
    if (!map || !el) return;

    let lastW = -1;
    let lastH = -1;
    let stableCount = 0;

    const step = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;

      // контейнер ещё не имеет нормальных размеров
      if (w === 0 || h === 0) {
        if (attempts-- > 0) requestAnimationFrame(step);
        return;
      }

      // стабильность размеров
      if (w === lastW && h === lastH) stableCount += 1;
      else stableCount = 0;

      lastW = w;
      lastH = h;

      map.invalidateSize(true);

      // 3 стабильных кадра подряд — достаточно
      if (stableCount >= 3) return;

      if (attempts-- > 0) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  // fullscreen: блокируем скролл
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (isFullscreen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [isFullscreen]);

  // при показе обычной карты — стабилизируем размеры
  useEffect(() => {
    if (isFullscreen) return;
    if (isCollapsed) return;

    const map = normalMapRef.current;
    const el = normalWrapRef.current;
    if (!map || !el) return;

    invalidateUntilStable(map, el);
  }, [isCollapsed, isFullscreen]);

  const buttonBase = {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(6px)",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  };

  const barStyle = {
    position: isFullscreen ? "fixed" : "relative",
    top: isFullscreen ? 12 : "auto",
    right: isFullscreen ? 12 : "auto",
    left: isFullscreen ? 12 : "auto",
    zIndex: 10000,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginBottom: isFullscreen ? 0 : 10,
  };

  const normalWrapStyle = {
    height: isCollapsed ? 56 : "40vh",
    width: "100%",
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#fff",
  };

  return (
    <div style={{ padding: 12 }}>
      {/* кнопки */}
      <div style={barStyle}>
        <button
          onClick={() => {
            setIsCollapsed((v) => {
              const next = !v;
              if (next) setIsFullscreen(false);
              return next;
            });
          }}
        >
          {isCollapsed ? "Показать карту" : "Скрыть карту"}
        </button>

        {!isCollapsed && (
          <button onClick={() => setIsFullscreen(true)}>
            На весь экран
          </button>
        )}
      </div>

      {/* обычная карта */}
      {!isFullscreen && (
        <div ref={normalWrapRef} style={normalWrapStyle}>
          {/* Если свернуто — просто показываем плашку, карту не монтируем */}
          {isCollapsed ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                opacity: 0.7,
              }}
            >
              Карта скрыта
            </div>
          ) : (
            <MapView
              atms={ATMS}
              center={center}
              onMap={(map) => {
                normalMapRef.current = map;
                invalidateUntilStable(map, normalWrapRef.current);
              }}
            />
          )}
        </div>
      )}

      {/* fullscreen через portal (у тебя это уже исправило серый) */}
      {isFullscreen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              background: "#fff",
              zIndex: 9000,
            }}
          >
            <div
              style={{
                position: "fixed",
                top: 12,
                right: 12,
                zIndex: 10001,
                display: "flex",
                gap: 10,
              }}
            >
              <button
                style={buttonBase}
                onClick={() => {
                  setIsFullscreen(false);
                  // после выхода — пересчёт обычной карты
                  setTimeout(() => {
                    const map = normalMapRef.current;
                    const el = normalWrapRef.current;
                    invalidateUntilStable(map, el);
                  }, 0);
                }}
              >
                Свернуть
              </button>
            </div>

            <div style={{ width: "100%", height: "100%" }}>
              <MapView
                atms={ATMS}
                center={center}
                onMap={(map) => {
                  fullMapRef.current = map;
                  // в portal обычно и так ок, но пусть будет
                  requestAnimationFrame(() => map.invalidateSize(true));
                  setTimeout(() => map.invalidateSize(true), 60);
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
