# Internet Banking Access Platform Design

**Date:** 2026-08-19  
**Status:** Approved in conversation; awaiting written-spec review  
**Scope:** `premies_portal`, `premies_portal_front`, `internet_banking_backend`, `internet_banking_frontend`, and the shared deployment controller in `premies_portal_front/deploy.ps1`

## 1. Goal

Add an operator-managed Internet Banking access registry to Daily Portal and turn the existing Internet Banking foundation into a customer-facing application with SMS registration, independent authentication, server-enforced permissions, and an ABS-product dashboard.

An operator grants one or more people access to one ABS client code. A person may later receive access to additional ABS client codes. After registering with an authorized phone number and a four-digit SMS OTP, the person signs in with phone and password and sees only the products and actions permitted for the selected ABS client.

## 2. Chosen Architecture

Daily Portal is the source of truth for:

- ABS client access records;
- authorized people and their phone numbers;
- Internet Banking accounts and password hashes;
- role and ARM catalogs;
- role-to-ARM and access-to-role/ARM assignments;
- registration OTP state and registration audit events.

`internet_banking_backend` is the only public backend used by `internet_banking_frontend`. It calls protected internal Daily Portal endpoints for registration, authentication, client access, and effective permissions. It calls the existing ABS service for product data and existing banking actions.

Direct shared-table access from `internet_banking_backend` is prohibited. All cross-service access uses versioned HTTP contracts and a server-to-server credential stored only in deployment environment files.

## 3. Repositories and Responsibilities

### 3.1 `premies_portal`

- Seed stable Daily Portal role `43`, named `Интернет банк`.
- Own and migrate Internet Banking access, identity, account, catalog, assignment, and audit tables.
- Expose role-43-protected operator CRUD endpoints.
- Expose service-token-protected Internet Banking internal endpoints.
- Reuse the configured bank SMS provider to send registration OTP messages.
- Normalize and validate phone numbers, ABS client codes, INNs, roles, and ARMs.
- Compute effective ARM permissions on the server.

### 3.2 `premies_portal_front`

- Add the role-43 menu entry and `/internet-bank` route.
- Provide operator screens for clients/accesses, roles, and ARMs.
- Provide a repeatable person editor: one person row contains one FIO, one INN, one or more phone numbers, multiple roles, and multiple direct ARMs.
- Add both Internet Banking repositories to the shared deployment controller.

### 3.3 `internet_banking_backend`

- Replace the Premies employee-login proxy with Internet Banking registration and authentication APIs.
- Proxy only authorized product and action requests to ABS/processing services.
- Verify the Internet Banking token, selected client access, and required ARM on every protected endpoint.
- Never trust a client code, card ID, account, credit, deposit, or terminal identifier supplied by the browser without resolving it under an authorized ABS client.

### 3.4 `internet_banking_frontend`

- Add phone registration, four-digit OTP verification, password creation, and phone/password login.
- Add a client selector when the account has access to more than one ABS client code.
- Render a new Internet Banking product dashboard inspired by `/frontovik/abs-search`, without client search or compliance checks.
- Hide inaccessible tabs and actions, while treating backend permission checks as authoritative.

## 4. Data Model

All new records use normal GORM timestamps and soft deletion only where restore/audit semantics require it.

### 4.1 Access registry

`InternetBankingClient`

- `id` primary key;
- `abs_client_code` normalized, unique, required;
- `display_name` optional operator label;
- `is_active` required, default `true`;
- `created_by_user_id` and `updated_by_user_id` required audit references.

`InternetBankingPerson`

- `id` primary key;
- `full_name` required;
- `inn` required, normalized;
- `is_active` required, default `true`.

`InternetBankingPersonPhone`

- `id` primary key;
- `person_id` required;
- `phone_normalized` required in `+992XXXXXXXXX` form;
- `is_primary` required;
- globally unique `phone_normalized`, so one phone cannot identify two different people.

`InternetBankingClientAccess`

- `id` primary key;
- `client_id` required;
- `person_id` required;
- `is_active` required, default `true`;
- unique pair `(client_id, person_id)`;
- `created_by_user_id` and `updated_by_user_id` required.

One person may have several phones and several client-access rows. A single operator form for one ABS client creates or updates the client and its list of people atomically.

### 4.2 Catalogs and assignments

`InternetBankingARM`

- stable string `code` primary business identifier;
- Russian `name`;
- `description`;
- `category`;
- `is_active`;
- `is_system`, which prevents deletion of seeded permissions but still permits activation/deactivation and descriptive updates.

`InternetBankingRole`

- stable string `code`;
- Russian `name`;
- `description`;
- `is_active`;
- `is_system`.

Join tables:

- `internet_banking_role_arms` maps role bundles to ARMs;
- `internet_banking_access_roles` assigns roles to a client access;
- `internet_banking_access_arms` adds direct ARMs to a client access.

Effective permissions for a client access are the union of active direct ARMs and active ARMs inherited from active assigned roles. A denial always wins when the client, person, phone, account, role, or ARM is inactive.

### 4.3 Customer account

`InternetBankingAccount`

- `id` primary key;
- `person_id` unique and required;
- `login_phone_id` unique and required;
- `password_hash` required;
- `is_active` required;
- `registered_at`, `last_login_at`, and password-change timestamp;
- refresh-token/session version for revocation.

Changing the operator registry does not require re-registration. Revoking the person, phone, or all client accesses immediately prevents new sessions and invalidates protected requests.

## 5. Seeded ARM Catalog

Every current Frontovik product action receives a stable permission code. UI labels may change later without changing codes.

### Client

- `client.profile.view` — view client summary and ABS details;
- `client.export` — export client information;
- `client.documents.view` — view client documents;
- `client.documents.generate` — generate client documents/requisites/certificates;
- `client.data.copy` — copy client data;
- `client.audit.view` — view action journal.

### Accounts

- `accounts.view` — view account list and balances;
- `accounts.export` — export accounts;
- `accounts.statement.view` — view ABS account statement;
- `accounts.statement.export` — export statement after the required confirmation flow;
- `accounts.documents.generate` — generate account documents.

### Cards

- `cards.view` — view card list, status, linked accounts, and balances;
- `cards.export` — export cards;
- `cards.history.view` — view one card's history;
- `cards.history.all` — view combined history for all client cards;
- `cards.activate` — activate a card;
- `cards.block` — block a card;
- `cards.unblock` — unblock a card;
- `cards.pin.change` — change PIN using the existing confirmation flow;
- `cards.pin.reset` — reset the PIN denial counter;
- `cards.limits.view` — view card limits;
- `cards.limits.change` — change card limits;
- `cards.tariffs.view` — view card tariffs;
- `cards.notifications.view` — view SMS and 3DS services;
- `cards.notifications.manage` — connect, disconnect, or change SMS/3DS services;
- `cards.subscriptions.view` — view VSM subscriptions and merchants;
- `cards.subscriptions.manage` — block, unblock, pause, or resume VSM subscriptions;
- `cards.documents.generate` — generate card documents.

### Credits

- `credits.view` — view credits;
- `credits.export` — export credits;
- `credits.schedule.view` — view payment graph;
- `credits.details.view` — view parameters, balances, and linked accounts;
- `credits.repay.early` — submit early repayment using the existing confirmation flow;
- `credits.documents.generate` — generate credit documents.

### Deposits

- `deposits.view` — view deposits;
- `deposits.export` — export deposits;
- `deposits.details.view` — view deposit details and accounts;
- `deposits.schedule.export` — export the deposit payment schedule;
- `deposits.accounts.export` — export deposit-account details;
- `deposits.documents.generate` — generate deposit documents.

### POS terminals

- `pos.view` — view linked POS terminals;
- `pos.statement.view` — open the linked account statement;
- `pos.history.view` — view operations for one or several selected terminal IDs.

Navigation-only actions such as pagination, tab switching, filters, copying a displayed account number, closing a modal, or choosing a category do not receive separate ARMs.

## 6. Seeded Role Bundles

The first deployment seeds editable system bundles:

- `viewer` — read-only profile and all product views;
- `statements_and_documents` — exports, statements, and document generation;
- `card_operator` — card views plus card actions, excluding VSM management;
- `subscription_operator` — card and VSM subscription views/actions;
- `credit_operator` — credit views and early repayment;
- `full_access` — all active system ARMs.

Operators may create additional roles, rename descriptions, and change role-to-ARM mappings. Stable system codes cannot be deleted or reused.

## 7. Operator API and UI

All operator routes require an authenticated Daily Portal user with role `43`; role `3` alone does not grant access.

Endpoints provide:

- paginated client/access list with search by ABS code, FIO, INN, and phone;
- create, read, update, deactivate, and reactivate client access;
- role catalog CRUD and role-to-ARM updates;
- ARM catalog list plus controlled create/update/deactivate for future permissions;
- account registration state, without password hashes, OTP values, or tokens;
- audit history for access and catalog changes.

The `/internet-bank` page has three tabs: `Клиенты и доступы`, `Роли`, and `АРМ`. Client editing uses one client header and repeatable person cards. Saving is atomic: validation failure in one person prevents partial updates.

## 8. Registration and Authentication

Internet Banking uses phone numbers as usernames.

### 8.1 Registration flow

1. `POST /api/v1/auth/registration/otp` accepts a phone number.
2. The response is always generic, whether the number exists or not.
3. For an active authorized phone, Daily Portal creates a cryptographically secure four-digit code, stores only a keyed hash in Redis, and sends the code through the existing SMS provider.
4. OTP lifetime is five minutes. Resend cooldown is 60 seconds. A code is single-use and permits at most five verification attempts.
5. Rate limits apply per normalized phone and source IP. Repeated violations receive HTTP 429 without revealing registry membership.
6. `POST /api/v1/auth/registration/verify` accepts phone and code. Success returns a single-use, short-lived registration token.
7. `POST /api/v1/auth/sign-up` accepts the registration token, password, and confirmation. It creates one account for the resolved person and consumes the token.

Passwords require at least 10 characters and at least one letter and one digit. Passwords are hashed with bcrypt using the repository's established secure cost. Logs and responses never contain passwords, OTPs, hashes, or complete tokens.

### 8.2 Sign-in and sessions

- `POST /api/v1/auth/sign-in` accepts normalized phone and password.
- Successful authentication returns an Internet Banking access token and refresh token with an Internet Banking-specific issuer and audience.
- Access tokens are short lived; refresh tokens are rotated and revocable through the account session version.
- The session payload identifies the account/person, not a browser-supplied ABS code.
- Every protected request reloads active client access and effective permissions or uses a short server-side cache invalidated by registry changes.

## 9. Product and Action Authorization

The authenticated API returns `GET /api/v1/me`, including masked phones, available ABS clients, and effective ARM codes per client.

Product requests include a selected client-access identifier, not an arbitrary ABS code. The backend resolves the ABS code from the authorized access record.

For resource-specific actions, the backend verifies that the card, account, credit, deposit, or terminal belongs to the selected client before calling the upstream action. A matching frontend button is never sufficient authorization.

Errors use these stable semantics:

- `401` for absent, expired, or revoked Internet Banking authentication;
- `403` for missing client access or ARM;
- `404` for a resource that is not visible under the selected client;
- `409` for already registered, stale, or conflicting state where disclosure is safe after OTP verification;
- `429` for OTP or authentication rate limits;
- `502/503` for bounded upstream failures without leaking internal addresses or credentials.

## 10. Internet Banking UI

Public routes:

- `/register` — phone entry, four-cell OTP entry, and password creation;
- `/login` — phone and password;
- `/` — authenticated product dashboard.

The dashboard uses the new Internet Banking visual language and follows the information structure of Frontovik:

- a client header and client selector when more than one access exists;
- product tabs for profile, accounts, cards, credits, deposits, and POS;
- clear bordered product cards, tables, selectors, loading states, and empty states;
- no client search;
- no terrorist/compliance checks;
- no employee-only metadata or operator audit controls unless the corresponding Internet Banking ARM explicitly allows it;
- inaccessible tabs and actions are absent, not merely disabled;
- permission-denied backend responses refresh the session capabilities and show a safe message.

## 11. Audit and Security

Audit events record:

- operator creation, modification, deactivation, and reactivation of clients, people, phones, roles, and ARMs;
- OTP request outcome category without the OTP value;
- registration completion;
- sign-in success/failure category with masked phone;
- client selection and every privileged product action;
- permission denial and upstream failure category.

Sensitive values are redacted. INN and phone are masked in logs. Secrets are read from environment or the existing encrypted deployment secret mechanism and are never committed to Git or stored in remote URLs.

## 12. Deployment

`premies_portal_front/deploy.ps1` adds:

- `internet_banking_backend`, branch `main`, GitHub canonical and the specified GitLab mirror;
- `internet_banking_frontend`, branch `main`, GitHub canonical and the specified GitLab mirror.

Selecting either Internet Banking service expands to the two-repository deployment group. The controller updates and mirrors both repositories, then runs their dedicated manifest:

```bash
docker compose -p internet_banking \
  -f internet_banking_backend/deploy/docker-compose.yml \
  up -d --build
```

The existing Daily Activ Compose remains responsible for Daily Portal and ABS. Internet Banking uses host ports `4000` and `4001` and joins `daily_activ_daily_network`. Production URLs and service credentials are provided as build arguments/environment variables from server-owned configuration.

## 13. Testing and Acceptance Criteria

Implementation follows test-driven development.

Backend tests must prove:

- phone and ABS-code normalization;
- atomic access updates and uniqueness constraints;
- effective ARM union and inactive-record denial;
- role-43 operator protection;
- generic OTP responses, four-digit generation, TTL, cooldown, attempt limit, single use, and rate limiting;
- registration token consumption and duplicate registration behavior;
- phone/password login, token refresh, and revocation;
- a person with multiple client accesses receives all and only those clients;
- arbitrary client codes and cross-client resource identifiers are rejected;
- every privileged action requires its exact ARM;
- upstream failures are bounded and sanitized.

Frontend tests must prove:

- operator multi-person editing and multi-select roles/ARMs;
- catalog editing and validation;
- registration state transitions and OTP input;
- phone/password login and safe session persistence;
- client switching;
- product rendering without search/compliance UI;
- tab/action visibility for representative permission combinations;
- permission revocation handling.

Deployment tests must prove:

- both repositories are configured without embedded credentials;
- selecting either service includes the full Internet Banking group;
- Internet Banking services are excluded from the main Daily Activ service arguments;
- the dedicated Compose command, network, ports, health checks, and failure logs are generated correctly;
- a deployment state is saved only after both Internet Banking services start successfully.

Production acceptance requires passing repository tests, lint/type checks, Go vet, production builds, Compose validation, container health checks, HTTP health checks, registration through SMS OTP, login, multi-client switching, permission-denied verification, and visual checks at `http://10.65.10.20:3000/internet-bank` and `http://10.65.10.20:4000/`.

