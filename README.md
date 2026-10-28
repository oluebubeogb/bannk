# Bannk

**Money that moves at your speed.**  
Send, receive and request money with a @username · PWA · Built in Nigeria · PostgreSQL

## Stack

- **Next.js 15** (App Router) + TypeScript
- **PostgreSQL** via Prisma
- **Tailwind CSS v4**
- Jose (JWT sessions) · bcryptjs · qrcode · zod

## Features (blueprint coverage)

| Area | Included |
|------|----------|
| Auth | Register, Nigerian-flavoured WordKey verify (case-insensitive), login, logout, sessions, **forgot / reset password** via emailed WordKey, eye toggles on every password field |
| Transaction PIN | 4-digit PIN (bcrypt-hashed only), set/change/remove in Profile → Security, required for every transfer; 5 wrong tries → 15 min lock |
| Identity | Unique usernames, public profiles `/u/[username]`, QR identity |
| Wallet | Multi-currency ready, balances, history |
| Weekly allowance | 7-day periods, initial + weekly grants, spending cap on transfers |
| Transfers | P2P by username, idempotent, atomic ledger |
| Exchange | **Receive payment** invoices (amount + description → QR + link), listed assets, market buy/sell, portfolio, P&amp;L |
| Discover | Product/event listings, search, create listing |
| PWA shell | Mobile-first bottom nav, installable manifest |
| Ledger | Double-entry journal, integer minor units, starts from an empty DB |
| Alerts | "Bannk credit" / "Bannk debit" emails on every transfer, partially masked balance, receipt PNG attached (`ALERT_EMAILS=false` to disable) |
| Privacy | Balances masked (`NGN ******`) by default; eye toggle remembered per device |
| Opening balance | **₦1,000,050.00** on verify (`INITIAL_ALLOWANCE_MINOR=100005000`) |
| Receipts | `/receipt/[id]` after every transfer, deep-linkable, party-only (403 otherwise) |
| Share | One **Share receipt** button → Image · PDF · Text · Private link (link opens only for the two parties) |
| Statements | Sleek **PDF**, CSV and Email on one row, any period up to 366 days, from Wallet |
| QR | Branded QR with the Bannk mark, bold @username, PNG download |
| Mail | WordKey + emailed PDF statements via SMTP or Resend |
| Schedule | `POST /api/cron/allowance` (Coolify scheduled task) |
| Community | `/community` — challenges with idempotent rewards, public groups (create/join/leave), real-data leaderboards |
| Admin console | `/admin` — overview, users (search, suspend, audited balance adjustments), business review, listings, campaigns, challenges, reports, audit log. Access via `ADMIN_USERNAMES` only |
| Business console | `/business` — any verified member submits a business → admin approves → owner drafts listings/campaigns → admin publishes; campaign metrics |
| Moderation | Report a listing/user/campaign (`POST /api/reports`), reviewed in `/admin/reports` |
| Theme | Light fintech UI (warm neutrals, charcoal ink, lime accent) |

**Not in this build:** Redis-backed queues/rate limits, bank deposit/withdrawal rails, self-service ad billing, subdomains, chat, microservices.

## Prerequisites

- Node 20+
- PostgreSQL 14+ (local: `docker compose -f docker-compose.dev.yml up -d postgres`)

## Local development

```bash
cp .env.example .env            # set DATABASE_URL, SESSION_SECRET, WORDKEY_PEPPER
npm install                     # runs prisma generate
npx prisma migrate deploy       # applies prisma/migrations (empty DB, no seed)
npm run dev                     # http://localhost:3000
```

With mail unset (`MAIL_PROVIDER=console`), the WordKey is printed in the server log and, **outside production only**, returned as `devWordKey` from register/resend. In production `devWordKey` is never returned.

Changing the schema: `npx prisma migrate dev --name <change>` and commit the new folder in `prisma/migrations/`.

## Deploy on Coolify

1. **Postgres** — New Resource → Database → PostgreSQL 16. Copy its *internal* connection URL.
2. **App** — New Resource → Application (not Docker Compose) → upload/`git` → Build Pack **Dockerfile** (repo root has `Dockerfile`). Port **3000**.
   - If Coolify only shows `POSTGRES_*` vars, you opened a **Compose** resource (or an old zip that shipped `docker-compose.yml`). Delete/ignore that resource and create a fresh **Application** with Build Pack Dockerfile. App secrets (`DATABASE_URL`, `SESSION_SECRET`, …) are added manually under Environment — they are not auto-imported from `.env.example`.
3. **Environment variables** (Coolify → app → Environment):

| Variable | Required | Example / notes |
|---|---|---|
| `DATABASE_URL` | yes | internal Postgres URL from step 1 |
| `SESSION_SECRET` | yes | `openssl rand -hex 32` |
| `WORDKEY_PEPPER` | yes | `openssl rand -hex 32` — never change after launch (invalidates pending WordKeys) |
| `APP_URL` | yes | `https://bannk.yourdomain.com` — used in emails and receipt share links |
| `CRON_SECRET` | yes (for schedule) | `openssl rand -hex 24` |
| `INITIAL_ALLOWANCE_MINOR` | no | `100005000` (₦1,000,050.00) — default if unset |
| `WEEKLY_ALLOWANCE_MINOR` | no | `25000000` (₦250,000.00) — weekly grant **and** weekly send cap |
| `ALLOWANCE_PERIOD_DAYS` | no | `7` |
| `ALERT_EMAILS` | no | `true` — credit/debit alert emails with receipt PNG; `false` disables |
| `MAIL_PROVIDER` | yes (prod mail) | `smtp` or `resend` |
| `MAIL_FROM` | yes | `Bannk <no-reply@yourdomain.com>` (must be a verified sender) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` | if smtp | 587 + `SMTP_SECURE=false` (STARTTLS) or 465 + `true` |
| `RESEND_API_KEY` | if resend | `re_…` |
| `ADMIN_USERNAMES` | for admin | Comma-separated usernames, e.g. `amara,tunde,admin1` — trimmed, case-insensitive, `@` optional. Only these accounts can open `/admin` and `/api/admin/*`. Empty/unset = nobody. Redeploy/restart after changing |

4. **Deploy.** The container entrypoint runs `prisma migrate deploy` then `next start` on `0.0.0.0:3000`. The image runs as the non-root `node` user.
5. **Health check** — `GET /api/health` → `{"status":"ok","db":"ok","mail":"smtp"}` (503 if the DB is unreachable). The Dockerfile also declares a `HEALTHCHECK`; in Coolify set the health check path to `/api/health`.
6. **Scheduled task (weekly allowance)** — Coolify → app → Scheduled Tasks → add:
   - Frequency: `0 1 * * *` (daily 01:00 is fine — grants are idempotent per user per period)
   - Command (runs inside the container):
     ```sh
     curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/allowance
     ```
   Response: `{"ok":true,"scanned":N,"granted":M,"errors":[]}`. Users still also receive a due grant on login.
7. Point your domain at the app; HTTPS via Coolify's proxy. (If you see intermittent `ChunkLoadError` / `ERR_QUIC_PROTOCOL_ERROR`, disable HTTP/3 on the proxy.)

**Redis is optional and unused in v1** — `docker-compose.dev.yml` is local-only (Postgres/Redis helpers). Do **not** deploy that Compose file on Coolify; use Build Pack **Dockerfile** so the app env vars from `.env.example` appear in Coolify → Environment.

## Allowance rules

- On WordKey verify: one-time **opening balance ₦1,000,050.00** (`initial-allowance:<userId>`, idempotent).
- Weekly grant (`WEEKLY_ALLOWANCE_MINOR`) starts the period *after* signup, via cron or login.
- Transfers are capped per period at `WEEKLY_ALLOWANCE_MINOR` (default **25000000 = ₦250,000.00**; shown in the app as a tooltip). Raise it if you want users to move more of the opening balance each week.

## Receipts, sharing & statements

| What | Where |
|---|---|
| Receipt screen | `/receipt/[transactionId]` — opened automatically after Send; every Wallet activity row links to it |
| Receipt API | `GET /api/transfers/[id]` → `{ receipt, shareUrl, shareText }` · `/image` (PNG) · `/pdf` (`?download=1`) · 401 signed-out · 403 not a party · 404 unknown |
| Share | Receipt → **Share receipt** → Image (PNG file share/download) · PDF · Text · Private link (`APP_URL/receipt/<id>`, party-only) |
| Statement download | Wallet → Statement (Last 30 days · This month · Last month · Custom) → **PDF · CSV · Email** (one row) |
| Statement API | `GET /api/statements?from=YYYY-MM-DD&to=YYYY-MM-DD&format=pdf\|csv\|json` (auth; default last 30 days; max 366 days; UTC days) |
| Email statement | Wallet → **Email me this statement** → `POST /api/statements/email {from,to,includeCsv?}` — PDF attached, sent to the verified email. Returns 503 `MAIL_NOT_CONFIGURED` in production if mail isn't set; download still works |

PDF contents: Bannk header, period, holder/username/email/currency, opening · money in · money out · closing cards, transaction table (date/time, description + counterparty + note, reference, signed amount, running balance), legal footer + page numbers on every page. Fonts: Inter (OFL) embedded from `assets/fonts/` so ₦ renders.

CSV columns: `date,type,ref,counterparty,note,amount,balance_after,currency` with opening/closing rows.

## Community, Admin & Business

### Admin access — `ADMIN_USERNAMES` only

Admin rights come **only** from the `ADMIN_USERNAMES` environment variable (comma-separated Bannk usernames). There is no role column in the database and no staff badge anywhere in the UI. Admins use the app like everyone else; an "Admin console" link appears on their own Profile page only.

- Signed-out visitors to `/admin/*` are redirected to `/login?next=/admin/...`.
- Signed-in non-admins get a **403** page; `/api/admin/*` returns `401`/`403` JSON.
- Every admin write is recorded in `AuditEvent` (`admin.*`).
- Helper: `src/lib/admin.ts` → `parseAdminUsernames()`, `isAdminUsername()`, `requireAdmin(session)`.

### Flows

| Flow | How it works |
|---|---|
| Challenge reward | `POST /api/community/challenges/[id]/complete` → one DB transaction: `ChallengeCompletion` + ledger journal from the issuance account + `RewardGrant` + `AuditEvent`. Unique `(challengeId,userId)` makes it pay **once**; repeat calls return `alreadyCompleted` |
| Balance adjustment | `/admin/users/[id]` → credit/debit with mandatory reason → balanced `adjustment` journal + `AuditEvent admin.adjust_balance` (idempotency key per submit; debits can't overdraw) |
| Business onboarding | `/business` submit (pending) → `/admin/businesses` approve/reject with reason (owner notified; rejecting pauses live items) → owner creates **draft** listings/campaigns → admin publishes/activates. Owners can pause/archive their own items |
| Campaign tracking | Discover records `impression`/`click` (once per user per campaign per UTC day) and `join` (once) via `POST /api/campaigns/[id]/events`; challenge completions add `complete`. Metrics shown in both consoles |

### Routes

| Route | Purpose |
|---|---|
| `GET /api/community/challenges` · `POST /api/community/challenges/[id]/complete` | Active challenges · complete + reward |
| `GET/POST /api/community/groups` · `POST/DELETE /api/community/groups/[id]/membership` · `GET …/members` | Groups |
| `GET /api/community/leaderboard` | Wallet / portfolio / challenge leaderboards (public profiles only) |
| `POST /api/campaigns/[id]/events` | `{eventType: impression\|click\|join}` |
| `POST /api/reports` | `{targetType: listing\|user\|campaign, targetId, reason}` (one open report per target; 10/hour) |
| `GET/POST /api/business` · `POST /api/business/listings` · `PATCH /api/business/listings/[id]` · `POST /api/business/campaigns` · `PATCH /api/business/campaigns/[id]` | Owner-scoped business console |
| `GET /api/admin/overview` | Counts + recent audit |
| `GET /api/admin/users` · `GET /api/admin/users/[id]` · `POST …/status` · `POST …/adjust` | Users |
| `GET /api/admin/businesses` · `POST /api/admin/businesses/[id]/review` | Business review |
| `GET /api/admin/listings` · `PATCH /api/admin/listings/[id]` | Publish / pause / archive / sponsor |
| `GET/POST /api/admin/campaigns` · `PATCH /api/admin/campaigns/[id]` | Campaigns |
| `GET/POST /api/admin/challenges` · `PATCH /api/admin/challenges/[id]` | Challenges |
| `GET /api/admin/reports` · `PATCH /api/admin/reports/[id]` | Reports |
| `GET /api/admin/audit` | Audit log |

## API additions

| Route | Purpose |
|---|---|
| `POST /api/auth/resend` | New WordKey email (1/min, 5/hour) |
| `GET /api/transfers/[id]` | Receipt |
| `GET /api/statements` | PDF/CSV/JSON statement |
| `POST /api/statements/email` | Email PDF statement |
| `POST /api/cron/allowance` | Weekly grants (Bearer `CRON_SECRET`) |
| `GET /api/health` | Liveness + DB ping |
| `POST /api/auth/forgot` | Email a reset WordKey (generic reply; 1/min, 5/hour; 30-min expiry, hashed) |
| `POST /api/auth/reset` | `{email, resetKey, newPassword}` → new password, all sessions revoked (5 attempts per key) |
| `GET/POST/DELETE /api/me/pin` | PIN status · set/change (`currentPin` or `currentPassword` to change) · remove (`currentPassword`) |
| `POST /api/me/password` | Change password (`currentPassword`, `newPassword`) |
| `POST /api/transfers` | Now requires `pin`; optional `paymentRequestToken` (server-side amount/recipient win). Errors carry `code`: `PIN_NOT_SET` 428 · `PIN_INVALID` 403 · `PIN_LOCKED` 423 |
| `GET /api/transfers/[id]/image` · `/pdf` | Receipt PNG / PDF (party-only, `?download=1`) |
| `GET /api/qr/image` | Branded profile QR PNG (`?download=1`) |
| `GET/POST /api/payment-requests` | My recent requests · create `{amountMinor, note?, expiresInDays 1–30}` |
| `GET/DELETE /api/payment-requests/[token]` | Public invoice view · cancel (payee) |
| `GET /api/payment-requests/[token]/qr` | Invoice QR PNG |

### Pages added

`/forgot-password`, `/reset-password`, `/pay/[token]` (public invoice → Pay → `/send?request=TOKEN`, PIN still required). `/` redirects signed-in users to `/home` server-side.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build / start |
| `npm run db:deploy` | `prisma migrate deploy` |
| `npm run start:prod` | migrate + start (non-Docker hosts) |
| `npx prisma studio` | Browse data |

## Project layout

```
src/
  app/
    (app)/            # Home, Wallet (+ statements), Send, Receipt, Exchange, Discover, Community, Profile
    admin/            # Admin console (ADMIN_USERNAMES only)
    business/         # Business console (verified members)
    api/              # auth, me, wallets, transfers, statements, cron, health, community, campaigns, reports, business, admin, …
    u/[username]      # public profile
    login|register|verify|forgot-password|reset-password
    pay/[token]       # public payment request / invoice
  components/         # BottomNav, StatementPanel, ReceivePanel, kit (Logo, IconCircle, PinPad, PasswordInput, InfoTip…), ui, MetricsRow
  lib/
    auth.ts           # WordKey, sessions, passwords
    ledger.ts         # double-entry, transfers, references (BNK-YYYYMMDD-XXXXXXXX)
    allowance.ts      # opening + weekly grants, cron batch
    receipts.ts       # receipt lookup + party check
    statements.ts     # statement data, CSV, PDF (pdfkit)
    mail.ts           # SMTP / Resend / console
    admin.ts          # ADMIN_USERNAMES parsing + requireAdmin / withAdmin guards
    community.ts · business.ts · campaign-events.ts · api.ts · guards.ts
    exchange.ts · discover.ts · qr.ts · money.ts
    pin.ts · paymentRequests.ts · alerts.ts · receiptRender.ts · render.ts · brand.ts
prisma/
  schema.prisma
  migrations/20261027000000_init/                       # initial migration
  migrations/20261027220000_community_admin_business/   # challenges, groups, business review fields
  migrations/20261028000000_pin_reset_payreq/           # transaction PIN, password reset challenges, payment requests
assets/fonts/         # Inter for PDFs
Dockerfile · docker-entrypoint.sh · .dockerignore
docs/PRODUCT_SPEC.md
```

Bannk is in pilot in Nigeria. Funding (deposits) and withdrawals to bank accounts are not part of this build.
