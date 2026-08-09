import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
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
import useNavigationStore from "../../store/useNavigationStore";
import useTabsStore from "../../store/useTabsStore";
import "./LiveWorkflow.css";

const LiveWorkflowContext = createContext(null);
const CURSOR_SEND_INTERVAL = 40;
const REMOTE_SYNC_MUTE_MS = 1200;
const REMOTE_CURSOR_TTL_MS = 12000;
const REMOTE_SNAPSHOT_DEDUP_MS = 220;
const ONLINE_GRACE_MS = 18000;
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

const roundedWorkflowNumber = (value, precision = 8) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric / precision) * precision;
};

const clampWorkflowNumber = (value, min, max) => Math.min(Math.max(value, min), max);

const getWorkflowDocumentMetrics = () => {
  if (typeof window === "undefined") {
    return {
      width: 1,
      height: 1,
      viewportWidth: 1,
      viewportHeight: 1,
      scrollX: 0,
      scrollY: 0,
    };
  }
  const doc = document.documentElement;
  const body = document.body;
  const viewportWidth = Math.max(window.innerWidth || 0, 1);
  const viewportHeight = Math.max(window.innerHeight || 0, 1);
  return {
    width: Math.max(doc?.scrollWidth || 0, body?.scrollWidth || 0, viewportWidth, 1),
    height: Math.max(doc?.scrollHeight || 0, body?.scrollHeight || 0, viewportHeight, 1),
    viewportWidth,
    viewportHeight,
    scrollX: window.scrollX || 0,
    scrollY: window.scrollY || 0,
  };
};

const getRemoteCursorPosition = (cursor) => {
  const metrics = getWorkflowDocumentMetrics();
  const pageXRatio = Number(cursor?.pageXRatio);
  const pageYRatio = Number(cursor?.pageYRatio);
  const viewportX = Number(cursor?.x);
  const viewportY = Number(cursor?.y);

  const x = Number.isFinite(pageXRatio)
    ? pageXRatio * metrics.width - metrics.scrollX
    : (Number.isFinite(viewportX) ? viewportX : 0.5) * metrics.viewportWidth;
  const y = Number.isFinite(pageYRatio)
    ? pageYRatio * metrics.height - metrics.scrollY
    : (Number.isFinite(viewportY) ? viewportY : 0.5) * metrics.viewportHeight;

  return {
    x: clampWorkflowNumber(x, -24, metrics.viewportWidth + 24),
    y: clampWorkflowNumber(y, -24, metrics.viewportHeight + 24),
  };
};

const isSameLiveUser = (left, right) => {
  const leftUser = left?.user || left;
  const rightUser = right?.user || right;
  if (!leftUser || !rightUser) return false;
  if (Number(leftUser.id) > 0 && Number(rightUser.id) > 0) {
    return Number(leftUser.id) === Number(rightUser.id);
  }
  const leftUsername = String(leftUser.username || "").trim().toLowerCase();
  const rightUsername = String(rightUser.username || "").trim().toLowerCase();
  return Boolean(leftUsername && rightUsername && leftUsername === rightUsername);
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

const decodeJwtPayload = (token) => {
  try {
    if (!token || !token.includes(".")) return null;
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
};

const getStoredCurrentUser = () => {
  if (typeof window === "undefined") return null;
  const payload = decodeJwtPayload(localStorage.getItem("access_token"));
  const id = Number(payload?.user_id || payload?.id || localStorage.getItem("user_id") || 0);
  const username = payload?.username || localStorage.getItem("username") || "";
  const fullName = localStorage.getItem("full_name") || payload?.full_name || username;
  if (!id && !username) return null;
  return {
    id,
    username,
    full_name: fullName,
  };
};

const sanitizeWorkflowMenuLinks = (items = [], depth = 0) => {
  if (!Array.isArray(items) || depth > 3) return [];
  return items
    .filter(Boolean)
    .map((item) => ({
      name: item.name || item.title || item.key || item.href || "Раздел",
      href: item.href || "",
      key: item.key || item.href || item.name || "",
      hasNotification: Boolean(item.hasNotification),
      children: sanitizeWorkflowMenuLinks(item.children || [], depth + 1),
    }))
    .slice(0, 80);
};

const sanitizeWorkflowTabs = (items = []) => (
  Array.isArray(items)
    ? items
      .filter((item) => item?.href)
      .map((item) => ({
        href: item.href,
        name: item.name || item.href,
        pinned: Boolean(item.pinned),
      }))
      .slice(0, 12)
    : []
);

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
  const [currentUser, setCurrentUser] = useState(() => getStoredCurrentUser());
  const [remoteCursors, setRemoteCursors] = useState({});
  const [isShareOpen, setShareOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const workflowTabs = useTabsStore((state) => state.tabs);
  const workflowActiveTabId = useTabsStore((state) => state.activeTabId);
  const workflowSplitTabHref = useTabsStore((state) => state.splitTabHref);
  const workflowMenuLinks = useNavigationStore((state) => state.links);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const lastCursorSentRef = useRef(0);
  const lastViewportSentRef = useRef(0);
  const shellTimerRef = useRef(null);
  const lastPointerRef = useRef({ x: 0.5, y: 0.5 });
  const routeTimerRef = useRef(null);
  const muteOutgoingUntilRef = useRef(0);
  const lastNavigationSignatureRef = useRef("");
  const lastViewportSignatureRef = useRef("");
  const lastAppliedRemoteSnapshotRef = useRef({ key: "", at: 0 });
  const applyingRemoteRouteRef = useRef(false);
  const applyingRemoteViewportRef = useRef(false);
  const isFollowingRef = useRef(false);
  const followTargetIdRef = useRef(0);
  const userRoutesRef = useRef({});
  const onlineUntilByUserRef = useRef({});
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
  const followedRouteSnapshot = followTargetId ? userRoutesById[followTargetId] : null;
  const followedShellSnapshot = followedRouteSnapshot?.context?.shell || null;

  useEffect(() => {
    isFollowingRef.current = isFollowing;
    followTargetIdRef.current = followTargetId;
    userRoutesRef.current = userRoutesById;
    sessionRef.current = session;
    currentUserRef.current = currentUser;
  }, [currentUser, followTargetId, isFollowing, session, userRoutesById]);

  const buildShellSnapshot = useCallback(() => ({
    route: getCurrentRoute(),
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    tabs: sanitizeWorkflowTabs(workflowTabs),
    activeTabId: workflowActiveTabId || getCurrentRoute(),
    splitTabHref: workflowSplitTabHref || "",
    menuLinks: sanitizeWorkflowMenuLinks(workflowMenuLinks),
  }), [workflowActiveTabId, workflowMenuLinks, workflowSplitTabHref, workflowTabs]);

  useEffect(() => {
    let mounted = true;
    apiClient.get("/user").then(({ data }) => {
      if (!mounted) return;
      const userData = data?.user || data?.data || data || {};
      const fallback = getStoredCurrentUser();
      setCurrentUser({
        id: userData.id || userData.ID || fallback?.id || 0,
        username: userData.username || fallback?.username || "",
        full_name: userData.full_name || userData.fullName || userData.FullName || fallback?.full_name || userData.username || fallback?.username || "",
      });
    }).catch(() => {
      setCurrentUser((prev) => prev || getStoredCurrentUser());
    });
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

  const muteOutgoingSync = useCallback((duration = REMOTE_SYNC_MUTE_MS) => {
    muteOutgoingUntilRef.current = Math.max(muteOutgoingUntilRef.current, Date.now() + duration);
  }, []);

  const syncRemoteViewport = useCallback((context = {}) => {
    const scrollX = Number(context?.scrollX);
    const scrollY = Number(context?.scrollY);
    if (!Number.isFinite(scrollX) && !Number.isFinite(scrollY)) return;
    const left = Number.isFinite(scrollX) ? Math.max(0, scrollX) : window.scrollX;
    const top = Number.isFinite(scrollY) ? Math.max(0, scrollY) : window.scrollY;
    if (Math.abs(window.scrollX - left) < 24 && Math.abs(window.scrollY - top) < 24) return;
    muteOutgoingSync();
    applyingRemoteViewportRef.current = true;
    window.requestAnimationFrame(() => {
      window.scrollTo({ left, top, behavior: "auto" });
      window.setTimeout(() => {
        applyingRemoteViewportRef.current = false;
      }, 180);
    });
  }, [muteOutgoingSync]);

  const applyRemoteSnapshot = useCallback((snapshot, options = {}) => {
    if (!snapshot?.route) return;
    const context = snapshot.context || {};
    const snapshotKey = [
      snapshot.route,
      roundedWorkflowNumber(context.scrollX),
      roundedWorkflowNumber(context.scrollY),
    ].join("|");
    const now = Date.now();
    if (
      !options.force &&
      lastAppliedRemoteSnapshotRef.current.key === snapshotKey &&
      now - lastAppliedRemoteSnapshotRef.current.at < REMOTE_SNAPSHOT_DEDUP_MS
    ) {
      return;
    }
    lastAppliedRemoteSnapshotRef.current = { key: snapshotKey, at: now };
    muteOutgoingSync();

    if (snapshot.route !== getCurrentRoute()) {
      applyingRemoteRouteRef.current = true;
      navigate(snapshot.route, { replace: Boolean(options.replace) });
      window.setTimeout(() => {
        applyingRemoteRouteRef.current = false;
        syncRemoteViewport(context);
      }, 650);
      return;
    }
    syncRemoteViewport(context);
  }, [muteOutgoingSync, navigate, syncRemoteViewport]);

  const applySessionState = useCallback((nextSession) => {
    setSession(nextSession);
    const now = Date.now();
    const nextParticipants = Array.isArray(nextSession?.participants) ? nextSession.participants : [];
    setParticipants(nextParticipants.map((participant) => {
      const participantUserId = Number(participant?.user?.id);
      const isCurrentUser = participantUserId > 0 && participantUserId === Number(currentUserRef.current?.id);
      return {
        ...participant,
        online: Boolean(participant?.online || isCurrentUser || (onlineUntilByUserRef.current[participantUserId] || 0) > now),
      };
    }));
    if (nextSession?.id && nextSession.status === "ACTIVE") {
      localStorage.setItem(LIVE_WORKFLOW_SESSION_STORAGE_KEY, nextSession.id);
    } else {
      localStorage.removeItem(LIVE_WORKFLOW_SESSION_STORAGE_KEY);
    }
  }, []);

  const mergeUserRouteIntoSession = useCallback((userId, route, context = {}) => {
    const numericUserId = Number(userId);
    if (!numericUserId || !route) return;
    setSession((prev) => {
      const existingRoutes = prev?.user_routes || [];
      const existingRoute = existingRoutes.find((item) => Number(item.user_id) === numericUserId);
      const existingRefRoute = userRoutesRef.current?.[numericUserId];
      const previousContext = existingRoute?.context || existingRefRoute?.context || {};
      const nextContext = {
        ...previousContext,
        ...context,
      };

      if (!context?.shell && previousContext?.shell) {
        nextContext.shell = previousContext.shell;
      }

      const nextRoute = { user_id: numericUserId, route, context: nextContext, updated_at: Date.now() };
      userRoutesRef.current = {
        ...userRoutesRef.current,
        [numericUserId]: nextRoute,
      };

      if (!prev?.id) return prev;
      return {
        ...prev,
        user_routes: [
          ...existingRoutes.filter((item) => Number(item.user_id) !== numericUserId),
          nextRoute,
        ],
      };
    });
  }, []);

  const markParticipantOnline = useCallback((user) => {
    if (!user?.id && !user?.username) return;
    const numericUserId = Number(user.id);
    if (numericUserId > 0) {
      onlineUntilByUserRef.current[numericUserId] = Date.now() + ONLINE_GRACE_MS;
    }
    setParticipants((prev) => prev.map((participant) => (
      isSameLiveUser(participant, user)
        ? { ...participant, online: true, last_seen_at: new Date().toISOString() }
        : participant
    )));
  }, []);

  const sendCurrentNavigation = useCallback((socket = wsRef.current, options = {}) => {
    const force = Boolean(options.force);
    if (
      !force &&
      (
        isFollowingRef.current ||
        applyingRemoteRouteRef.current ||
        applyingRemoteViewportRef.current ||
        Date.now() < muteOutgoingUntilRef.current
      )
    ) {
      return;
    }
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const route = getCurrentRoute();
    const shell = buildShellSnapshot();
    const navigationSignature = `${route}|${JSON.stringify(shell)}`;
    if (!force && navigationSignature === lastNavigationSignatureRef.current) return;
    lastNavigationSignatureRef.current = navigationSignature;

    const context = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      shell,
    };
    socket.send(JSON.stringify({
      type: "navigation.change",
      payload: { route, context },
    }));
    mergeUserRouteIntoSession(currentUserRef.current?.id, route, context);
    markParticipantOnline(currentUserRef.current);
  }, [buildShellSnapshot, markParticipantOnline, mergeUserRouteIntoSession]);

  const sendCurrentCursor = useCallback((socket = wsRef.current) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const metrics = getWorkflowDocumentMetrics();
    const pointer = lastPointerRef.current || { x: 0.5, y: 0.5 };
    const viewportX = Math.max(0, Math.min(1, Number(pointer.x) || 0.5));
    const viewportY = Math.max(0, Math.min(1, Number(pointer.y) || 0.5));
    const pageXRatio = Number.isFinite(Number(pointer.pageXRatio))
      ? Math.max(0, Math.min(1, Number(pointer.pageXRatio)))
      : Math.max(0, Math.min(1, (metrics.scrollX + viewportX * metrics.viewportWidth) / metrics.width));
    const pageYRatio = Number.isFinite(Number(pointer.pageYRatio))
      ? Math.max(0, Math.min(1, Number(pointer.pageYRatio)))
      : Math.max(0, Math.min(1, (metrics.scrollY + viewportY * metrics.viewportHeight) / metrics.height));

    socket.send(JSON.stringify({
      type: "cursor.move",
      payload: {
        x: viewportX,
        y: viewportY,
        pageXRatio,
        pageYRatio,
        route: getCurrentRoute(),
        scrollX: metrics.scrollX,
        scrollY: metrics.scrollY,
        viewportWidth: metrics.viewportWidth,
        viewportHeight: metrics.viewportHeight,
        documentWidth: metrics.width,
        documentHeight: metrics.height,
      },
    }));
  }, []);

  const applyCursorSnapshots = useCallback((cursorSnapshots = []) => {
    if (!Array.isArray(cursorSnapshots) || cursorSnapshots.length === 0) return;
    setRemoteCursors((prev) => {
      const next = { ...prev };
      cursorSnapshots.forEach((item) => {
        const user = item.user || {};
        if (!user.id || Number(user.id) === Number(currentUserRef.current?.id)) return;
        const payload = item.payload || {};
        next[user.id] = {
          user,
          x: Number(payload.x) || 0.5,
          y: Number(payload.y) || 0.5,
          pageXRatio: Number.isFinite(Number(payload.pageXRatio)) ? Number(payload.pageXRatio) : null,
          pageYRatio: Number.isFinite(Number(payload.pageYRatio)) ? Number(payload.pageYRatio) : null,
          route: payload.route,
          scrollX: payload.scrollX,
          scrollY: payload.scrollY,
          color: getParticipantColor(user.id),
          seenAt: Date.now(),
        };
        markParticipantOnline(user);
      });
      return next;
    });
  }, [markParticipantOnline]);

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
        setStatusMessage("Live workflow подключён");
        sendCurrentNavigation(socket, { force: true });
        sendCurrentCursor(socket);
        window.setTimeout(() => sendCurrentNavigation(socket, { force: true }), 400);
        window.setTimeout(() => sendCurrentCursor(socket), 450);
      };

      socket.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.type === "session.state") {
          applySessionState(msg.payload);
          applyCursorSnapshots(msg.payload?.cursors);
          const me = msg.payload?.participants?.find((item) => Number(item.user?.id) === Number(currentUserRef.current?.id));
          const targetId = Number(me?.follow_target_id || msg.payload?.presenter_user_id || 0);
          const shouldFollowTarget = Boolean(me?.is_following && targetId && targetId !== Number(currentUserRef.current?.id));
          if (shouldFollowTarget) {
            applyRemoteSnapshot(getFollowSnapshot(msg.payload, targetId));
          }
          return;
        }
        if (msg.type === "participant.joined") {
          markParticipantOnline(msg.user);
          sendCurrentNavigation(undefined, { force: true });
          sendCurrentCursor();
          return;
        }
        if (msg.type === "participant.left") {
          const leftUserId = Number(msg.user?.id);
          if (leftUserId > 0) {
            delete onlineUntilByUserRef.current[leftUserId];
            setParticipants((prev) => prev.map((participant) => (
              Number(participant.user?.id) === leftUserId
                ? { ...participant, online: false, last_seen_at: new Date().toISOString() }
                : participant
            )));
            setRemoteCursors((prev) => {
              const next = { ...prev };
              delete next[leftUserId];
              return next;
            });
          }
          return;
        }
        if (msg.type === "cursor.moved" && Number(msg.user?.id) !== Number(currentUserRef.current?.id)) {
          const color = getParticipantColor(msg.user?.id);
          markParticipantOnline(msg.user);
          setRemoteCursors((prev) => ({
            ...prev,
            [msg.user.id]: {
              user: msg.user,
              x: msg.payload?.x || 0,
              y: msg.payload?.y || 0,
              pageXRatio: Number.isFinite(Number(msg.payload?.pageXRatio)) ? Number(msg.payload.pageXRatio) : null,
              pageYRatio: Number.isFinite(Number(msg.payload?.pageYRatio)) ? Number(msg.payload.pageYRatio) : null,
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
          markParticipantOnline(msg.user);
          if (route) {
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
          markParticipantOnline(msg.user);
          if (route) {
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
  }, [applyCursorSnapshots, applyRemoteSnapshot, applySessionState, disconnect, markParticipantOnline, mergeUserRouteIntoSession, sendCurrentCursor, sendCurrentNavigation, syncRemoteViewport]);

  const openShareDialog = useCallback(async () => {
    setShareOpen(true);
    setStatusMessage("");
    getLiveWorkflowUsers()
      .then((users) => setEmployees(users))
      .catch(() => setEmployees([]));

    if (!sessionRef.current?.id) {
      try {
        const route = getCurrentRoute();
        const shell = buildShellSnapshot();
        const response = await createLiveWorkflowSession({
          route,
          context: {
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            shell,
          },
        });
        applySessionState(response.session);
        applyCursorSnapshots(response.session?.cursors);
        setInvitation(response.invitation);
        connect(response.session);
      } catch {
        setStatusMessage("Не удалось создать live session");
      }
    }
  }, [applyCursorSnapshots, applySessionState, buildShellSnapshot, connect]);

  const joinByToken = useCallback(async (token) => {
    const joined = await joinLiveWorkflowByToken(token);
    applySessionState(joined);
    applyCursorSnapshots(joined?.cursors);
    await connect(joined);
    const me = joined.participants?.find((item) => Number(item.user?.id) === Number(currentUserRef.current?.id));
    const targetId = Number(me?.follow_target_id || joined.presenter_user_id || 0);
    applyRemoteSnapshot(getFollowSnapshot(joined, targetId), { replace: true });
  }, [applyCursorSnapshots, applyRemoteSnapshot, applySessionState, connect]);

  useEffect(() => {
    if (!currentUser?.id || session?.id || location.pathname.startsWith("/live-session/")) return undefined;

    const savedSessionId = localStorage.getItem(LIVE_WORKFLOW_SESSION_STORAGE_KEY);
    if (!savedSessionId) return undefined;

    let cancelled = false;
    getLiveWorkflowSession(savedSessionId)
      .then((restoredSession) => {
        if (cancelled || !restoredSession?.id || restoredSession.status !== "ACTIVE") return;
        applySessionState(restoredSession);
        applyCursorSnapshots(restoredSession?.cursors);
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
  }, [applyCursorSnapshots, applyRemoteSnapshot, applySessionState, connect, currentUser?.id, location.pathname, session?.id]);

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
    if (
      !session?.id ||
      !wsRef.current ||
      isFollowingRef.current ||
      applyingRemoteRouteRef.current ||
      Date.now() < muteOutgoingUntilRef.current
    ) {
      return undefined;
    }
    if (routeTimerRef.current) window.clearTimeout(routeTimerRef.current);
    routeTimerRef.current = window.setTimeout(() => {
      sendCurrentNavigation();
    }, 180);
    return () => window.clearTimeout(routeTimerRef.current);
  }, [location.hash, location.pathname, location.search, sendCurrentNavigation, session?.id]);

  useEffect(() => {
    if (!session?.id) return undefined;
    const handleMove = (event) => {
      lastPointerRef.current = {
        x: Math.max(0, Math.min(1, event.clientX / Math.max(window.innerWidth, 1))),
        y: Math.max(0, Math.min(1, event.clientY / Math.max(window.innerHeight, 1))),
      };
      const metrics = getWorkflowDocumentMetrics();
      lastPointerRef.current.pageXRatio = Math.max(0, Math.min(1, (metrics.scrollX + event.clientX) / metrics.width));
      lastPointerRef.current.pageYRatio = Math.max(0, Math.min(1, (metrics.scrollY + event.clientY) / metrics.height));
      const now = Date.now();
      if (now - lastCursorSentRef.current < CURSOR_SEND_INTERVAL) return;
      lastCursorSentRef.current = now;
      sendCurrentCursor();
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [sendCurrentCursor, session?.id]);

  useEffect(() => {
    if (!session?.id) return undefined;
    const timer = window.setInterval(() => {
      sendCurrentCursor();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [sendCurrentCursor, session?.id]);

  useEffect(() => {
    if (
      !session?.id ||
      isFollowingRef.current ||
      applyingRemoteRouteRef.current ||
      applyingRemoteViewportRef.current ||
      Date.now() < muteOutgoingUntilRef.current
    ) {
      return undefined;
    }
    if (shellTimerRef.current) window.clearTimeout(shellTimerRef.current);
    shellTimerRef.current = window.setTimeout(() => {
      sendCurrentNavigation();
    }, 260);
    return () => window.clearTimeout(shellTimerRef.current);
  }, [sendCurrentNavigation, session?.id, workflowActiveTabId, workflowMenuLinks, workflowSplitTabHref, workflowTabs]);

  useEffect(() => {
    if (!session?.id) return undefined;
    const handleViewportChange = () => {
      const now = Date.now();
      if (
        isFollowingRef.current ||
        applyingRemoteRouteRef.current ||
        applyingRemoteViewportRef.current ||
        now < muteOutgoingUntilRef.current ||
        now - lastViewportSentRef.current < 160 ||
        wsRef.current?.readyState !== WebSocket.OPEN
      ) {
        return;
      }
      lastViewportSentRef.current = now;
      const route = getCurrentRoute();
      const context = {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      };
      const viewportSignature = `${route}|${roundedWorkflowNumber(context.scrollX)}|${roundedWorkflowNumber(context.scrollY)}`;
      if (viewportSignature === lastViewportSignatureRef.current) return;
      lastViewportSignatureRef.current = viewportSignature;

      wsRef.current.send(JSON.stringify({
        type: "viewport.change",
        payload: { route, ...context },
      }));
      mergeUserRouteIntoSession(currentUserRef.current?.id, route, context);
    };
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    return () => window.removeEventListener("scroll", handleViewportChange);
  }, [mergeUserRouteIntoSession, session?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemoteCursors((prev) => Object.fromEntries(
        Object.entries(prev).filter(([, cursor]) => Date.now() - cursor.seenAt < REMOTE_CURSOR_TTL_MS)
      ));
    }, 5000);
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
      <LiveWorkflowMirrorShell
        visible={isFollowing && Boolean(followedShellSnapshot)}
        shell={followedShellSnapshot}
        targetName={getParticipantName(followTargetParticipant, "участником")}
      />
      <RemoteCursors cursors={Object.values(remoteCursors)} currentRoute={getCurrentRoute()} />
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
          (() => {
            const isCurrentUser = isSameLiveUser(item, currentUser);
            const isOnline = Boolean(item.online || isCurrentUser);
            return (
              <button
                type="button"
                key={item.user.id}
                title={getParticipantName(item)}
                className={`${isOnline ? "online" : ""} ${Number(item.user.id) === Number(followTargetId) ? "following" : ""}`}
                style={{ "--avatar-color": getParticipantColor(item.user.id) }}
                onClick={() => setPeopleOpen((prev) => !prev)}
              >
                {getParticipantInitials(item)}
              </button>
            );
          })()
        ))}
        {participants.length > visibleParticipants.length && <small>+{participants.length - visibleParticipants.length}</small>}
      </div>
      {isFollowing
        ? <button type="button" onClick={onStopFollowing}>Стоп</button>
        : <button type="button" onClick={onResumeFollowing} disabled={!presenter || Number(presenter.user?.id) === Number(currentUser?.id)}>Следовать</button>}
      {isPresenter && <button type="button" className="danger" onClick={onEnd}>Завершить</button>}

      <AnimatePresence>
        {isPeopleOpen && (
          <Motion.div
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
                const isCurrentUser = isSameLiveUser(item, currentUser);
                const isOnline = Boolean(item.online || isCurrentUser);
                const isFollowTarget = Number(item.user?.id) === Number(followTargetId);
                const hasRoute = Boolean(
                  isCurrentUser ||
                  userRoutesById?.[Number(item.user?.id)]?.route ||
                  Number(item.user?.id) === Number(session.presenter_user_id)
                );
                return (
                  <div key={item.user.id} className={`live-workflow-person ${isFollowTarget ? "is-follow-target" : ""}`}>
                    <span
                      className={`live-workflow-person__avatar ${isOnline ? "online" : ""}`}
                      style={{ "--avatar-color": getParticipantColor(item.user.id) }}
                    >
                      {getParticipantInitials(item)}
                    </span>
                    <div>
                      <strong>
                        {getParticipantName(item)}
                        {Number(item.user?.id) === Number(session.presenter_user_id) && <em>Ведущий</em>}
                      </strong>
                      <small>
                        {isOnline ? "онлайн" : "не в сети"}
                        {isCurrentUser ? " · текущая страница" : hasRoute ? " · можно следовать" : " · ждём маршрут"}
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
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveWorkflowMirrorShell({ visible, shell, targetName }) {
  if (!visible || !shell) return null;

  const route = shell.route || "";
  const tabs = Array.isArray(shell.tabs) ? shell.tabs : [];
  const menuLinks = Array.isArray(shell.menuLinks) ? shell.menuLinks : [];
  const activeTabId = shell.activeTabId || route;

  const renderMenuLinks = (items = [], depth = 0) => (
    items.slice(0, depth > 0 ? 8 : 14).map((item, index) => {
      const isActive = Boolean(item.href && route && (item.href === route || route.startsWith(`${item.href}/`)));
      return (
        <div key={`${item.key || item.href || item.name || "menu"}-${depth}-${index}`} className={`live-workflow-shell__menu-item ${isActive ? "active" : ""}`} style={{ "--depth": depth }}>
          <span>
            {item.hasNotification && <i />}
            {item.name || item.href || "Раздел"}
          </span>
          {item.children?.length > 0 && (
            <div className="live-workflow-shell__submenu">
              {renderMenuLinks(item.children, depth + 1)}
            </div>
          )}
        </div>
      );
    })
  );

  return (
    <Motion.aside
      className="live-workflow-shell"
      initial={{ opacity: 0, x: -12, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -12, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      aria-hidden="true"
    >
      <header className="live-workflow-shell__header">
        <div>
          <Radio size={14} />
          <strong>Workflow: {targetName}</strong>
        </div>
        <small>{route || "маршрут ещё не получен"}</small>
      </header>

      <div className="live-workflow-shell__content">
        <nav className="live-workflow-shell__menu">
          {menuLinks.length ? renderMenuLinks(menuLinks) : <span className="live-workflow-shell__empty">Меню ещё не синхронизировано</span>}
        </nav>

        <section className="live-workflow-shell__workspace">
          <div className="live-workflow-shell__tabs">
            {tabs.length ? tabs.map((tab) => {
              const isActive = tab.href === activeTabId || tab.href === route;
              return (
                <span key={tab.href} className={isActive ? "active" : ""}>
                  {tab.pinned && <b>★</b>}
                  {tab.name || tab.href}
                </span>
              );
            }) : <span className="live-workflow-shell__empty">Открытых вкладок пока нет</span>}
          </div>
          {shell.splitTabHref && (
            <div className="live-workflow-shell__split">
              <strong>RMP</strong>
              <span>{shell.splitTabHref}</span>
            </div>
          )}
        </section>
      </div>
    </Motion.aside>
  );
}

function RemoteCursors({ cursors, currentRoute }) {
  const visibleCursors = cursors.filter((cursor) => !cursor.route || !currentRoute || cursor.route === currentRoute);
  return (
    <div className="live-cursors-layer" aria-hidden="true">
      {visibleCursors.map((cursor) => {
        const position = getRemoteCursorPosition(cursor);
        return (
          <Motion.div
            key={cursor.user.id}
            className="live-remote-cursor"
            style={{ "--cursor-color": cursor.color || getParticipantColor(cursor.user.id) }}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.2 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 1.5 16.5 8 10 9.4 7.1 16.5 2 1.5Z" /></svg>
            <span>{getParticipantName(cursor.user)}</span>
          </Motion.div>
        );
      })}
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
        <Motion.div className="live-share-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Motion.div className="live-share-modal" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}>
            <header>
              <div>
                <span><Users size={18} /></span>
                <div>
                  <h2>Поделиться workflow</h2>
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
              <label>Участники с доступом</label>
              <div className="live-share-access">
                {participants.map((participant) => (
                  <div key={participant.user.id}>
                    <span className={participant.online ? "online" : ""}>{participant.user.initials}</span>
                    <strong>{participant.user.full_name || participant.user.username}</strong>
                    <small>{participant.role === "presenter" ? "Ведущий" : participant.is_following ? "Следует" : "Смотрит"}</small>
                  </div>
                ))}
              </div>
            </section>

            <footer>
              <button type="button" onClick={onCopy} disabled={!session?.id}>
                <Copy size={16} /> Скопировать ссылку
              </button>
              <button type="button" className="primary" onClick={onSend} disabled={!session?.id || !selectedEmployeeId}>
                <Send size={16} /> Отправить в чат
              </button>
            </footer>
            <div className="live-share-security"><ShieldCheck size={15} /> Сессия истекает: {invitation?.expires_at ? new Date(invitation.expires_at).toLocaleString("ru-RU") : "создаётся..."}</div>
            {statusMessage && <div className="live-share-status"><Link2 size={14} /> {statusMessage}</div>}
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
