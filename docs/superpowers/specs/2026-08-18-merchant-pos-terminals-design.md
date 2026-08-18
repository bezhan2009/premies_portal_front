# Merchant POS Terminals Design

## Scope

Add merchant POS-terminal administration to `premies_portal` and a conditional
`POS-терминалы` tab to Frontovik ABS Search in `premies_portal_front`. The QR tab
is explicitly deferred. The existing merchant-code dictionary at `/merchants`
must remain compatible because QR transaction screens already use it.

## Existing Architecture

- Frontovik searches an ABS client and then loads cards, accounts, credits, and
  deposits by the client's `client_code`.
- Account balances and currencies are already returned by the ABS accounts
  request. Account statements use `/accounts/account-operations`.
- Processing transaction history is rendered by the existing processing
  transactions page.
- Operator administration is protected by role `3`; Frontovik ABS Search is
  available to roles `17`, `35`, and `39`.
- The Go backend uses Gin, GORM, PostgreSQL, route middleware, handlers,
  services, repositories, and startup `AutoMigrate`.
- The current `Merchants` model (`title`, `code`) is a separate QR dictionary,
  not a POS model.

## Data Model

Create a separate `merchant_pos_terminals` table:

| Column | Type/constraint |
| --- | --- |
| `id` | primary key |
| `atm_id` | string, required, unique index |
| `account_number` | string, indexed, not unique |
| `client_code` | string, required, indexed, not unique |
| `address` | string/text, not unique |
| `inn` | string, indexed, not unique |
| `created_at`, `updated_at`, `deleted_at` | standard GORM lifecycle fields |

Identifier fields remain strings to preserve leading zeros. No unique or
composite unique constraint is permitted on account number, client code,
address, or INN. Rows that are identical except for `atm_id` are valid.

## Backend API

Use a dedicated handler/service/repository stack with an injected GORM
repository.

### Operator administration

- `GET /merchant-pos-terminals?page=&limit=&search=&sort_by=&sort_order=`
- `GET /merchant-pos-terminals/:id`
- `POST /merchant-pos-terminals`
- `PATCH /merchant-pos-terminals/:id`
- `DELETE /merchant-pos-terminals/:id`

These routes require authentication and operator role `3`. List responses use
`{ items, total, page, limit }`. Search covers ATM ID, account number, client
code, address, and INN. Sort columns are allow-listed before building the GORM
order expression.

### Frontovik lookup

- `GET /merchant-pos-terminals/client/:clientCode`

This route requires authentication and one of the roles already allowed to use
Frontovik ABS Search (`17`, `35`, `39`), plus operator role `3` for operational
support. It returns all matching rows ordered by ATM ID without `DISTINCT` or
frontend/backend deduplication.

### POS history

- `POST /merchant-pos-terminals/history`

Request body:

```json
{
  "clientCode": "5100.000001",
  "atmIds": ["30000373", "30000375"],
  "fromDate": "2026-07-19",
  "toDate": "2026-08-18"
}
```

The handler requires a Frontovik/processing-authorized user, rejects an empty
selection, safely normalizes duplicate request IDs, and verifies that every ATM
ID exists under the supplied client code. It then queries the existing
processing API with parameterized URL values for each ATM ID and returns one
combined transaction array. A missing or foreign ATM ID is rejected before any
processing response is returned.

## Validation and Errors

- Trim all identifier and text inputs.
- Require `atm_id` and `client_code`; validate reasonable maximum lengths.
- Translate an ATM unique-index violation to HTTP `409` with
  `{"error":"ATM ID уже существует"}`.
- Return `400` for malformed input, `404` for missing records, `403` for denied
  permissions, and `502` with a user-safe message when processing is unavailable.
- Never expose SQL, connection, or raw internal errors.

## Administrative UI

Keep the current QR merchant dictionary intact. Inside operator data
administration, the `Мерчанты` area exposes the existing dictionary and a new
`POS-терминалы` view. The POS view provides:

- server-side pagination;
- one search field covering all five business fields;
- columns for ATM ID, account number, client code, address, and INN;
- create/edit/delete controls using existing Ant Design/table conventions;
- field validation and existing toast notifications.

## Frontovik Data Flow

1. When the selected ABS client changes, clear POS state immediately and start
   a product-load generation for that `client_code`.
2. Load POS together with cards, accounts, credits, and deposits.
3. Ignore late results from older client generations.
4. Do not render the navigation bar until the POS lookup resolves; show the
   existing loader instead, preventing tab flicker.
5. Insert `POS-терминалы` after `Депозиты` only when at least one POS exists.
6. If the active tab is POS and the new/fresh result is empty, return to the
   established default tab `Карты`.

Until QR is implemented, the resulting order is:

`Карты → Кредиты → Счета → Депозиты → POS-терминалы → Информация`.

## POS Cards

Render every API row as a separate card keyed by ATM ID. Do not deduplicate.
Each card displays:

- a lightweight existing-library POS/payment icon;
- the selected ABS client's name;
- ATM ID;
- account number and copy action;
- ABS balance and currency matched by exact account number against the already
  loaded ABS accounts;
- `Выписка по счету`, reusing the current statement navigation;
- `История операций`, opening the shared client-level terminal selector.

Missing account, address, or balance values display `—`; balance failure does
not remove the POS card.

## History Selection and Existing Transactions Page

Use Ant Design `Modal` and `Checkbox`, already present in the frontend
dependency set. The modal lists every POS for the current client, not only the
card that launched it. It supports individual selection, multi-selection,
Select All, and indeterminate state. The CTA is disabled when nothing is
selected, and the list has a bounded scroll area for large client portfolios.

After confirmation, navigate to the existing processing transactions page with
the client code and selected ATM IDs. Extend that page with a POS-history mode
that calls the authenticated Go gateway and renders the returned operations in
the existing transaction table. The general single-card and manual processing
search modes remain unchanged.

## Loading, Empty, and Responsive States

- Use the existing spinner while client product/POS data is resolving.
- Use existing toast/error conventions for recoverable failures.
- If the POS list becomes empty after initial navigation, show a short empty
  state and switch safely to Cards.
- Use the existing responsive cards grid; stack card metadata/actions on narrow
  screens.
- Limit modal height and make only the terminal rows scroll.

## Testing

Backend tests cover:

- model/repository uniqueness: identical non-ATM fields with different ATM IDs
  succeed, duplicate ATM ID fails;
- service validation and normalized duplicate request IDs;
- zero/one/many client lookup without deduplication;
- invalid, empty, and foreign history selections;
- allowed and forbidden route access where the existing middleware harness
  permits isolated testing.

Frontend tests use the repository's lightweight Node test style for extracted
pure helpers and cover:

- POS tab absent/present and ordered after Deposits;
- reset when switching clients;
- one and multiple POS rows with identical non-ATM data;
- Select All, partial/indeterminate, and empty selection behavior;
- exact ATM ID payload generation;
- balance matching and missing-value fallback.

Final verification runs Go tests/build, frontend helper tests, ESLint, and Vite
build. Any unrelated baseline failure is documented and only repaired when it
blocks verification with a minimal targeted change.

## Repositories and Branches

- `premies_portal_front`: commit and push to `master`.
- `premies_portal`: commit and push to `main`.
- `abs_service`: no change; its repository is unavailable and the design does
  not require a new ABS contract.
