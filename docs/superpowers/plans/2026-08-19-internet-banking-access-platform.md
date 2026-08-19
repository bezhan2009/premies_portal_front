# Internet Banking Access Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver operator-managed Internet Banking access, SMS OTP registration, phone/password authentication, server-enforced ARM permissions, an ABS product dashboard, and repeatable deployment.

**Architecture:** Daily Portal owns access, accounts, OTP, catalogs, and privileged banking adapters. Internet Banking backend is the browser-facing gateway. ABS service exposes a narrow service-token-protected read API. Both frontends consume versioned APIs and never decide authorization by themselves.

**Tech Stack:** Go 1.26, Gin, GORM, PostgreSQL, Redis, bcrypt/JWT, React 19, Vite, Next.js 16, TypeScript, Vitest, Docker Compose, PowerShell deployment controller.

**Spec:** `docs/superpowers/specs/2026-08-19-internet-banking-access-platform-design.md`

## Global Constraints

- Daily Portal role `43` is named `Интернет банк` and is the only role granting operator access to `/internet-bank`.
- Phone login is normalized to `+992XXXXXXXXX`; one phone identifies one person globally.
- Registration OTP contains exactly four decimal digits, expires after five minutes, allows five checks, has a 60-second resend cooldown, and is single-use.
- Passwords contain at least 10 characters, one letter, and one digit and are stored only as bcrypt hashes.
- A person may access several ABS client codes; a browser-supplied ABS code is never trusted.
- Effective ARM access is the union of active direct ARMs and active ARMs inherited from active roles; inactive records deny access.
- Employee JWTs and repository/service credentials are never exposed to Internet Banking clients or committed to Git.
- Existing employee-facing Daily Portal and ABS routes remain backward compatible.
- All behavior changes use red-green-refactor: no production implementation before a failing test demonstrates the requirement.

---

### Task 1: Daily Portal Internet Banking Schema and Seed Data

**Files:**
- Create: `../premies_portal/internal/domain/models/internet_banking.go`
- Create: `../premies_portal/internal/domain/models/seeds/internet_banking.go`
- Create: `../premies_portal/internal/domain/models/seeds/internet_banking_test.go`
- Modify: `../premies_portal/internal/domain/models/seeds/usecase.go`
- Modify: `../premies_portal/internal/domain/models/seeds/roles.go`
- Modify: `../premies_portal/pkg/db/migrations.go`

**Interfaces:**
- Produces: GORM models `InternetBankingClient`, `InternetBankingPerson`, `InternetBankingPersonPhone`, `InternetBankingClientAccess`, `InternetBankingARM`, `InternetBankingRole`, `InternetBankingAccount`, and `InternetBankingAuditEvent`.
- Produces: `SeedInternetBankingCatalogs(db *gorm.DB) error`.

- [ ] **Step 1: Write failing schema and seed tests**

```go
func TestInternetBankingSeedsContainStableRoleAndARMKeys(t *testing.T) {
    require.Equal(t, "Интернет банк", RoleNameByID(43))
    require.Contains(t, InternetBankingARMCodes(), "cards.block")
    require.Contains(t, InternetBankingARMCodes(), "cards.subscriptions.manage")
    require.Contains(t, InternetBankingARMCodes(), "credits.repay.early")
    require.Contains(t, InternetBankingRoleCodes(), "full_access")
}

func TestInternetBankingFullAccessContainsEverySeededARM(t *testing.T) {
    require.ElementsMatch(t, InternetBankingARMCodes(), InternetBankingRoleARMCodes("full_access"))
}
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd ../premies_portal && go test ./internal/domain/models/seeds -run InternetBanking -count=1`

Expected: compilation fails because the Internet Banking seed helpers do not exist.

- [ ] **Step 3: Add models, stable codes, joins, migration order, and seeds**

Use explicit join models with unique composite indexes and no JSON arrays. The core model relationships are:

```go
type InternetBankingClientAccess struct {
    gorm.Model
    ClientID uint `gorm:"not null;uniqueIndex:ux_ib_client_person"`
    PersonID uint `gorm:"not null;uniqueIndex:ux_ib_client_person"`
    IsActive bool `gorm:"not null;default:true"`
    Roles    []InternetBankingRole `gorm:"many2many:internet_banking_access_roles"`
    DirectARMs []InternetBankingARM `gorm:"many2many:internet_banking_access_arms"`
    CreatedByUserID uint `gorm:"not null"`
    UpdatedByUserID uint `gorm:"not null"`
}

type InternetBankingAccount struct {
    gorm.Model
    PersonID uint `gorm:"not null;uniqueIndex"`
    LoginPhoneID uint `gorm:"not null;uniqueIndex"`
    PasswordHash string `gorm:"type:varchar(255);not null" json:"-"`
    IsActive bool `gorm:"not null;default:true"`
    SessionVersion uint64 `gorm:"not null;default:1"`
    RegisteredAt *time.Time
    LastLoginAt *time.Time
}
```

Seed role 43 through the existing `Roles` list and seed every ARM and role bundle from the approved spec with stable string codes.

- [ ] **Step 4: Run schema and seed tests GREEN**

Run: `cd ../premies_portal && go test ./internal/domain/models/seeds -run InternetBanking -count=1`

Expected: PASS.

- [ ] **Step 5: Run migration package tests and commit**

Run: `cd ../premies_portal && go test ./pkg/db ./internal/domain/models/seeds -count=1`

Commit:

```bash
git -C ../premies_portal add internal/domain/models/internet_banking.go internal/domain/models/seeds pkg/db/migrations.go
git -C ../premies_portal commit -m "feat: add internet banking access schema"
```

---

### Task 2: Registry Validation, Repository, and Effective Permissions

**Files:**
- Create: `../premies_portal/internal/domain/repository/internet_banking_repository.go`
- Create: `../premies_portal/internal/repository/postgres/internet_banking_repository.go`
- Create: `../premies_portal/internal/repository/postgres/internet_banking_repository_test.go`
- Create: `../premies_portal/internal/domain/service/internet_banking_registry.go`
- Create: `../premies_portal/internal/domain/service/internet_banking_registry_test.go`

**Interfaces:**
- Produces: `NormalizeInternetBankingPhone(string) (string, error)` and `NormalizeABSClientCode(string) (string, error)`.
- Produces: `SaveClientRegistry(ctx context.Context, operatorID uint, input SaveInternetBankingClientInput) (InternetBankingClientView, error)`.
- Produces: `EffectiveARMs(ctx context.Context, personID, clientID uint) ([]string, error)`.
- Produces: `FindActivePersonByPhone(ctx context.Context, normalizedPhone string) (InternetBankingPerson, error)`.

- [ ] **Step 1: Write failing normalization and permission tests**

```go
func TestNormalizeInternetBankingPhone(t *testing.T) {
    cases := map[string]string{
        "992900001122": "+992900001122",
        "+992 90 000-11-22": "+992900001122",
        "900001122": "+992900001122",
    }
    for input, want := range cases {
        got, err := NormalizeInternetBankingPhone(input)
        require.NoError(t, err)
        require.Equal(t, want, got)
    }
}

func TestEffectiveARMsUnionsRoleAndDirectPermissions(t *testing.T) {
    got := EffectiveARMSet(
        []InternetBankingRoleView{{Active: true, ARMs: []string{"cards.view", "cards.block"}}},
        []InternetBankingARMView{{Code: "accounts.view", Active: true}},
    )
    require.ElementsMatch(t, []string{"cards.view", "cards.block", "accounts.view"}, got)
}

func TestEffectiveARMsDropsInactiveAssignments(t *testing.T) {
    got := EffectiveARMSet(
        []InternetBankingRoleView{{Active: false, ARMs: []string{"cards.block"}}},
        []InternetBankingARMView{{Code: "accounts.view", Active: false}},
    )
    require.Empty(t, got)
}
```

- [ ] **Step 2: Run focused tests RED**

Run: `cd ../premies_portal && go test ./internal/domain/service ./internal/repository/postgres -run 'InternetBanking|EffectiveARM|Normalize' -count=1`

Expected: compilation fails for the missing service and repository.

- [ ] **Step 3: Implement validation and transactional registry persistence**

`SaveClientRegistry` must normalize the ABS code and phones before beginning the transaction, reject duplicate phones assigned to different people, upsert a person when the same phone/INN identity is reused, replace role/direct-ARM joins atomically, and append an audit event in the same transaction.

```go
type SaveInternetBankingPersonInput struct {
    PersonID *uint
    FullName string
    INN string
    Phones []string
    RoleCodes []string
    DirectARMCodes []string
    IsActive bool
}

type SaveInternetBankingClientInput struct {
    ClientID *uint
    ABSClientCode string
    DisplayName string
    IsActive bool
    People []SaveInternetBankingPersonInput
}
```

- [ ] **Step 4: Run repository/service tests GREEN**

Run: `cd ../premies_portal && go test ./internal/domain/service ./internal/repository/postgres -run 'InternetBanking|EffectiveARM|Normalize' -count=1`

Expected: PASS.

- [ ] **Step 5: Commit registry core**

```bash
git -C ../premies_portal add internal/domain/repository/internet_banking_repository.go internal/repository/postgres/internet_banking_repository.go internal/repository/postgres/internet_banking_repository_test.go internal/domain/service/internet_banking_registry.go internal/domain/service/internet_banking_registry_test.go
git -C ../premies_portal commit -m "feat: manage internet banking access registry"
```

---

### Task 3: Role-43 Operator API

**Files:**
- Create: `../premies_portal/internal/http/dto/internet_banking.go`
- Create: `../premies_portal/internal/http/handlers/internet_banking_operator.go`
- Create: `../premies_portal/internal/http/handlers/internet_banking_operator_test.go`
- Create: `../premies_portal/internal/routes/internet_banking.go`
- Modify: `../premies_portal/internal/routes/routes.go`
- Modify: `../premies_portal/internal/server/service.go`
- Modify: `../premies_portal/internal/app/app.go`

**Interfaces:**
- Produces operator routes under `/internet-banking/operator` for clients, roles, ARMs, and audit.
- Consumes `InternetBankingRegistryService` from Task 2.

- [ ] **Step 1: Write failing route and handler tests**

```go
func TestInternetBankingOperatorRoutesRequireRole43(t *testing.T) {
    router := newInternetBankingOperatorTestRouter(fakeRegistry{})
    require.Equal(t, http.StatusForbidden, perform(router, "GET", "/internet-banking/operator/clients", tokenWithRoles(3)).Code)
    require.Equal(t, http.StatusOK, perform(router, "GET", "/internet-banking/operator/clients", tokenWithRoles(43)).Code)
}

func TestSaveInternetBankingClientRejectsPartialPerson(t *testing.T) {
    body := `{"abs_client_code":"5400.001610","people":[{"full_name":"Иванов Иван","inn":"","phones":[]}]}`
    response := performJSON(newInternetBankingOperatorTestRouter(fakeRegistry{}), "POST", "/internet-banking/operator/clients", tokenWithRoles(43), body)
    require.Equal(t, http.StatusBadRequest, response.Code)
}
```

- [ ] **Step 2: Run handler tests RED**

Run: `cd ../premies_portal && go test ./internal/http/handlers ./internal/routes -run InternetBankingOperator -count=1`

Expected: route/handler symbols are missing.

- [ ] **Step 3: Implement versioned operator endpoints**

Register:

```go
group := r.Group("/internet-banking/operator",
    middlewares.CheckUserAuthentication,
    middlewares.CheckUserRole(43),
)
group.GET("/clients", handler.ListClients)
group.POST("/clients", handler.CreateClient)
group.GET("/clients/:id", handler.GetClient)
group.PUT("/clients/:id", handler.UpdateClient)
group.PATCH("/clients/:id/status", handler.SetClientStatus)
group.GET("/roles", handler.ListRoles)
group.POST("/roles", handler.CreateRole)
group.PUT("/roles/:code", handler.UpdateRole)
group.GET("/arms", handler.ListARMs)
group.POST("/arms", handler.CreateARM)
group.PUT("/arms/:code", handler.UpdateARM)
group.GET("/audit", handler.ListAudit)
```

Use strict JSON decoding, bounded pagination, and stable validation errors. Never serialize account password hashes.

- [ ] **Step 4: Run handler and route tests GREEN**

Run: `cd ../premies_portal && go test ./internal/http/handlers ./internal/routes -run InternetBankingOperator -count=1`

Expected: PASS.

- [ ] **Step 5: Commit operator API**

```bash
git -C ../premies_portal add internal/http/dto/internet_banking.go internal/http/handlers/internet_banking_operator.go internal/http/handlers/internet_banking_operator_test.go internal/routes/internet_banking.go internal/routes/routes.go internal/server/service.go internal/app/app.go
git -C ../premies_portal commit -m "feat: expose internet banking operator API"
```

---

### Task 4: OTP Registration and Internet Banking Accounts

**Files:**
- Create: `../premies_portal/internal/domain/service/internet_banking_auth.go`
- Create: `../premies_portal/internal/domain/service/internet_banking_auth_test.go`
- Create: `../premies_portal/internal/http/handlers/internet_banking_internal_auth.go`
- Create: `../premies_portal/internal/http/handlers/internet_banking_internal_auth_test.go`
- Create: `../premies_portal/internal/http/middlewares/internet_banking_service.go`
- Modify: `../premies_portal/internal/routes/internet_banking.go`

**Interfaces:**
- Produces: `RequestRegistrationOTP(ctx, phone, sourceIP string) error` with enumeration-safe result.
- Produces: `VerifyRegistrationOTP(ctx, phone, code string) (registrationToken string, error)`.
- Produces: `RegisterInternetBankingAccount(ctx, registrationToken, password string) (AuthTokens, error)`.
- Produces: `SignInInternetBanking(ctx, phone, password string) (AuthTokens, error)` and `RefreshInternetBanking(ctx, refreshToken string) (AuthTokens, error)`.

- [ ] **Step 1: Write failing OTP lifecycle tests**

```go
func TestRegistrationOTPIsFourDigitsSingleUseAndExpires(t *testing.T) {
    clock := newFakeClock(time.Date(2026, 8, 19, 9, 0, 0, 0, time.UTC))
    store := newMemoryOTPStore(clock)
    sender := &captureSMSSender{}
    service := newAuthService(store, sender, authorizedPhone("+992900001122"), clock)

    require.NoError(t, service.RequestRegistrationOTP(context.Background(), "+992900001122", "10.0.0.1"))
    require.Regexp(t, `^\d{4}$`, sender.LastCode())
    token, err := service.VerifyRegistrationOTP(context.Background(), "+992900001122", sender.LastCode())
    require.NoError(t, err)
    require.NotEmpty(t, token)
    _, err = service.VerifyRegistrationOTP(context.Background(), "+992900001122", sender.LastCode())
    require.ErrorIs(t, err, ErrOTPInvalid)
}

func TestRegistrationOTPResponseDoesNotRevealUnknownPhone(t *testing.T) {
    known := requestOTPResponse(t, "+992900001122")
    unknown := requestOTPResponse(t, "+992900009999")
    require.Equal(t, known.Code, unknown.Code)
    require.JSONEq(t, known.Body.String(), unknown.Body.String())
}
```

- [ ] **Step 2: Run auth tests RED**

Run: `cd ../premies_portal && go test ./internal/domain/service ./internal/http/handlers -run 'RegistrationOTP|InternetBankingSignIn' -count=1`

Expected: missing OTP/auth service symbols.

- [ ] **Step 3: Implement Redis-backed OTP, account registration, JWT, and rate limits**

Use keys namespaced by HMAC of normalized phone, never plaintext OTP:

```go
type RegistrationOTPRecord struct {
    CodeMAC string `json:"code_mac"`
    Attempts int `json:"attempts"`
    ExpiresAt time.Time `json:"expires_at"`
}

func OTPCodeMAC(secret, phone, code string) string {
    mac := hmac.New(sha256.New, []byte(secret))
    _, _ = mac.Write([]byte(phone + ":" + code))
    return hex.EncodeToString(mac.Sum(nil))
}
```

Generate digits with `crypto/rand`, send through an injected adapter backed by existing `service.SendMessage`, and use bcrypt for passwords. Internet Banking tokens use separate issuer/audience and include `account_id`, `person_id`, and `session_version` only.

- [ ] **Step 4: Implement constant-time service-token middleware and internal auth routes**

Routes under `/internal/internet-banking/v1/auth`:

```text
POST /registration/otp
POST /registration/verify
POST /sign-up
POST /sign-in
POST /refresh
GET  /me
```

Require `X-Internet-Banking-Service-Token` on all routes; compare SHA-256 digests with `subtle.ConstantTimeCompare`.

- [ ] **Step 5: Run auth tests GREEN and commit**

Run: `cd ../premies_portal && go test ./internal/domain/service ./internal/http/handlers ./internal/http/middlewares -run 'RegistrationOTP|InternetBankingSignIn|InternetBankingService' -count=1`

Commit:

```bash
git -C ../premies_portal add internal/domain/service/internet_banking_auth.go internal/domain/service/internet_banking_auth_test.go internal/http/handlers/internet_banking_internal_auth.go internal/http/handlers/internet_banking_internal_auth_test.go internal/http/middlewares/internet_banking_service.go internal/routes/internet_banking.go
git -C ../premies_portal commit -m "feat: add internet banking OTP authentication"
```

---

### Task 5: ABS Service Internal Product API

**Files:**
- Create: `../abs_service/internal/controllers/middlewares/internet_banking_service.go`
- Create: `../abs_service/internal/controllers/middlewares/internet_banking_service_test.go`
- Create: `../abs_service/internal/controllers/internet_banking.go`
- Create: `../abs_service/internal/controllers/internet_banking_test.go`
- Modify: `../abs_service/internal/routes/routes.go`

**Interfaces:**
- Produces service-token-protected `/internal/internet-banking/v1` read routes.
- Reuses existing client, account, card, credit, deposit, schedule, and address service functions.

- [ ] **Step 1: Write failing service-token and route-surface tests**

```go
func TestInternetBankingInternalRoutesRejectInvalidServiceToken(t *testing.T) {
    router := routes.InitRoutes(gin.New())
    response := perform(router, "GET", "/internal/internet-banking/v1/accounts?clientCode=5400.001610", nil)
    require.Equal(t, http.StatusUnauthorized, response.Code)
}

func TestInternetBankingInternalRouteSurfaceIsReadOnly(t *testing.T) {
    router := routes.InitRoutes(gin.New())
    response := performWithServiceToken(router, "POST", "/internal/internet-banking/v1/cards")
    require.Equal(t, http.StatusNotFound, response.Code)
}
```

- [ ] **Step 2: Run ABS tests RED**

Run: `cd ../abs_service && go test ./internal/controllers/... ./internal/routes -run InternetBanking -count=1`

Expected: internal routes do not exist.

- [ ] **Step 3: Implement narrow read routes**

Expose only:

```text
GET /client?clientIndex={normalized ABS code}
GET /accounts?clientCode={normalized ABS code}
GET /cards?clientCode={normalized ABS code}
GET /credits?clientCode={normalized ABS code}
GET /credits/graphs?referenceId={id}
GET /credits/details?referenceId={id}
GET /deposits?clientCode={normalized ABS code}
GET /deposits/schedule?referenceId={id}
GET /addresses?clientCode={normalized ABS code}
```

Inject controller delegates in tests so invalid credentials are proven to fail before a delegate call.

- [ ] **Step 4: Run ABS tests GREEN and commit**

Run: `cd ../abs_service && go test ./internal/controllers/... ./internal/routes -run InternetBanking -count=1`

Commit:

```bash
git -C ../abs_service add internal/controllers/middlewares/internet_banking_service.go internal/controllers/middlewares/internet_banking_service_test.go internal/controllers/internet_banking.go internal/controllers/internet_banking_test.go internal/routes/routes.go
git -C ../abs_service commit -m "feat: expose protected internet banking product reads"
```

---

### Task 6: Daily Portal Internal Authorization and Privileged Actions

**Files:**
- Create: `../premies_portal/internal/domain/service/internet_banking_actions.go`
- Create: `../premies_portal/internal/domain/service/internet_banking_actions_test.go`
- Create: `../premies_portal/internal/http/handlers/internet_banking_internal_actions.go`
- Create: `../premies_portal/internal/http/handlers/internet_banking_internal_actions_test.go`
- Modify: `../premies_portal/internal/routes/internet_banking.go`
- Modify: `../premies_portal/internal/app/app.go`

**Interfaces:**
- Produces `AuthorizeInternetBankingAction(ctx, accountID, accessID uint, armCode string) (AuthorizedClientContext, error)`.
- Produces internal action routes that resolve access and enforce one exact ARM before delegating.

- [ ] **Step 1: Write a table-driven failing permission test for every privileged action**

```go
func TestInternetBankingActionPermissions(t *testing.T) {
    cases := []struct{ route, arm string }{
        {"POST /cards/activate", "cards.activate"},
        {"POST /cards/block", "cards.block"},
        {"POST /cards/unblock", "cards.unblock"},
        {"POST /cards/pin/change", "cards.pin.change"},
        {"POST /cards/pin/reset", "cards.pin.reset"},
        {"PUT /cards/limits", "cards.limits.change"},
        {"PUT /cards/notifications", "cards.notifications.manage"},
        {"PUT /cards/subscriptions", "cards.subscriptions.manage"},
        {"POST /credits/repay-early", "credits.repay.early"},
    }
    for _, tc := range cases {
        t.Run(tc.arm, func(t *testing.T) {
            require.Equal(t, http.StatusForbidden, performInternalActionWithoutARM(tc.route).Code)
            require.NotEqual(t, http.StatusForbidden, performInternalActionWithARM(tc.route, tc.arm).Code)
        })
    }
}
```

- [ ] **Step 2: Run action tests RED**

Run: `cd ../premies_portal && go test ./internal/domain/service ./internal/http/handlers -run InternetBankingAction -count=1`

Expected: action authorization and handlers are missing.

- [ ] **Step 3: Implement access/resource ownership guards and adapters**

Before a delegate call:

1. Resolve the account and selected access.
2. Verify client/person/account/access active state.
3. Compute effective ARMs.
4. Resolve the target resource under the selected ABS client using the internal ABS client.
5. Call the existing processing/VSM/PIN/credit operation.
6. Write an audit event with masked identifiers and outcome.

Read/export endpoints must also map to their exact view/export ARM; do not combine `view` and `change` permissions.

- [ ] **Step 4: Run action tests GREEN and commit**

Run: `cd ../premies_portal && go test ./internal/domain/service ./internal/http/handlers -run InternetBankingAction -count=1`

Commit:

```bash
git -C ../premies_portal add internal/domain/service/internet_banking_actions.go internal/domain/service/internet_banking_actions_test.go internal/http/handlers/internet_banking_internal_actions.go internal/http/handlers/internet_banking_internal_actions_test.go internal/routes/internet_banking.go internal/app/app.go
git -C ../premies_portal commit -m "feat: enforce internet banking action permissions"
```

---

### Task 7: Daily Portal Operator Frontend Route and API Client

**Files:**
- Create: `src/api/internetBanking.js`
- Create: `src/api/internetBanking.test.js`
- Create: `src/router/routes/internetBanking.routes.jsx`
- Modify: `src/router/index.jsx`
- Modify: `src/components/general/DynamicMenu.jsx`
- Modify: `src/components/dashboard/dashboard_operator/DocxGenerator.jsx`

**Interfaces:**
- Produces API functions `listInternetBankingClients`, `saveInternetBankingClient`, `listInternetBankingRoles`, `saveInternetBankingRole`, `listInternetBankingARMs`, and `saveInternetBankingARM`.
- Produces role-43 route `/internet-bank`.

- [ ] **Step 1: Write failing API contract tests**

```js
test("saveInternetBankingClient sends normalized operator payload", async () => {
  const request = captureFetch();
  await saveInternetBankingClient({
    absClientCode: "5400.001610",
    people: [{ fullName: "Иванов Иван", inn: "123456789", phones: ["+992900001122"], roleCodes: ["viewer"], directArmCodes: [] }],
  });
  assert.equal(request.url, `${BASE}/internet-banking/operator/clients`);
  assert.equal(request.options.method, "POST");
});
```

- [ ] **Step 2: Run API tests RED**

Run: `node --test src/api/internetBanking.test.js`

Expected: module is missing.

- [ ] **Step 3: Implement API client, menu entry, and route guard**

Use `RequireRole allowedRoles={[43]}` and add a `Landmark` menu entry named `Интернет банк` only when `roles.includes(43)`.

- [ ] **Step 4: Run API test and lint GREEN**

Run: `node --test src/api/internetBanking.test.js && npm run lint`

- [ ] **Step 5: Commit route/API foundation**

```bash
git add src/api/internetBanking.js src/api/internetBanking.test.js src/router/routes/internetBanking.routes.jsx src/router/index.jsx src/components/general/DynamicMenu.jsx src/components/dashboard/dashboard_operator/DocxGenerator.jsx
git commit -m "feat: add internet banking operator navigation"
```

---

### Task 8: Daily Portal Operator Management Page

**Files:**
- Create: `src/pages/dashboard/dashboard_internet_banking/InternetBankingPage.jsx`
- Create: `src/pages/dashboard/dashboard_internet_banking/internetBankingForm.js`
- Create: `src/pages/dashboard/dashboard_internet_banking/internetBankingForm.test.js`
- Create: `src/styles/InternetBankingAdmin.scss`
- Modify: `src/router/routes/internetBanking.routes.jsx`
- Modify: `src/styles/global.scss`

**Interfaces:**
- Consumes Task 7 API functions.
- Produces tabs `Клиенты и доступы`, `Роли`, and `АРМ`.

- [ ] **Step 1: Write failing form-state tests**

```js
test("buildClientPayload preserves multiple people and multi-select assignments", () => {
  const payload = buildClientPayload({
    absClientCode: "5400.001610",
    people: [
      { fullName: "Иванов Иван", inn: "123456789", phones: ["900001122", "900003344"], roleCodes: ["viewer"], directArmCodes: ["cards.block"] },
      { fullName: "Петров Пётр", inn: "987654321", phones: ["+992900005566"], roleCodes: ["card_operator"], directArmCodes: [] },
    ],
  });
  assert.equal(payload.people.length, 2);
  assert.deepEqual(payload.people[0].phones, ["+992900001122", "+992900003344"]);
});
```

- [ ] **Step 2: Run form tests RED**

Run: `node --test src/pages/dashboard/dashboard_internet_banking/internetBankingForm.test.js`

Expected: helper module is missing.

- [ ] **Step 3: Implement the operator page**

Use Ant Design `Table`, `Tabs`, `Modal`, `Form`, `Select mode="multiple"`, and repeatable person cards. Show registration status but never hashes/tokens. Require explicit confirmation for deactivation and preserve unsaved-form validation errors inline.

- [ ] **Step 4: Run tests, lint, and production build GREEN**

Run:

```bash
node --test src/pages/dashboard/dashboard_internet_banking/internetBankingForm.test.js
npm run lint
npm run build
```

- [ ] **Step 5: Commit operator UI**

```bash
git add src/pages/dashboard/dashboard_internet_banking src/styles/InternetBankingAdmin.scss src/styles/global.scss src/router/routes/internetBanking.routes.jsx
git commit -m "feat: build internet banking access management UI"
```

---

### Task 9: Internet Banking Backend Upstream Client and Public Auth API

**Files:**
- Modify: `../internet_banking_backend/internal/config/config.go`
- Modify: `../internet_banking_backend/internal/config/config_test.go`
- Replace: `../internet_banking_backend/internal/upstream/premies.go`
- Modify: `../internet_banking_backend/internal/upstream/premies_test.go`
- Modify: `../internet_banking_backend/internal/httpapi/models.go`
- Modify: `../internet_banking_backend/internal/httpapi/server.go`
- Modify: `../internet_banking_backend/internal/httpapi/server_test.go`
- Modify: `../internet_banking_backend/cmd/server/main.go`

**Interfaces:**
- Produces public auth routes matching the spec.
- Adds required config `INTERNET_BANKING_SERVICE_TOKEN` and `ABS_SERVICE_URL`.
- Forwards service token only server-to-server.

- [ ] **Step 1: Replace employee sign-in expectations with failing phone-auth tests**

```go
func TestRegistrationOTPReturnsGenericAcceptedResponse(t *testing.T) {
    handler, upstream := newTestServer()
    response := postJSON(handler, "/api/v1/auth/registration/otp", `{"phone":"+992900001122"}`)
    require.Equal(t, http.StatusAccepted, response.Code)
    require.Equal(t, "/internal/internet-banking/v1/auth/registration/otp", upstream.LastPath())
}

func TestSignInForwardsPhoneNotUsername(t *testing.T) {
    handler, upstream := newTestServer()
    _ = postJSON(handler, "/api/v1/auth/sign-in", `{"phone":"+992900001122","password":"SafePass123"}`)
    require.JSONEq(t, `{"phone":"+992900001122","password":"SafePass123"}`, upstream.LastBody())
}
```

- [ ] **Step 2: Run backend tests RED**

Run: `cd ../internet_banking_backend && go test ./internal/config ./internal/upstream ./internal/httpapi -count=1`

Expected: auth routes and configuration fields are missing.

- [ ] **Step 3: Implement typed upstream methods and public handlers**

```go
type DailyPortalClient interface {
    RequestRegistrationOTP(context.Context, RegistrationOTPRequest) (Response, error)
    VerifyRegistrationOTP(context.Context, VerifyOTPRequest) (Response, error)
    SignUp(context.Context, SignUpRequest) (Response, error)
    SignIn(context.Context, SignInRequest) (Response, error)
    Refresh(context.Context, RefreshRequest) (Response, error)
    Me(context.Context, string) (Response, error)
}
```

Keep strict body size/JSON checks and sanitize all upstream transport failures.

- [ ] **Step 4: Run auth/config tests GREEN and commit**

Run: `cd ../internet_banking_backend && go test ./internal/config ./internal/upstream ./internal/httpapi -count=1`

Commit:

```bash
git -C ../internet_banking_backend add internal/config internal/upstream internal/httpapi cmd/server/main.go
git -C ../internet_banking_backend commit -m "feat: add customer internet banking authentication"
```

---

### Task 10: Internet Banking Backend Product Gateway and ARM Enforcement

**Files:**
- Create: `../internet_banking_backend/internal/auth/session.go`
- Create: `../internet_banking_backend/internal/auth/session_test.go`
- Create: `../internet_banking_backend/internal/upstream/abs.go`
- Create: `../internet_banking_backend/internal/upstream/abs_test.go`
- Create: `../internet_banking_backend/internal/httpapi/products.go`
- Create: `../internet_banking_backend/internal/httpapi/products_test.go`
- Create: `../internet_banking_backend/internal/httpapi/actions.go`
- Create: `../internet_banking_backend/internal/httpapi/actions_test.go`
- Modify: `../internet_banking_backend/internal/httpapi/server.go`
- Modify: `../internet_banking_backend/cmd/server/main.go`

**Interfaces:**
- Produces `/api/v1/me`, `/api/v1/accesses/{accessID}/products/*`, and action endpoints.
- Consumes Daily Portal access/permission contracts and ABS internal read contracts.

- [ ] **Step 1: Write failing cross-client and missing-ARM tests**

```go
func TestProductsResolveABSCodeFromAuthorizedAccess(t *testing.T) {
    handler, daily, abs := newProductTestServer()
    daily.AllowAccess(7, 22, "5400.001610", []string{"cards.view"})
    response := getWithToken(handler, "/api/v1/accesses/22/products/cards?clientCode=attacker-value", tokenForAccount(7))
    require.Equal(t, http.StatusOK, response.Code)
    require.Equal(t, "5400.001610", abs.LastClientCode())
}

func TestCardBlockRequiresExactARM(t *testing.T) {
    handler, daily, _ := newProductTestServer()
    daily.AllowAccess(7, 22, "5400.001610", []string{"cards.view"})
    response := postWithToken(handler, "/api/v1/accesses/22/actions/cards/block", tokenForAccount(7), `{"card_id":"123"}`)
    require.Equal(t, http.StatusForbidden, response.Code)
    require.False(t, daily.ActionCalled())
}
```

- [ ] **Step 2: Run gateway tests RED**

Run: `cd ../internet_banking_backend && go test ./internal/auth ./internal/upstream ./internal/httpapi -run 'Products|ARM|Access|Action' -count=1`

Expected: product/action gateway modules are missing.

- [ ] **Step 3: Implement session middleware, access resolution, reads, and actions**

Map each endpoint to exactly one ARM from the spec. Resolve access through Daily Portal before any ABS request. Product reads use the resolved ABS code. Resource actions are delegated to Daily Portal, which repeats ownership and ARM checks.

- [ ] **Step 4: Run gateway tests GREEN and commit**

Run: `cd ../internet_banking_backend && go test ./... -count=1 && go vet ./...`

Commit:

```bash
git -C ../internet_banking_backend add internal/auth internal/upstream internal/httpapi cmd/server/main.go
git -C ../internet_banking_backend commit -m "feat: add permissioned internet banking product gateway"
```

---

### Task 11: Internet Banking Registration, Login, and Session UI

**Files:**
- Modify: `../internet_banking_frontend/src/lib/auth/types.ts`
- Modify: `../internet_banking_frontend/src/lib/auth/api.ts`
- Modify: `../internet_banking_frontend/src/lib/auth/api.test.ts`
- Modify: `../internet_banking_frontend/src/lib/auth/session.ts`
- Modify: `../internet_banking_frontend/src/lib/auth/session.test.ts`
- Replace: `../internet_banking_frontend/src/components/LoginForm.tsx`
- Modify: `../internet_banking_frontend/src/components/LoginForm.test.tsx`
- Create: `../internet_banking_frontend/src/components/RegistrationForm.tsx`
- Create: `../internet_banking_frontend/src/components/RegistrationForm.test.tsx`
- Create: `../internet_banking_frontend/src/app/register/page.tsx`
- Modify: `../internet_banking_frontend/src/app/globals.css`

**Interfaces:**
- Produces three-stage registration UI and phone/password login.
- Stores only auth tokens and non-sensitive display/session metadata in namespaced session storage.

- [ ] **Step 1: Write failing registration and phone-login tests**

```tsx
it("moves from phone to four-digit OTP to password", async () => {
  render(<RegistrationForm />);
  await user.type(screen.getByLabelText("Номер телефона"), "900001122");
  await user.click(screen.getByRole("button", { name: "Получить код" }));
  expect(screen.getByLabelText("Одноразовый код")).toHaveAttribute("maxLength", "4");
  await user.type(screen.getByLabelText("Одноразовый код"), "1234");
  await user.click(screen.getByRole("button", { name: "Подтвердить код" }));
  expect(screen.getByLabelText("Пароль")).toBeVisible();
});

it("submits phone and password on login", async () => {
  render(<LoginForm />);
  expect(screen.getByLabelText("Номер телефона")).toBeVisible();
  expect(screen.queryByLabelText("Имя пользователя")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run frontend auth tests RED**

Run: `cd ../internet_banking_frontend && npm test -- RegistrationForm LoginForm auth session`

Expected: registration component is missing and login still asks for username.

- [ ] **Step 3: Implement API/session helpers and both forms**

Normalize phone before API calls, render a four-cell numeric OTP field, keep the resend timer client-side for usability while relying on backend enforcement, and clear all secrets from component state after completion/logout.

- [ ] **Step 4: Run auth tests, lint, and typecheck GREEN**

Run:

```bash
cd ../internet_banking_frontend
npm test -- RegistrationForm LoginForm auth session
npm run lint
npm run typecheck
```

- [ ] **Step 5: Commit auth UI**

```bash
git -C ../internet_banking_frontend add src/lib/auth src/components/LoginForm.tsx src/components/LoginForm.test.tsx src/components/RegistrationForm.tsx src/components/RegistrationForm.test.tsx src/app/register src/app/globals.css
git -C ../internet_banking_frontend commit -m "feat: add SMS registration and phone login"
```

---

### Task 12: Internet Banking Product Dashboard and Permissioned Actions

**Files:**
- Create: `../internet_banking_frontend/src/lib/banking/api.ts`
- Create: `../internet_banking_frontend/src/lib/banking/api.test.ts`
- Create: `../internet_banking_frontend/src/lib/banking/permissions.ts`
- Create: `../internet_banking_frontend/src/lib/banking/permissions.test.ts`
- Replace: `../internet_banking_frontend/src/components/FrontovikDashboard.tsx`
- Modify: `../internet_banking_frontend/src/components/FrontovikDashboard.test.tsx`
- Create: `../internet_banking_frontend/src/components/dashboard/ClientSelector.tsx`
- Create: `../internet_banking_frontend/src/components/dashboard/ProductTabs.tsx`
- Create: `../internet_banking_frontend/src/components/dashboard/AccountsPanel.tsx`
- Create: `../internet_banking_frontend/src/components/dashboard/CardsPanel.tsx`
- Create: `../internet_banking_frontend/src/components/dashboard/CreditsPanel.tsx`
- Create: `../internet_banking_frontend/src/components/dashboard/DepositsPanel.tsx`
- Create: `../internet_banking_frontend/src/components/dashboard/PosPanel.tsx`
- Modify: `../internet_banking_frontend/src/app/globals.css`

**Interfaces:**
- Consumes `/api/v1/me` and access-scoped product/action APIs.
- Produces the no-search/no-compliance Internet Banking dashboard.

- [ ] **Step 1: Write failing permission visibility and client-switch tests**

```tsx
it("shows only tabs and actions granted for the selected access", async () => {
  renderDashboard({ arms: ["cards.view", "cards.block"], clients: twoClients });
  expect(await screen.findByRole("tab", { name: "Карты" })).toBeVisible();
  expect(screen.queryByRole("tab", { name: "Кредиты" })).not.toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Заблокировать" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Сменить ПИН" })).not.toBeInTheDocument();
});

it("reloads products and permissions when client changes", async () => {
  renderDashboard({ clients: twoClients });
  await user.selectOptions(screen.getByLabelText("Клиент"), "access-2");
  expect(await screen.findByText("Код клиента: 5400.009999")).toBeVisible();
});
```

- [ ] **Step 2: Run dashboard tests RED**

Run: `cd ../internet_banking_frontend && npm test -- FrontovikDashboard permissions banking`

Expected: dashboard still renders foundation cards and no product modules exist.

- [ ] **Step 3: Implement product panels and all ARM-gated buttons**

Use the stable ARM codes from the spec. Preserve confirmation dialogs for mutating actions. On HTTP 403, reload `/me`, remove now-inaccessible actions, and show `Доступ к операции был изменён оператором`.

- [ ] **Step 4: Apply the new visual system**

Use clear card borders, compact selectors, responsive tables/cards, and the Frontovik product information hierarchy. Do not add client search, compliance status, terrorist checks, or employee-only labels.

- [ ] **Step 5: Run full frontend verification GREEN and commit**

Run:

```bash
cd ../internet_banking_frontend
npm test
npm run lint
npm run typecheck
npm run build
```

Commit:

```bash
git -C ../internet_banking_frontend add src/lib/banking src/components/FrontovikDashboard.tsx src/components/FrontovikDashboard.test.tsx src/components/dashboard src/app/globals.css
git -C ../internet_banking_frontend commit -m "feat: build permissioned ABS product dashboard"
```

---

### Task 13: Shared Deployment Controller and Internet Banking Compose

**Files:**
- Modify: `deploy.ps1`
- Create: `tests/deploy_internet_banking_test.sh`
- Modify: `../internet_banking_backend/deploy/docker-compose.yml`
- Modify: `../internet_banking_backend/README.md`
- Modify: `../internet_banking_frontend/README.md`

**Interfaces:**
- Adds project metadata for both GitHub canonical repositories and GitLab mirrors.
- Expands either Internet Banking service selector to both repositories.
- Runs a dedicated Compose project after repository updates.

- [ ] **Step 1: Write failing deployment-controller tests**

```bash
assert_contains 'LocalName     = "internet_banking_backend"' "$deploy_script"
assert_contains 'LocalName     = "internet_banking_frontend"' "$deploy_script"
assert_contains 'GitlabProject = "Bejan/internet_banking_backend.git"' "$deploy_script"
assert_contains 'GitlabProject = "Bejan/internet_banking_frontend.git"' "$deploy_script"
assert_contains 'docker compose -p internet_banking' "$deploy_script"
assert_not_contains 'ghp_' "$deploy_script"
assert_not_contains 'glpat-' "$deploy_script"
```

Add a generated-script fixture proving that selecting either service checks out both repositories, omits both names from the main Daily Activ Compose service list, and saves deployment state only after dedicated Compose succeeds.

- [ ] **Step 2: Run deployment test RED**

Run: `bash tests/deploy_internet_banking_test.sh`

Expected: project definitions/group expansion are absent.

- [ ] **Step 3: Extend `$Projects`, selection expansion, remote update, and Compose phases**

Add service names `internet-banking-backend` and `internet-banking-frontend`, both branch `main`, with remote paths under `/home/bkarimov/daily_activ`. Split ready projects into main-compose and Internet-Banking groups. Skip PostgreSQL/main Compose validation when only the Internet Banking group is selected.

- [ ] **Step 4: Update dedicated Compose environment and health checks**

Backend environment includes:

```yaml
PREMIES_PORTAL_URL: http://go-backend:7575
ABS_SERVICE_URL: http://abs_service:5000
INTERNET_BANKING_SERVICE_TOKEN: ${INTERNET_BANKING_SERVICE_TOKEN}
ALLOWED_ORIGINS: http://10.65.10.20:4000
```

Both backend and frontend join the existing external network where required. Keep host ports `4001:4001` and `4000:3000`.

- [ ] **Step 5: Run deployment and Compose validation GREEN**

Run:

```bash
bash tests/deploy_backup_worktree_test.sh
bash tests/deploy_internet_banking_test.sh
docker compose -p internet_banking -f ../internet_banking_backend/deploy/docker-compose.yml config
```

- [ ] **Step 6: Commit deployment changes in owning repositories**

```bash
git add deploy.ps1 tests/deploy_internet_banking_test.sh
git commit -m "feat: deploy internet banking services"
git -C ../internet_banking_backend add deploy/docker-compose.yml README.md
git -C ../internet_banking_backend commit -m "chore: configure internet banking production services"
git -C ../internet_banking_frontend add README.md
git -C ../internet_banking_frontend commit -m "docs: document internet banking deployment"
```

---

### Task 14: Cross-Repository Verification, Security Review, and Production Deployment

**Files:**
- Modify only files required by verified failures discovered in this task.

**Interfaces:**
- Produces five pushed canonical branches and synchronized GitLab mirrors.
- Produces healthy production services at ports 3000, 4000, and 4001.

- [ ] **Step 1: Run complete local verification**

```bash
cd ../premies_portal && go test ./... -count=1 && go vet ./...
cd ../abs_service && go test ./... -count=1 && go vet ./...
cd ../premies_portal_front && node --test src/api/internetBanking.test.js src/pages/dashboard/dashboard_internet_banking/internetBankingForm.test.js && npm run lint && npm run build
cd ../internet_banking_backend && go test ./... -count=1 && go vet ./...
cd ../internet_banking_frontend && npm test && npm run lint && npm run typecheck && npm run build
cd ../premies_portal_front && bash tests/deploy_backup_worktree_test.sh && bash tests/deploy_internet_banking_test.sh
```

- [ ] **Step 2: Run credential and unsafe-log scans**

```bash
rg -n 'ghp_|glpat-|P1jOE|Fduecn|password_hash|code_mac' ../premies_portal ../premies_portal_front ../abs_service ../internet_banking_backend ../internet_banking_frontend
```

Expected: no real credentials; `password_hash` and `code_mac` appear only in models/tests and never response DTOs or log format strings.

- [ ] **Step 3: Request an independent code review**

Review the full diff against the approved spec, focusing on enumeration resistance, OTP single use, constant-time service authentication, role-43 enforcement, cross-client isolation, exact ARM mapping, and deployment rollback behavior. Address only findings verified against source/tests.

- [ ] **Step 4: Push canonical branches and synchronize mirrors**

Push the committed branches to their configured GitHub origins without embedding credentials. Use `deploy.ps1` mirror logic to synchronize the exact canonical commits to GitLab.

- [ ] **Step 5: Deploy and verify infrastructure**

Run the controller for the changed services. Verify:

```bash
docker compose ps
docker compose -p internet_banking -f /home/bkarimov/daily_activ/internet_banking_backend/deploy/docker-compose.yml ps
curl -fsS http://127.0.0.1:4001/ping
curl -fsS http://127.0.0.1:4001/ready
curl -fsS http://127.0.0.1:4000/login
curl -fsS http://127.0.0.1:3000/internet-bank
```

- [ ] **Step 6: Perform browser acceptance checks**

At `http://10.65.10.20:3000/internet-bank`, assign role 43 to a test operator, create an ABS client with two people, multiple phones, roles, and direct ARMs, and confirm catalogs persist.

At `http://10.65.10.20:4000/register`, complete real SMS OTP registration, sign in, switch between two allowed clients, verify products, verify hidden actions for missing ARMs, and verify a granted non-destructive action. Test a mutating action only against an explicitly approved test card/account.

- [ ] **Step 7: Record final SHAs and production evidence**

Report each repository SHA, all verification commands, container health, HTTP results, the tested role/ARM matrix, and any intentionally untested production mutation.
