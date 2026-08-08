import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Radio, ShieldCheck } from "lucide-react";
import { useLiveWorkflow } from "../../components/live-workflow/LiveWorkflowProvider";

export default function LiveWorkflowJoinPage() {
  const { token } = useParams();
  const { joinByToken } = useLiveWorkflow();
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    let mounted = true;
    joinByToken(token)
      .then(() => {
        if (mounted) setState({ loading: false, error: "" });
      })
      .catch((error) => {
        if (mounted) setState({ loading: false, error: error?.response?.data?.error || "Не удалось подключиться к live workflow" });
      });
    return () => { mounted = false; };
  }, [joinByToken, token]);

  return (
    <div style={{ minHeight: "calc(100vh - 160px)", display: "grid", placeItems: "center", padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: "min(520px, 100%)",
          padding: 24,
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: 18,
          background: "var(--bg-surface, #fff)",
          boxShadow: "0 18px 60px rgba(15,23,42,.12)",
          color: "var(--text-color, #172033)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(235,37,37,.1)", color: "#eb2525" }}>
            {state.loading ? <Loader2 size={22} className="spin" /> : state.error ? <AlertCircle size={22} /> : <Radio size={22} />}
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Live BPM session</h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary, #64748b)", fontSize: 13 }}>
              {state.loading ? "Подключаем вас к workflow..." : state.error ? "Приглашение не сработало" : "Вы подключены. Сейчас откроется маршрут presenter."}
            </p>
          </div>
        </div>
        {state.error ? (
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(239,68,68,.08)", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
            {state.error}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary, #64748b)", fontSize: 12 }}>
            <ShieldCheck size={15} /> Приглашение не даёт дополнительных прав доступа к данным BPM.
          </div>
        )}
      </motion.div>
    </div>
  );
}
