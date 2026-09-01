import test from "node:test";
import assert from "node:assert/strict";

import { buildClientPayload, normalizeInternetBankingPhone } from "./internetBankingForm.js";

test("buildClientPayload preserves multiple people and multi-select assignments", () => {
  const payload = buildClientPayload({
    absClientCode: " 5400.001610 ",
    displayName: " ООО Тест ",
    isActive: true,
    people: [
      { fullName: " Иванов  Иван ", inn: " 123456789 ", phones: ["900001122", "+992900003344"], roleCodes: ["viewer"], directArmCodes: ["cards.block"], isActive: true },
      { fullName: "Петров Пётр", inn: "987654321", phones: ["+992900005566"], roleCodes: ["card_operator", "viewer"], directArmCodes: [], isActive: true },
    ],
  });

  assert.equal(payload.abs_client_code, "5400.001610");
  assert.equal(payload.people.length, 2);
  assert.deepEqual(payload.people[0].phones, ["+992900001122", "+992900003344"]);
  assert.deepEqual(payload.people[1].role_codes, ["card_operator", "viewer"]);
  assert.deepEqual(payload.people[0].direct_arm_codes, ["cards.block"]);
});

test("normalizeInternetBankingPhone rejects unsupported and incomplete values", () => {
  assert.equal(normalizeInternetBankingPhone("(900) 00-11-22"), "+992900001122");
  assert.throws(() => normalizeInternetBankingPhone("123"), /номер телефона/i);
  assert.throws(() => normalizeInternetBankingPhone("+99290ABC1122"), /номер телефона/i);
});
