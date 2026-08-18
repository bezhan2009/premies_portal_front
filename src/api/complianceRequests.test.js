import test from "node:test";
import assert from "node:assert/strict";

import { checkTerroristList } from "./complianceRequests.js";

test("checkTerroristList sends full name and birth date to the backend screening API", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  let request;

  globalThis.localStorage = {
    getItem: (key) => (key === "access_token" ? "test-token" : null),
  };
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      match: {
        source: "external_terror_list",
        similarity: 0.82,
        data: { full_name: "Иванов Иван Иванович", birth_date: "1990-01-01" },
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const match = await checkTerroristList(
      {
        lastName: " Иванов ",
        firstName: " Иван ",
        middleName: " Иванович ",
        birthDate: "1990-01-01",
      },
      { backendUrl: "http://backend.test" },
    );

    assert.match(request.url, /\/terror-list\/best-match$/);
    assert.equal(request.options.method, "POST");
    assert.equal(request.options.headers.Authorization, "Bearer test-token");
    assert.deepEqual(JSON.parse(request.options.body), {
      name: "Иванов Иван Иванович",
      bday: "1990-01-01",
    });
    assert.equal(match.data.full_name, "Иванов Иван Иванович");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});
