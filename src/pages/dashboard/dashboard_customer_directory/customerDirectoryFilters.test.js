import test from "node:test";
import assert from "node:assert/strict";

import { buildCustomerDirectoryQuery } from "./customerDirectoryFilters.js";

test("customer directory query preserves every visible filter", () => {
  const query = buildCustomerDirectoryQuery({
    page: 3,
    filters: {
      search: "  Баротов  ",
      creatorUsername: "ABS.USER",
      departments: ["5000", "5100"],
      resident: "false",
      overdue: "false",
      terror: "clear",
      complianceScore: "4",
      sortBy: "updated_at",
      sortOrder: "asc",
    },
  });

  assert.equal(query.get("page"), "3");
  assert.equal(query.get("limit"), "30");
  assert.equal(query.get("search"), "Баротов");
  assert.equal(query.get("creator_username"), "ABS.USER");
  assert.equal(query.get("departments"), "5000,5100");
  assert.equal(query.get("resident"), "false");
  assert.equal(query.get("overdue"), "false");
  assert.equal(query.get("terror"), "clear");
  assert.equal(query.get("compliance_score"), "4");
  assert.equal(query.get("sort_by"), "updated_at");
  assert.equal(query.get("sort_order"), "asc");
});

test("customer directory query omits empty optional filters", () => {
  const query = buildCustomerDirectoryQuery({
    page: 1,
    filters: {
      search: "",
      creatorUsername: "",
      departments: [],
      resident: "",
      overdue: "",
      terror: "",
      complianceScore: "",
      sortBy: "created_at",
      sortOrder: "desc",
    },
  });

  assert.equal(query.toString(), "page=1&limit=30&sort_by=created_at&sort_order=desc");
});
