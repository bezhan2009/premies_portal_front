import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { AlertCircle, Loader2, Radio, ShieldCheck } from "lucide-react";
import { useLiveWorkflow } from "../../components/live-workflow/LiveWorkflowProvider";

const JOIN_TEXT = {
  error: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c\u0441\u044f \u043a live workflow",
  connecting: "\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0435\u043c \u0432\u0430\u0441 \u043a workflow...",
  failed: "\u041f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u043d\u0435 \u0441\u0440\u0430\u0431\u043e\u0442\u0430\u043b\u043e",
  connected: "\u0412\u044b \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u044b. \u0421\u0435\u0439\u0447\u0430\u0441 \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u0432\u0435\u0434\u0443\u0449\u0435\u0433\u043e.",
  security: "\u041f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u043d\u0435 \u0434\u0430\u0451\u0442 \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0445 \u043f\u0440\u0430\u0432 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a \u0434\u0430\u043d\u043d\u044b\u043c BPM.",
};

export default function LiveWorkflowJoinPage() {
  const { token } = useParams();
  const { joinByToken } = useLiveWorkflow();
  const [state, setState] = useState({ loading: true, error: "" });
  const joinAttemptRef = useRef("");

  useEffect(() => {
    if (!token || joinAttemptRef.current === token) return undefined;
    joinAttemptRef.current = token;
    let mounted = true;
    joinByToken(token)
      .then(() => {
        if (mounted) setState({ loading: false, error: "" });
      })
      .catch((error) => {
        if (mounted) setState({ loading: false, error: error?.response?.data?.error || JOIN_TEXT.error });
      });
    return () => { mounted = false; };
  }, [joinByToken, token]);

  return (
    <div style={{ minHeight: "calc(100vh - 160px)", display: "grid", placeItems: "center", padding: 24 }}>
      <Motion.div
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
              {state.loading ? JOIN_TEXT.connecting : state.error ? JOIN_TEXT.failed : JOIN_TEXT.connected}
            </p>
          </div>
        </div>
        {state.error ? (
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(239,68,68,.08)", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
            {state.error}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary, #64748b)", fontSize: 12 }}>
            <ShieldCheck size={15} /> {JOIN_TEXT.security}
          </div>
        )}
      </Motion.div>
    </div>
  );
}
