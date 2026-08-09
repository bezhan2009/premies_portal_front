export const LIVE_WORKFLOW_INVITATION_TYPE = "live_workflow_invitation";

const FORWARD_PREFIX_PATTERNS = [
  new RegExp("^\\u041f\\u0435\\u0440\\u0435\\u0441\\u043b\\u0430\\u043d\\u043e \\u043e\\u0442 [^:\\n]+(:\\n?|\\n)?"),
];

const stripForwardPrefix = (value = "") => {
  let text = String(value || "").trim();
  text = text.replace(/^<!--fwd:\d+:.+?-->/, "").trimStart();
  return FORWARD_PREFIX_PATTERNS
    .reduce((nextText, pattern) => nextText.replace(pattern, ""), text)
    .trim();
};

export const parseLiveWorkflowInvitation = (message) => {
  if (!message) return null;
  if (typeof message === "object") {
    return message.type === LIVE_WORKFLOW_INVITATION_TYPE ? message : null;
  }

  const cleanText = stripForwardPrefix(message);
  if (!cleanText.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(cleanText);
    return parsed?.type === LIVE_WORKFLOW_INVITATION_TYPE ? parsed : null;
  } catch {
    return null;
  }
};

export const isLiveWorkflowInvitationMessage = (message) => Boolean(parseLiveWorkflowInvitation(message));

export const getLiveWorkflowMessagePreview = (message, fallback = "\u0412\u043b\u043e\u0436\u0435\u043d\u0438\u0435") => {
  const invitation = parseLiveWorkflowInvitation(message);
  if (!invitation) {
    const cleanText = stripForwardPrefix(message);
    return cleanText || fallback;
  }

  const inviter = invitation.invitedBy ? `${invitation.invitedBy}: ` : "";
  const route = invitation.route ? ` \u00b7 ${invitation.route}` : "";
  return `${inviter}\u043f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u0432 Live workflow${route}`;
};
