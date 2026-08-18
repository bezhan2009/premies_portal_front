import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNewClientStatusReasons,
  getComplianceLookupStateForScreening,
  isQuestionnaireFieldValid,
  isTerrorScreeningReady,
} from "./newClientFormUtils.js";

test("empty optional middle name does not reduce questionnaire completion", () => {
  assert.equal(
    isQuestionnaireFieldValid(
      { name: "middle_name", optional: true },
      { middle_name: "" },
    ),
    true,
  );
});

test("terror screening is ready without a middle name", () => {
  assert.equal(
    isTerrorScreeningReady({
      lastName: "Иванов",
      firstName: "Иван",
      middleName: "",
      birthDate: "1990-01-01",
    }),
    true,
  );
});

test("white-list status suppresses an external terrorist match", () => {
  const reasons = buildNewClientStatusReasons({
    complianceCheck: { state: "checked", matched: true, listType: "white" },
    terrorScreening: { state: "matched", match: { similarity: 0.91 } },
    isWhiteListed: true,
    values: { is_resident: true, fatca: false, apl_pzl: false },
  });

  assert.ok(reasons.some(({ text }) => text.includes("белом списке")));
  assert.ok(reasons.every(({ text }) => !text.includes("террористическом")));
});

test("black-list status does not suppress an external terrorist match", () => {
  const reasons = buildNewClientStatusReasons({
    complianceCheck: { state: "checked", matched: true, listType: "black" },
    terrorScreening: { state: "matched", match: { similarity: 0.91 } },
    values: { is_resident: true, fatca: false, apl_pzl: false },
  });

  assert.ok(reasons.some(({ text }) => text.includes("черных списках")));
  assert.ok(reasons.some(({ text }) => text.includes("террористическом")));
});

test("terror screening waits for the current numeric INN compliance lookup", () => {
  assert.deepEqual(
    getComplianceLookupStateForScreening({
      identifier: "123456789",
      isResident: true,
      complianceCheck: { state: "loading", identifier: "123456789" },
    }),
    { pending: true, isWhiteListed: false },
  );
  assert.deepEqual(
    getComplianceLookupStateForScreening({
      identifier: "987654321",
      isResident: true,
      complianceCheck: { state: "checked", identifier: "123456789", listType: "black" },
    }),
    { pending: true, isWhiteListed: false },
  );
});

test("confirmed white-list result unlocks the gate and suppresses screening", () => {
  assert.deepEqual(
    getComplianceLookupStateForScreening({
      identifier: "123456789",
      isResident: true,
      complianceCheck: {
        state: "checked",
        identifier: "123456789",
        matched: true,
        listType: "white",
      },
    }),
    { pending: false, isWhiteListed: true },
  );
});

test("screening stays gated for an incomplete resident INN but not a valid foreign identifier", () => {
  assert.deepEqual(
    getComplianceLookupStateForScreening({ identifier: "12345", isResident: true }),
    { pending: true, isWhiteListed: false },
  );
  assert.deepEqual(
    getComplianceLookupStateForScreening({ identifier: "AB-123456", isResident: false }),
    { pending: false, isWhiteListed: false },
  );
});

test("pending compliance lookup hides a stale terrorist match status", () => {
  const reasons = buildNewClientStatusReasons({
    complianceCheck: {
      state: "checked",
      identifier: "123456789",
      matched: true,
      listType: "white",
    },
    terrorScreening: { state: "matched", match: { similarity: 0.91 } },
    complianceLookupPending: true,
    values: { is_resident: true, fatca: false, apl_pzl: false },
  });

  assert.ok(reasons.every(({ text }) => !text.includes("террористическом")));
  assert.ok(reasons.every(({ text }) => !text.includes("белом списке")));
});

test("foreign identifier transition does not reuse a stale numeric white-list status", () => {
  const reasons = buildNewClientStatusReasons({
    complianceCheck: {
      state: "checked",
      identifier: "123456789",
      matched: true,
      listType: "white",
    },
    terrorScreening: { state: "matched", match: { similarity: 0.91 } },
    complianceLookupPending: false,
    isWhiteListed: false,
    values: { is_resident: false, fatca: false, apl_pzl: false },
  });

  assert.ok(reasons.every(({ text }) => !text.includes("белом списке")));
  assert.ok(reasons.some(({ text }) => text.includes("террористическом")));
});
