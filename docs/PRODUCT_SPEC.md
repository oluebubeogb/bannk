# Bannk — Product Specification & MVP Roadmap

# Bannk

## Banking without borders.

Product definition · Technical architecture · Security · Delivery roadmap

Virtual-only economy

Global-first PWA

African identity

Simulated exchange

## 1. Executive summary

Bannk is a global, installable progressive web app (PWA) built around a virtual financial economy. Users receive simulated money, maintain wallets denominated in familiar currencies, send funds to other members, earn rewards, invest in simulated companies, and discover real products and events through Bannk's own marketplace.

Its defining principle is banking-inspired experiences without real-money banking.

The launch version will not accept deposits, process withdrawals, hold customer funds, or offer actual investment products. Every wallet balance, transfer, share, and portfolio value is virtual. Product purchases and event ticket purchases, if enabled, are clearly separate real-world transactions handled by the relevant merchant or ticketing provider.

The first release should make the virtual economy enjoyable, safe, and internally consistent. International financial services can remain outside the MVP entirely.

### Product north star

Build a trusted global community where anyone can establish a financial identity, participate in a simulated economy, discover real-world opportunities, and grow their reputation without needing a bank account.

Launch audience

Global community

Primary platform

Installable PWA

Economic model

Virtual credits

Revenue direction

Sponsored discovery

## 2. Product principles and boundaries

These decisions should be treated as foundational requirements rather than optional features.

- Virtual value is not real money. A simulated balance cannot be deposited, withdrawn, redeemed, transferred to a bank account, or represented as a real-world financial claim.
- No cash-equivalent investment claims. Simulated shares are game assets, not securities, ownership interests, or promises of profit.
- Transparent economics. Every credit grant, transfer, fee, reward, and adjustment has a recorded reason.
- No pay-to-win economy. Sponsorship participation and community contributions should be the primary ways to earn progression benefits.
- Global access, African identity. Use African-origin vocabulary, visual references, and language diversity respectfully, while supporting international users equally.
- First-party commercial discovery. Bannk manages its own sponsored placements and clearly labels paid promotions instead of embedding third-party advertising networks.
- Privacy by default. Users control what others can see about their profile, activity, and virtual portfolio.

A legal review is still necessary before public launch. Virtual-only functionality reduces financial-service complexity, but it does not automatically eliminate obligations involving consumer protection, advertising, privacy, virtual assets, contests, minors, or country-specific regulations.

## 3. Product structure and navigation

Bannk should feel like a financial product, a social network, and a marketplace combined, without allowing any one of those functions to overwhelm the experience.

### Design system: Mobile-first & responsive

**Primary experience is mobile.** Every screen is designed first for a single-column phone viewport (320–430 px), then progressively enhanced for tablet and desktop.

**Mobile (default)**
- Compact bottom navigation (5 primary destinations).
- Full-width cards, generous touch targets (≥44 px), safe-area insets.
- Single-column scroll for Home, Wallet, Exchange, Discover.
- Transfer and confirmation flows use bottom sheets or full-screen steps.
- Large, high-contrast numbers; restrained motion; reduced-motion support.

**Tablet / Desktop**
- Same components, more breathing room.
- Optional expanded side or top navigation that mirrors the bottom-nav items.
- Home can become a two-column layout (balance + activity | goals + recommendations).
- Transaction history and portfolio switch from card lists to proper data tables when space allows.
- Max content width ~1200–1280 px, centered, with soft side margins.
- No horizontal scrolling of primary content.

**Visual direction**  
Premium, restrained, contemporary fintech. Deep charcoal or midnight navy, warm neutral surfaces, one distinctive natural lime accent, strong typography, clear numbers, and restrained motion. Avoid casino or crypto-terminal aesthetics.

### Primary navigation

| Destination | Purpose |
|-------------|---------|
| Home        | Balance, weekly allowance, activity, goals and recommendations |
| Wallet      | Balances, transfers and transaction history |
| Exchange    | Simulated shares, portfolios and rankings |
| Discover    | Products, events and sponsored campaigns |
| Community   | Challenges, groups, leaderboards and social discovery |
| Profile     | Username, QR identity, reputation, settings and privacy |

On mobile: bottom navigation with the five primary items; Community and secondary destinations accessible via secondary navigation or from Home. On larger screens the same destinations expand into a persistent side or top nav.

### Core screens

| Screen               | Required content                                                      |
| -------------------- | --------------------------------------------------------------------- |
| Landing page         | Product explanation, benefits, signup and virtual-money disclaimer    |
| Registration         | Email, password, username, locale and consent                         |
| WordKey verification | African-origin word phrase, expiry and resend controls                |
| Home dashboard       | Available virtual balance, weekly allowance, activity and goals       |
| Wallet               | Currency balances, transfer flow, QR, history and transaction details |
| Exchange             | Simulated market, asset pages, buy/sell controls and portfolio        |
| Discover             | Real product and event listings, sponsored placements and filters     |
| Community            | Challenges, achievements, leaderboards and groups                     |
| Profile              | Public identity, QR, privacy controls and reputation                  |
| Admin console        | User support, economic controls, moderation, listings and audit logs  |
| Business console     | Sponsored campaigns, product listings, event listings and reporting   |

## 4. Detailed feature specification

### A. Accounts and identity

MVP requirement

- Email and password registration.
- Email verification using Bannk WordKey.
- Unique usernames with a reserved-name policy.
- Public profile URL, such as `bannk.app/@amara`.
- Generated QR code tied to a stable profile or payment URL.
- Profile image, display name, locale and preferred currency.
- Password reset, session management and account deletion.
- Configurable public/private profile and transaction privacy.
- Age-appropriate access controls based on the launch policy and applicable law.

WordKey should use a curated vocabulary with documented language origin and meaning. Generate the phrase with a cryptographically secure random generator, store only a secure verifier or hash where appropriate, expire it, invalidate it after use, and rate-limit attempts. It is a verification mechanism, not a password or recovery secret.

### B. Virtual wallet and ledger

MVP requirement

Each user receives an initial allowance in their selected home currency. Additional virtual currency balances can be opened for other supported currencies.

The MVP should support:

- One home-currency wallet and multiple virtual currency balances.
- Initial grants and scheduled **weekly** allowances.
- Peer-to-peer virtual transfers.
- QR-based recipient lookup.
- Transfer requests and payment notes.
- Transaction history with filters.
- Balance and allowance breakdowns.
- Administrative adjustments with mandatory reasons and audit logs.
- Configurable per-transfer, daily, and **weekly** limits.
- Idempotent transfer submission to prevent duplicate debits.
- A clear indicator that all balances are simulated.

Currency design decision: virtual balances should be denominated in a selected currency, but the platform must not imply that every balance is convertible at a guaranteed live or redeemable rate.

For the first release, the safest and simplest policy is to use a single authoritative virtual currency per transfer. Transfers between different currencies can initially be disabled. When cross-currency transfers are introduced, use a recorded exchange-rate snapshot, explicit rounding rules, and an atomic conversion transaction.

### C. Weekly allowance and progression

The allowance system should be deterministic, configurable, and resistant to exploitation.

**Period definition**
- Fixed 7-day windows aligned to a single server timezone (recommended: `Africa/Lagos` or `UTC` for global consistency).
- Period opens at 00:00:00 on the chosen day (e.g. Monday) and closes 6 days 23:59:59 later.
- All period logic uses **server time only** — never the device clock.

A user can earn additional virtual credits or allowance capacity through:

- Completing onboarding.
- Participating in verified sponsored events.
- Completing learning or community challenges.
- Maintaining a positive community reputation.
- Reaching defined membership milestones.

The system should distinguish three concepts:

1. **Allowance cap**: the maximum virtual amount a user may receive or spend during the current week, depending on the chosen policy.
2. **Available balance**: the virtual amount currently held.
3. **Rewards**: credits or benefits granted through qualifying activities.

These values must not be conflated. A user with an increased cap does not automatically receive that amount as a balance.

For weekly limits, define:
- the exact timezone and period boundaries,
- treatment of reversals and refunds,
- what happens when a transfer is rejected after partial consumption of the weekly cap.

Use database-backed period records and enforce consumption inside the same atomic transaction that posts the journal entry.

### D. QR transfers

The QR feature should be extremely simple.

1. Scan  
   Read a Bannk identity or payment-request QR.

2. Confirm recipient  
   Show username, profile and selected currency.

3. Enter and review  
   Enter amount, add a note and review the transfer.

4. Complete  
   Atomically debit and credit the wallets, then show a receipt.

The QR should contain an opaque public identifier or a stable HTTPS URL. It should never contain private account data, authentication tokens, or a mutable wallet balance. The server must validate the recipient and all transfer rules independently of the QR contents.

### E. Simulated stock exchange

MVP requirement

Bannk Exchange is a game economy, not a real securities marketplace.

The MVP should include:

- A catalogue of fictional companies or clearly labelled simulated assets.
- Asset symbols, descriptions, categories and historical simulated prices.
- Virtual cash available for trading.
- Buy and sell transactions.
- Holdings, average acquisition cost and portfolio value.
- Realized and unrealized virtual gains/losses.
- Leaderboards and optional investment challenges.
- Market activity and price-history charts.
- A visible explanation of how prices are determined.

For the initial implementation, use a deterministic simulated market model. For example, prices may change at scheduled intervals based on configured rules, random shocks generated server-side, and simulated market activity. Do not imply that these prices track actual securities or are forecasts of real returns.

Keep the market engine separate from the wallet ledger. A trade must update the user's virtual cash and asset holdings consistently, with no partial transaction if either update fails.

### F. Real products and live events

MVP requirement

This is Bannk's first-party commercial discovery layer.

Users should be able to:

- Browse real product and event listings.
- Search by category, location, date and keyword.
- View a listing's description, images, organizer or merchant, and destination.
- Follow or bookmark listings.
- Participate in eligible sponsored challenges.
- See clearly labelled sponsored content.
- Report misleading or inappropriate listings.

Administrators and approved businesses should be able to create and manage listings, schedule publication, pause campaigns, and view engagement metrics.

Important separation: virtual investing in a fictional company does not grant ownership of the real brand. Virtual rewards do not automatically pay for a product or event ticket. Real purchases happen through an explicitly identified merchant checkout or ticketing provider and must be kept separate from the virtual wallet.

### G. Sponsorships and Bannk Ads

Bannk should own the advertising experience instead of embedding a third-party ad network.

The first-party ad system needs:

- Advertiser or business profiles.
- Sponsored products and events.
- Campaign budgets, start/end dates and targeting settings.
- Sponsored challenges and reward pools.
- Placement rules and frequency caps.
- Campaign impressions and clicks.
- Eligibility checks before rewards are granted.
- Fraud detection for repeated clicks, fake attendance, and reward farming.
- Clear labels such as “Sponsored” or “Bannk Partner.”

Start with admin-managed campaigns rather than a fully self-service advertising marketplace. This keeps moderation, billing, and campaign economics manageable while the platform is still small.

### H. PWA and accessibility

The PWA should have responsive layouts for mobile, tablet and desktop, a web app manifest, install prompts where supported, service-worker caching, and accessible interactions.

**Mobile-first implementation requirements**
- Design and implement for the smallest supported viewport first; enhance upward.
- Bottom navigation on viewports < 768 px; expandable side/top navigation on larger screens.
- Safe-area insets for notched devices.
- Touch targets ≥ 44 × 44 px.
- Semantic HTML, keyboard navigation, visible focus states, reduced-motion support, appropriate contrast, screen-reader labels.
- Localized number and date formatting.
- Offline mode may show cached public listings or read-only historical data. Never queue a transfer for automatic execution while offline. All balances, trades, allowances and transfer confirmations must be validated online by the server.

## 5. End-to-end user flows

These are the primary flows the development team should implement and test.

### Flow 1 — Signup and first virtual wallet

```
flowchart TD
    A["Landing page"] --> B["Choose username and enter email"]
    B --> C["Create account and send WordKey"]
    C --> D{"Phrase verified?"}
    D -- No --> E["Retry with rate limits or resend"]
    E --> D
    D -- Yes --> F["Complete profile and select home currency"]
    F --> G["Create virtual wallet"]
    G --> H["Grant initial allowance"]
    H --> I["Welcome dashboard and tutorial"]
```

Acceptance criteria:

- A user cannot access protected wallet features before verification.
- Usernames are unique under a consistent case-normalization policy.
- Repeated signup attempts cannot generate unlimited rewards.
- The initial allowance is granted once, even if the onboarding request is retried.
- The welcome screen explicitly explains the virtual-only economy.

### Flow 2 — Send virtual money

```
flowchart TD
    A["Open Wallet"] --> B["Enter username or scan QR"]
    B --> C["Verify recipient"]
    C --> D["Enter amount and note"]
    D --> E["Review transfer"]
    E --> F{"Valid balance, limits and currency?"}
    F -- No --> G["Show reason and recovery option"]
    F -- Yes --> H["Submit idempotent transfer"]
    H --> I["Atomic ledger transaction"]
    I --> J["Show receipt and updated balances"]
```

Acceptance criteria:

- Sending to oneself is blocked unless a specific supported feature requires it.
- The sender must have sufficient available funds.
- A transfer cannot exceed applicable per-transfer or weekly limits.
- Simultaneous requests cannot spend the same balance twice.
- Retrying the same transfer request does not duplicate the transaction.
- The sender and recipient see the same transaction reference and final status.

### Flow 3 — Buy a simulated share

1. Open Exchange and select a simulated asset.
2. View its price, simulated history and risk/game description.
3. Enter the quantity to buy.
4. Preview total cost and any virtual trading fee.
5. Confirm the order.
6. Validate available virtual cash and the current market price.
7. Commit the trade and cash/holdings updates atomically.
8. Update the portfolio and transaction history.

If the market price changes between preview and confirmation, Bannk should either reject the stale order or ask the user to review the revised quote.

### Flow 4 — Discover a sponsored event

1. Browse Discover and select an event.
2. View organizer information, date, location and sponsorship label.
3. Bookmark the event or open its official ticket page.
4. If eligible, join a sponsored challenge.
5. Complete the required action.
6. Validate participation or attendance.
7. Grant the configured virtual reward once.
8. Record campaign engagement and update the user's progress.

Do not reward users for merely clicking a link if the campaign requires verified attendance or another meaningful action.

### Flow 5 — Business creates a campaign

For the MVP, this can be an admin-assisted workflow:

1. A business submits its profile and listing.
2. An administrator reviews and approves the business.
3. The business submits a product, event or sponsorship campaign.
4. Bannk checks content, eligibility, reward budget and dates.
5. An administrator approves publication.
6. The campaign goes live with clear sponsorship labels.
7. Bannk records engagement and validated rewards.
8. The business receives a performance report.

## 6. Database architecture

Use PostgreSQL as the primary source of truth. Organize the schema around identity, the virtual economy, market activity, commercial discovery, and governance.

Identity and access

users · profiles · sessions · verification

Virtual economy

wallets · ledger accounts · journal entries · transfers · allowances

Exchange

assets · orders · trades · holdings

Commerce

businesses · listings · campaigns · rewards

Governance and observability

audit events · moderation · idempotency · reporting

### Recommended tables

| Table                     | Purpose and important fields                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `users`                   | `id`, `email`, `email_normalized`, `password_hash`, `email_verified_at`, `status`, `created_at` |
| `profiles`                | `user_id`, `username`, `display_name`, `avatar_url`, `home_currency`, `locale`, `visibility`    |
| `verification_challenges` | `id`, `user_id`, `verifier_hash`, `expires_at`, `attempt_count`, `consumed_at`                  |
| `sessions`                | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`                                       |
| `wallets`                 | `id`, `owner_user_id`, `currency_code`, `wallet_type`, `status`                                 |
| `ledger_accounts`         | `id`, `wallet_id`, `account_type`, `status`                                                     |
| `journal_transactions`    | `id`, `type`, `status`, `idempotency_key`, `reference`, `created_at`                            |
| `journal_entries`         | `id`, `transaction_id`, `ledger_account_id`, `amount_minor`, `direction`                        |
| `transfers`               | `id`, `transaction_id`, `sender_wallet_id`, `recipient_wallet_id`, `status`, `note`             |
| `allowance_periods`       | `id`, `user_id`, `period_start`, `period_end`, `cap_minor`, `used_minor`                        |
| `reward_grants`           | `id`, `user_id`, `campaign_id`, `amount_minor`, `status`, `idempotency_key`                     |
| `exchange_assets`         | `id`, `symbol`, `name`, `description`, `asset_type`, `status`                                   |
| `market_prices`           | `id`, `asset_id`, `price_minor`, `currency_code`, `effective_at`, `model_version`               |
| `trade_orders`            | `id`, `user_id`, `asset_id`, `side`, `quantity`, `status`, `idempotency_key`                    |
| `trades`                  | `id`, `order_id`, `price_minor`, `quantity`, `total_minor`, `executed_at`                       |
| `holdings`                | `user_id`, `asset_id`, `quantity_units`, `average_cost_minor`                                   |
| `businesses`              | `id`, `owner_user_id`, `name`, `verification_status`                                            |
| `listings`                | `id`, `business_id`, `listing_type`, `title`, `status`, `starts_at`, `ends_at`                  |
| `campaigns`               | `id`, `business_id`, `budget_minor`, `reward_policy`, `status`, `starts_at`, `ends_at`          |
| `campaign_events`         | `id`, `campaign_id`, `user_id`, `event_type`, `occurred_at`                                     |
| `audit_events`            | `id`, `actor_id`, `action`, `target_type`, `target_id`, `metadata`, `created_at`                |
| `idempotency_keys`        | `id`, `actor_id`, `key`, `request_hash`, `response_reference`, `expires_at`                     |

Additional tables will be needed for consent history, reports, moderation cases, bookmarks, notifications, and localized content.

### Essential database rules

1. Use integer minor units, not floating-point money. Store amounts as integers in the currency's defined minor unit, accounting for currencies with zero or three decimal places. Never assume all currencies have two decimal places.

2. Make the ledger double-entry. Each posted transaction must balance within the same currency and ledger scope. Transfers debit the sender and credit the recipient. System-issued allowances debit an appropriate virtual issuance account and credit the user wallet. No transaction should update only one side.

3. Enforce atomicity. The journal transaction, entries, transfer status, and allowance consumption must commit in one PostgreSQL transaction where applicable. Use row locks or conditional updates to protect against concurrent spending.

4. Keep journal entries immutable. Correct mistakes with explicit reversing transactions and replacement entries. Do not silently edit historical balances.

5. Prevent duplicate actions. Use database uniqueness constraints for usernames, normalized emails, idempotency keys, reward grants, and other operations that must happen only once.

6. Separate currencies. Never balance NGN entries against USD entries. Any future simulated currency conversion must record both sides and the exact rate used.

7. Reconcile continuously. A scheduled job should check journal balance invariants, wallet balance projections, reward totals, and market holdings. Alert administrators when an invariant fails.

For a lean MVP, avoid introducing microservices prematurely. A modular monolith with one backend, one PostgreSQL database, and a background worker is easier to deploy, test, and operate.

**Allowance period note**  
The `allowance_periods` table is already period-agnostic. The only change required is that the background job that creates the next period advances by 7 days instead of one calendar month. Enforce a uniqueness constraint on `(user_id, period_start)`.

## 7. API design

Use a versioned API, with the server responsible for all authoritative economic decisions.

A REST API is sufficient for the MVP. Example endpoint groups:

| Method | Endpoint                           | Purpose                      |
| ------ | ---------------------------------- | ---------------------------- |
| `POST` | `/api/v1/auth/register`            | Register a user              |
| `POST` | `/api/v1/auth/verify-wordkey`      | Verify email                 |
| `POST` | `/api/v1/auth/login`               | Create a session             |
| `POST` | `/api/v1/auth/logout`              | Revoke a session             |
| `GET`  | `/api/v1/me`                       | Fetch current profile        |
| `GET`  | `/api/v1/wallets`                  | List virtual wallets         |
| `GET`  | `/api/v1/wallets/:id/transactions` | Fetch transaction history    |
| `POST` | `/api/v1/transfers/quote`          | Validate a proposed transfer |
| `POST` | `/api/v1/transfers`                | Execute a virtual transfer   |
| `GET`  | `/api/v1/profiles/:username`       | Resolve public identity      |
| `GET`  | `/api/v1/exchange/assets`          | Browse simulated assets      |
| `POST` | `/api/v1/exchange/orders`          | Submit a simulated trade     |
| `GET`  | `/api/v1/exchange/portfolio`       | Fetch simulated holdings     |
| `GET`  | `/api/v1/discover`                 | Browse products and events   |
| `POST` | `/api/v1/campaigns/:id/join`       | Join an eligible campaign    |
| `GET`  | `/api/v1/notifications`            | Fetch user notifications     |

These are proposed contracts, not existing endpoints.

### API requirements

- Validate every request on the server.
- Require authentication and authorization for private operations.
- Use idempotency keys on transfers, trades, and reward grants.
- Return stable error codes, not raw database errors.
- Paginate transaction history and public listings.
- Apply rate limits to login, verification, QR resolution, transfers, and trading.
- Log request identifiers and economic transaction references without logging passwords, session tokens, or sensitive verification data.
- Use database constraints as the final enforcement layer for invariants.

Example transfer request:

```
{
  "recipient_username": "amara",
  "currency": "NGN",
  "amount_minor": 250000,
  "note": "Community challenge"
}
```

Here, `250000` represents ₦2,500 if the currency's minor unit is one kobo. The API must verify the currency's exponent rather than hardcoding two decimal places globally.

The server must derive the sender from the authenticated session. A client must never be allowed to specify another user's identity as the sender.

## 8. Security and abuse prevention

Security is central because users will trust Bannk with their identity and a ledger that looks and behaves like financial software, even though the money is simulated.

Authentication and account protection

- Modern password hashing, such as Argon2id.
- Secure, HTTP-only, SameSite cookies for browser sessions.
- Email verification, session revocation and account recovery.
- Rate limits, login throttling and suspicious-session alerts.
- Optional passkeys or MFA for stronger account protection.

Ledger integrity

- Immutable posted journal entries.
- Double-entry accounting and atomic commits.
- Idempotency and concurrency controls.
- Server-side balance and allowance enforcement.
- Automated reconciliation and invariant alerts.

Identity and privacy

- Minimal personal data collection.
- Public profile data separated from private account data.
- Restricted access to email addresses and moderation records.
- Export and deletion workflows subject to applicable retention requirements.
- No sensitive information embedded in QR codes.

Abuse and economic integrity

- Duplicate-account and referral-reward abuse detection.
- Transfer velocity limits and anomaly detection.
- Campaign reward deduplication.
- Market manipulation and automated-trading controls.
- Moderation queues, reporting and account suspension.

### Critical attack scenarios to test

| Scenario                                                 | Required protection                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| User changes the balance through browser developer tools | Balance changes are server-only                                    |
| User submits a transfer twice                            | Idempotency plus unique database constraints                       |
| Two concurrent transfers overspend a wallet              | Atomic debit with locking or conditional balance update            |
| User forges a reward-completion request                  | Server-side eligibility verification                               |
| User buys shares at an old price                         | Server-enforced quote expiry or stale-order rejection              |
| User changes a recipient ID                              | Server validates recipient and authorization                       |
| User tries to bypass weekly caps                         | Database-backed limits enforced inside the economic transaction    |
| Admin abuses manual credits                              | Least privilege, mandatory reason, immutable audit record          |
| Attacker enumerates accounts through WordKey             | Rate limits, generic responses and secure challenge lifecycle      |
| Malicious listing targets users                          | Moderation, reporting, content validation and publication controls |

### Security testing before launch

The release must include unit tests, integration tests, API authorization tests, database concurrency tests, dependency scanning, and a security review of the authentication and ledger modules.

Run dedicated tests that attempt to:

- Create money without an authorized issuance event.
- Debit a wallet below zero.
- Duplicate a transfer or reward.
- Exceed a weekly cap through parallel requests.
- Access private transaction data from another account.
- Manipulate prices or execute trades using stale data.
- Bypass moderation or campaign eligibility rules.

The goal is not just to make the normal flow work; it is to prove that invalid economic state cannot be created through repeated, concurrent, or malicious requests.

## 9. Deployment architecture on Coolify

I'd start with a small, self-hosted deployment and scale individual components only when usage justifies it.

Users

Mobile browsers · Desktop browsers · Installed PWA

HTTPS reverse proxy

TLS · Domain routing · Request limits

Web application

PWA · UI · routing

Backend API

Auth · ledger · exchange

PostgreSQL

Persistent source of truth

Cache and worker

Queues · scheduled tasks

Operations and recovery

Backups · monitoring · alerts · logs · restore tests

### Recommended services

| Service                  | Responsibility                                                           |
| ------------------------ | ------------------------------------------------------------------------ |
| `bannk-web`              | PWA and frontend                                                         |
| `bannk-api`              | Authentication, wallet, ledger, exchange and discovery APIs              |
| `bannk-worker`           | Allowance resets (weekly), scheduled market updates, emails and reward processing |
| `bannk-postgres`         | Persistent application database                                          |
| `bannk-redis`            | Rate limiting, caching and background-job coordination, if needed        |
| `bannk-mail` integration | Transactional email provider for verification and recovery               |

You can combine the web and API into a single application deployment initially if that fits the framework. The worker should still execute scheduled economic jobs reliably, and only one authoritative process should own each scheduled task.

### Domain structure

A clean initial structure could be:

- `bannk.app` — public landing page.
- `app.bannk.app` — signed-in PWA.
- `api.bannk.app` — API, if separated.
- `admin.bannk.app` — restricted administration.
- `business.bannk.app` — business dashboard, potentially introduced later.

These are proposed domain names; availability has not been checked.

### Environment variables

Store secrets in Coolify's environment configuration rather than committing them to Git.

Example configuration keys:

```
NODE_ENV=production
APP_URL=https://app.bannk.app
API_URL=https://api.bannk.app

DATABASE_URL=<managed-secret>
SESSION_SECRET=<managed-secret>
WORDKEY_PEPPER=<managed-secret>

MAIL_FROM=<verified-sender>
MAIL_API_KEY=<managed-secret>

REDIS_URL=<optional-managed-secret>
```

These are illustrative variable names, not a complete production configuration. Never expose database credentials, session secrets, WordKey secrets, or mail-provider API keys to browser-side environment variables.

### Deployment sequence

1. Create a dedicated Bannk project in Coolify.
2. Deploy PostgreSQL with persistent storage and a private network.
3. Deploy the application from a Git repository and configure the required environment variables.
4. Run database migrations as a controlled release step.
5. Configure the background worker and scheduler (weekly allowance job).
6. Connect domains and configure HTTPS.
7. Verify outbound email delivery and domain authentication.
8. Run health checks, registration tests, ledger tests and a smoke test.
9. Configure off-server encrypted backups and test restoration.
10. Deploy staging first, then promote a tested release to production.

Use a non-root application container, pin and scan container images, restrict public ports, and avoid exposing PostgreSQL or Redis to the public internet.

Backups matter even for virtual money. A corrupted virtual ledger damages user trust just as surely as a lost conventional account history. Maintain encrypted off-server backups, test restores regularly, and ensure economic state is not recoverable only from logs or cache.

## 10. MVP roadmap

I'd plan the MVP over approximately 10–12 weeks for a small, experienced team. This is a planning estimate, not a guaranteed delivery date; design complexity, staffing, and testing results can change it.

## Weeks 1–2

Foundation

Phase 1 — Product and design system

- Finalize product requirements and virtual-economy rules (weekly allowance model).
- Establish the visual identity and **mobile-first responsive** UI system.
- Define the database schema and API contracts.
- Set up Git, staging, production configuration and CI checks.

Exit criterion: approved specification, architecture and working application skeleton.

## Weeks 3–4

Identity

Phase 2 — Accounts and PWA

- Registration, WordKey verification and recovery.
- Username reservation and public profiles.
- QR identity and account privacy.
- Responsive PWA shell (mobile-first bottom navigation) and initial dashboard.

Exit criterion: users can securely register, verify and access their profiles.

## Weeks 5–6

Economy

Phase 3 — Virtual wallets

- Double-entry ledger and transaction history.
- Initial grants, **weekly** allowances and limits.
- Username and QR-based transfers.
- Transaction receipts, idempotency and audit logging.

Exit criterion: economic invariants pass, including concurrent transfer and overspending tests.

## Weeks 7–8

Exchange

Phase 4 — Simulated trading

- Fictional asset catalogue and deterministic price engine.
- Buy/sell orders and virtual holdings.
- Portfolio dashboard and price history.
- Initial achievements and rankings.

Exit criterion: trades cannot create negative cash balances or inconsistent holdings.

## Weeks 9–10

Discovery

Phase 5 — Commerce and sponsorship

- Product and event listings.
- Admin-managed sponsored campaigns.
- Challenges, reward grants and moderation.
- Business reporting and campaign engagement metrics.

Exit criterion: a complete sponsored campaign can be created, approved, published and measured.

## Weeks 11–12

Release

Phase 6 — Hardening and controlled launch

- Accessibility and browser/device testing (mobile-first + desktop).
- Security review, rate-limit and abuse tests.
- Backup restoration and operational monitoring.
- Staging acceptance testing and initial user cohort.

Exit criterion: release checklist completed and no unresolved critical or high-severity launch blockers.

### What I would deliberately postpone

To protect the delivery schedule, do not put these into the first release:

- Real-money deposits, withdrawals or banking integrations.
- Actual securities, tokenized ownership or cash-redeemable investments.
- Cross-currency virtual transfers until the ledger supports them correctly.
- A complex self-service advertiser marketplace.
- AI financial assistants or autonomous trading.
- Public chat, direct messaging and elaborate social feeds.
- Microservices, Kubernetes and multi-region database infrastructure.

Build the foundations so these can be added later, but don't let them delay the first usable product.

## 11. Launch acceptance checklist

## Release readiness

0/15 checked

### Identity

Registration, WordKey verification and recovery work end to end.

Username uniqueness, privacy settings and QR identity are enforced.

Session revocation and account deletion workflows are tested.

### Virtual economy

Every posted journal transaction balances.

No transfer can overdraw a wallet or exceed a limit.

Duplicate and concurrent requests cannot duplicate value.

Allowance resets and reward grants are idempotent.

### Exchange and discovery

Buy/sell operations preserve cash and holdings consistency.

All simulated assets and returns are clearly labelled.

Sponsored listings are labelled and can be reported.

Rewards cannot be claimed repeatedly for one qualifying action.

### Production readiness

Critical security and authorization tests pass.

Off-server backups and a restoration drill are complete.

Monitoring, alerts and error reporting are working.

Mobile accessibility, installability and key browser flows pass.

## 12. Success metrics

Measure whether Bannk becomes a useful, trusted virtual economy rather than optimizing for raw signup counts.

| Metric                      | What it tells you                                       |
| --------------------------- | ------------------------------------------------------- |
| Signup-to-verification rate | Whether onboarding and WordKey work well                |
| First-session activation    | Whether users create a profile and explore their wallet |
| First-transfer completion   | Whether the central social payment flow is usable       |
| Weekly active users         | Whether the experience encourages return visits         |
| Transfers per active user   | Whether the economy is genuinely being used             |
| Challenge completion rate   | Whether gamification motivates participation            |
| 7-day and 30-day retention  | Whether the product remains useful over time            |
| Sponsored engagement        | Whether commercial discovery provides value             |
| Reward-abuse rate           | Whether incentives remain economically sustainable      |
| Ledger invariant failures   | Whether the virtual economy remains correct             |

Set numeric targets after an initial beta establishes a baseline. For ledger invariant failures, the target should be zero unexplained failures, with automated alerts and a clear incident procedure.

## 13. Final technical recommendations

For the first version, I would choose:

- Application: TypeScript, using a framework with strong PWA support.
- Backend: a modular API with clear separation between identity, ledger, exchange, and discovery.
- Database: PostgreSQL, with an immutable double-entry virtual ledger.
- Background jobs: a separate worker for **weekly** allowance resets, email delivery, rewards, and market updates.
- Hosting: Docker-based deployment through Coolify, with isolated staging and production environments.
- Commercial content: admin-managed listings and sponsored campaigns first.
- Release model: short iterations, automated tests, staged migrations, and controlled rollouts.
- Frontend: mobile-first responsive design with bottom navigation on small screens and progressive enhancement for tablet/desktop.

One architectural detail deserves special emphasis: use one authoritative economic ledger for all virtual currency movements. Simulated investments should use that ledger for their cash leg and a consistent, separately validated holdings model for the asset leg. A cached balance, frontend calculation, or market-price feed must never become the authority for available funds.

## 14. The first build milestone

The first deliverable should be a working vertical slice, not a collection of disconnected screens.

A new user should be able to:

1. Sign up and verify their email with WordKey.
2. Claim a unique Bannk username.
3. Receive their initial virtual allowance.
4. Open their wallet and see a recorded ledger history.
5. Generate a QR code for their identity.
6. Scan another user's QR code.
7. Send a virtual transfer and see the updated balances on both accounts.
8. Review the transfer receipt and activity history.

Once that complete path works reliably, the simulated exchange and sponsorship features can build on a stable foundation.

My recommendation: begin with the identity, ledger, wallet and QR-transfer milestone. Those are Bannk's core product and its hardest correctness requirements. Everything else becomes easier to build once the virtual economy is trustworthy.
