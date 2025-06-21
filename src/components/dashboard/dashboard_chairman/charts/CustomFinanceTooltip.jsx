import React from 'react';

const CustomFinanceTooltip = ({ active, payload, label }) => {
    return (
        <div
            style={{
                transition: "opacity 0.3s ease",
                background: "rgba(255, 255, 255, 0.75)",
                borderRadius: "10px",
                padding: "10px 12px",
                boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
                backdropFilter: "blur(4px)",
                fontSize: "13.5px",
                color: "#222",
                pointerEvents: "none",
                lineHeight: 1.5
            }}
        >
            <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "6px" }}>{label}</div>
            <div><span style={{ color: "#ff8a41" }}>Дебет:</span> {payload?.[0]?.value}</div>
            <div><span style={{ color: "#d9d9d9" }}>Кредит:</span> {payload?.[1]?.value}</div>
            <div><span style={{ color: "#8c52ff" }}>Остатки:</span> {payload?.[2]?.value}</div>
        </div>
    );
};

export default CustomFinanceTooltip;
