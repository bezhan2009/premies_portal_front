import test from "node:test";
import assert from "node:assert/strict";

import { documentScopeOptions, scopedDocumentUrl } from "./clientDocumentScope.js";

test("selected Frontovik client is carried to document requests", () => {
  assert.deepEqual(documentScopeOptions(" 5000.153975 "), {
    params: { clientIndex: "5000.153975" },
  });
});

test("INN-only document searches do not invent a client selection", () => {
  assert.deepEqual(documentScopeOptions(""), {});
  assert.deepEqual(documentScopeOptions(undefined), {});
});

test("protected document preview keeps its URL and carries the selected client", () => {
  assert.equal(
    scopedDocumentUrl("http://daily.test/uploads/client_documents/123/passport.jpg?view=1", "5100.052139"),
    "http://daily.test/uploads/client_documents/123/passport.jpg?view=1&clientIndex=5100.052139",
  );
});
