# Paste-ready prompt for an AI slide generator

Works in Gamma, Canva Magic, Beautiful.ai, Tome, Copilot in PowerPoint, or ChatGPT/Claude.
Everything below is verified against the real codebase (updated 14-09-2026) — do not let the tool invent or round numbers.

---

Create a 31-slide academic project review presentation titled **"FinFlow AI — Review 3"**.

**Context:** BTech mini-project review by Kuppili Nikhilesh Raju. The two assessed topics are (1) algorithms used to overcome the specific problem, with general descriptions, and (2) implementation and testing. Audience is engineering faculty. Tone: technical, precise, no marketing language.

**Design direction:** Deep teal and ink palette — ink `#0B1F2A`, teal `#0F766E`, mint accent `#14B8A6`, light surface `#F2F6F5`. Dark slides for the title, the two section dividers, and the conclusion; light slides for content. Serif headings (Cambria) paired with a sans body (Calibri). Every slide needs a visual element — cards, tables, comparison columns, code blocks, or charts. Use monospace blocks for pipelines and pseudocode. No decorative accent stripes or underlines beneath titles. 16:9.

---

## PROJECT SUMMARY

FinFlow AI is a personal financial copilot for Indian salaried professionals. Problem: financial life is scattered across bank SMS, PDF statements and spreadsheets, causing (a) no consolidated view, so overspending is found only after the fact, (b) manual categorisation that users abandon, (c) generic advice not grounded in real numbers. Design goal: every insight is computed from the user's own transaction data, never from assumptions or sample values — even monthly income is derived from imported salary credits rather than typed in at sign-up.

---

## PART A — ALGORITHMS (16 total, across 6 layers)

Layers: **Security** (Argon2id, JWT with revocation) · **Ingestion** (CSV parsing, whole-word categorisation, duplicate detection, income derivation) · **Analytics** (conditional aggregation, category breakdown, recurring detection, budget alerts — all MongoDB aggregation pipelines) · **Planning** (debt avalanche, salary waterfall, investment split, emergency-fund gap) · **AI** (agentic tool-calling loop with a forced final answer) · **Cross-cutting** (Decimal128 fixed-point arithmetic).

**1. Argon2id password hashing.** Problem: leaked databases expose weakly-hashed passwords. Memory-hard — consumes large RAM per hash, so GPUs/ASICs lose their parallelism advantage. Winner of the 2015 Password Hashing Competition, current OWASP recommendation. Parameters: time_cost 3, memory_cost 65536 KB (64 MB, above the OWASP 19 MB minimum), parallelism 4, hash_len 32 bytes, salt_len 16 bytes. Transparent rehashing: each login calls `check_needs_rehash()` and silently re-hashes if parameters were strengthened.

**2. JWT authentication with revocation (HS256).** Problem: server sessions need shared state, but a purely stateless token cannot be withdrawn at logout. Payload `{sub: email, iat, exp: +24h, jti: random 128-bit id}`. Verification: recompute HMAC and reject on mismatch, require sub/exp/iat, reject if expired, reject if `jti` is in `revoked_tokens` ("Session has been signed out"), load user by sub. Logout stores `{jti, expires_at}`; a MongoDB TTL index deletes each entry when the token would have expired anyway, so the deny-list never grows. Revoking one session leaves other devices signed in.

**3. CSV parsing and sign normalisation.** Problem: every bank exports a different format. Decision cascade: type in {debit,expense,dr} → ("expense", −|amount|); type in {credit,income,cr} → ("income", +|amount|); type == transfer → ("transfer", amount); otherwise infer from sign. Invariant: expenses always negative, income always positive, including manual entries. Robustness: BOM stripped; `₹`, `Rs.`, `INR` and Indian commas removed (1,25,000 → 125000); accounting negatives (500) → −500; NaN/Infinity and absurd values rejected; rounded to paise; ISO and Indian day-first dates (01/06/2026, 01-06-2026, 01.06.2026); 5 MB upload limit (HTTP 413); partial-success model where bad rows are reported but valid rows import; the batch is inserted all-or-nothing.

**4. Whole-word keyword categorisation.** Problem: users will not tag hundreds of transactions. 58 keywords across 9 categories, compiled to whole-word regex such as `\bsip(?:s|es)?\b`. Rules: a specific bank category wins; a generic one ("Other", "Misc") may be upgraded; ordered first-match on lowercase(description + merchant); fallback Salary/Income for credits, Other for debits. Investment keywords (SIP, ELSS, mutual fund, PPF, NPS, Groww, Zerodha) are checked first. Whole words fixed real false matches: "insurance premium" → EMI (`emi`), "Coca cola" → Transport (`ola`), "current account charges" → Bills (`rent`). Rule-based chosen over ML: deterministic, explainable, no training data, no inference latency, extend with one dictionary entry.

**5. Duplicate detection and income derivation.** Duplicate fingerprint = (transaction_date, lower(trim(description)), lower(trim(merchant)), round(amount,2)); hash set of existing fingerprints, then scan incoming rows — O(N+M) versus O(N×M) pairwise; also de-duplicates within one file. Income derivation: monthly income = average income over the 3 most recent months that contain income, so a month still waiting for salary does not drag it down; recomputed after each import and on login; never overwritten with 0 when no income rows exist; seeds the emergency-fund target (3 × income) only if the user has not set one.

**6. Conditional aggregation pipeline — THE CORE OPTIMISATION.** Problem: looping over every transaction in Python costs O(N) memory and transfer per dashboard load. Solution: one MongoDB `$group` stage with `$sum` of `$cond` expressions computes income, spend and invested in a single pass, after a `$match` on user_id and a date range. Before/after: documents transferred all N → 1; aggregation application → database engine; memory O(N) → O(1); index none → compound (user_id, transaction_date). Investments are not spending: SIPs are money the user kept, so they are excluded from spend and reported separately as "invested" — counting them showed disciplined savers a negative savings rate.

**7. Recurring payment detection.** `$match` expenses → `$group` by lowercase(merchant or description) + category with count, average amount and `$addToSet` of months → `$match` count ≥ 2 OR at least 2 distinct months (the pipeline form of GROUP BY … HAVING) → `$sort` by average. Two conditions: repetition catches repeated charges; distinct months catch a bill that fires once a month. Expenses only — salary credits recur too, and listing them made the copilot call income a subscription.

**8. Budget alert classification.** One pipeline over budgets with a `$lookup` into transactions (a left join) sums spend per budget for the month. Classification: remaining < 0 → overspent; usage ≥ 80% → warning; otherwise safe. Left join because an inner join would hide budgets with no spending. One budget per category is enforced (case-insensitive) — duplicates made alerts contradict each other.

**9. Debt avalanche prioritisation.** Avalanche (chosen) orders by highest interest rate and minimises total interest paid; snowball orders by smallest balance and is strictly more expensive. Steps: pay minimum EMI on all accounts, sort by interest_rate DESC (index-backed), send surplus to the top account, roll the payment forward when it clears. Front-end amortisation per account: interest = remaining × rate/12; principal = EMI − interest; if EMI ≤ interest the balance never falls and the page warns "EMI does not cover interest".

**10. Salary allocation waterfall.** Strict priority — each bucket draws only from what is left: remaining = max(income − EMIs, 0); essentials = min(50% of income, remaining); emergency = min(gap/12, 15% of income, remaining); investments = min(profile capacity or 15%, remaining); flexible = remainder; shortfall = max(EMIs − income, 0) shown as a banner. Buckets always sum exactly to income. Audit finding: the earlier version took investments first and split ₹40,000 income into ₹50,000.

**11. Risk-based investment allocation.** Split of monthly capacity, each profile summing to exactly 100% — Conservative / Balanced / Growth: Index Fund SIP 20/35/55, Emergency Fund 25/15/15, Fixed Deposit 30/20/10, Gold ETF 5/10/10, Liquid Fund 20/20/10. Audit finding: conservative previously summed to 105% and growth to 90%. Emergency gate: gap = max(target − saved, 0); gap 0 → "Emergency fund is ready"; the emergency share is capped at the remaining gap and any unused share moves to the SIP. **Compliance note:** not a SEBI-registered advisor; the system prompt restricts investment answers to general education.

**12. Agentic tool-calling loop — THE NOVEL COMPONENT.** Problem: an LLM will hallucinate personal-finance numbers. Bounded ReAct loop: send system prompt + last 10 messages + question with tool definitions; if no tool calls, return the answer; otherwise execute each tool (a real aggregation pipeline), append results, repeat for up to 5 rounds; then a 6th forced-answer round from the gathered data. Why: the model fetches one tool per round, so a five-part question used to end with "reasoning limit". On Groq, `tool_choice="none"` is ignored (400 tool_use_failed), so the final request carries no tools and restates results as text; an empty reply is retried once with lower reasoning effort. Ten tools: get_dashboard_summary, get_category_breakdown, get_monthly_spend_trend, get_income_vs_expense, get_budget_alerts, get_top_merchants, get_recurring_transactions, get_salary_plan, get_debt_strategy, get_investment_profile. Guarantees: prompt forbids unsupported claims; numbers enter only through tool results; model-supplied arguments validated (month must be YYYY-MM); no key or rate limit → deterministic rule-based answer. Providers: Groq `openai/gpt-oss-120b` and Anthropic `claude-opus-5` with server-side refusal fallback to `claude-opus-4-8`; the OpenAI-format schema is derived from the Anthropic definitions so they cannot drift.

**13. Fixed-point decimal arithmetic.** `0.1 + 0.2 == 0.30000000000000004` in binary floating point. Money is BSON Decimal128 in MongoDB; a PyMongo `TypeCodec` converts Decimal128 ⇄ Python `Decimal` automatically so no value passes through a float; services quantise to paise; Pydantic `Decimal` validates input; converted to float only at the JSON boundary.

**Complexity summary table:** Argon2id O(m) memory-hard · JWT verify O(1) + one indexed revocation lookup · CSV parse O(N) · categorisation O(K) per row, K = 58 · duplicate detection O(N+M) · income derivation O(N) in DB · monthly summary O(N) in DB, O(1) transferred · category breakdown and recurring detection O(N log N) in DB · budget alerts O(B×T) in one `$lookup` · debt avalanche O(D log D) · salary waterfall O(1) · agentic loop O(R×T), R ≤ 5 + 1. Headline: all aggregation runs in the database, so application memory is O(1) regardless of transaction count.

---

## PART B — IMPLEMENTATION AND TESTING

**Stack:** FastAPI on Python 3.12 · MongoDB 8.0 + PyMongo (aggregation pipelines, TTL indexes, Decimal128) · Pydantic v2 · PyJWT + argon2-cffi · SlowAPI rate limiting · Groq + Anthropic for AI · React 18 + TypeScript + Vite · TanStack Query v5 + Zustand · Recharts + Tailwind CSS v4 (light and dark themes) · Docker multi-stage + nginx · GitHub Actions.

**Scale:** ~2,940 lines of backend Python · ~3,160 lines of frontend TypeScript · 43 REST endpoints · 9 MongoDB collections (users, transactions, budgets, debt_accounts, investment_profiles, savings_goals, chat_history, counters, revoked_tokens) · 10 frontend pages · 10 AI tools · 143 automated tests.

**Layered architecture:** `api/routes` (HTTP only) → `services` (analytics pipelines, CSV import, categorisation) → `ai` (copilot loops and tools) → `models` (Pydantic documents) → `schemas` (API contracts) → `core` (config, security, rate limiting) → `db` (Mongo client, Decimal codec, id counters, indexes).

**Key decisions:** database-side aggregation with compound indexes · Decimal128 money path · a `counters` collection keeps integer ids, so URLs like /budgets/12 were unchanged by the SQL → MongoDB migration · income derived from data · `Page[T]` pagination envelope · `React.lazy()` code splitting · TanStack Query 30 s cache, mutations invalidate derived views, cache cleared when the signed-in user changes · only GET/HEAD retried (a retried POST once created the same budget three times) · provider-agnostic AI Groq → Anthropic → rule-based.

**Testing strategy — four levels:** unit (parsing, amounts, dates, categorisation) · integration (pytest against a real MongoDB — pipelines, waterfall, income derivation) · API/E2E (FastAPI TestClient; scripted fake Groq and Anthropic clients that record every request) · manual UI (browser automation, axe accessibility scan, contrast check in both themes, 375 px mobile).

**Fixtures (conftest.py):** `test_database` session-scoped throwaway database `finflow_test_<random>`, indexes created once, dropped at the end · `db` empties every collection after each test · `client` TestClient · `user` seeded user + profile · `auth_headers` JWT header. Guard: the suite refuses to run unless the database name starts with `finflow_test_`. Real MongoDB rather than mocks because the analytics layer is aggregation pipelines — a mock would test the mock.

**Results: 143 tests passing in about 5 s** (bar chart): test_audit_regressions 30 · test_csv_import 21 · test_analytics 19 · test_categorization 16 · test_auth 13 · test_income_derivation 11 · test_copilot_loops 10 · test_sessions_and_uploads 9 · test_step4_finance 7 · test_investments_not_spend 6 · test_health 1. Also clean: `ruff`, `tsc --noEmit`, production build.

**Defects — Round 1, found by testing (table):**
1. Dashboard crash "toFixed is not a function" — Decimal serialised as JSON string — convert to float at the service boundary.
2. NameError on copilot history route — missing import — added.
3. Login InvalidHashError — wrong argon2-cffi from system Python — pinned virtualenv.
4. Logins invalidated after restart — SECRET_KEY regenerated — persisted in gitignored .env.
5. 401 shown as "backend unavailable" — every error treated as network failure — distinguish and sign out.
6. Real error masked by "Missing bearer token" — 401 retried after token cleared — never retry auth errors.
7. Parallel queries without a token — token cleared mid-flight — API client fails closed.
8. Budget form silently did nothing — `min="1"` + `step="500"` failed HTML validation with no message — `step="1"`.
9. Groq rejected all tool calls — `null` for optional parameter — optional params typed `["string","null"]`.

**Defects — Round 2, found by full audit (table):**
10. SIPs counted as spending → negative savings for savers → Investments excluded from spend.
11. Substring keyword matching → "premium" → EMI, "Coca cola" → Transport → whole-word regex.
12. Waterfall took investments first → ₹40,000 split into ₹50,000 → every bucket draws from remaining.
13. Allocation splits summed to 105% / 90% → each profile sums to 100%.
14. Savings rate from ₹0 income → −5% before salary credit → same income for savings and rate.
15. Salary listed as recurring drain → recurring detection on expenses only.
16. POST retried after timeout → budget created three times → retry only GET/HEAD.
17. 422 errors shown as "[object Object]" → flatten FastAPI detail arrays.
18. Copilot "reasoning limit" on multi-part questions → forced final answer round.
19. Groq 400 on that final round (`tool_choice="none"` ignored) → final request sends no tools.
20. Logout left token valid for 24 h → jti revocation + TTL index.
21. Previous user's data flashed after account switch → clear query cache on session change.
22. Grey text failed WCAG contrast (2.6:1 light, 3.9:1 dark) → shades adjusted to ≥ 4.5:1.
23. Import failing part-way kept half the rows → compensating rollback by `_id`; ids reserved in one counter update.
Closing line: round 2 found mostly numerical bugs that raised no error — the app ran but the numbers were wrong. Each now has a regression test.

**End-to-end verification (13 steps):** register → 201, no income asked · login → token · dashboard before import → zeros and empty state · CSV import → rows imported, duplicates reported, income derived · dashboard → income ₹1,25,000, spend ₹87,128, invested ₹18,000, savings rate 30.3% · create budget → 201, second Food budget → 409 · create debt → 201, Home Loan 8.65% · save investment profile → 200 · alerts → Food 108.2% overspent, Bills 90.2% warning · salary plan sums to income · copilot names the Food overspend; a 10-part question is answered via the final round · another user's budget → 404 · logout → 204, then same token → 401. UI: axe found no violations; contrast verified in light and dark; no horizontal overflow at 375 px.

**Five-persona dataset**, zero rejected rows, two months each: Priya (fresher, PG rent, education loan) ₹84,000 / ₹59,495 · Rahul (IT professional, family, home loan) ₹2,50,000 / ₹2,10,726 · Ananya (freelancer, irregular income) ₹1,90,000 / ₹1,99,396 · Vikram (senior manager, overspender) ₹5,00,000 / ₹6,00,998 · Meera (newlywed, car loan, disciplined saver) ₹1,70,000 / ₹1,75,696. Ananya and Vikram deliberately spend more than they earn.

**CI/CD:** GitHub Actions — backend (Python 3.12, MongoDB 8.0 service container, ruff with pinned version and rule set, pytest) · frontend (npm ci, tsc --noEmit, build) · docker (build both images after the other jobs pass). No secrets: throwaway database, empty AI keys. Ruff 0.16 widened its default rules and broke a passing check with 140 errors, so `ruff.toml` and the version are pinned. Containers: backend multi-stage python:3.12-slim, non-root, HEALTHCHECK, indexes created at startup; frontend node:20-alpine → nginx:1.27-alpine with SPA fallback, /api/ proxy, gzip; compose runs mongo:8.0 with a health check and named volume, backend waits for healthy MongoDB, production override enables MongoDB authentication; `.env`, databases and virtualenvs excluded from images.

**Results summary:** 16 algorithms · all analytics as indexed pipelines · exact decimal arithmetic, allocations always sum to income · Argon2id, JWT with revocation, rate limiting, per-user isolation · AI grounded in pipeline results and always answers · 143 tests, 23 defects fixed · ruff, tsc, build, axe and contrast checks clean · Dockerised and CI-verified.

**Challenges and learnings:** numbers wrong without any error → regression test per numerical defect → "it runs" is not "it is correct". SQL → MongoDB migration → same API contract, integer ids, Decimal codec, tests re-run for parity → a stable interface makes migration invisible. Decimal at every boundary → codec at the driver, float only in JSON. LLMs hallucinate → mandatory tool calling. Provider quirks → remove tools on the final request → test against the real API, not only mocks. Silent form validation → `step="1"` → absence of an error is not evidence of correctness.

**Future work:** Account Aggregator bank integration · ML categorisation over the rule-based baseline · goal-based planning with timelines · multi-currency · React Native app · Redis-backed distributed rate limiting.

**Conclusion:** automated ingestion, database-side analytics, deterministic planning that cannot over-allocate, grounded AI that always answers, and verified quality via 143 tests, CI/CD and 23 fixed defects. Close on: *every figure the application displays is computed from the user's own transactions.*

---

## SLIDE ORDER

1 Title (dark) · 2 Problem · 3 Algorithm map · 4 Section divider "Part A — Algorithms" (dark) · 5 Argon2id · 6 JWT with revocation · 7 CSV parsing · 8 Categorisation · 9 Duplicates & income derivation · 10 Aggregation pipeline ⭐ · 11 Recurring detection · 12 Budget alerts · 13 Debt avalanche · 14 Salary waterfall · 15 Investment allocation (grouped bar chart) · 16 Agentic loop ⭐ · 17 Decimal arithmetic · 18 Complexity table · 19 Section divider "Part B — Implementation & Testing" (dark) · 20 Tech stack · 21 Scale and architecture · 22 Key decisions · 23 Testing strategy · 24 Test results (bar chart per module) · 25 Defects round 1 ⭐ · 26 Defects round 2 ⭐ · 27 E2E verification · 28 Persona dataset · 29 CI/CD · 30 Results, challenges and future work · 31 Conclusion (dark).

Emphasis slides: 10, 16, 25 and 26. Timing for 15 minutes: problem 1 min, algorithms 8 min, implementation 3 min, testing 3 min.

## SPEAKER NOTES — anticipate these examiner questions

- *Why MongoDB?* Analytics map naturally to aggregation pipelines, TTL indexes expire sessions for free, Decimal128 keeps money exact, and the API contract did not change in the migration.
- *No transactions on standalone MongoDB — how is an import consistent?* Rows are parsed and de-duplicated before writing, inserted as one batch, and deleted again if the batch fails part-way; income is recomputed afterwards and on every login.
- *Why avalanche and not snowball?* Avalanche minimises total interest; snowball is strictly more expensive.
- *Why rule-based categorisation instead of ML?* Deterministic, explainable, no training data or latency; whole-word patterns remove substring false matches.
- *How do you stop the AI inventing numbers?* Figures come only from tool results of real pipelines; the loop is bounded and ends with a forced answer.
- *Why Decimal instead of float?* Binary floating point cannot represent decimal fractions exactly.
- *How is test isolation guaranteed?* A random throwaway database per run, collections emptied after each test, and a name guard against real data.
- *How does logout work with stateless JWTs?* Each token has a jti; logout stores it until the token's expiry, and a TTL index removes it.
- *Why 404 rather than 403 for another user's resource?* A 403 would confirm the record exists.
