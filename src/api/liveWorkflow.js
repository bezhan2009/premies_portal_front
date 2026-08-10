import { apiClient } from "./utils/apiClient";

export const getLiveWorkflowUsers = async () => {
  const { data } = await apiClient.get("/users/emails");
  return data?.users || [];
};

export const createLiveWorkflowSession = async ({ route, context = {} }) => {
  const { data } = await apiClient.post("/api/live-workflows", { route, context });
  return data;
};

export const getLiveWorkflowSession = async (sessionId) => {
  const { data } = await apiClient.get(`/api/live-workflows/${sessionId}`, { timeout: 3000 });
  return data;
};

export const inviteLiveWorkflowUser = async (sessionId, targetUserId) => {
  const payload = targetUserId ? { target_user_id: Number(targetUserId) } : {};
  const { data } = await apiClient.post(`/api/live-workflows/${sessionId}/invite`, payload, { timeout: 5000 });
  return data;
};

export const joinLiveWorkflowByToken = async (token) => {
  const { data } = await apiClient.post("/api/live-workflows/join", { token }, { timeout: 5000 });
  return data;
};

export const createLiveWorkflowWsTicket = async (sessionId) => {
  const { data } = await apiClient.post(`/api/live-workflows/${sessionId}/ws-ticket`, null, { timeout: 2500 });
  return data;
};

export const updateLiveWorkflowFollowMode = async (sessionId, isFollowing, followTargetId = null) => {
  const payload = { is_following: Boolean(isFollowing) };
  if (followTargetId) {
    payload.follow_target_id = Number(followTargetId);
  }
  const { data } = await apiClient.post(`/api/live-workflows/${sessionId}/follow`, payload);
  return data;
};

export const endLiveWorkflowSession = async (sessionId) => {
  await apiClient.delete(`/api/live-workflows/${sessionId}`);
};

export const sendLiveWorkflowChatInvite = async ({ recipientId, message }) => {
  const { data } = await apiClient.post("/api/feedback", {
    message,
    recipient_id: Number(recipientId),
  }, { timeout: 5000 });
  return data;
};
