# Bannk

**Banking without borders.**  
Virtual-only economy · Global-first PWA · African identity · Weekly allowance · PostgreSQL

## Stack

- **Next.js 15** (App Router) + TypeScript
- **PostgreSQL** via Prisma
- **Tailwind CSS v4**
- Jose (JWT sessions) · bcryptjs · qrcode · zod

## Features (blueprint coverage)

| Area | Included |
|------|----------|
| Auth | Register, WordKey verify, login, logout, sessions |
| Identity | Unique usernames, public profiles `/u/[username]`, QR identity |
| Wallet | Multi-currency ready, balances, history |
| Weekly allowance | 7-day periods, initial + weekly grants, spending cap on transfers |
| Transfers | P2P by username, idempotent, atomic ledger |
| Exchange | Simulated assets, market buy/sell, portfolio, P&amp;L |
| Discover | Product/event listings, search, create listing |
| PWA shell | Mobile-first bottom nav, installable manifest |
| Ledger | Double-entry journal, integer minor units, no seed required |
| Opening balance | **₦1,000,050.00** on verify (`INITIAL_ALLOWANCE_MINOR=100005000`) |
| Receipts | `/receipt/[id]` after every transfer, deep-linkable, party-only (403 otherwise) |
| Share | Native share sheet (`navigator.share`) with copy-link / copy-summary fallback |
| Statements | Sleek **PDF** (primary) + CSV, any period up to 366 days, from Wallet |
| Mail | WordKey + emailed PDF statements via SMTP or Resend |
| Schedule | `POST /api/cron/allowance` (Coolify scheduled task) |
| Theme | Light fintech UI (warm neutrals, charcoal ink, lime accent) |

**Postponed (Phase C — not in this build):** Community tab, Admin console, Business console, Redis-backed queues/rate limits, real-money rails, self-service ad marketplace, chat, microservices.

## Prerequisites

- Node 20+
- PostgreSQL 14+ (local: `docker compose up -d postgres`)

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
2. **App** — New Resource → Public/Private Git repo (or upload) → Build Pack **Dockerfile** (repo root). Port **3000**.
3. **Environment variables** (Coolify → app → Environment):

| Variable | Required | Example / notes |
|---|---|---|
| `DATABASE_URL` | yes | internal Postgres URL from step 1 |
| `SESSION_SECRET` | yes | `openssl rand -hex 32` |
| `WORDKEY_PEPPER` | yes | `openssl rand -hex 32` — never change after launch (invalidates pending WordKeys) |
| `APP_URL` | yes | `https://bannk.yourdomain.com` — used in emails and receipt share links |
| `CRON_SECRET` | yes (for schedule) | `openssl rand -hex 24` |
| `INITIAL_ALLOWANCE_MINOR` | no | `100005000` (₦1,000,050.00) — default if unset |
| `WEEKLY_ALLOWANCE_MINOR` | no | `250000` (₦2,500.00) — weekly grant **and** weekly send cap |
| `ALLOWANCE_PERIOD_DAYS` | no | `7` |
| `MAIL_PROVIDER` | yes (prod mail) | `smtp` or `resend` |
| `MAIL_FROM` | yes | `Bannk <no-reply@yourdomain.com>` (must be a verified sender) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` | if smtp | 587 + `SMTP_SECURE=false` (STARTTLS) or 465 + `true` |
| `RESEND_API_KEY` | if resend | `re_…` |

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

**Redis is optional and unused in v1** — `docker-compose.yml` keeps it for local experiments only; no env var is required.

## Allowance rules

- On WordKey verify: one-time **opening balance ₦1,000,050.00** (`initial-allowance:<userId>`, idempotent).
- Weekly grant (`WEEKLY_ALLOWANCE_MINOR`) starts the period *after* signup, via cron or login.
- Transfers are capped per period at `WEEKLY_ALLOWANCE_MINOR` (existing spec rule). Raise it if you want users to move more of the opening balance each week.

## Receipts, sharing & statements

| What | Where |
|---|---|
| Receipt screen | `/receipt/[transactionId]` — opened automatically after Send; every Wallet activity row links to it |
| Receipt API | `GET /api/transfers/[id]` → `{ receipt, shareUrl }` · 401 signed-out · 403 not a party · 404 unknown |
| Share | Receipt → **Share receipt** (`navigator.share` with text + `APP_URL/receipt/<id>`), fallback copies text + link; **Copy link**, **Copy summary text** |
| Statement download | Wallet → Statement (Last 30 days · This month · Last month · Custom) → **Download PDF** / CSV |
| Statement API | `GET /api/statements?from=YYYY-MM-DD&to=YYYY-MM-DD&format=pdf\|csv\|json` (auth; default last 30 days; max 366 days; UTC days) |
| Email statement | Wallet → **Email me this statement** → `POST /api/statements/email {from,to,includeCsv?}` — PDF attached, sent to the verified email. Returns 503 `MAIL_NOT_CONFIGURED` in production if mail isn't set; download still works |

PDF contents: Bannk header, period, holder/username/email/currency, opening · money in · money out · closing cards, transaction table (date/time, description + counterparty + note, reference, signed amount, running balance), virtual-credits disclaimer + page numbers on every page. Fonts: Inter (OFL) embedded from `assets/fonts/` so ₦ renders.

CSV columns: `date,type,ref,counterparty,note,amount,balance_after,currency` with opening/closing rows.

## API additions

| Route | Purpose |
|---|---|
| `POST /api/auth/resend` | New WordKey email (1/min, 5/hour) |
| `GET /api/transfers/[id]` | Receipt |
| `GET /api/statements` | PDF/CSV/JSON statement |
| `POST /api/statements/email` | Email PDF statement |
| `POST /api/cron/allowance` | Weekly grants (Bearer `CRON_SECRET`) |
| `GET /api/health` | Liveness + DB ping |

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
    (app)/            # Home, Wallet (+ statements), Send, Receipt, Exchange, Discover, Profile
    api/              # auth (+resend), me, wallets, transfers (+[id]), statements (+email), cron, health, …
    u/[username]      # public profile
    login|register|verify
  components/         # BottomNav, StatementPanel
  lib/
    auth.ts           # WordKey, sessions, passwords
    ledger.ts         # double-entry, transfers, references (BNK-YYYYMMDD-XXXXXXXX)
    allowance.ts      # opening + weekly grants, cron batch
    receipts.ts       # receipt lookup + party check
    statements.ts     # statement data, CSV, PDF (pdfkit)
    mail.ts           # SMTP / Resend / console
    exchange.ts · discover.ts · qr.ts · money.ts
prisma/
  schema.prisma
  migrations/20261027000000_init/   # initial migration (prisma migrate deploy)
assets/fonts/         # Inter for PDFs
Dockerfile · docker-entrypoint.sh · .dockerignore
docs/PRODUCT_SPEC.md
```

## Phase C — postponed

Community tab, Admin console, Business console, sponsorship self-serve, Redis-backed queues & rate limiting, real-money rails. Not included in this build.

All balances are **simulated virtual credits**. Bannk does not accept real deposits or process real money.
