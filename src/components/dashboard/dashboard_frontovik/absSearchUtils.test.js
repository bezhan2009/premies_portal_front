import test from "node:test";
import assert from "node:assert/strict";

import { resolveClientSearch } from "./absSearchUtils.js";

test("client code overrides a mistakenly selected name search", () => {
  assert.deepEqual(
    resolveClientSearch(" 5400.001610 ", "byName"),
    {
      searchValue: "5400.001610",
      searchType: "client/info/client-index?clientIndex=",
    },
  );
});

test("regular full name keeps the selected name search", () => {
  assert.deepEqual(
    resolveClientSearch(" Хошимов Хабибулло ", "byName"),
    {
      searchValue: "Хошимов Хабибулло",
      searchType: "byName",
    },
  );
});
