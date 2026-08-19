const resolveBackendUrl = (options = {}) => (
  options.backendUrl ?? import.meta.env?.VITE_BACKEND_URL ?? ""
).replace(/\/$/, "");

const authHeaders = (includeJSON = false) => {
  const headers = { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` };
  if (includeJSON) headers["Content-Type"] = "application/json";
  return headers;
};

async function requestInternetBanking(path, requestOptions = {}, options = {}) {
  const response = await fetch(`${resolveBackendUrl(options)}${path}`, requestOptions);
  if (response.status === 204) return null;
  const contentType = response.headers.get("Content-Type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(body?.error || body?.message || "Не удалось выполнить операцию");
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

const operatorPath = "/internet-banking/operator";

export function listInternetBankingClients(filters = {}, options = {}) {
  const query = new URLSearchParams({
    page: String(filters.page || 1),
    page_size: String(filters.pageSize || 20),
  });
  if (filters.query?.trim()) query.set("query", filters.query.trim());
  return requestInternetBanking(`${operatorPath}/clients?${query}`, { headers: authHeaders() }, options);
}

export function getInternetBankingClient(id, options = {}) {
  return requestInternetBanking(`${operatorPath}/clients/${encodeURIComponent(id)}`, { headers: authHeaders() }, options);
}

export function saveInternetBankingClient(payload, options = {}) {
  const id = payload.id ?? payload.client_id;
  const body = {
    abs_client_code: payload.abs_client_code,
    display_name: payload.display_name || "",
    is_active: payload.is_active !== false,
    people: (payload.people || []).map((person) => ({
      ...(person.person_id ? { person_id: person.person_id } : {}),
      full_name: person.full_name,
      inn: person.inn,
      phones: person.phones || [],
      role_codes: person.role_codes || [],
      direct_arm_codes: person.direct_arm_codes || [],
      is_active: person.is_active !== false,
    })),
  };
  return requestInternetBanking(`${operatorPath}/clients${id ? `/${encodeURIComponent(id)}` : ""}`, {
    method: id ? "PUT" : "POST",
    headers: authHeaders(true),
    body: JSON.stringify(body),
  }, options);
}

export function setInternetBankingClientStatus(id, isActive, options = {}) {
  return requestInternetBanking(`${operatorPath}/clients/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ is_active: Boolean(isActive) }),
  }, options);
}

export function listInternetBankingRoles(options = {}) {
  return requestInternetBanking(`${operatorPath}/roles`, { headers: authHeaders() }, options);
}

export function saveInternetBankingRole(payload, options = {}) {
  const isUpdate = Boolean(payload.persisted || payload.ID || payload.id);
  return requestInternetBanking(`${operatorPath}/roles${isUpdate ? `/${encodeURIComponent(payload.code)}` : ""}`, {
    method: isUpdate ? "PUT" : "POST",
    headers: authHeaders(true),
    body: JSON.stringify({
      code: payload.code,
      name: payload.name,
      description: payload.description || "",
      arm_codes: payload.arm_codes || [],
      is_active: payload.is_active !== false,
    }),
  }, options);
}

export function listInternetBankingARMs(options = {}) {
  return requestInternetBanking(`${operatorPath}/arms`, { headers: authHeaders() }, options);
}

export function saveInternetBankingARM(payload, options = {}) {
  const isUpdate = Boolean(payload.persisted || payload.ID || payload.id);
  return requestInternetBanking(`${operatorPath}/arms${isUpdate ? `/${encodeURIComponent(payload.code)}` : ""}`, {
    method: isUpdate ? "PUT" : "POST",
    headers: authHeaders(true),
    body: JSON.stringify({
      code: payload.code,
      name: payload.name,
      description: payload.description || "",
      group: payload.group,
      sort_order: Number(payload.sort_order || 0),
      is_active: payload.is_active !== false,
    }),
  }, options);
}

export function listInternetBankingAudit(filters = {}, options = {}) {
  const query = new URLSearchParams({
    page: String(filters.page || 1),
    page_size: String(filters.pageSize || 20),
  });
  return requestInternetBanking(`${operatorPath}/audit?${query}`, { headers: authHeaders() }, options);
}
