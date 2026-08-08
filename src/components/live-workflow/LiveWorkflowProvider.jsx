import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Link2, Radio, Search, Send, ShieldCheck, Users, X } from "lucide-react";
import {
  createLiveWorkflowSession,
  createLiveWorkflowWsTicket,
  endLiveWorkflowSession,
  getLiveWorkflowUsers,
  inviteLiveWorkflowUser,
  joinLiveWorkflowByToken,
  sendLiveWorkflowChatInvite,
  updateLiveWorkflowFollowMode,
} from "../../api/liveWorkflow";
import { apiClient } from "../../api/utils/apiClient";
import "./LiveWorkflow.css";

const LiveWorkflowContext = createContext(null);
const CURSOR_SEND_INTERVAL = 40;

const getCurrentRoute = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

const backendToWsURL = (sessionId, ticket) => {
  const base = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  const parsed = new URL(base, window.location.origin);
  parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  parsed.pathname = `/api/live-workflows/${sessionId}/ws`;
  parsed.search = `ticket=${encodeURIComponent(ticket)}`;
  return parsed.toString();
};

const buildAbsoluteJoinUrl = (joinPath) => `${window.location.origin}${joinPath}`;

const safeParseInvitation = (message) => {
  try {
    const parsed = JSON.parse(message);
    return parsed?.type === "live_workflow_invitation" ? parsed : null;
  } catch {
    return null;
  }
};

export const buildLiveWorkflowInvitationMessage = (payload) => JSON.stringify({
  type: "live_workflow_invitation",
  ...payload,
});

export const LiveWorkflowInvitationCard = ({ message, compact = false }) => {
  const invitation = typeof message === "string" ? safeParseInvitation(message) : message;
  if (!invitation) return null;

  const route = invitation.route || "Текущий маршрут BPM";
  return (
    <div className={`live-workflow-card ${compact ? "compact" : ""}`}>
      <div className="live-workflow-card__icon"><Radio size={18} /></div>
      <div className="live-workflow-card__body">
        <strong>Live BPM session</strong>
        <span>{invitation.invitedBy || "Сотрудник"} приглашает вас следовать за workflow.</span>
        <small>{route}</small>
      </div>
      <button type="button" onClick={() => { window.location.href = invitation.joinPath || `/live-session/${invitation.token}`; }}>
        Join
      </button>
    </div>
  );
};

export const useLiveWorkflow = () => {
  const value = useContext(LiveWorkflowContext);
  if (!value) {
    return {
      session: null,
      participants: [],
      currentUser: null,
      remoteCursors: [],
      isPresenter: false,
      isFollowing: false,
      openShareDialog: () => {},
      joinByToken: async () => {},
      stopFollowing: async () => {},
      resumeFollowing: async () => {},
      endSession: async () => {},
    };
  }
  return value;
};

export default function LiveWorkflowProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [isShareOpen, setShareOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const lastCursorSentRef = useRef(0);
  const routeTimerRef = useRef(null);
  const applyingRemoteRouteRef = useRef(false);
  const isPresenterRef = useRef(false);
  const isFollowingRef = useRef(false);
  const sessionRef = useRef(null);
  const currentUserRef = useRef(null);

  const myParticipant = useMemo(() => (
    participants.find((item) => Number(item.user?.id) === Number(currentUser?.id))
  ), [participants, currentUser]);

  const isPresenter = !!session && Number(session.presenter_user_id) === Number(currentUser?.id);
  const isFollowing = !!myParticipant?.is_following && !isPresenter;

  useEffect(() => {
    isPresenterRef.current = isPresenter;
    isFollowingRef.current = isFollowing;
    sessionRef.current = session;
    currentUserRef.current = currentUser;
  }, [currentUser, isPresenter, isFollowing, session]);

  useEffect(() => {
    let mounted = true;
    apiClient.get("/user").then(({ data }) => {
      if (!mounted) return;
      setCurrentUser({
        id: data.id || data.ID,
        username: data.username,
        full_name: data.full_name || data.fullName || data.username,
      });
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const disconnect = useCallback((allowReconnect = false) => {
    shouldReconnectRef.current = allowReconnect;
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const applySessionState = useCallback((nextSession) => {
    setSession(nextSession);
    setParticipants(nextSession?.participants || []);
  }, []);

  const connect = useCallback(async (targetSession) => {
    if (!targetSession?.id) return;
    disconnect(true);
    shouldReconnectRef.current = true;

    try {
      const { ticket } = await createLiveWorkflowWsTicket(targetSession.id);
      const socket = new WebSocket(backendToWsURL(targetSession.id, ticket));
      wsRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
        setStatusMessage("Live workflow подключен");
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "session.state") {
          applySessionState(msg.payload);
          return;
        }
        if (msg.type === "participant.joined" || msg.type === "participant.left") {
          return;
        }
        if (msg.type === "cursor.moved" && Number(msg.user?.id) !== Number(currentUserRef.current?.id)) {
          setRemoteCursors((prev) => ({
            ...prev,
            [msg.user.id]: { user: msg.user, x: msg.payload?.x || 0, y: msg.payload?.y || 0, seenAt: Date.now() },
          }));
          return;
        }
        if (msg.type === "navigation.changed" && Number(msg.user?.id) !== Number(currentUserRef.current?.id) && isFollowingRef.current) {
          const route = msg.payload?.route;
          if (route && route !== getCurrentRoute()) {
            applyingRemoteRouteRef.current = true;
            navigate(route);
            window.setTimeout(() => { applyingRemoteRouteRef.current = false; }, 300);
          }
          return;
        }
        if (msg.type === "session.ended") {
          setStatusMessage("Live workflow session завершён");
          setSession(null);
          setParticipants([]);
          setRemoteCursors({});
          disconnect(false);
        }
      };

      socket.onclose = () => {
        if (!shouldReconnectRef.current || !sessionRef.current?.id) return;
        const attempt = Math.min(reconnectAttemptRef.current + 1, 6);
        reconnectAttemptRef.current = attempt;
        const timeout = Math.min(30000, 700 * 2 ** attempt);
        reconnectTimerRef.current = window.setTimeout(() => connect(sessionRef.current), timeout);
      };

      socket.onerror = () => setStatusMessage("Live assistance временно недоступен");
    } catch {
      setStatusMessage("Не удалось подключить Live workflow");
    }
  }, [applySessionState, disconnect, navigate]);

  const openShareDialog = useCallback(async () => {
    setShareOpen(true);
    setStatusMessage("");
    try {
      const users = await getLiveWorkflowUsers();
      setEmployees(users);
    } catch {
      setEmployees([]);
    }

    if (!sessionRef.current?.id) {
      try {
        const response = await createLiveWorkflowSession({ route: getCurrentRoute(), context: {} });
        applySessionState(response.session);
        setInvitation(response.invitation);
        connect(response.session);
      } catch {
        setStatusMessage("Не удалось создать live session");
      }
    }
  }, [applySessionState, connect]);

  const joinByToken = useCallback(async (token) => {
    const joined = await joinLiveWorkflowByToken(token);
    applySessionState(joined);
    await connect(joined);
    if (joined.current_route) {
      navigate(joined.current_route, { replace: true });
    }
  }, [applySessionState, connect, navigate]);

  const copyLink = useCallback(async () => {
    let invite = invitation;
    if (!invite && session?.id) {
      invite = await inviteLiveWorkflowUser(session.id);
      setInvitation(invite);
    }
    if (!invite?.join_path) return;
    await navigator.clipboard.writeText(buildAbsoluteJoinUrl(invite.join_path));
    setStatusMessage("Ссылка скопирована");
  }, [invitation, session?.id]);

  const sendViaChat = useCallback(async () => {
    if (!session?.id || !selectedEmployeeId) return;
    const invite = await inviteLiveWorkflowUser(session.id, selectedEmployeeId);
    const message = buildLiveWorkflowInvitationMessage({
      sessionId: session.id,
      token: invite.token,
      joinPath: invite.join_path,
      route: session.current_route,
      invitedBy: currentUser?.full_name || currentUser?.username || "Сотрудник",
      createdAt: new Date().toISOString(),
      expiresAt: invite.expires_at,
    });
    await sendLiveWorkflowChatInvite({ recipientId: selectedEmployeeId, message });
    setInvitation(invite);
    setStatusMessage("Приглашение отправлено в чат");
  }, [currentUser, selectedEmployeeId, session]);

  const stopFollowing = useCallback(async () => {
    if (!session?.id) return;
    const updated = await updateLiveWorkflowFollowMode(session.id, false);
    applySessionState(updated);
  }, [applySessionState, session?.id]);

  const resumeFollowing = useCallback(async () => {
    if (!session?.id) return;
    const updated = await updateLiveWorkflowFollowMode(session.id, true);
    applySessionState(updated);
    if (updated.current_route) navigate(updated.current_route);
  }, [applySessionState, navigate, session?.id]);

  const endSession = useCallback(async () => {
    if (!session?.id) return;
    await endLiveWorkflowSession(session.id);
    setSession(null);
    setParticipants([]);
    setRemoteCursors({});
    disconnect(false);
  }, [disconnect, session?.id]);

  useEffect(() => {
    if (!session?.id || !wsRef.current || !isPresenter || applyingRemoteRouteRef.current) return undefined;
    if (routeTimerRef.current) window.clearTimeout(routeTimerRef.current);
    routeTimerRef.current = window.setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({
        type: "navigation.change",
        payload: { route: `${location.pathname}${location.search}${location.hash}`, context: {} },
      }));
    }, 180);
    return () => window.clearTimeout(routeTimerRef.current);
  }, [isPresenter, location.hash, location.pathname, location.search, session?.id]);

  useEffect(() => {
    if (!session?.id) return undefined;
    const handleMove = (event) => {
      const now = Date.now();
      if (now - lastCursorSentRef.current < CURSOR_SEND_INTERVAL || wsRef.current?.readyState !== WebSocket.OPEN) return;
      lastCursorSentRef.current = now;
      wsRef.current.send(JSON.stringify({
        type: "cursor.move",
        payload: {
          x: Math.max(0, Math.min(1, event.clientX / Math.max(window.innerWidth, 1))),
          y: Math.max(0, Math.min(1, event.clientY / Math.max(window.innerHeight, 1))),
        },
      }));
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [session?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemoteCursors((prev) => Object.fromEntries(
        Object.entries(prev).filter(([, cursor]) => Date.now() - cursor.seenAt < 5000)
      ));
    }, 2500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => disconnect(false), [disconnect]);

  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    return employees
      .filter((user) => Number(user.id) !== Number(currentUser?.id))
      .filter((user) => !q || [user.full_name, user.username, user.email].filter(Boolean).join(" ").toLowerCase().includes(q))
      .slice(0, 8);
  }, [currentUser?.id, employeeQuery, employees]);

  const value = useMemo(() => ({
    session,
    participants,
    currentUser,
    remoteCursors: Object.values(remoteCursors),
    isPresenter,
    isFollowing,
    openShareDialog,
    joinByToken,
    stopFollowing,
    resumeFollowing,
    endSession,
  }), [currentUser, endSession, isFollowing, isPresenter, joinByToken, openShareDialog, participants, remoteCursors, resumeFollowing, session, stopFollowing]);

  return (
    <LiveWorkflowContext.Provider value={value}>
      {children}
      <RemoteCursors cursors={Object.values(remoteCursors)} />
      <LiveWorkflowBar
        session={session}
        participants={participants}
        isPresenter={isPresenter}
        isFollowing={isFollowing}
        onStopFollowing={stopFollowing}
        onResumeFollowing={resumeFollowing}
        onEnd={endSession}
      />
      <ShareWorkflowModal
        open={isShareOpen}
        session={session}
        participants={participants}
        employees={filteredEmployees}
        employeeQuery={employeeQuery}
        selectedEmployeeId={selectedEmployeeId}
        invitation={invitation}
        statusMessage={statusMessage}
        onQueryChange={setEmployeeQuery}
        onSelectEmployee={setSelectedEmployeeId}
        onCopy={copyLink}
        onSend={sendViaChat}
        onClose={() => setShareOpen(false)}
      />
    </LiveWorkflowContext.Provider>
  );
}

function RemoteCursors({ cursors }) {
  return (
    <div className="live-cursors-layer" aria-hidden="true">
      {cursors.map((cursor) => (
        <motion.div
          key={cursor.user.id}
          className="live-remote-cursor"
          animate={{ x: cursor.x * window.innerWidth, y: cursor.y * window.innerHeight }}
          transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.2 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 1.5 16.5 8 10 9.4 7.1 16.5 2 1.5Z" /></svg>
          <span>{cursor.user.full_name || cursor.user.username}</span>
        </motion.div>
      ))}
    </div>
  );
}

function LiveWorkflowBar({ session, participants, isPresenter, isFollowing, onStopFollowing, onResumeFollowing, onEnd }) {
  if (!session) return null;
  const presenter = participants.find((item) => Number(item.user?.id) === Number(session.presenter_user_id));
  return (
    <div className="live-workflow-bar">
      <div>
        <Radio size={16} />
        <span>{isPresenter ? "Вы показываете workflow" : isFollowing ? `Следуете за ${presenter?.user?.full_name || "presenter"}` : "Вы смотрите самостоятельно"}</span>
      </div>
      <div className="live-workflow-avatars">
        {participants.slice(0, 4).map((item) => (
          <span key={item.user.id} title={item.user.full_name || item.user.username} className={item.online ? "online" : ""}>
            {item.user.initials || "U"}
          </span>
        ))}
        {participants.length > 4 && <small>+{participants.length - 4}</small>}
      </div>
      {!isPresenter && (isFollowing
        ? <button type="button" onClick={onStopFollowing}>Стоп</button>
        : <button type="button" onClick={onResumeFollowing}>Следовать</button>)}
      {isPresenter && <button type="button" className="danger" onClick={onEnd}>Завершить</button>}
    </div>
  );
}

function ShareWorkflowModal({
  open,
  session,
  participants,
  employees,
  employeeQuery,
  selectedEmployeeId,
  invitation,
  statusMessage,
  onQueryChange,
  onSelectEmployee,
  onCopy,
  onSend,
  onClose,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="live-share-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="live-share-modal" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}>
            <header>
              <div>
                <span><Users size={18} /></span>
                <div>
                  <h2>Share workflow</h2>
                  <p>Пригласите сотрудника следовать за вашей BPM-сессией.</p>
                </div>
              </div>
              <button type="button" onClick={onClose}><X size={18} /></button>
            </header>

            <section className="live-share-section">
              <label>Поиск сотрудника</label>
              <div className="live-share-search">
                <Search size={16} />
                <input value={employeeQuery} onChange={(event) => onQueryChange(event.target.value)} placeholder="ФИО, username или email" />
              </div>
              <div className="live-share-users">
                {employees.map((user) => (
                  <button
                    type="button"
                    key={user.id}
                    className={Number(selectedEmployeeId) === Number(user.id) ? "selected" : ""}
                    onClick={() => onSelectEmployee(user.id)}
                  >
                    <span>{(user.full_name || user.username || "U").slice(0, 2).toUpperCase()}</span>
                    <strong>{user.full_name || user.username || user.email}</strong>
                    {Number(selectedEmployeeId) === Number(user.id) && <Check size={16} />}
                  </button>
                ))}
              </div>
            </section>

            <section className="live-share-section">
              <label>People with access</label>
              <div className="live-share-access">
                {participants.map((participant) => (
                  <div key={participant.user.id}>
                    <span className={participant.online ? "online" : ""}>{participant.user.initials}</span>
                    <strong>{participant.user.full_name || participant.user.username}</strong>
                    <small>{participant.role === "presenter" ? "Presenter" : participant.is_following ? "Following" : "Viewing"}</small>
                  </div>
                ))}
              </div>
            </section>

            <footer>
              <button type="button" onClick={onCopy} disabled={!session?.id}>
                <Copy size={16} /> Copy secure link
              </button>
              <button type="button" className="primary" onClick={onSend} disabled={!session?.id || !selectedEmployeeId}>
                <Send size={16} /> Send through chat
              </button>
            </footer>
            <div className="live-share-security"><ShieldCheck size={15} /> Session expires: {invitation?.expires_at ? new Date(invitation.expires_at).toLocaleString("ru-RU") : "создаётся..."}</div>
            {statusMessage && <div className="live-share-status"><Link2 size={14} /> {statusMessage}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
