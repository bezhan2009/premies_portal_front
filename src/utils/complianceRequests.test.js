import test from "node:test";
import assert from "node:assert/strict";

import { formatComplianceCreatedAt } from "./complianceRequests.js";

test("formatComplianceCreatedAt renders request time in Dushanbe timezone", () => {
  assert.equal(
    formatComplianceCreatedAt("2026-08-15T09:07:00Z"),
    "15.08.2026 14:07",
  );
});

test("formatComplianceCreatedAt renders a dash for an invalid timestamp", () => {
  assert.equal(formatComplianceCreatedAt("not-a-date"), "-");
  assert.equal(formatComplianceCreatedAt(null), "-");
});
