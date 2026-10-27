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

**Not in this build (postpone per blueprint):** real-money rails, self-service ad marketplace, microservices, chat.

## Prerequisites

- Node 20+
- Docker (for Postgres) **or** any PostgreSQL 14+ instance

## Quick start (from scratch — no seed)

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install & generate client
npm install
npx prisma generate

# 3. Push schema (empty database)
npx prisma db push

# 4. Run
npm run dev
```

Open **http://localhost:3000**

Register your first user. WordKey is returned in the API response in development and logged to the server console. On verify you receive the initial weekly allowance. Create exchange assets and discover listings yourself — there is **no seed data**.

### Environment

Copy `.env.example` → `.env` (already configured for local Docker Postgres):

```
DATABASE_URL="postgresql://bannk:bannk_dev_password@localhost:5432/bannk?schema=public"
```

For production, set strong `SESSION_SECRET` and `WORDKEY_PEPPER`, use a managed Postgres URL, and remove `devWordKey` from the register response.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` / `start` | Production |
| `npx prisma db push` | Apply schema to empty DB |
| `npx prisma studio` | Browse data |
| `docker compose up -d` | Local Postgres + Redis |

## Project layout

```
src/
  app/
    (app)/           # authenticated shell (Home, Wallet, Exchange, Discover, Profile, Send)
    api/             # REST: auth, me, wallets, transfers, exchange, discover, qr, listings
    u/[username]     # public profile
    login|register|verify
  components/        # BottomNav
  lib/
    auth.ts          # WordKey, sessions, passwords
    ledger.ts        # double-entry + transfers + trade cash
    allowance.ts     # weekly periods
    exchange.ts      # simulated market
    discover.ts      # listings & campaigns
    qr.ts            # profile QR
    money.ts         # minor units
prisma/schema.prisma # PostgreSQL
docker-compose.yml   # Postgres 16 + Redis
docs/PRODUCT_SPEC.md # full product blueprint
```

## Production notes

1. Managed PostgreSQL (`DATABASE_URL`)
2. Strong secrets; HTTPS only
3. Wire transactional email for WordKey
4. Restrict asset/listing creation to admin roles when ready
5. Coolify / Docker deploy per product spec §9

All balances are **simulated virtual credits**. Bannk does not accept real deposits or process real money.
