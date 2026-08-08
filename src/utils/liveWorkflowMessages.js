export const LIVE_WORKFLOW_INVITATION_TYPE = "live_workflow_invitation";

const stripForwardPrefix = (value = "") => {
  let text = String(value || "").trim();
  text = text.replace(/^<!--fwd:\d+:.+?-->/, "").trimStart();
  return text
    .replace(/^Переслано от [^:\n]+(:\n?|\n)?/, "")
    .replace(/^РџРµСЂРµСЃР»Р°РЅРѕ РѕС‚ [^:\n]+(:\n?|\n)?/, "")
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

export const getLiveWorkflowMessagePreview = (message, fallback = "Вложение") => {
  const invitation = parseLiveWorkflowInvitation(message);
  if (!invitation) {
    const cleanText = stripForwardPrefix(message);
    return cleanText || fallback;
  }

  const inviter = invitation.invitedBy ? `${invitation.invitedBy}: ` : "";
  const route = invitation.route ? ` · ${invitation.route}` : "";
  return `${inviter}приглашение в Live workflow${route}`;
};

