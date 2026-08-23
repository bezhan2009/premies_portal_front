const ABS_CLIENT_CODE_PATTERN = /^[0-9]+(?:\.[0-9]+)*$/;

export function normalizeInternetBankingPhone(value) {
  const raw = String(value || "").trim();
  if (/[^0-9+()\s-]/.test(raw)) {
    throw new Error("Некорректный номер телефона");
  }
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 9) digits = `992${digits}`;
  if (digits.length !== 12 || !digits.startsWith("992")) {
    throw new Error("Номер телефона должен быть в формате +992XXXXXXXXX");
  }
  return `+${digits}`;
}

const unique = (values) => [...new Set((values || []).filter(Boolean))];
const cleanName = (value) => String(value || "").trim().replace(/\s+/g, " ");

export function buildClientPayload(values, clientId) {
  const absClientCode = String(values.absClientCode || "").trim();
  if (!ABS_CLIENT_CODE_PATTERN.test(absClientCode)) {
    throw new Error("Укажите корректный код клиента в АБС");
  }
  if (!Array.isArray(values.people) || values.people.length === 0) {
    throw new Error("Добавьте хотя бы одного пользователя");
  }

  const people = values.people.map((person, index) => {
    const fullName = cleanName(person.fullName);
    const inn = String(person.inn || "").trim();
    if (!fullName || !inn) {
      throw new Error(`Заполните ФИО и ИНН пользователя ${index + 1}`);
    }
    const phones = unique((person.phones || []).map(normalizeInternetBankingPhone));
    if (phones.length === 0) {
      throw new Error(`Добавьте номер телефона пользователя ${index + 1}`);
    }
    return {
      ...(person.personId ? { person_id: person.personId } : {}),
      full_name: fullName,
      inn,
      phones,
      role_codes: unique(person.roleCodes),
      direct_arm_codes: unique(person.directArmCodes),
      is_active: person.isActive !== false,
    };
  });

  return {
    ...(clientId ? { id: clientId } : {}),
    abs_client_code: absClientCode,
    display_name: cleanName(values.displayName),
    is_active: values.isActive !== false,
    people,
  };
}

export function clientToForm(client) {
  return {
    absClientCode: client?.abs_client_code || "",
    displayName: client?.display_name || "",
    isActive: client?.is_active !== false,
    people: (client?.people || []).map((person) => ({
      personId: person.id,
      fullName: person.full_name || "",
      inn: person.inn || "",
      phones: person.phones || [],
      roleCodes: (person.roles || []).map((role) => role.code),
      directArmCodes: (person.direct_arms || []).map((arm) => arm.code),
      isActive: person.is_active !== false,
    })),
  };
}

export const emptyInternetBankingPerson = () => ({
  fullName: "",
  inn: "",
  phones: [],
  roleCodes: [],
  directArmCodes: [],
  isActive: true,
});
