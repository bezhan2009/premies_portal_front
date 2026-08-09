import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Check, Copy, Eye, Link2, MessageCircle, Radio, Search, Send, ShieldCheck, UserRoundCheck, Users, X } from "lucide-react";
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
import {
  LIVE_WORKFLOW_PAGE_STATE_EVENT,
  LIVE_WORKFLOW_REMOTE_PAGE_STATE_EVENT,
} from "../../utils/liveWorkflowPageState";
import "./LiveWorkflow.css";

const LiveWorkflowContext = createContext(null);
const CURSOR_SEND_INTERVAL = 40;
const REMOTE_SYNC_MUTE_MS = 1200;
const REMOTE_CURSOR_TTL_MS = 12000;
const REMOTE_SNAPSHOT_DEDUP_MS = 220;
const ONLINE_GRACE_MS = 18000;
const INPUT_SYNC_INTERVAL = 90;
const REMOTE_INPUT_TTL_MS = 12000;
const WORKFLOW_CHAT_LIMIT = 100;
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

const buildViewportContext = (extra = {}) => {
  const metrics = getWorkflowDocumentMetrics();
  const scrollableWidth = Math.max(metrics.width - metrics.viewportWidth, 1);
  const scrollableHeight = Math.max(metrics.height - metrics.viewportHeight, 1);
  return {
    scrollX: metrics.scrollX,
    scrollY: metrics.scrollY,
    scrollXRatio: Math.max(0, Math.min(1, metrics.scrollX / scrollableWidth)),
    scrollYRatio: Math.max(0, Math.min(1, metrics.scrollY / scrollableHeight)),
    viewportWidth: metrics.viewportWidth,
    viewportHeight: metrics.viewportHeight,
    documentWidth: metrics.width,
    documentHeight: metrics.height,
    ...extra,
  };
};

const getRemoteScrollTarget = (context = {}) => {
  const metrics = getWorkflowDocumentMetrics();
  const remoteScrollXRatio = Number(context?.scrollXRatio);
  const remoteScrollYRatio = Number(context?.scrollYRatio);
  const remoteScrollX = Number(context?.scrollX);
  const remoteScrollY = Number(context?.scrollY);
  const localScrollableWidth = Math.max(metrics.width - metrics.viewportWidth, 0);
  const localScrollableHeight = Math.max(metrics.height - metrics.viewportHeight, 0);

  const left = Number.isFinite(remoteScrollXRatio)
    ? remoteScrollXRatio * localScrollableWidth
    : (Number.isFinite(remoteScrollX) ? remoteScrollX : window.scrollX);
  const top = Number.isFinite(remoteScrollYRatio)
    ? remoteScrollYRatio * localScrollableHeight
    : (Number.isFinite(remoteScrollY) ? remoteScrollY : window.scrollY);

  return {
    left: clampWorkflowNumber(left, 0, localScrollableWidth),
    top: clampWorkflowNumber(top, 0, localScrollableHeight),
  };
};

const getRemoteCursorPosition = (cursor) => {
  const metrics = getWorkflowDocumentMetrics();
  const pageXRatio = Number(cursor?.pageXRatio);
  const pageYRatio = Number(cursor?.pageYRatio);
  const viewportX = Number(cursor?.x);
  const viewportY = Number(cursor?.y);

  // Viewport ratios are the stable coordinate system when participants have
  // different resolutions or when the page uses nested scroll containers.
  const x = Number.isFinite(viewportX)
    ? viewportX * metrics.viewportWidth
    : (Number.isFinite(pageXRatio) ? pageXRatio * metrics.width - metrics.scrollX : metrics.viewportWidth * 0.5);
  const y = Number.isFinite(viewportY)
    ? viewportY * metrics.viewportHeight
    : (Number.isFinite(pageYRatio) ? pageYRatio * metrics.height - metrics.scrollY : metrics.viewportHeight * 0.5);

  return {
    x: clampWorkflowNumber(x, -24, metrics.viewportWidth + 24),
    y: clampWorkflowNumber(y, -24, metrics.viewportHeight + 24),
  };
};

const cssEscapeValue = (value = "") => (
  window.CSS?.escape ? window.CSS.escape(String(value)) : String(value).replace(/["\\#.;:[\],>+~*^$|=]/g, "\\$&")
);

const isWorkflowInputTarget = (element) => {
  if (!element || !(element instanceof HTMLElement)) return false;
  if (element.closest(".live-workflow-bar, .live-workflow-people-panel, .live-share-backdrop, .live-workflow-chat-panel")) return false;
  if (element.isContentEditable) return true;
  const tagName = element.tagName?.toLowerCase();
  if (!["input", "textarea", "select"].includes(tagName)) return false;
  const type = String(element.getAttribute("type") || "").toLowerCase();
  return !["hidden", "file", "button", "submit", "reset", "image"].includes(type);
};

const isSensitiveWorkflowInput = (element) => {
  const joined = [
    element?.getAttribute?.("type"),
    element?.getAttribute?.("name"),
    element?.getAttribute?.("id"),
    element?.getAttribute?.("autocomplete"),
    element?.getAttribute?.("aria-label"),
    element?.getAttribute?.("placeholder"),
  ].filter(Boolean).join(" ").toLowerCase();
  return /password|парол|otp|token|secret|cvv|cvc|pin|пин/.test(joined);
};

const getElementNthPath = (element) => {
  const parts = [];
  let current = element;
  while (current && current.nodeType === 1 && current !== document.body && parts.length < 7) {
    const tag = current.tagName.toLowerCase();
    const siblings = Array.from(current.parentElement?.children || []).filter((item) => item.tagName === current.tagName);
    const index = Math.max(1, siblings.indexOf(current) + 1);
    parts.unshift(`${tag}:nth-of-type(${index})`);
    current = current.parentElement;
  }
  return parts.join(" > ");
};

const findWorkflowElement = (target = {}) => {
  const selectors = [];
  if (target.id) selectors.push(`#${cssEscapeValue(target.id)}`);
  if (target.path) selectors.push(target.path);
  for (const selector of selectors) {
    try {
      const found = document.querySelector(selector);
      if (found) return found;
    } catch {
      // Ignore stale selectors after navigation or a responsive layout change.
    }
  }
  return null;
};

const buildScrollableTargetContext = (eventTarget) => {
  const element = eventTarget instanceof Element ? eventTarget : null;
  if (!element || element === document.documentElement || element === document.body) return null;
  const maxLeft = Math.max(element.scrollWidth - element.clientWidth, 0);
  const maxTop = Math.max(element.scrollHeight - element.clientHeight, 0);
  if (maxLeft <= 0 && maxTop <= 0) return null;
  return {
    id: element.id || "",
    path: getElementNthPath(element),
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop,
    scrollLeftRatio: maxLeft > 0 ? element.scrollLeft / maxLeft : 0,
    scrollTopRatio: maxTop > 0 ? element.scrollTop / maxTop : 0,
  };
};

const getWorkflowInputLabel = (element) => {
  if (!element) return "";
  const id = element.getAttribute("id");
  const explicitLabel = id ? document.querySelector(`label[for="${cssEscapeValue(id)}"]`)?.innerText : "";
  return (
    explicitLabel ||
    element.closest("label")?.innerText ||
    element.getAttribute("aria-label") ||
    element.getAttribute("placeholder") ||
    element.getAttribute("name") ||
    element.getAttribute("id") ||
    element.tagName?.toLowerCase() ||
    "поле"
  ).trim().replace(/\s+/g, " ").slice(0, 80);
};

const getWorkflowInputValue = (element) => {
  if (!element) return "";
  if (isSensitiveWorkflowInput(element)) return "••••••";
  if (element.isContentEditable) return String(element.innerText || "").slice(0, 500);
  if (element.tagName?.toLowerCase() === "select") {
    return element.selectedOptions?.[0]?.textContent?.trim() || element.value || "";
  }
  if (element.type === "checkbox" || element.type === "radio") {
    return element.checked ? "выбрано" : "не выбрано";
  }
  return String(element.value || "").slice(0, 500);
};

const buildWorkflowInputPayload = (element, status = "change") => {
  const metrics = getWorkflowDocumentMetrics();
  const rect = element.getBoundingClientRect();
  const pageLeft = metrics.scrollX + rect.left;
  const pageTop = metrics.scrollY + rect.top;
  const tag = element.tagName?.toLowerCase() || "";
  const target = {
    tag,
    id: element.getAttribute("id") || "",
    name: element.getAttribute("name") || "",
    type: element.getAttribute("type") || "",
    placeholder: element.getAttribute("placeholder") || "",
    ariaLabel: element.getAttribute("aria-label") || "",
    label: getWorkflowInputLabel(element),
    path: getElementNthPath(element),
    leftRatio: pageLeft / Math.max(metrics.width, 1),
    topRatio: pageTop / Math.max(metrics.height, 1),
    widthRatio: rect.width / Math.max(metrics.width, 1),
    heightRatio: rect.height / Math.max(metrics.height, 1),
  };
  return {
    route: getCurrentRoute(),
    status,
    target,
    value: getWorkflowInputValue(element),
    sensitive: isSensitiveWorkflowInput(element),
    at: Date.now(),
  };
};

const findWorkflowInputTarget = (target = {}) => {
  const tag = ["input", "textarea", "select"].includes(target.tag) ? target.tag : "";
  const selectors = [];
  if (target.id) selectors.push(`#${cssEscapeValue(target.id)}`);
  if (target.name && tag) selectors.push(`${tag}[name="${cssEscapeValue(target.name)}"]`);
  if (target.ariaLabel && tag) selectors.push(`${tag}[aria-label="${cssEscapeValue(target.ariaLabel)}"]`);
  if (target.placeholder && tag) selectors.push(`${tag}[placeholder="${cssEscapeValue(target.placeholder)}"]`);
  if (target.path) selectors.push(target.path);

  for (const selector of selectors) {
    try {
      const found = document.querySelector(selector);
      if (found) return found;
    } catch {
      // Ignore invalid dynamic selectors.
    }
  }
  return null;
};

const setWorkflowInputNativeValue = (element, value) => {
  if (!element || element.isContentEditable) return false;
  const tag = element.tagName?.toLowerCase();
  const prototype = tag === "textarea"
    ? window.HTMLTextAreaElement?.prototype
    : tag === "select"
      ? window.HTMLSelectElement?.prototype
      : window.HTMLInputElement?.prototype;
  const setter = prototype ? Object.getOwnPropertyDescriptor(prototype, "value")?.set : null;
  if (!setter) return false;
  setter.call(element, value ?? "");
  return true;
};

const getRemoteInputPosition = (input) => {
  const metrics = getWorkflowDocumentMetrics();
  const element = findWorkflowInputTarget(input?.target);
  if (element) {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  const target = input?.target || {};
  const left = Number(target.leftRatio) * metrics.width - metrics.scrollX;
  const top = Number(target.topRatio) * metrics.height - metrics.scrollY;
  return {
    left: clampWorkflowNumber(Number.isFinite(left) ? left : 16, -20, metrics.viewportWidth - 40),
    top: clampWorkflowNumber(Number.isFinite(top) ? top : 80, -20, metrics.viewportHeight - 40),
    width: clampWorkflowNumber(Number(target.widthRatio) * metrics.width || 220, 80, metrics.viewportWidth - 32),
    height: clampWorkflowNumber(Number(target.heightRatio) * metrics.height || 40, 28, 160),
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

const mergeWorkflowUserRoutes = (currentRoutes = [], incomingRoutes = []) => {
  const merged = new Map();
  [...currentRoutes, ...incomingRoutes].forEach((item) => {
    const userId = Number(item?.user_id);
    if (!userId || !item?.route) return;
    const existing = merged.get(userId);
    if (!existing || Number(item.updated_at || 0) >= Number(existing.updated_at || 0)) {
      merged.set(userId, item);
    }
  });
  return Array.from(merged.values());
};

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
  const [remoteClicks, setRemoteClicks] = useState({});
  const [isShareOpen, setShareOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [manualFollowPausedUntil, setManualFollowPausedUntil] = useState(0);
  const [remoteInputs, setRemoteInputs] = useState({});
  const [workflowMessages, setWorkflowMessages] = useState([]);
  const [isWorkflowChatOpen, setWorkflowChatOpen] = useState(false);
  const [workflowChatText, setWorkflowChatText] = useState("");
  const [workflowChatUnread, setWorkflowChatUnread] = useState(0);
  const workflowTabs = useTabsStore((state) => state.tabs);
  const workflowActiveTabId = useTabsStore((state) => state.activeTabId);
  const workflowSplitTabHref = useTabsStore((state) => state.splitTabHref);
  const workflowMenuLinks = useNavigationStore((state) => state.links);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const connectionWatchdogRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const lastCursorSentRef = useRef(0);
  const pendingInputTimerRef = useRef(null);
  const pendingInputElementRef = useRef(null);
  const activeInputTargetRef = useRef(null);
  const applyingRemoteInputRef = useRef(false);
  const latestPageStateRef = useRef(null);
  const pendingChatMessagesRef = useRef([]);
  const lastViewportSentRef = useRef(0);
  const lastScrollTargetContextRef = useRef(null);
  const shellTimerRef = useRef(null);
  const lastPointerRef = useRef({ x: 0.5, y: 0.5 });
  const routeTimerRef = useRef(null);
  const muteOutgoingUntilRef = useRef(0);
  const lastNavigationSignatureRef = useRef("");
  const lastViewportSignatureRef = useRef("");
  const lastAppliedRemoteSnapshotRef = useRef({ key: "", at: 0 });
  const manualFollowPausedUntilRef = useRef(0);
  const applyingRemoteRouteRef = useRef(false);
  const applyingRemoteViewportRef = useRef(false);
  const isFollowingRef = useRef(false);
  const followTargetIdRef = useRef(0);
  const userRoutesRef = useRef({});
  const onlineUntilByUserRef = useRef({});
  const sessionRef = useRef(null);
  const currentUserRef = useRef(null);
  currentUserRef.current = currentUser;

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
  const isManualFollowPaused = isFollowing && manualFollowPausedUntil > Date.now();

  useEffect(() => {
    isFollowingRef.current = isFollowing;
    followTargetIdRef.current = followTargetId;
    userRoutesRef.current = userRoutesById;
    sessionRef.current = session;
    currentUserRef.current = currentUser;
  }, [currentUser, followTargetId, isFollowing, session, userRoutesById]);

  useEffect(() => {
    manualFollowPausedUntilRef.current = manualFollowPausedUntil;
  }, [manualFollowPausedUntil]);

  useEffect(() => {
    if (!manualFollowPausedUntil) return undefined;
    const timeout = Math.max(0, manualFollowPausedUntil - Date.now());
    const timer = window.setTimeout(() => {
      if (manualFollowPausedUntilRef.current <= Date.now()) {
        manualFollowPausedUntilRef.current = 0;
        setManualFollowPausedUntil(0);
      }
    }, timeout + 50);
    return () => window.clearTimeout(timer);
  }, [manualFollowPausedUntil]);

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
    pageState: latestPageStateRef.current,
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
    if (connectionWatchdogRef.current) window.clearTimeout(connectionWatchdogRef.current);
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
    if (isFollowingRef.current && Date.now() < manualFollowPausedUntilRef.current) return;
    const hasScrollValue = ["scrollX", "scrollY", "scrollXRatio", "scrollYRatio"].some((key) => Number.isFinite(Number(context?.[key])));
    const nestedTarget = context?.scrollTarget ? findWorkflowElement(context.scrollTarget) : null;
    if (!hasScrollValue && !nestedTarget) return;
    const { left, top } = getRemoteScrollTarget(context);
    const windowNeedsSync = hasScrollValue && (Math.abs(window.scrollX - left) >= 4 || Math.abs(window.scrollY - top) >= 4);
    let nestedNeedsSync = false;
    let nestedLeft = 0;
    let nestedTop = 0;
    if (nestedTarget) {
      const maxLeft = Math.max(nestedTarget.scrollWidth - nestedTarget.clientWidth, 0);
      const maxTop = Math.max(nestedTarget.scrollHeight - nestedTarget.clientHeight, 0);
      const leftRatio = Number(context.scrollTarget?.scrollLeftRatio);
      const topRatio = Number(context.scrollTarget?.scrollTopRatio);
      nestedLeft = Number.isFinite(leftRatio)
        ? clampWorkflowNumber(leftRatio, 0, 1) * maxLeft
        : clampWorkflowNumber(Number(context.scrollTarget?.scrollLeft) || 0, 0, maxLeft);
      nestedTop = Number.isFinite(topRatio)
        ? clampWorkflowNumber(topRatio, 0, 1) * maxTop
        : clampWorkflowNumber(Number(context.scrollTarget?.scrollTop) || 0, 0, maxTop);
      nestedNeedsSync = Math.abs(nestedTarget.scrollLeft - nestedLeft) >= 3 || Math.abs(nestedTarget.scrollTop - nestedTop) >= 3;
    }
    if (!windowNeedsSync && !nestedNeedsSync) return;
    muteOutgoingSync();
    applyingRemoteViewportRef.current = true;
    window.requestAnimationFrame(() => {
      if (windowNeedsSync) window.scrollTo({ left, top, behavior: "auto" });
      if (nestedNeedsSync && nestedTarget) {
        nestedTarget.scrollTo({ left: nestedLeft, top: nestedTop, behavior: "auto" });
      }
      window.setTimeout(() => {
        applyingRemoteViewportRef.current = false;
      }, 80);
    });
  }, [muteOutgoingSync]);

  const applyRemotePageState = useCallback((pageState) => {
    if (!pageState || typeof pageState !== "object") return;
    window.dispatchEvent(new CustomEvent(LIVE_WORKFLOW_REMOTE_PAGE_STATE_EVENT, { detail: pageState }));
  }, []);

  const applyRemoteInputValue = useCallback((payload) => {
    if (!payload || payload.sensitive || payload.status === "blur" || payload.route !== getCurrentRoute()) return;
    const apply = () => {
      const element = findWorkflowInputTarget(payload.target);
      if (!element || !isWorkflowInputTarget(element)) return false;
      const nextValue = payload.value ?? "";
      if (String(getWorkflowInputValue(element)) === String(nextValue)) return true;
      applyingRemoteInputRef.current = true;
      try {
        if (element.type === "checkbox" || element.type === "radio") {
          element.checked = String(nextValue) === "выбрано";
        } else if (element.isContentEditable) {
          element.textContent = String(nextValue);
        } else {
          setWorkflowInputNativeValue(element, nextValue);
        }
        const inputEvent = new Event(element.tagName?.toLowerCase() === "select" ? "change" : "input", { bubbles: true });
        Object.defineProperty(inputEvent, "liveWorkflowRemote", { value: true });
        element.dispatchEvent(inputEvent);
      } finally {
        applyingRemoteInputRef.current = false;
      }
      return true;
    };

    if (!apply()) {
      window.setTimeout(apply, 120);
      window.setTimeout(apply, 500);
    }
  }, []);

  const applyRemoteSnapshot = useCallback((snapshot, options = {}) => {
    if (!snapshot?.route) return;
    if (!options.force && isFollowingRef.current && Date.now() < manualFollowPausedUntilRef.current) return;
    const context = snapshot.context || {};
    const snapshotKey = [
      snapshot.route,
      roundedWorkflowNumber(context.scrollX),
      roundedWorkflowNumber(context.scrollY),
      roundedWorkflowNumber(context.scrollXRatio, 0.01),
      roundedWorkflowNumber(context.scrollYRatio, 0.01),
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
    const pageState = context?.shell?.pageState || context?.pageState;

    if (snapshot.route !== getCurrentRoute()) {
      applyingRemoteRouteRef.current = true;
      navigate(snapshot.route, { replace: Boolean(options.replace) });
      window.setTimeout(() => {
        applyingRemoteRouteRef.current = false;
        syncRemoteViewport(context);
        applyRemotePageState(pageState);
        window.setTimeout(() => syncRemoteViewport(context), 700);
        window.setTimeout(() => applyRemotePageState(pageState), 720);
      }, 650);
      return;
    }
    syncRemoteViewport(context);
    applyRemotePageState(pageState);
  }, [applyRemotePageState, muteOutgoingSync, navigate, syncRemoteViewport]);

  const applySessionState = useCallback((nextSession) => {
    sessionRef.current = nextSession;
    userRoutesRef.current = getSessionUserRoutesMap(nextSession);
    const currentParticipant = (nextSession?.participants || []).find(
      (item) => Number(item.user?.id) === Number(currentUserRef.current?.id),
    );
    const nextFollowTargetId = Number(
      currentParticipant?.follow_target_id || nextSession?.presenter_user_id || 0,
    );
    isFollowingRef.current = Boolean(
      currentParticipant?.is_following &&
      nextFollowTargetId &&
      nextFollowTargetId !== Number(currentUserRef.current?.id),
    );
    followTargetIdRef.current = isFollowingRef.current ? nextFollowTargetId : 0;
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

    const context = buildViewportContext({
      shell,
      ...(lastScrollTargetContextRef.current ? { scrollTarget: lastScrollTargetContextRef.current } : {}),
    });
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
        scrollXRatio: Math.max(0, Math.min(1, metrics.scrollX / Math.max(metrics.width - metrics.viewportWidth, 1))),
        scrollYRatio: Math.max(0, Math.min(1, metrics.scrollY / Math.max(metrics.height - metrics.viewportHeight, 1))),
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
          scrollXRatio: payload.scrollXRatio,
          scrollYRatio: payload.scrollYRatio,
          color: getParticipantColor(user.id),
          seenAt: Date.now(),
        };
        markParticipantOnline(user);
      });
      return next;
    });
  }, [markParticipantOnline]);

  const applyWorkflowMessages = useCallback((messages = []) => {
    if (!Array.isArray(messages)) return;
    setWorkflowMessages(messages.slice(-WORKFLOW_CHAT_LIMIT));
  }, []);

  const appendWorkflowMessage = useCallback((message) => {
    if (!message?.id && !message?.text) return;
    setWorkflowMessages((prev) => {
      if (message.id && prev.some((item) => item.id === message.id)) return prev;
      return [...prev, message].slice(-WORKFLOW_CHAT_LIMIT);
    });
    if (!isWorkflowChatOpen) {
      setWorkflowChatUnread((prev) => Math.min(prev + 1, 99));
    }
  }, [isWorkflowChatOpen]);

  const transmitInputSync = useCallback((element, status = "change") => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !isWorkflowInputTarget(element)) return;
    socket.send(JSON.stringify({
      type: status === "focus" ? "input.focus" : status === "blur" ? "input.blur" : "input.change",
      payload: buildWorkflowInputPayload(element, status),
    }));
    markParticipantOnline(currentUserRef.current);
  }, [markParticipantOnline]);

  const sendInputSync = useCallback((element, status = "change", options = {}) => {
    if (!isWorkflowInputTarget(element) || applyingRemoteInputRef.current) return;
    if (status === "change" && !options.force) {
      pendingInputElementRef.current = element;
      if (pendingInputTimerRef.current) return;
      pendingInputTimerRef.current = window.setTimeout(() => {
        pendingInputTimerRef.current = null;
        const pendingElement = pendingInputElementRef.current;
        pendingInputElementRef.current = null;
        transmitInputSync(pendingElement, "change");
      }, INPUT_SYNC_INTERVAL);
      return;
    }
    transmitInputSync(element, status);
  }, [transmitInputSync]);

  const sendPageState = useCallback((pageState, socket = wsRef.current) => {
    if (!pageState || typeof pageState !== "object") return;
    latestPageStateRef.current = pageState;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "page.state", payload: pageState }));
    markParticipantOnline(currentUserRef.current);
  }, [markParticipantOnline]);

  const sendWorkflowChatMessage = useCallback(() => {
    const text = workflowChatText.trim();
    const socket = wsRef.current;
    if (!text) return;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pendingChatMessagesRef.current.push(text);
      setStatusMessage("Сообщение будет отправлено сразу после подключения");
    } else {
      socket.send(JSON.stringify({
        type: "workflow.chat.send",
        payload: { text },
      }));
    }
    setWorkflowChatText("");
    setWorkflowChatOpen(true);
  }, [workflowChatText]);

  const toggleWorkflowChat = useCallback(() => {
    setWorkflowChatOpen((prev) => {
      const next = !prev;
      if (next) setWorkflowChatUnread(0);
      return next;
    });
  }, []);

  useEffect(() => {
    if (isWorkflowChatOpen) {
      setWorkflowChatUnread(0);
    }
  }, [isWorkflowChatOpen, workflowMessages.length]);

  const connect = useCallback(async (targetSession) => {
    if (!targetSession?.id) return;
    disconnect(true);
    shouldReconnectRef.current = true;
    sessionRef.current = targetSession;

    const scheduleReconnect = () => {
      if (!shouldReconnectRef.current) return;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      const attempt = Math.min(reconnectAttemptRef.current + 1, 8);
      reconnectAttemptRef.current = attempt;
      const timeout = Math.min(5000, 250 * 2 ** Math.max(0, attempt - 1));
      reconnectTimerRef.current = window.setTimeout(() => {
        connect(sessionRef.current || targetSession);
      }, timeout);
    };

    try {
      setStatusMessage("Подключаем live workflow...");
      const { ticket } = await createLiveWorkflowWsTicket(targetSession.id);
      const socket = new WebSocket(backendToWsURL(targetSession.id, ticket));
      wsRef.current = socket;
      connectionWatchdogRef.current = window.setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) socket.close();
      }, 5000);

      socket.onopen = () => {
        if (connectionWatchdogRef.current) window.clearTimeout(connectionWatchdogRef.current);
        reconnectAttemptRef.current = 0;
        setStatusMessage("Соединение установлено, синхронизируем workflow...");
        sendCurrentNavigation(socket, { force: true });
        sendCurrentCursor(socket);
        if (latestPageStateRef.current) sendPageState(latestPageStateRef.current, socket);
        if (activeInputTargetRef.current) sendInputSync(activeInputTargetRef.current, "focus", { force: true });
        socket.send(JSON.stringify({ type: "session.sync.request", payload: { at: Date.now() } }));
        pendingChatMessagesRef.current.splice(0).forEach((text) => {
          socket.send(JSON.stringify({ type: "workflow.chat.send", payload: { text } }));
        });
        window.setTimeout(() => sendCurrentNavigation(socket, { force: true }), 120);
        window.setTimeout(() => sendCurrentCursor(socket), 140);
      };

      socket.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.type === "connection.ready") {
          setStatusMessage("Live workflow подключён");
          markParticipantOnline(msg.user || currentUserRef.current);
          socket.send(JSON.stringify({ type: "session.sync.request", payload: { at: Date.now(), ready: true } }));
          return;
        }
        if (msg.type === "session.state") {
          applySessionState(msg.payload);
          applyCursorSnapshots(msg.payload?.cursors);
          applyWorkflowMessages(msg.payload?.messages);
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
          if (latestPageStateRef.current) sendPageState(latestPageStateRef.current);
          if (activeInputTargetRef.current) sendInputSync(activeInputTargetRef.current, "focus", { force: true });
          return;
        }
        if (msg.type === "session.sync.requested") {
          markParticipantOnline(msg.user);
          sendCurrentNavigation(undefined, { force: true });
          sendCurrentCursor();
          if (latestPageStateRef.current) sendPageState(latestPageStateRef.current);
          if (activeInputTargetRef.current) sendInputSync(activeInputTargetRef.current, "focus", { force: true });
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
            setRemoteInputs((prev) => {
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
              scrollXRatio: msg.payload?.scrollXRatio,
              scrollYRatio: msg.payload?.scrollYRatio,
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
        if (msg.type === "interaction.clicked" && Number(msg.user?.id) !== Number(currentUserRef.current?.id)) {
          const remoteUserId = Number(msg.user?.id);
          markParticipantOnline(msg.user);
          if (!remoteUserId || (msg.payload?.route && msg.payload.route !== getCurrentRoute())) return;
          const click = { user: msg.user, ...(msg.payload || {}), seenAt: Date.now() };
          setRemoteClicks((prev) => ({ ...prev, [remoteUserId]: click }));
          window.setTimeout(() => {
            setRemoteClicks((prev) => {
              if (prev[remoteUserId]?.seenAt !== click.seenAt) return prev;
              const next = { ...prev };
              delete next[remoteUserId];
              return next;
            });
          }, 900);
          return;
        }
        if (
          ["input.focused", "input.changed", "input.blurred"].includes(msg.type) &&
          Number(msg.user?.id) !== Number(currentUserRef.current?.id)
        ) {
          markParticipantOnline(msg.user);
          const remoteUserId = Number(msg.user?.id);
          if (!remoteUserId) return;
          if (msg.type === "input.blurred") {
            setRemoteInputs((prev) => {
              const next = { ...prev };
              delete next[remoteUserId];
              return next;
            });
            return;
          }
          setRemoteInputs((prev) => ({
            ...prev,
            [remoteUserId]: {
              user: msg.user,
              ...(msg.payload || {}),
              seenAt: Date.now(),
            },
          }));
          if (isFollowingRef.current && remoteUserId === Number(followTargetIdRef.current)) {
            applyRemoteInputValue(msg.payload);
          }
          return;
        }
        if (msg.type === "page.state.changed" && Number(msg.user?.id) !== Number(currentUserRef.current?.id)) {
          markParticipantOnline(msg.user);
          if (isFollowingRef.current && Number(msg.user?.id) === Number(followTargetIdRef.current)) {
            latestPageStateRef.current = msg.payload || null;
            applyRemotePageState(msg.payload);
          }
          return;
        }
        if (msg.type === "workflow.chat.message") {
          appendWorkflowMessage(msg.payload);
          markParticipantOnline(msg.user || msg.payload?.user);
          return;
        }
        if (msg.type === "session.ended") {
          setStatusMessage("Live workflow session завершён");
          setSession(null);
          setParticipants([]);
          setRemoteCursors({});
          setRemoteClicks({});
          setRemoteInputs({});
          setWorkflowMessages([]);
          setWorkflowChatUnread(0);
          localStorage.removeItem(LIVE_WORKFLOW_SESSION_STORAGE_KEY);
          disconnect(false);
        }
      };

      socket.onclose = () => {
        if (connectionWatchdogRef.current) window.clearTimeout(connectionWatchdogRef.current);
        if (wsRef.current === socket) wsRef.current = null;
        scheduleReconnect();
      };

      socket.onerror = () => {
        setStatusMessage("Переподключаем live workflow...");
        if (socket.readyState === WebSocket.CONNECTING) socket.close();
      };
    } catch {
      setStatusMessage("Переподключаем live workflow...");
      scheduleReconnect();
    }
  }, [appendWorkflowMessage, applyCursorSnapshots, applyRemoteInputValue, applyRemotePageState, applyRemoteSnapshot, applySessionState, applyWorkflowMessages, disconnect, markParticipantOnline, mergeUserRouteIntoSession, sendCurrentCursor, sendCurrentNavigation, sendInputSync, sendPageState, syncRemoteViewport]);

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
          context: buildViewportContext({ shell }),
        });
        applySessionState(response.session);
        applyCursorSnapshots(response.session?.cursors);
        applyWorkflowMessages(response.session?.messages);
        setInvitation(response.invitation);
        connect(response.session);
      } catch {
        setStatusMessage("Не удалось создать live session");
      }
    }
  }, [applyCursorSnapshots, applySessionState, applyWorkflowMessages, buildShellSnapshot, connect]);

  const joinByToken = useCallback(async (token) => {
    const joined = await joinLiveWorkflowByToken(token);
    applySessionState(joined);
    applyCursorSnapshots(joined?.cursors);
    applyWorkflowMessages(joined?.messages);
    const me = joined.participants?.find((item) => Number(item.user?.id) === Number(currentUserRef.current?.id));
    const targetId = Number(me?.follow_target_id || joined.presenter_user_id || 0);
    applyRemoteSnapshot(getFollowSnapshot(joined, targetId), { replace: true });
    await connect(joined);
  }, [applyCursorSnapshots, applyRemoteSnapshot, applySessionState, applyWorkflowMessages, connect]);

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
        applyWorkflowMessages(restoredSession?.messages);
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
  }, [applyCursorSnapshots, applyRemoteSnapshot, applySessionState, applyWorkflowMessages, connect, currentUser?.id, location.pathname, session?.id]);

  useEffect(() => {
    if (!session?.id) return undefined;
    let cancelled = false;
    const timers = [];
    const refreshSnapshot = async () => {
      try {
        const snapshot = await getLiveWorkflowSession(session.id);
        if (cancelled || !snapshot?.id) return;
        const current = sessionRef.current || {};
        const merged = {
          ...current,
          ...snapshot,
          user_routes: mergeWorkflowUserRoutes(current.user_routes, snapshot.user_routes),
        };
        applySessionState(merged);
        if (snapshot.cursors?.length) applyCursorSnapshots(snapshot.cursors);
        if (snapshot.messages?.length) applyWorkflowMessages(snapshot.messages);

        if (wsRef.current?.readyState !== WebSocket.OPEN && isFollowingRef.current) {
          const followSnapshot = getFollowSnapshot(merged, followTargetIdRef.current);
          if (followSnapshot) applyRemoteSnapshot(followSnapshot, { force: true });
        }
      } catch {
        // The WebSocket remains primary; these requests are only fast recovery.
      }
    };

    [250, 750, 1500, 3000, 6000].forEach((delay) => {
      timers.push(window.setTimeout(refreshSnapshot, delay));
    });
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [applyCursorSnapshots, applyRemoteSnapshot, applySessionState, applyWorkflowMessages, session?.id]);

  useEffect(() => {
    if (!session?.id) return undefined;
    const sendHeartbeat = () => {
      const socket = wsRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "heartbeat", payload: { at: Date.now() } }));
      }
    };
    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, 15000);
    return () => window.clearInterval(timer);
  }, [session?.id]);

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

  const resumeLiveFollowNow = useCallback(() => {
    manualFollowPausedUntilRef.current = 0;
    setManualFollowPausedUntil(0);
    const snapshot = getFollowSnapshot(sessionRef.current, followTargetIdRef.current);
    if (snapshot) {
      applyRemoteSnapshot(snapshot, { force: true });
    }
  }, [applyRemoteSnapshot]);

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
    const handlePageState = (event) => {
      const pageState = event.detail;
      if (!pageState || typeof pageState !== "object") return;
      sendPageState({ ...pageState, route: pageState.route || getCurrentRoute(), at: Date.now() });
    };
    window.addEventListener(LIVE_WORKFLOW_PAGE_STATE_EVENT, handlePageState);
    return () => window.removeEventListener(LIVE_WORKFLOW_PAGE_STATE_EVENT, handlePageState);
  }, [sendPageState]);

  useEffect(() => {
    if (!session?.id) return undefined;
    const handleClick = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest(".live-workflow-bar, .live-workflow-people-panel, .live-share-backdrop, .live-workflow-chat-panel")) return;
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({
        type: "interaction.click",
        payload: {
          route: getCurrentRoute(),
          x: Math.max(0, Math.min(1, event.clientX / Math.max(window.innerWidth, 1))),
          y: Math.max(0, Math.min(1, event.clientY / Math.max(window.innerHeight, 1))),
          label: String(target.getAttribute("aria-label") || target.textContent || "Действие").trim().replace(/\s+/g, " ").slice(0, 80),
        },
      }));
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [session?.id]);

  useEffect(() => {
    if (!session?.id) return undefined;
    const handleFocusIn = (event) => {
      const target = event.target;
      if (!isWorkflowInputTarget(target)) return;
      activeInputTargetRef.current = target;
      sendInputSync(target, "focus", { force: true });
    };
    const handleInput = (event) => {
      if (event.liveWorkflowRemote || applyingRemoteInputRef.current) return;
      const target = event.target;
      if (!isWorkflowInputTarget(target)) return;
      activeInputTargetRef.current = target;
      sendInputSync(target, "change");
    };
    const handleFocusOut = (event) => {
      const target = event.target;
      if (!isWorkflowInputTarget(target)) return;
      sendInputSync(target, "blur", { force: true });
      if (activeInputTargetRef.current === target) {
        activeInputTargetRef.current = null;
      }
    };

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleInput, true);
    document.addEventListener("focusout", handleFocusOut, true);
    return () => {
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("change", handleInput, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      if (pendingInputTimerRef.current) {
        window.clearTimeout(pendingInputTimerRef.current);
        pendingInputTimerRef.current = null;
      }
    };
  }, [sendInputSync, session?.id]);

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
    const handleViewportChange = (event) => {
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
      const scrollTarget = buildScrollableTargetContext(event.target);
      lastScrollTargetContextRef.current = scrollTarget;
      const context = buildViewportContext(scrollTarget ? { scrollTarget } : {});
      const viewportSignature = `${route}|${roundedWorkflowNumber(context.scrollX)}|${roundedWorkflowNumber(context.scrollY)}|${roundedWorkflowNumber(context.scrollYRatio, 0.01)}|${scrollTarget?.path || "window"}|${roundedWorkflowNumber(scrollTarget?.scrollTop, 4)}`;
      if (viewportSignature === lastViewportSignatureRef.current) return;
      lastViewportSignatureRef.current = viewportSignature;

      wsRef.current.send(JSON.stringify({
        type: "viewport.change",
        payload: { route, ...context },
      }));
      mergeUserRouteIntoSession(currentUserRef.current?.id, route, context);
    };
    window.addEventListener("scroll", handleViewportChange, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", handleViewportChange, { capture: true });
  }, [mergeUserRouteIntoSession, session?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemoteCursors((prev) => Object.fromEntries(
        Object.entries(prev).filter(([, cursor]) => Date.now() - cursor.seenAt < REMOTE_CURSOR_TTL_MS)
      ));
      setRemoteInputs((prev) => Object.fromEntries(
        Object.entries(prev).filter(([, input]) => Date.now() - input.seenAt < REMOTE_INPUT_TTL_MS)
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
      <RemoteCursors cursors={Object.values(remoteCursors)} currentRoute={getCurrentRoute()} />
      <RemoteClickEffects clicks={Object.values(remoteClicks)} currentRoute={getCurrentRoute()} />
      <RemoteInputOverlays inputs={Object.values(remoteInputs)} currentRoute={getCurrentRoute()} />
      <LiveWorkflowPeopleBar
        session={session}
        participants={participants}
        currentUser={currentUser}
        isPresenter={isPresenter}
        isFollowing={isFollowing}
        isFollowPaused={isManualFollowPaused}
        followTargetId={followTargetId}
        userRoutesById={userRoutesById}
        onStopFollowing={stopFollowing}
        onResumeFollowing={resumeFollowing}
        onResumeLiveFollowNow={resumeLiveFollowNow}
        onFollowUser={followUser}
        onEnd={endSession}
        isChatOpen={isWorkflowChatOpen}
        chatUnread={workflowChatUnread}
        onToggleChat={toggleWorkflowChat}
      />
      <WorkflowChatPanel
        open={isWorkflowChatOpen}
        messages={workflowMessages}
        currentUser={currentUser}
        text={workflowChatText}
        onTextChange={setWorkflowChatText}
        onSend={sendWorkflowChatMessage}
        onClose={() => setWorkflowChatOpen(false)}
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
  isFollowPaused,
  followTargetId,
  userRoutesById,
  onStopFollowing,
  onResumeFollowing,
  onResumeLiveFollowNow,
  onFollowUser,
  onEnd,
  isChatOpen,
  chatUnread,
  onToggleChat,
}) {
  const [isPeopleOpen, setPeopleOpen] = useState(false);
  if (!session) return null;

  const presenter = participants.find((item) => Number(item.user?.id) === Number(session.presenter_user_id));
  const followTarget = participants.find((item) => Number(item.user?.id) === Number(followTargetId));
  const visibleParticipants = participants.slice(0, 5);
  const title = isFollowing
    ? isFollowPaused
      ? `Пауза следования за ${getParticipantName(followTarget, "участником")}`
      : `Следуете за ${getParticipantName(followTarget, "участником")}`
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
      {isFollowing ? (
        <>
          {isFollowPaused && <button type="button" onClick={onResumeLiveFollowNow}>Продолжить</button>}
          <button type="button" onClick={onStopFollowing}>Стоп</button>
        </>
      ) : (
        <button type="button" onClick={onResumeFollowing} disabled={!presenter || Number(presenter.user?.id) === Number(currentUser?.id)}>Следовать</button>
      )}
      <button type="button" className={`live-workflow-chat-toggle ${isChatOpen ? "active" : ""}`} onClick={onToggleChat}>
        <MessageCircle size={14} />
        Чат
        {chatUnread > 0 && <b>{chatUnread}</b>}
      </button>
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
                const isFollowTarget = Number(item.user?.id) === Number(followTargetId);
                const hasRoute = Boolean(
                  isCurrentUser ||
                  userRoutesById?.[Number(item.user?.id)]?.route ||
                  Number(item.user?.id) === Number(session.presenter_user_id)
                );
                const isOnline = Boolean(item.online || isCurrentUser || (isFollowTarget && hasRoute));
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

function RemoteInputOverlays({ inputs, currentRoute }) {
  const visibleInputs = inputs.filter((input) => input?.route === currentRoute);
  if (!visibleInputs.length) return null;

  return (
    <div className="live-inputs-layer" aria-hidden="true">
      {visibleInputs.map((input) => {
        const position = getRemoteInputPosition(input);
        const color = getParticipantColor(input.user?.id);
        return (
          <Motion.div
            key={input.user?.id || `${input.target?.path}-${input.at}`}
            className="live-remote-input"
            style={{
              "--input-color": color,
              left: position.left,
              top: position.top,
              width: position.width,
              height: position.height,
            }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <span className="live-remote-input__ring" />
            <div className="live-remote-input__bubble">
              <strong>{getParticipantName(input.user)} печатает</strong>
              <small>{input.target?.label || "поле"}</small>
              <p>{input.sensitive ? "Скрытое поле" : input.value || "..."}</p>
            </div>
          </Motion.div>
        );
      })}
    </div>
  );
}

function RemoteClickEffects({ clicks, currentRoute }) {
  const visibleClicks = clicks.filter((click) => !click.route || click.route === currentRoute);
  if (!visibleClicks.length) return null;
  return (
    <div className="live-clicks-layer" aria-hidden="true">
      {visibleClicks.map((click) => (
        <Motion.div
          key={`${click.user?.id}-${click.seenAt}`}
          className="live-remote-click"
          style={{
            "--click-color": getParticipantColor(click.user?.id),
            left: `${clampWorkflowNumber(Number(click.x) || 0, 0, 1) * 100}%`,
            top: `${clampWorkflowNumber(Number(click.y) || 0, 0, 1) * 100}%`,
          }}
          initial={{ opacity: 1, scale: 0.35 }}
          animate={{ opacity: 0, scale: 1.9 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function WorkflowChatPanel({ open, messages, currentUser, text, onTextChange, onSend, onClose }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, open]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSend();
  };

  return (
    <Motion.aside
      className="live-workflow-chat-panel"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
    >
      <header>
        <strong><MessageCircle size={16} /> Чат workflow</strong>
        <button type="button" onClick={onClose}><X size={15} /></button>
      </header>
      <div className="live-workflow-chat-list" ref={listRef}>
        {messages.length ? messages.map((message) => {
          const mine = Number(message.user?.id) === Number(currentUser?.id);
          return (
            <div key={message.id || `${message.created_at}-${message.text}`} className={`live-workflow-chat-message ${mine ? "mine" : ""}`}>
              <span>{getParticipantName(message.user)}</span>
              <p>{message.text}</p>
              <small>{message.created_at ? new Date(message.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}</small>
            </div>
          );
        }) : (
          <div className="live-workflow-chat-empty">
            Здесь можно обсуждать текущий workflow, не выходя со страницы.
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Напишите сообщение..."
          maxLength={1000}
        />
        <button type="submit" disabled={!text.trim()}><Send size={15} /></button>
      </form>
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
