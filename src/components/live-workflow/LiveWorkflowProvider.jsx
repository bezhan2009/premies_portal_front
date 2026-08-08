import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Eye, Link2, Radio, Search, Send, ShieldCheck, UserRoundCheck, Users, X } from "lucide-react";
import {
  createLiveWorkflowSession,
  createLiveWorkflowWsTicket,
  endLiveWorkflowSession,
  getLiveWorkflowSession,
  getLiveWorkflowUsers,
  inviteLiveWorkflowUser,
  joinLiveWorkflowByToken,
  sendLiveWorkflowChatInvite,
  updateLiveWorkflowFollowMode,
} from "../../api/liveWorkflow";
import { apiClient } from "../../api/utils/apiClient";
import { parseLiveWorkflowInvitation } from "../../utils/liveWorkflowMessages";
import "./LiveWorkflow.css";

const LiveWorkflowContext = createContext(null);
const CURSOR_SEND_INTERVAL = 40;
const LIVE_WORKFLOW_SESSION_STORAGE_KEY = "live_workflow_active_session_id";

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

const LIVE_WORKFLOW_CURSOR_COLORS = [
  "#eb2525",
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#0891b2",
  "#be185d",
  "#4f46e5",
];

const getParticipantName = (participantOrUser, fallback = "Сотрудник") => {
  const user = participantOrUser?.user || participantOrUser;
  return user?.full_name || user?.username || user?.email || fallback;
};

const getParticipantInitials = (participantOrUser) => {
  const user = participantOrUser?.user || participantOrUser;
  const name = getParticipantName(user, "U");
  return user?.initials || name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
};

const getParticipantColor = (userId) => {
  const numericId = Number(userId) || 0;
  return LIVE_WORKFLOW_CURSOR_COLORS[Math.abs(numericId) % LIVE_WORKFLOW_CURSOR_COLORS.length];
};

const getSessionUserRoutesMap = (targetSession) => (
  (targetSession?.user_routes || []).reduce((acc, item) => {
    if (item?.user_id && item?.route) {
      acc[Number(item.user_id)] = item;
    }
    return acc;
  }, {})
);

const getFollowSnapshot = (targetSession, targetUserId) => {
  const numericTargetId = Number(targetUserId);
  if (!targetSession?.id || !numericTargetId) return null;
  const userRoutes = getSessionUserRoutesMap(targetSession);
  if (userRoutes[numericTargetId]) return userRoutes[numericTargetId];
  if (Number(targetSession.presenter_user_id) === numericTargetId && targetSession.current_route) {
    return {
      user_id: numericTargetId,
      route: targetSession.current_route,
      context: targetSession.current_context || {},
      updated_at: Date.parse(targetSession.created_at || "") || Date.now(),
    };
  }
  return null;
};

export const buildLiveWorkflowInvitationMessage = (payload) => JSON.stringify({
  type: "live_workflow_invitation",
  ...payload,
});

export const LiveWorkflowInvitationCard = ({ message, compact = false }) => {
  const invitation = parseLiveWorkflowInvitation(message);
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
        Войти
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
      followTargetId: 0,
      openShareDialog: () => {},
      joinByToken: async () => {},
      stopFollowing: async () => {},
      resumeFollowing: async () => {},
      followUser: async () => {},
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
  const lastViewportSentRef = useRef(0);
  const routeTimerRef = useRef(null);
  const applyingRemoteRouteRef = useRef(false);
  const applyingRemoteViewportRef = useRef(false);
  const isFollowingRef = useRef(false);
  const followTargetIdRef = useRef(0);
  const userRoutesRef = useRef({});
  const sessionRef = useRef(null);
  const currentUserRef = useRef(null);

  const myParticipant = useMemo(() => (
    participants.find((item) => Number(item.user?.id) === Number(currentUser?.id))
  ), [participants, currentUser]);

  const userRoutesById = useMemo(() => getSessionUserRoutesMap(session), [session]);
  const isPresenter = !!session && Number(session.presenter_user_id) === Number(currentUser?.id);
  const followTargetId = Number(myParticipant?.is_following ? (myParticipant.follow_target_id || session?.presenter_user_id || 0) : 0);
  const isFollowing = !!myParticipant?.is_following && !!followTargetId && Number(followTargetId) !== Number(currentUser?.id);
  const followTargetParticipant = useMemo(() => (
    participants.find((item) => Number(item.user?.id) === Number(followTargetId))
  ), [followTargetId, participants]);

  useEffect(() => {
    isFollowingRef.current = isFollowing;
    followTargetIdRef.current = followTargetId;
    userRoutesRef.current = userRoutesById;
    sessionRef.current = session;
    currentUserRef.current = currentUser;
  }, [currentUser, followTargetId, isFollowing, session, userRoutesById]);

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

  const syncRemoteViewport = useCallback((context = {}) => {
    const scrollX = Number(context?.scrollX);
    const scrollY = Number(context?.scrollY);
    if (!Number.isFinite(scrollX) && !Number.isFinite(scrollY)) return;
    const left = Number.isFinite(scrollX) ? Math.max(0, scrollX) : window.scrollX;
    const top = Number.isFinite(scrollY) ? Math.max(0, scrollY) : window.scrollY;
    if (Math.abs(window.scrollX - left) < 24 && Math.abs(window.scrollY - top) < 24) return;
    applyingRemoteViewportRef.current = true;
    window.requestAnimationFrame(() => {
      window.scrollTo({ left, top, behavior: "smooth" });
      window.setTimeout(() => {
        applyingRemoteViewportRef.current = false;
      }, 260);
    });
  }, []);

  const applyRemoteSnapshot = useCallback((snapshot, options = {}) => {
    if (!snapshot?.route) return;
    const context = snapshot.context || {};
    if (snapshot.route !== getCurrentRoute()) {
      applyingRemoteRouteRef.current = true;
      navigate(snapshot.route, { replace: Boolean(options.replace) });
      window.setTimeout(() => {
        applyingRemoteRouteRef.current = false;
        syncRemoteViewport(context);
      }, 350);
      return;
    }
    syncRemoteViewport(context);
  }, [navigate, syncRemoteViewport]);

  const applySessionState = useCallback((nextSession) => {
    setSession(nextSession);
    setParticipants(nextSession?.participants || []);
    if (nextSession?.id && nextSession.status === "ACTIVE") {
      localStorage.setItem(LIVE_WORKFLOW_SESSION_STORAGE_KEY, nextSession.id);
    } else {
      localStorage.removeItem(LIVE_WORKFLOW_SESSION_STORAGE_KEY);
    }
  }, []);

  const mergeUserRouteIntoSession = useCallback((userId, route, context = {}) => {
    const numericUserId = Number(userId);
    if (!numericUserId || !route) return;
    const nextRoute = { user_id: numericUserId, route, context, updated_at: Date.now() };
    setSession((prev) => {
      if (!prev?.id) return prev;
      const existingRoutes = prev.user_routes || [];
      return {
        ...prev,
        user_routes: [
          ...existingRoutes.filter((item) => Number(item.user_id) !== numericUserId),
          nextRoute,
        ],
      };
    });
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
          const me = msg.payload?.participants?.find((item) => Number(item.user?.id) === Number(currentUserRef.current?.id));
          const targetId = Number(me?.follow_target_id || msg.payload?.presenter_user_id || 0);
          const shouldFollowTarget = Boolean(me?.is_following && targetId && targetId !== Number(currentUserRef.current?.id));
          if (shouldFollowTarget) {
            applyRemoteSnapshot(getFollowSnapshot(msg.payload, targetId));
          }
          return;
        }
        if (msg.type === "participant.joined" || msg.type === "participant.left") {
          return;
        }
        if (msg.type === "cursor.moved" && Number(msg.user?.id) !== Number(currentUserRef.current?.id)) {
          const color = getParticipantColor(msg.user?.id);
          setRemoteCursors((prev) => ({
            ...prev,
            [msg.user.id]: {
              user: msg.user,
              x: msg.payload?.x || 0,
              y: msg.payload?.y || 0,
              route: msg.payload?.route,
              scrollX: msg.payload?.scrollX,
              scrollY: msg.payload?.scrollY,
              color,
              seenAt: Date.now(),
            },
          }));
          if (isFollowingRef.current && Number(msg.user?.id) === Number(followTargetIdRef.current)) {
            if (msg.payload?.route && msg.payload.route !== getCurrentRoute()) {
              applyRemoteSnapshot({ route: msg.payload.route, context: msg.payload });
            } else {
              syncRemoteViewport(msg.payload);
            }
          }
          return;
        }
        if (msg.type === "navigation.changed" && Number(msg.user?.id) !== Number(currentUserRef.current?.id)) {
          const route = msg.payload?.route;
          const context = msg.payload?.context || {};
          if (route) {
            userRoutesRef.current = {
              ...userRoutesRef.current,
              [Number(msg.user.id)]: { user_id: Number(msg.user.id), route, context, updated_at: Date.now() },
            };
            mergeUserRouteIntoSession(msg.user.id, route, context);
          }
          if (route && isFollowingRef.current && Number(msg.user?.id) === Number(followTargetIdRef.current)) {
            applyRemoteSnapshot({ route, context });
          }
          return;
        }
        if (msg.type === "viewport.changed" && Number(msg.user?.id) !== Number(currentUserRef.current?.id)) {
          const route = msg.payload?.route;
          const context = msg.payload?.context || {};
          if (route) {
            userRoutesRef.current = {
              ...userRoutesRef.current,
              [Number(msg.user.id)]: { user_id: Number(msg.user.id), route, context, updated_at: Date.now() },
            };
            mergeUserRouteIntoSession(msg.user.id, route, context);
          }
          if (route && isFollowingRef.current && Number(msg.user?.id) === Number(followTargetIdRef.current)) {
            applyRemoteSnapshot({ route, context });
          }
          return;
        }
        if (msg.type === "session.ended") {
          setStatusMessage("Live workflow session завершён");
          setSession(null);
          setParticipants([]);
          setRemoteCursors({});
          localStorage.removeItem(LIVE_WORKFLOW_SESSION_STORAGE_KEY);
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
  }, [applyRemoteSnapshot, applySessionState, disconnect, mergeUserRouteIntoSession, syncRemoteViewport]);

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
    const me = joined.participants?.find((item) => Number(item.user?.id) === Number(currentUserRef.current?.id));
    const targetId = Number(me?.follow_target_id || joined.presenter_user_id || 0);
    applyRemoteSnapshot(getFollowSnapshot(joined, targetId), { replace: true });
  }, [applyRemoteSnapshot, applySessionState, connect]);

  useEffect(() => {
    if (!currentUser?.id || session?.id || location.pathname.startsWith("/live-session/")) return undefined;

    const savedSessionId = localStorage.getItem(LIVE_WORKFLOW_SESSION_STORAGE_KEY);
    if (!savedSessionId) return undefined;

    let cancelled = false;
    getLiveWorkflowSession(savedSessionId)
      .then((restoredSession) => {
        if (cancelled || !restoredSession?.id || restoredSession.status !== "ACTIVE") return;
        applySessionState(restoredSession);
        connect(restoredSession);

        const me = restoredSession.participants?.find((item) => Number(item.user?.id) === Number(currentUser.id));
        const targetId = Number(me?.follow_target_id || restoredSession.presenter_user_id || 0);
        if (me?.is_following && targetId && targetId !== Number(currentUser.id)) {
          applyRemoteSnapshot(getFollowSnapshot(restoredSession, targetId), { replace: true });
        }
      })
      .catch(() => {
        localStorage.removeItem(LIVE_WORKFLOW_SESSION_STORAGE_KEY);
      });

    return () => { cancelled = true; };
  }, [applyRemoteSnapshot, applySessionState, connect, currentUser?.id, location.pathname, session?.id]);

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
      route: getCurrentRoute(),
      invitedBy: currentUser?.full_name || currentUser?.username || "Сотрудник",
      createdAt: new Date().toISOString(),
      expiresAt: invite.expires_at,
    });
    await sendLiveWorkflowChatInvite({ recipientId: selectedEmployeeId, message });
    setStatusMessage("Приглашение отправлено в чат");
  }, [currentUser, selectedEmployeeId, session]);

  const stopFollowing = useCallback(async () => {
    if (!session?.id) return;
    const updated = await updateLiveWorkflowFollowMode(session.id, false, null);
    applySessionState(updated);
  }, [applySessionState, session?.id]);

  const followUser = useCallback(async (targetUserId) => {
    if (!session?.id || !targetUserId || Number(targetUserId) === Number(currentUser?.id)) return;
    const updated = await updateLiveWorkflowFollowMode(session.id, true, targetUserId);
    applySessionState(updated);
    applyRemoteSnapshot(getFollowSnapshot(updated, targetUserId));
  }, [applyRemoteSnapshot, applySessionState, currentUser?.id, session?.id]);

  const resumeFollowing = useCallback(async () => {
    if (!session?.id) return;
    await followUser(session.presenter_user_id);
  }, [followUser, session?.id, session?.presenter_user_id]);

  const endSession = useCallback(async () => {
    if (!session?.id) return;
    await endLiveWorkflowSession(session.id);
    setSession(null);
    setParticipants([]);
    setRemoteCursors({});
    localStorage.removeItem(LIVE_WORKFLOW_SESSION_STORAGE_KEY);
    disconnect(false);
  }, [disconnect, session?.id]);

  useEffect(() => {
    if (!session?.id || !wsRef.current || applyingRemoteRouteRef.current) return undefined;
    if (routeTimerRef.current) window.clearTimeout(routeTimerRef.current);
    routeTimerRef.current = window.setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({
        type: "navigation.change",
        payload: {
          route: `${location.pathname}${location.search}${location.hash}`,
          context: {
            scrollX: window.scrollX,
            scrollY: window.scrollY,
          },
        },
      }));
    }, 180);
    return () => window.clearTimeout(routeTimerRef.current);
  }, [location.hash, location.pathname, location.search, session?.id]);

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
          route: getCurrentRoute(),
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
      }));
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [session?.id]);

  useEffect(() => {
    if (!session?.id) return undefined;
    const handleViewportChange = () => {
      const now = Date.now();
      if (
        applyingRemoteRouteRef.current ||
        applyingRemoteViewportRef.current ||
        now - lastViewportSentRef.current < 160 ||
        wsRef.current?.readyState !== WebSocket.OPEN
      ) {
        return;
      }
      lastViewportSentRef.current = now;
      wsRef.current.send(JSON.stringify({
        type: "viewport.change",
        payload: {
          route: getCurrentRoute(),
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
      }));
    };
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    return () => window.removeEventListener("scroll", handleViewportChange);
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
    followTargetId,
    followTargetParticipant,
    openShareDialog,
    joinByToken,
    stopFollowing,
    resumeFollowing,
    followUser,
    endSession,
  }), [currentUser, endSession, followTargetId, followTargetParticipant, followUser, isFollowing, isPresenter, joinByToken, openShareDialog, participants, remoteCursors, resumeFollowing, session, stopFollowing]);

  return (
    <LiveWorkflowContext.Provider value={value}>
      {children}
      <RemoteCursors cursors={Object.values(remoteCursors)} />
      <LiveWorkflowPeopleBar
        session={session}
        participants={participants}
        currentUser={currentUser}
        isPresenter={isPresenter}
        isFollowing={isFollowing}
        followTargetId={followTargetId}
        userRoutesById={userRoutesById}
        onStopFollowing={stopFollowing}
        onResumeFollowing={resumeFollowing}
        onFollowUser={followUser}
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

function LiveWorkflowPeopleBar({
  session,
  participants,
  currentUser,
  isPresenter,
  isFollowing,
  followTargetId,
  userRoutesById,
  onStopFollowing,
  onResumeFollowing,
  onFollowUser,
  onEnd,
}) {
  const [isPeopleOpen, setPeopleOpen] = useState(false);
  if (!session) return null;

  const presenter = participants.find((item) => Number(item.user?.id) === Number(session.presenter_user_id));
  const followTarget = participants.find((item) => Number(item.user?.id) === Number(followTargetId));
  const visibleParticipants = participants.slice(0, 5);
  const title = isFollowing
    ? `Следуете за ${getParticipantName(followTarget, "участником")}`
    : isPresenter
      ? "Вы показываете workflow"
      : "Самостоятельный просмотр";

  return (
    <div className="live-workflow-bar">
      <button type="button" className="live-workflow-bar__status" onClick={() => setPeopleOpen((prev) => !prev)}>
        <Radio size={16} />
        <span>{title}</span>
      </button>
      <div className="live-workflow-avatars">
        {visibleParticipants.map((item) => (
          <button
            type="button"
            key={item.user.id}
            title={getParticipantName(item)}
            className={`${item.online ? "online" : ""} ${Number(item.user.id) === Number(followTargetId) ? "following" : ""}`}
            style={{ "--avatar-color": getParticipantColor(item.user.id) }}
            onClick={() => setPeopleOpen((prev) => !prev)}
          >
            {getParticipantInitials(item)}
          </button>
        ))}
        {participants.length > visibleParticipants.length && <small>+{participants.length - visibleParticipants.length}</small>}
      </div>
      {isFollowing
        ? <button type="button" onClick={onStopFollowing}>Стоп</button>
        : <button type="button" onClick={onResumeFollowing} disabled={!presenter || Number(presenter.user?.id) === Number(currentUser?.id)}>Следовать</button>}
      {isPresenter && <button type="button" className="danger" onClick={onEnd}>Завершить</button>}

      <AnimatePresence>
        {isPeopleOpen && (
          <motion.div
            className="live-workflow-people-panel"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
          >
            <header>
              <strong><Users size={16} /> Участники live workflow</strong>
              <button type="button" onClick={() => setPeopleOpen(false)}><X size={15} /></button>
            </header>
            <div className="live-workflow-people-list">
              {participants.map((item) => {
                const isCurrentUser = Number(item.user?.id) === Number(currentUser?.id);
                const isFollowTarget = Number(item.user?.id) === Number(followTargetId);
                const hasRoute = Boolean(userRoutesById?.[Number(item.user?.id)]?.route || Number(item.user?.id) === Number(session.presenter_user_id));
                return (
                  <div key={item.user.id} className={`live-workflow-person ${isFollowTarget ? "is-follow-target" : ""}`}>
                    <span
                      className={`live-workflow-person__avatar ${item.online ? "online" : ""}`}
                      style={{ "--avatar-color": getParticipantColor(item.user.id) }}
                    >
                      {getParticipantInitials(item)}
                    </span>
                    <div>
                      <strong>
                        {getParticipantName(item)}
                        {Number(item.user?.id) === Number(session.presenter_user_id) && <em>Presenter</em>}
                      </strong>
                      <small>
                        {item.online ? "онлайн" : "не в сети"}
                        {hasRoute ? " · можно следовать" : " · ждём маршрут"}
                      </small>
                    </div>
                    {isCurrentUser ? (
                      <span className="live-workflow-person__self">Это вы</span>
                    ) : isFollowTarget ? (
                      <span className="live-workflow-person__following"><UserRoundCheck size={14} /> Следуете</span>
                    ) : (
                      <button type="button" disabled={!hasRoute} onClick={() => onFollowUser(item.user.id)}>
                        <Eye size={14} /> Следовать
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RemoteCursors({ cursors }) {
  return (
    <div className="live-cursors-layer" aria-hidden="true">
      {cursors.map((cursor) => (
        <motion.div
          key={cursor.user.id}
          className="live-remote-cursor"
          style={{ "--cursor-color": cursor.color || getParticipantColor(cursor.user.id) }}
          animate={{ x: cursor.x * window.innerWidth, y: cursor.y * window.innerHeight }}
          transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.2 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 1.5 16.5 8 10 9.4 7.1 16.5 2 1.5Z" /></svg>
          <span>{getParticipantName(cursor.user)}</span>
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
