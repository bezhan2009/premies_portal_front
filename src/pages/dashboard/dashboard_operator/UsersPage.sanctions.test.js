import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./UsersPage.jsx", import.meta.url), "utf8");

test("section 5 renders the full client-code directory and supports selecting a sanction code", () => {
  const section = source.slice(source.indexOf('5. Санкции'), source.indexOf('6. Страница «Клиенты»'));

  assert.match(section, /customerDepartments\.map\(\(department\)/);
  assert.match(source, /handleSanctionDepartmentChange/);
  assert.doesNotMatch(section, /selectedCustomerDepartments\.map/);
});
