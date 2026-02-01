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

            if (w === 0 || h === 0) {
                if (attempts-- > 0) requestAnimationFrame(step);
                return;
            }

            if (w === lastW && h === lastH) stableCount += 1;
            else stableCount = 0;

            lastW = w;
            lastH = h;

            map.invalidateSize(true);

            if (stableCount >= 3) return;

            if (attempts-- > 0) requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
    };

    // Обработчик клавиши Escape для выхода из полноэкранного режима
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape" && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isFullscreen]);

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
        padding: "10px 16px",
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.15)",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        fontWeight: 700,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        fontSize: "14px",
        transition: "all 0.2s ease",
    };

    const barStyle = {
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 20 : "auto",
        right: isFullscreen ? 20 : "auto",
        left: isFullscreen ? 20 : "auto",
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
        transition: "height 0.3s ease",
    };

    return (
        <div style={{ padding: 12 }}>
            {/* кнопки */}
            <div style={barStyle}>
                <button
                    style={{
                        ...buttonBase,
                        background: isCollapsed ? "#f0f0f0" : "rgba(255,255,255,0.95)",
                    }}
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

                {!isCollapsed && !isFullscreen && (
                    <button
                        style={{ ...buttonBase, background: "#4a6bff", color: "white" }}
                        onClick={() => setIsFullscreen(true)}
                    >
                        На весь экран
                    </button>
                )}
            </div>

            {/* обычная карта */}
            {!isFullscreen && (
                <div ref={normalWrapRef} style={normalWrapStyle}>
                    {isCollapsed ? (
                        <div
                            style={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                opacity: 0.7,
                                background: "#f8f9fa",
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

            {/* fullscreen через portal */}
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
                        {/* Панель управления в полноэкранном режиме */}
                        <div
                            style={{
                                position: "fixed",
                                top: 20,
                                right: 20,
                                left: 20,
                                zIndex: 10001,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "12px 20px",
                                background: "rgba(255,255,255,0.9)",
                                backdropFilter: "blur(10px)",
                                borderRadius: 12,
                                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                                margin: "0 auto",
                                maxWidth: "calc(100% - 40px)",
                            }}
                        >
                            <div style={{ fontWeight: 700, fontSize: "16px" }}>
                                Полноэкранный режим карты
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                <button
                                    style={{
                                        ...buttonBase,
                                        background: "#ff4a4a",
                                        color: "white",
                                        padding: "8px 16px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                    }}
                                    onClick={() => {
                                        setIsFullscreen(false);
                                        setTimeout(() => {
                                            const map = normalMapRef.current;
                                            const el = normalWrapRef.current;
                                            invalidateUntilStable(map, el);
                                        }, 0);
                                    }}
                                >
                                    <span>✕</span>
                                    Выйти из полноэкранного режима
                                </button>
                            </div>
                        </div>

                        {/* Карта в полноэкранном режиме */}
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                paddingTop: "70px", // Отступ для панели управления
                            }}
                        >
                            <MapView
                                atms={ATMS}
                                center={center}
                                onMap={(map) => {
                                    fullMapRef.current = map;
                                    requestAnimationFrame(() => map.invalidateSize(true));
                                    setTimeout(() => map.invalidateSize(true), 60);
                                }}
                            />
                        </div>

                        {/* Подсказка внизу экрана */}
                        <div
                            style={{
                                position: "fixed",
                                bottom: 20,
                                left: "50%",
                                transform: "translateX(-50%)",
                                zIndex: 10001,
                                background: "rgba(0,0,0,0.7)",
                                color: "white",
                                padding: "8px 16px",
                                borderRadius: 8,
                                fontSize: "14px",
                                backdropFilter: "blur(4px)",
                            }}
                        >
                            Нажмите ESC или кнопку выше, чтобы выйти из полноэкранного режима
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
