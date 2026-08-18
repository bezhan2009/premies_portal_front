# Merchant POS Terminals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure POS-terminal administration and a conditional POS tab with statement and multi-terminal processing history to Frontovik.

**Architecture:** Store POS records in a new `merchant_pos_terminals` table in the Go backend, leaving the legacy QR merchant dictionary unchanged. The frontend loads terminals by ABS `client_code`, derives balance/currency from the existing ABS accounts response, and sends selected ATM IDs through an authenticated Go history gateway that validates client ownership before querying processing.

**Tech Stack:** Go 1.24, Gin, GORM/PostgreSQL, React 19, Vite, Ant Design, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-18-merchant-pos-terminals-design.md`

## Global Constraints

- Frontend changes are committed and pushed to `premies_portal_front/master`.
- Backend changes are committed and pushed to `premies_portal/main`.
- QR is deferred; POS is inserted after Deposits and before Information.
- `atm_id` is the only unique POS business field.
- Account number, client code, address, INN, and complete non-ATM row data may repeat.
- Never deduplicate stored or rendered POS records by anything other than rejecting duplicate `atm_id` at persistence.
- Keep `/merchants` and its `title`/`code` contract unchanged.
- Reuse existing statement, processing transaction table, RBAC middleware, loaders, toasts, and Ant Design dependencies.
- Do not add production mock data or unrelated refactors.

---

### Task 1: Backend POS domain and validation

**Files:**
- Create: `internal/domain/models/merchant_pos_terminal.go`
- Create: `internal/domain/repository/merchant_pos_terminal_repository.go`
- Create: `internal/domain/service/merchant_pos_terminal_service.go`
- Create: `internal/domain/service/merchant_pos_terminal_service_test.go`
- Modify: `pkg/db/migrations.go`

**Interfaces:**
- Produces: `models.MerchantPosTerminal`, `repository.MerchantPosTerminalRepository`, `service.MerchantPosTerminalService`, `service.MerchantPosHistoryProvider`.
- Repository methods accept `context.Context`; list methods return rows without deduplication.
- `History(ctx, clientCode, atmIDs, fromDate, toDate)` returns `[]map[string]interface{}` after ownership validation.

- [ ] **Step 1: Write failing service tests**

Cover normalization, required ATM/client values, identical non-ATM fields with different ATM IDs, duplicate ATM error propagation, exact client lookup multiplicity, empty history selection, duplicate request ID normalization, and foreign ATM rejection. Use an in-memory repository stub that records calls and a history-provider stub that records queried ATM IDs.

```go
func TestMerchantPosHistoryNormalizesDuplicateIDs(t *testing.T) {
    repo := &merchantPosRepositoryStub{byClient: []models.MerchantPosTerminal{
        {AtmID: "30000373", ClientCode: "10025"},
        {AtmID: "30000374", ClientCode: "10025"},
    }}
    provider := &merchantPosHistoryStub{}
    svc := NewMerchantPosTerminalService(repo, provider)
    _, err := svc.History(context.Background(), "10025", []string{"30000373", "30000373", "30000374"}, "2026-07-19", "2026-08-18")
    if err != nil { t.Fatal(err) }
    if !slices.Equal(provider.atmIDs, []string{"30000373", "30000374"}) {
        t.Fatalf("queried ATM IDs = %v", provider.atmIDs)
    }
}
```

- [ ] **Step 2: Run tests and verify RED**

Run: `go test ./internal/domain/service -run MerchantPos -count=1`

Expected: FAIL because POS domain types and constructor do not exist.

- [ ] **Step 3: Implement the model and interfaces**

Use explicit string sizes and indexes:

```go
type MerchantPosTerminal struct {
    ID            uint           `gorm:"primaryKey" json:"id"`
    CreatedAt     time.Time      `json:"created_at"`
    UpdatedAt     time.Time      `json:"updated_at"`
    DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
    AtmID         string         `gorm:"column:atm_id;size:64;not null;uniqueIndex" json:"atm_id"`
    AccountNumber string         `gorm:"size:64;index" json:"account_number"`
    ClientCode    string         `gorm:"size:64;not null;index" json:"client_code"`
    Address       string         `gorm:"size:512" json:"address"`
    INN           string         `gorm:"size:64;index" json:"inn"`
}
```

Add the model to the ordered `tables` slice in `pkg/db/migrations.go` next to `Merchants`.

- [ ] **Step 4: Implement minimal service behavior**

Define typed errors `ErrMerchantPosNotFound`, `ErrMerchantPosAtmExists`, `ErrMerchantPosInvalid`, `ErrMerchantPosEmptySelection`, and `ErrMerchantPosForeignATM`. Trim fields in one normalization helper; require ATM ID/client code; cap identifiers at 64 and address at 512 characters; compare returned ownership rows by exact ATM ID.

- [ ] **Step 5: Run service tests and verify GREEN**

Run: `go test ./internal/domain/service -run MerchantPos -count=1`

Expected: PASS.

- [ ] **Step 6: Commit backend domain**

```bash
git add internal/domain/models/merchant_pos_terminal.go internal/domain/repository/merchant_pos_terminal_repository.go internal/domain/service/merchant_pos_terminal_service.go internal/domain/service/merchant_pos_terminal_service_test.go pkg/db/migrations.go
git commit -m "feat: add merchant POS domain"
```

### Task 2: Backend persistence, processing gateway, and protected API

**Files:**
- Create: `internal/repository/postgres/merchant_pos_terminal_repository.go`
- Create: `internal/clients/processing/merchant_pos_history.go`
- Create: `internal/http/dto/merchant_pos_terminal.go`
- Create: `internal/http/handlers/merchant_pos_terminal.go`
- Create: `internal/http/handlers/merchant_pos_terminal_test.go`
- Create: `internal/routes/merchant_pos_terminal.go`
- Modify: `internal/app/app.go`
- Modify: `internal/server/service.go`
- Modify: `internal/routes/routes.go`
- Modify: `example.env`

**Interfaces:**
- Consumes: Task 1 domain/service interfaces.
- Produces: authenticated CRUD/list/client/history endpoints under `/merchant-pos-terminals`.
- `processing.NewMerchantPosHistoryClientFromEnv()` reads `PROCESSING_API_BASE_URL` and falls back to the existing processing base used by the project.

- [ ] **Step 1: Write failing handler response tests**

Use a stub service and `httptest` to assert `400` for malformed create/history input, `409` with `ATM ID уже существует`, `404` for missing POS, and `{items,total,page,limit}` list JSON. Keep middleware authorization tests at route composition level if the existing global user service prevents isolated middleware setup.

- [ ] **Step 2: Run handler tests and verify RED**

Run: `go test ./internal/http/handlers -run MerchantPos -count=1`

Expected: FAIL because handler and DTO types do not exist.

- [ ] **Step 3: Implement PostgreSQL repository**

Use injected `*gorm.DB`, `ILIKE` on PostgreSQL-compatible search fields, parameter binding, allow-listed sort columns (`atm_id`, `account_number`, `client_code`, `address`, `inn`, `created_at`, `updated_at`), `Limit`/`Offset`, and `Order("atm_id ASC")` for client lookup. Translate `SQLSTATE 23505`/`gorm.ErrDuplicatedKey` to `ErrMerchantPosAtmExists`.

- [ ] **Step 4: Implement processing history client**

For every validated ATM ID, call:

```text
GET {PROCESSING_API_BASE_URL}/api/Transactions/search-transactions?atmId=...&fromDate=...&toDate=...
```

Use `http.NewRequestWithContext`, `url.Values`, a finite client timeout, accepted wrapper keys (`data`, `items`, `transactions`, `operations`), and user-safe wrapped errors. Append all rows without deduplication.

- [ ] **Step 5: Implement DTOs and handlers**

Use snake_case JSON matching the model and these request shapes:

```go
type MerchantPosHistoryRequest struct {
    ClientCode string   `json:"clientCode" binding:"required"`
    AtmIDs     []string `json:"atmIds" binding:"required"`
    FromDate   string   `json:"fromDate"`
    ToDate     string   `json:"toDate"`
}
```

Map typed service errors to 400/404/409 and processing failures to 502 without returning raw SQL or upstream bodies.

- [ ] **Step 6: Wire role-protected routes and application dependencies**

Compose route groups in this order so `/client/:clientCode` and `/history` are not captured by `/:id`:

```go
frontovik := r.Group("/merchant-pos-terminals", auth, roles(3, 17, 35, 39))
frontovik.GET("/client/:clientCode", handler.ListByClient)
history := r.Group("/merchant-pos-terminals", auth, roles(17, 18))
history.POST("/history", handler.History)
admin := r.Group("/merchant-pos-terminals", auth, role(3))
admin.GET("")
admin.GET("/:id")
admin.POST("")
admin.PATCH("/:id")
admin.DELETE("/:id")
```

Construct repository, provider, service, and handler in `internal/app/app.go`; thread the handler through server and route initialization.

- [ ] **Step 7: Run backend tests/build and verify GREEN**

Run: `go test ./internal/domain/service ./internal/http/handlers ./internal/clients/processing -count=1`

Run: `go test ./...`

Run: `go build ./...`

Expected: all commands exit 0.

- [ ] **Step 8: Commit backend API**

```bash
git add internal example.env
git commit -m "feat: expose merchant POS API"
```

### Task 3: Frontend POS helpers and API client

**Files:**
- Create: `src/api/merchantPosTerminals.js`
- Create: `src/components/dashboard/dashboard_frontovik/posTerminalUtils.js`
- Create: `src/components/dashboard/dashboard_frontovik/posTerminalUtils.test.js`

**Interfaces:**
- Produces: `fetchMerchantPosTerminals(clientCode)`, admin CRUD/list calls, and `fetchMerchantPosHistory(payload)`.
- Produces pure helpers `buildFrontovikTabs`, `findPosAccountBalance`, `selectionState`, and `historyAtmIds`.

- [ ] **Step 1: Write failing helper tests**

```js
test("POS tab is conditional and follows deposits", () => {
  assert.deepEqual(buildFrontovikTabs([]).map(({ key }) => key), ["cards", "credits", "accounts", "deposits", "info"]);
  assert.deepEqual(buildFrontovikTabs([{ atm_id: "1" }]).map(({ key }) => key), ["cards", "credits", "accounts", "deposits", "pos", "info"]);
});
```

Also test exact string account matching, missing balance fallback, partial/all selection flags, and stable ATM ID payloads without collapsing distinct records.

- [ ] **Step 2: Run helper tests and verify RED**

Run: `node --test src/components/dashboard/dashboard_frontovik/posTerminalUtils.test.js`

Expected: FAIL because the utility module does not exist.

- [ ] **Step 3: Implement helpers and authenticated API calls**

Use the existing backend URL and Bearer token. Preserve backend arrays exactly; do not run them through `Set`, `Map`, or `filter` based on non-ATM fields. Normalize only duplicate user-selected history IDs in `historyAtmIds`.

- [ ] **Step 4: Run helper tests and verify GREEN**

Run: `node --test src/components/dashboard/dashboard_frontovik/posTerminalUtils.test.js`

Expected: PASS.

- [ ] **Step 5: Commit frontend foundation**

```bash
git add src/api/merchantPosTerminals.js src/components/dashboard/dashboard_frontovik/posTerminalUtils.js src/components/dashboard/dashboard_frontovik/posTerminalUtils.test.js
git commit -m "feat: add merchant POS frontend client"
```

### Task 4: Operator POS administration

**Files:**
- Create: `src/components/dashboard/dashboard_operator/MerchantAdminPanel.jsx`
- Create: `src/components/dashboard/dashboard_operator/table_datas/TableMerchantPosTerminals.jsx`
- Modify: `src/components/dashboard/dashboard_operator/OperatorDatas.jsx`
- Modify: `src/styles/components/Table.scss` only if existing classes cannot express the form layout.

**Interfaces:**
- Consumes: Task 3 admin API functions.
- Produces: an operator-only POS CRUD table nested under the existing Merchants area while retaining `TableCardMargents`.

- [ ] **Step 1: Add the Merchants subview wrapper**

Render two Ant Design tabs/buttons: `Справочник` for the existing `TableCardMargents` and `POS-терминалы` for the new table. Change only the `margents` case in `OperatorDatas.jsx` to render the wrapper.

- [ ] **Step 2: Implement server-side POS table behavior**

Maintain `page`, `limit`, `search`, `sortBy`, and `sortOrder`; refetch when they change. Use row key `atm_id`, columns required by the spec, an accessible create/edit modal, confirmation before delete, and existing `message.success/error` notifications. Do not coerce identifiers to numbers.

- [ ] **Step 3: Verify admin UI statically**

Run: `npx eslint src/components/dashboard/dashboard_operator/MerchantAdminPanel.jsx src/components/dashboard/dashboard_operator/table_datas/TableMerchantPosTerminals.jsx src/components/dashboard/dashboard_operator/OperatorDatas.jsx`

Expected: exit 0.

- [ ] **Step 4: Commit operator administration**

```bash
git add src/components/dashboard/dashboard_operator src/styles/components/Table.scss
git commit -m "feat: add POS administration table"
```

### Task 5: Conditional Frontovik POS cards and selector modal

**Files:**
- Create: `src/components/dashboard/dashboard_frontovik/PosTerminalsTab.jsx`
- Modify: `src/components/dashboard/dashboard_frontovik/ABSSearch.jsx`
- Modify: `src/components/dashboard/dashboard_frontovik/ClientDataTabs.jsx`
- Modify: `src/styles/ABSSearch.scss`

**Interfaces:**
- Consumes: Task 3 `fetchMerchantPosTerminals` and helper functions.
- Produces: `handleNavigateToPosHistory(atmIDs)` query navigation used by Task 6.

- [ ] **Step 1: Add request-generation-safe POS loading**

Add `posTerminals`, `isProductDataLoading`, and a monotonically increasing request ref. Clear POS on search clear/client change/direct-link reset. Fetch POS in the existing product `Promise.all`; before each state update verify that the generation/client code is still current. Persist POS only alongside its owning client code.

- [ ] **Step 2: Prevent navigation flicker and stale active tabs**

While the POS lookup is unresolved, render the existing centered Spinner instead of `ClientDataTabs`. When a resolved POS list is empty and `activeTab === "pos"`, call the established tab setter with `cards`.

- [ ] **Step 3: Render ordered conditional navigation**

Drive navigation through `buildFrontovikTabs(posTerminals)` so the exact order is Cards, Credits, Accounts, Deposits, conditional POS, Information. Keep the existing active CSS class.

- [ ] **Step 4: Implement POS cards**

Use `CreditCard`/`ScanLine` from `lucide-react`, selected ABS client name, exact ATM ID, account number, `findPosAccountBalance`, Ant Design copy toast, existing statement handler, and `key={terminal.atm_id}`. Use `—` fallbacks and the existing responsive card grid.

- [ ] **Step 5: Implement client-level history selector**

Use Ant Design `Modal`, `Checkbox`, and `Button`. Keep `selectedAtmIDs` local to the modal; reset it on open/client change. Render all terminal rows, repeated addresses included. Set Select All `checked`/`indeterminate` from the pure helper, bound the row label to the checkbox, cap list height, and disable CTA for empty selection.

- [ ] **Step 6: Verify helper tests and changed-file lint**

Run: `node --test src/components/dashboard/dashboard_frontovik/posTerminalUtils.test.js`

Run: `npx eslint src/components/dashboard/dashboard_frontovik/PosTerminalsTab.jsx src/components/dashboard/dashboard_frontovik/ABSSearch.jsx src/components/dashboard/dashboard_frontovik/ClientDataTabs.jsx`

Expected: helper tests pass; lint has no new errors in changed POS code.

- [ ] **Step 7: Commit Frontovik POS UI**

```bash
git add src/components/dashboard/dashboard_frontovik src/styles/ABSSearch.scss
git commit -m "feat: add conditional Frontovik POS tab"
```

### Task 6: Multi-POS history in the existing processing page

**Files:**
- Modify: `src/components/dashboard/dashboard_operator/processing/Transactions.jsx`
- Modify: `src/api/merchantPosTerminals.js`

**Interfaces:**
- Consumes: `fetchMerchantPosHistory({ clientCode, atmIds, fromDate, toDate })`.
- Query contract: `/processing/transactions?clientCode=<code>&atmIds=<comma-separated ids>`.

- [ ] **Step 1: Add POS-history query mode**

Read `clientCode` and `atmIds` with `useSearchParams`. If both are present, do not redirect limited Frontovik users to a stored card route. Set the visible search type to terminal history and retain the existing default 30-day date range.

- [ ] **Step 2: Auto-load validated multi-terminal history**

After default dates exist, call the Go gateway once with the concrete ATM ID array. Map returned rows through the same transaction formatting fields already used by manual/card searches, then render the existing table, chart, export, and safe toast states.

- [ ] **Step 3: Preserve existing transaction modes**

Manual card, ATM, UTRNNO, transaction type, amount, reversal, MCC, and card-BIN searches must continue through their current direct processing API functions. POS mode must not modify `allowedCardId` semantics for ordinary card history.

- [ ] **Step 4: Run changed-file lint**

Run: `npx eslint src/components/dashboard/dashboard_operator/processing/Transactions.jsx src/api/merchantPosTerminals.js`

Expected: no new lint errors.

- [ ] **Step 5: Commit multi-POS history**

```bash
git add src/components/dashboard/dashboard_operator/processing/Transactions.jsx src/api/merchantPosTerminals.js
git commit -m "feat: add validated multi-POS history"
```

### Task 7: Full verification, final commits, and push

**Files:**
- Modify only files required for minimal fixes discovered by the verification commands.

**Interfaces:**
- Produces: tested commits on backend `main` and frontend `master` pushed to `origin`.

- [ ] **Step 1: Verify backend**

Run in `premies_portal`:

```bash
gofmt -w <all changed .go files>
go test ./...
go build ./...
git diff --check
git status --short
```

- [ ] **Step 2: Verify frontend**

Run in `premies_portal_front`:

```bash
node --test src/components/dashboard/dashboard_frontovik/posTerminalUtils.test.js
npm run lint
npm run build
git diff --check
git status --short
```

If tracked build artifacts change, restore only generated files to their committed versions without touching source changes. Preserve the user's untracked `premies_portal_front.zip`.

- [ ] **Step 3: Run acceptance-focused checks**

Confirm from tests/code paths: zero POS hides tab; one POS shows one card; three identical non-ATM rows show three cards; duplicate ATM is conflict; client switching clears POS; selected ATM IDs are the only IDs sent to history.

- [ ] **Step 4: Commit minimal verification fixes**

Commit only if verification required source fixes:

```bash
git add <specific source/test files>
git commit -m "fix: complete POS verification"
```

- [ ] **Step 5: Push exact target branches**

```bash
git -C <backend> push origin main
git -C <frontend> push origin master
```

Expected: both pushes succeed and local branches report no divergence from their upstreams; the frontend archive remains untracked.
