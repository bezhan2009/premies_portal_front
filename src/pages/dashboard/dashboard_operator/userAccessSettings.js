export function buildUserAccessPayload(departments, approvers, canApprove, creator) {
  if (canApprove && departments.length && approvers.some(code => !departments.includes(code))) {
    throw new Error("Подразделения санкций должны входить в доступ сотрудника. Проверьте разделы 4 и 5.");
  }
  return { department_codes: departments, approver_departments: canApprove ? approvers : [], creator_username: creator.trim() };
}

export function selectApproverDepartment(departments, code) {
  return !departments.length || departments.includes(code) ? departments : [...departments, code];
}

export async function saveUserPermissions(canApprove, saveRoles, saveAccess) {
  if (canApprove) {
    await saveAccess();
    await saveRoles();
  } else {
    await saveRoles();
    await saveAccess();
  }
}

export async function readUserManagementResponse(response, fallback) {
  const text = await response.text();
  let data = null;
  let malformed = false;
  try { data = text ? JSON.parse(text) : null; } catch { malformed = true; }
  if (!response.ok) throw new Error(data?.error || data?.message || `${fallback} (HTTP ${response.status})`);
  if (malformed) throw new Error(`${fallback}: сервер вернул некорректный ответ`);
  return data;
}
