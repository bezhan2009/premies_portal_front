import test from "node:test";
import assert from "node:assert/strict";

import {
  listInternetBankingClients,
  saveInternetBankingARM,
  saveInternetBankingClient,
  saveInternetBankingRole,
} from "./internetBanking.js";

function installFetchCapture(responseBody = {}) {
  const requests = [];
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => key === "access_token" ? "operator-token" : null };
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return {
    requests,
    restore() {
      globalThis.fetch = originalFetch;
      globalThis.localStorage = originalStorage;
    },
  };
}

test("saveInternetBankingClient sends the operator registry contract", async () => {
  const capture = installFetchCapture({ id: 1 });
  try {
    await saveInternetBankingClient({
      abs_client_code: "5400.001610",
      display_name: "ООО Тест",
      is_active: true,
      people: [{ full_name: "Иванов Иван", inn: "123456789", phones: ["+992900001122"], role_codes: ["viewer"], direct_arm_codes: [], is_active: true }],
    }, { backendUrl: "http://backend.test" });

    assert.equal(capture.requests[0].url, "http://backend.test/internet-banking/operator/clients");
    assert.equal(capture.requests[0].options.method, "POST");
    assert.equal(capture.requests[0].options.headers.Authorization, "Bearer operator-token");
    assert.deepEqual(JSON.parse(capture.requests[0].options.body).people[0].role_codes, ["viewer"]);
  } finally {
    capture.restore();
  }
});

test("internet banking catalogs use stable REST paths", async () => {
  const capture = installFetchCapture({ items: [] });
  try {
    await listInternetBankingClients({ page: 2, pageSize: 25, query: "5400" }, { backendUrl: "http://backend.test" });
    await saveInternetBankingRole({ code: "viewer", name: "Просмотр", arm_codes: [], is_active: true }, { backendUrl: "http://backend.test" });
    await saveInternetBankingARM({ code: "cards.view", name: "Карты", group: "cards", sort_order: 1, is_active: true }, { backendUrl: "http://backend.test" });

    assert.equal(capture.requests[0].url, "http://backend.test/internet-banking/operator/clients?page=2&page_size=25&query=5400");
    assert.equal(capture.requests[1].url, "http://backend.test/internet-banking/operator/roles");
    assert.equal(capture.requests[2].url, "http://backend.test/internet-banking/operator/arms");
  } finally {
    capture.restore();
  }
});
