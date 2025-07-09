import React from 'react';

const CustomCardsTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div
                style={{
                    background: "rgba(255, 255, 255, 0.75)",
                    borderRadius: "12px",
                    padding: "10px 14px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    backdropFilter: "blur(6px)",
                    fontSize: "14px",
                    color: "#333",
                    lineHeight: 1.6
                }}
            >
                <div style={{ fontWeight: "600", fontSize: "13px", marginBottom: "4px" }}>{label}</div>
                <div>
                    <span style={{color: "#417cd5"}}>Всего карт:</span> {payload[2]?.value || 0} {/* ← */}
                </div>
                <div>
                    <span style={{color: "#41b8d5"}}>Выдано в этом месяце:</span> {payload[0]?.value}
                </div>
                <div>
                    <span style={{color: "#6ce5e8"}}>Активные карты за этот месяц:</span> {payload[1]?.value}
                </div>
            </div>
        );
    }

    return null;
};

export default CustomCardsTooltip;
