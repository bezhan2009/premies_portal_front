import test from "node:test";
import assert from "node:assert/strict";

import {
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
