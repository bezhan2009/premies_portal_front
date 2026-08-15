const getBackendUrl = () => import.meta.env.VITE_BACKEND_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
  "Content-Type": "application/json",
});

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Ошибка выполнения запроса");
  }
  return payload;
};

export const submitFrontovikNewClient = async (questionnaire) => {
  const response = await fetch(`${getBackendUrl()}/frontovik/new-client-questionnaires`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(questionnaire),
  });
  return parseResponse(response);
};

export const fetchMyComplianceRequests = async () => {
  const response = await fetch(`${getBackendUrl()}/frontovik/compliance-requests`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
};
