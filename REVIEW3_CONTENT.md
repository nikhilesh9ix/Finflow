# Review-3 — FinFlow AI
**Date:** 20-08-2026 · **Updated:** 14-09-2026 (MongoDB migration, second audit, current test results)
**Topics:** Algorithms used to overcome the specific problem · Implementation and testing

---

## Slide 1 — Title

**FinFlow AI — Personal Financial Copilot for Indian Salaried Professionals**

Review-3: Algorithms, Implementation & Testing

Presented by: Kuppili Nikhilesh Raju

---

## Slide 2 — Problem Recap (one slide, for context)

Salaried individuals in India have their financial life scattered across bank SMS, statements, and spreadsheets. Three concrete problems:

| Problem | Consequence |
|---|---|
| No consolidated view of spending | Overspending discovered only after the fact |
| Manual categorisation of transactions | Tedious, inconsistent, abandoned quickly |
| Generic financial advice | Not grounded in the user's actual numbers |

**Goal:** compute every insight from the user's own transaction data — never from assumptions or sample values. Even monthly income is not typed in at sign-up; it is derived from the salary credits in the imported statements.

---

# PART A — ALGORITHMS

---

## Slide 3 — Algorithm Overview Map

The system uses **16 algorithms** across six layers:

| Layer | Algorithms |
|---|---|
| **Security** | Argon2id password hashing · JWT HS256 auth with server-side revocation |
| **Data ingestion** | CSV parsing & sign normalisation · Whole-word keyword categorisation · Duplicate fingerprinting · Income derivation |
| **Analytics (aggregation pipelines)** | Conditional aggregation · Category breakdown · Recurring detection · Budget alerts |
| **Financial planning** | Debt avalanche · Salary allocation waterfall · Risk-based investment split · Emergency-fund gap |
| **AI** | Agentic tool-calling loop with a forced final answer |
| **Cross-cutting** | Fixed-point decimal arithmetic (Decimal128) |

---

## Slide 4 — Algorithm 1: Argon2id Password Hashing

**Problem:** Plain or weakly-hashed passwords are recoverable if the database leaks.

**Algorithm:** Argon2id — winner of the 2015 Password Hashing Competition, current OWASP recommendation.

**Why it is memory-hard:** It deliberately consumes large amounts of RAM per hash. GPUs and ASICs can parallelise arithmetic cheaply but cannot cheaply replicate memory, so brute-force attacks lose their hardware advantage.

**Parameters chosen:**

| Parameter | Value | Reason |
|---|---|---|
| time_cost | 3 | Iteration count |
| memory_cost | 65536 KB (64 MB) | Above OWASP minimum of 19 MB |
| parallelism | 4 | Threads |
| hash_len / salt_len | 32 / 16 bytes | Output and random salt size |

**Additional step — transparent rehashing:** on each successful login the stored hash is checked with `check_needs_rehash()`. If parameters have since been strengthened, the password is silently re-hashed with the new settings. Security improves without forcing a password reset.

---

## Slide 5 — Algorithm 2: JWT Authentication with Revocation

**Problem:** Server-side sessions require shared state, which blocks horizontal scaling — but a purely stateless token cannot be withdrawn when the user signs out.

**Algorithm:** JSON Web Token, HMAC-SHA256 signature, plus a small deny-list keyed by token id.

**Token issue:**
```
payload = { sub: <user email>, iat: <issued at>, exp: <issued + 24h>, jti: <random 128-bit id> }
token   = base64(header) . base64(payload) . HMAC_SHA256(secret, header.payload)
```

**Token verification:**
1. Recompute the HMAC with the server secret; reject on mismatch (forgery).
2. Require the claims `sub`, `exp`, `iat` to be present; reject if `exp` has passed.
3. Reject if `jti` is in `revoked_tokens` → *"Session has been signed out"*.
4. Load the user identified by `sub`.

**Logout:** `POST /auth/logout` stores `{jti, expires_at}`. A MongoDB **TTL index** on `expires_at` deletes each entry the moment the token would have expired anyway, so the deny-list never grows beyond the set of still-valid tokens.

**Property:** revoking one session leaves the user's other devices signed in; verification is still one indexed lookup.

---

## Slide 6 — Algorithm 3: CSV Parsing & Sign Normalisation

**Problem:** Every bank exports a different CSV format. Some mark debits with a `type` column, some with negative amounts, some with neither.

**Algorithm — decision cascade** for `normalize_transaction_type(raw_type, amount)`:

```
1. type ∈ {debit, expense, dr}    → ("expense", −|amount|)
2. type ∈ {credit, income, cr}    → ("income",  +|amount|)
3. type == transfer               → ("transfer", amount)
4. no usable type → infer from sign:
       amount > 0                 → ("income",  amount)
       amount ≤ 0                 → ("expense", amount)
```

**Invariant established:** after parsing, expenses are always negative and income always positive — regardless of source format, and for manually entered transactions too.

**Robustness handling:**
- UTF-8 BOM stripped; header names trimmed and lower-cased
- **All-or-nothing insert:** the batch is written in one `insert_many`; a failure part-way deletes what was written
- Amounts: `₹`, `Rs.`, `INR` and Indian commas removed (`1,25,000` → `125000`); accounting negatives `(500)` → `−500`; `NaN`/`Infinity` and values above ₹9,999,999,999,999.99 rejected; rounded to paise
- Dates: ISO `2026-06-01` and Indian day-first `01/06/2026`, `01-06-2026`, `01.06.2026`
- Upload capped at **5 MB** (HTTP 413) so a huge file cannot exhaust server memory
- **Partial success model:** bad rows are collected and reported, valid rows still import

---

## Slide 7 — Algorithm 4: Whole-Word Keyword Categorisation

**Problem:** Users will not manually tag hundreds of transactions.

**Algorithm:** dictionary-driven matching — **58 keywords across 9 categories**, compiled to whole-word regular expressions.

```
classify_category(description, merchant, amount, provided_category):
    1. if provided_category is specific (not "Other"/"Misc") → use it   (explicit wins)
    2. searchable = lowercase(description + " " + merchant)
    3. for pattern, category in KEYWORD_PATTERNS:                      (ordered)
           if pattern matches searchable → return category             (first match wins)
    4. generic bank label with no match → keep it
    5. fallback → "Salary/Income" if amount > 0 else "Other"
```

**Whole-word patterns** — `\bsip(?:s|es)?\b`: plain substring matching put "insurance **premium**" under EMI (`emi`), "Coca **cola**" under Transport (`ola`) and "**current** account charges" under Bills (`rent`). Word boundaries fix this while still matching plurals.

**Ordering:** investment keywords (SIP, ELSS, mutual fund, PPF, NPS, Groww, Zerodha…) are checked first, so "Mutual fund SIP" is never claimed by a broader keyword.

**Design trade-off — why rule-based and not machine learning:**

| Rule-based (chosen) | ML classifier |
|---|---|
| Deterministic and explainable | Probabilistic, opaque |
| Zero training data needed | Needs a large labelled corpus |
| Instant, no inference cost | Latency and compute cost |
| Trivial to extend (one dict entry) | Requires retraining |

---

## Slide 8 — Algorithm 5: Duplicate Detection & Income Derivation

**Duplicate detection** — users re-upload overlapping statements; naive import corrupts every total.

```
fingerprint(row) = ( transaction_date, lower(trim(description)),
                     lower(trim(merchant)), round(amount, 2) )

seen = { fingerprint(t) for t in existing_transactions }   # O(N) build
for row in incoming_rows:                                  # O(M) scan
    if fingerprint(row) in seen: skip and report
    else: import, seen.add(fingerprint(row))
```

**Complexity:** O(N + M) with O(1) average set membership, versus O(N × M) pairwise. The in-batch `seen.add()` also removes duplicates *within* one file.

**Income derivation** — income is read from the statements, not typed in:

```
monthly_income = average of total income over the 3 most recent months
                 that contain at least one income transaction
```

- A month still in progress (salary not credited yet) does not drag the average down
- Recomputed after every import and on login; if no income rows exist the stored value is kept, never overwritten with 0
- The emergency-fund target is seeded to 3 × income only while the user has not set one

---

## Slide 9 — Algorithm 6: Conditional Aggregation Pipeline ⭐

**Problem (the key performance issue):** loading every transaction into Python and looping costs O(N) memory and O(N) transfer on every dashboard load.

**Algorithm:** push aggregation into MongoDB so only the *result* crosses the network — one `$group` stage computes income, spend and investments in a single pass.

```js
[
  { $match: { user_id: uid, transaction_type: { $ne: "transfer" },
              transaction_date: { $gte: monthStart, $lt: nextMonthStart } } },
  { $group: {
      _id: null,
      income:   { $sum: { $cond: [ isIncome,     "$amount",             0 ] } },
      expense:  { $sum: { $cond: [ isSpend,      { $abs: "$amount" },   0 ] } },
      invested: { $sum: { $cond: [ isInvestment, { $abs: "$amount" },   0 ] } } } }
]
isSpend      = expense AND category ≠ "Investments"
isInvestment = expense AND category = "Investments"
```

| | Loop in Python | Aggregation pipeline |
|---|---|---|
| Documents transferred | All N | 1 result document |
| Aggregation location | Application | Database engine |
| Memory | O(N) | O(1) |
| Index usage | None | Compound `(user_id, transaction_date)` |

**Investments are not spending.** A SIP leaves the bank account but is money the user *kept*. Counting it as spend showed disciplined savers a negative savings rate; it is now reported separately as "invested".

**Month range, not string compare:** `$gte/$lt` on the date lets the compound index do the filtering.

---

## Slide 10 — Algorithm 7: Recurring Payment Detection

**Problem:** Identify subscriptions and silent recurring drains.

**Algorithm:** group, then filter the groups — the pipeline equivalent of `GROUP BY … HAVING`.

```js
[
  { $match: { user_id: uid, transaction_type: "expense" } },
  { $group: { _id: { merchant: { $toLower: merchantOrDescription }, category: "$category" },
              count: { $sum: 1 }, avg_amount: { $avg: { $abs: "$amount" } },
              months: { $addToSet: { $dateToString: { format: "%Y-%m", date: "$transaction_date" } } } } },
  { $match: { $or: [ { count: { $gte: 2 } }, { "months.1": { $exists: true } } ] } },
  { $sort: { avg_amount: -1 } }
]
```

**Two-condition rationale:**
- `count ≥ 2` — appears repeatedly (two Netflix charges)
- `months.1 exists` (≥ 2 distinct months) — a monthly bill that fires once per month

**Normalisation:** grouping on `$toLower` merges "NETFLIX", "Netflix", "netflix".

**Expenses only:** the monthly salary credit is recurring too, but listing it made the copilot describe income as a subscription draining cash flow.

---

## Slide 11 — Algorithm 8: Budget Alert Classification

**Problem:** Warn the user *before* a budget is blown, not after.

**Algorithm:** one `$lookup` (a left join) computes spend per budget, then threshold classification.

```js
db.budgets.aggregate([
  { $match: { user_id: uid } },
  { $lookup: { from: "transactions", let: { cat: "$category" }, as: "spend",
      pipeline: [ { $match: { $expr: { $and: [ same user, same category,
                    type = "expense", date in month ] } } },
                  { $group: { _id: null, spent: { $sum: { $abs: "$amount" } } } } ] } }
])
```

**Classification rule:**
```
usage_ratio = spent / monthly_limit
remaining < 0        → "overspent"   (red)
usage_ratio ≥ 0.80   → "warning"     (amber)
otherwise            → "safe"        (green)
```

**Why a left join:** a budget with no spending still comes through with an empty `spend` array and is reported as ₹0 used. An inner join would silently hide new budgets.

**One budget per category** is enforced (case-insensitive) — two "Food" budgets each counted the same spend and made alerts contradict each other.

---

## Slide 12 — Algorithm 9: Debt Avalanche Prioritisation

**Problem:** With several loans, which should receive surplus money first?

| Strategy | Order by | Optimises |
|---|---|---|
| **Avalanche** (chosen) | Highest interest rate first | **Minimum total interest paid** |
| Snowball | Smallest balance first | Psychological quick wins |

**Algorithm:**
```
1. Pay the minimum EMI on every account (avoids default and penalties)
2. Sort accounts by interest_rate DESC   (compound index on user_id, interest_rate)
3. Direct all surplus cash to accounts[0]
4. When it clears, roll that payment into the next account
```

**Payoff projection** (front-end, per account): amortisation month by month —
```
interest  = remaining × annual_rate / 12
principal = EMI − interest
remaining = max(remaining − principal, 0)
```
If `EMI ≤ interest`, the balance never falls; the page shows an **"EMI does not cover interest"** warning instead of a payoff date.

---

## Slide 13 — Algorithm 10: Salary Allocation Waterfall

**Problem:** Split salary into purposeful buckets *before* discretionary spending starts ("pay yourself first").

**Algorithm — strict priority waterfall.** Each bucket draws only from what is left, so the total can never exceed income.

```
remaining   = max(income − debt_emis, 0)            -- 1. contractual EMIs
essentials  = min(income × 0.50, remaining)          -- 2. rent, food, bills (≤ 50%)
remaining  −= essentials
emergency   = min(emergency_gap / 12,                -- 3. close the gap over a year,
                  income × 0.15, remaining)          --    capped at 15%
remaining  −= emergency
investments = min(desired_investment, remaining)     -- 4. profile capacity (default 15%)
remaining  −= investments
flexible    = remaining                              -- 5. whatever is left
shortfall   = max(debt_emis − income, 0)             -- reported, never hidden
```

| Guard | Purpose |
|---|---|
| Draw from `remaining` at every step | Buckets sum to exactly income |
| Essentials before investments | Living costs are funded before optional saving |
| `emergency_gap / 12`, cap 15% | Spreads the shortfall over a year without crowding out essentials |
| `shortfall` | EMIs above income are shown as a red banner rather than silently truncated |

*Found in audit:* the earlier version took investments first and could split ₹40,000 income into ₹50,000 of buckets.

---

## Slide 14 — Algorithm 11: Risk-Based Investment Allocation

**Problem:** Suggest an instrument mix appropriate to the user's declared risk tolerance.

**Algorithm:** profile-weighted split of monthly investable capacity. **Each column sums to exactly 100%.**

| Instrument | Conservative | Balanced | Growth |
|---|---|---|---|
| Index Fund SIP | 20% | 35% | 55% |
| Emergency Fund | 25% | 15% | 15% |
| Fixed Deposit | 30% | 20% | 10% |
| Gold ETF | 5% | 10% | 10% |
| Liquid Fund | 20% | 20% | 10% |
| **Total** | **100%** | **100%** | **100%** |

*Found in audit:* conservative previously summed to 105% (recommending more than the user can invest) and growth to 90%.

**Emergency-fund gate:**
```
gap = max(emergency_fund_target − emergency_fund_current, 0)      -- never negative
gap == 0 → "Emergency fund is ready; review SIP allocation."
gap  > 0 → "Emergency fund still needs funding before raising risk."
emergency_share = min(capacity × share, gap)   -- unused share moves to the SIP
```
Once the target is met the plan stops recommending emergency contributions, so the allocation agrees with the readiness message.

**⚠️ Compliance note:** the application is **not** a SEBI-registered investment advisor. The system prompt restricts investment answers to general education and recommends a qualified advisor.

---

## Slide 15 — Algorithm 12: Agentic Tool-Calling Loop (AI) ⭐

**Problem:** A language model asked about personal finances will *hallucinate* numbers. It must be forced to read real data.

**Algorithm:** ReAct-style loop — the model may only obtain figures by calling tools that run the real analytics pipelines.

```
convo = [system_prompt, ...last 10 messages, user_question]

for round in 1..5:                              # tool budget
    response = LLM(convo, tools=TOOL_DEFINITIONS)
    if no tool calls: return response.text      # answered
    for each tool_call:
        result = execute_tool(name, args)        # real aggregation pipeline
        convo.append(tool result)

# 6th round — forced final answer from the data gathered so far
return LLM(answer-only prompt + gathered results, no tools)
```

**The 10 tools** map one-to-one onto analytics functions: `get_dashboard_summary` · `get_category_breakdown` · `get_monthly_spend_trend` · `get_income_vs_expense` · `get_budget_alerts` · `get_top_merchants` · `get_recurring_transactions` · `get_salary_plan` · `get_debt_strategy` · `get_investment_profile`

**Why the forced final round:** the model fetches one tool per round, so a five-part question used the whole budget and returned "reasoning limit" instead of an answer. On Groq, `tool_choice="none"` is not enough — the model still emits a call and the API rejects it (`400 tool_use_failed`) — so the last request carries **no tools** and restates the results as text. An empty reply is retried once with lower reasoning effort.

**Anti-hallucination guarantees:**
1. System prompt: *"Always call the appropriate tool before making any claims. Never invent numbers."*
2. Numbers can only enter the context via tool results
3. Model-supplied arguments are validated (e.g. month must match `YYYY-MM`)
4. No API key → deterministic rule-based answers; rate limit → same fallback

**Multi-provider:** Groq (`openai/gpt-oss-120b`) and Anthropic Claude (`claude-opus-5`, with a server-side refusal fallback to `claude-opus-4-8`). `OPENAI_TOOL_DEFINITIONS` is *derived* from `TOOL_DEFINITIONS`, so the two schemas cannot drift.

---

## Slide 16 — Algorithm 13: Fixed-Point Decimal Arithmetic

**Problem:** IEEE-754 binary floating point cannot represent most decimal fractions exactly.

```python
>>> 0.1 + 0.2
0.30000000000000004        # error accumulates across thousands of transactions
```

**Algorithm:** exact base-10 arithmetic end to end.

| Layer | Type |
|---|---|
| Database | BSON **Decimal128** (34 significant digits) |
| Driver boundary | A `TypeCodec` converts `Decimal128 ⇄ Decimal` automatically — no value ever passes through a float |
| Service | `decimal.Decimal`, amounts quantised to 2 places (paise) |
| API schema | Pydantic `Decimal` with range and decimal-place constraints |
| JSON boundary | Converted to `float` for transport by `_f()` |

**Why the codec matters:** without it, PyMongo returns `Decimal128` objects that cannot be added to a `Decimal`, and a naïve `float()` on write would reintroduce rounding error. Registering the codec once on the client covers every collection.

---

## Slide 17 — Algorithm Complexity Summary

| Algorithm | Complexity | Notes |
|---|---|---|
| Argon2id hashing | O(m) memory-hard | Intentionally slow — that is the defence |
| JWT verify + revocation check | O(1) + one indexed lookup | Unique index on `jti` |
| CSV parse | O(N) | Single pass over rows |
| Categorisation | O(K) per row | K = 58 keywords, effectively constant |
| Duplicate detection | O(N + M) | Hash-set membership |
| Income derivation | O(N) in DB | `$group` by month, `$limit 3` |
| Monthly summary | O(N) in DB, **O(1) transferred** | Index range scan, single result document |
| Category breakdown | O(N log N) in DB | `$group` + `$sort` |
| Recurring detection | O(N log N) in DB | `$group` + `$match` |
| Budget alerts | O(B × T) in DB | One `$lookup`, not B queries |
| Debt avalanche | O(D log D) | Index-backed sort by interest rate |
| Salary waterfall | O(1) | Fixed arithmetic sequence |
| Agentic loop | O(R × T) | R ≤ 5 tool rounds + 1 answer round |

**Headline result:** all aggregation runs inside the database — memory at the application layer is O(1) regardless of how many transactions a user has.

---

# PART B — IMPLEMENTATION AND TESTING

---

## Slide 18 — Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| **Backend** | FastAPI (Python 3.12) | Automatic OpenAPI docs, native Pydantic validation |
| **Database** | MongoDB 8.0 + PyMongo | Aggregation pipelines for analytics; TTL indexes; flexible documents |
| **Validation** | Pydantic v2 | Request/response schemas |
| **Auth** | PyJWT + argon2-cffi | Maintained libraries, OWASP-recommended hashing |
| **Rate limiting** | SlowAPI | Brute-force protection on auth routes |
| **AI** | Groq (`openai/gpt-oss-120b`) · Anthropic Claude (`claude-opus-5`) | Free tier by default; provider-agnostic design |
| **Frontend** | React 18 + TypeScript + Vite | Type safety, fast HMR |
| **State/data** | TanStack Query v5 + Zustand | Server-state caching; light auth store |
| **Charts** | Recharts | Declarative, composable |
| **Styling** | Tailwind CSS v4 | Utility-first, light and dark themes |
| **Container** | Docker (multi-stage) + nginx | Reproducible deploys |
| **CI** | GitHub Actions | Lint, test against real MongoDB, build |

---

## Slide 19 — Implementation Scale

| Metric | Value |
|---|---|
| Backend Python | ~2,940 LOC |
| Frontend TypeScript/React | ~3,160 LOC |
| REST API endpoints | **43** |
| MongoDB collections | **9** (users, transactions, budgets, debt_accounts, investment_profiles, savings_goals, chat_history, counters, revoked_tokens) |
| Frontend pages | **10** |
| AI tools | **10** |
| Automated tests | **143** |

**Architecture — clean layered separation:**

```
app/
├── api/routes/     HTTP layer      — request handling only
├── services/       Business logic  — analytics pipelines, CSV import, categorisation
├── ai/             AI layer        — copilot loops + tool definitions
├── models/         Document models (Pydantic)
├── schemas/        API contracts
├── core/           Config, security, rate limiting
└── db/             MongoDB client, Decimal codec, id counters, indexes
```

Each layer depends only on the layer beneath it, so business logic is testable without HTTP.

---

## Slide 20 — Key Implementation Decisions

**1. Database-side aggregation** — analytics are MongoDB aggregation pipelines; compound indexes on `(user_id, transaction_date)`, `(user_id, category)`, `(user_id, interest_rate)`.

**2. Decimal money path** — Decimal128 in storage, `Decimal` in code, never `float` until the JSON boundary.

**3. Stable integer ids** — a `counters` collection issues sequential ids, so URLs such as `/budgets/12` stayed unchanged when the database moved from SQL to MongoDB.

**4. Income from data** — monthly income is derived from imported salary credits, not entered at registration.

**5. Pagination** — a generic `Page[T]` envelope (`items`, `total`, `limit`, `offset`); list endpoints never return unbounded results.

**6. Code splitting and caching** — pages load with `React.lazy()`; TanStack Query caches for 30 s, mutations invalidate every derived view, and the whole cache is cleared when the signed-in user changes.

**7. Safe retries** — only GET/HEAD requests are retried; retrying a POST after a timeout had created the same budget three times.

**8. Provider-agnostic AI** — Groq → Anthropic → deterministic rule-based fallback, so the app runs with no API key at all.

---

## Slide 21 — Testing Strategy: Four Levels

| Level | Method | Coverage |
|---|---|---|
| **Unit** | pytest, isolated functions | CSV parsing, amounts, dates, categorisation, type normalisation |
| **Integration** | pytest + real MongoDB | Aggregation pipelines, waterfall, income derivation |
| **API / E2E** | FastAPI `TestClient`; scripted copilot clients | Request → auth → DB → response; both AI loops offline |
| **Manual / UI** | Browser automation, axe, contrast script | Rendering, forms, dark mode, 375 px mobile, accessibility |

**Test infrastructure (`conftest.py`):**

| Fixture | Scope | Purpose |
|---|---|---|
| `test_database` | session | Throwaway database `finflow_test_<random>`, indexes created once, **dropped at the end** |
| `db` | function | Empties every collection after each test (indexes kept) |
| `client` | function | `TestClient` against the app |
| `user` | function | Seeded user + investment profile |
| `auth_headers` | function | Valid JWT bearer header |

**Safety guard:** the suite refuses to start unless the database name begins with `finflow_test_`, so it can never touch real data.

**Why a real MongoDB, not a mock:** the analytics layer *is* aggregation pipelines — a mock would test the mock. The full suite still runs in about 5 seconds.

**AI loops without network:** fake Groq and Anthropic clients return scripted responses and record every request, so tests assert the exact parameters sent (model, token limits, tool choice, final no-tools round).

---

## Slide 22 — Test Suite Results

```
$ pytest -q
143 passed in 4.7s
```

| Test file | Tests | What it covers |
|---|---|---|
| `test_audit_regressions.py` | 30 | Amount/date formats, NaN rejection, sign of manual entries, duplicate budgets, waterfall sums, shortfall, savings-rate consistency, emergency gap, chat history order |
| `test_csv_import.py` | 21 | Decimal precision, BOM, comma amounts, invalid rows, missing columns, sign inference |
| `test_analytics.py` | 19 | Monthly summary, category breakdown, budget alerts, recurring detection, income vs expense |
| `test_categorization.py` | 16 | Whole-word matching, plurals, investment keywords, generic bank labels |
| `test_auth.py` | 13 | Register, duplicate email (409), invalid email (422), login, wrong password (401), `/me`, malformed token |
| `test_income_derivation.py` | 11 | 3-month average, partial months, emergency-target seeding, upload → income |
| `test_copilot_loops.py` | 10 | Tool execution, forced final answer (both providers), truncation, refusal, retry of empty answer |
| `test_sessions_and_uploads.py` | 9 | Logout revocation, per-device sessions, TTL index, 5 MB limit, all-or-nothing import, login income repair |
| `test_step4_finance.py` | 7 | Finance route integration |
| `test_investments_not_spend.py` | 6 | Investments excluded from spend, charts, merchants; real overspend still negative |
| `test_health.py` | 1 | Liveness endpoint |
| **Total** | **143** | **All passing** · `ruff` clean · `tsc --noEmit` clean · production build passes |

---

## Slide 23 — Defects Found by Testing (Round 1) ⭐

*Each item is a genuine bug caught and fixed during the first implementation pass.*

| # | Defect | Root cause | Fix |
|---|---|---|---|
| 1 | Dashboard crashed: `value.toFixed is not a function` | `Decimal` serialised as a JSON **string** | Convert `Decimal → float` at the service boundary |
| 2 | `NameError` on the copilot history route | Response model used but never imported | Added the import |
| 3 | Login failed with `InvalidHashError` | Wrong `argon2-cffi` version from the system Python | Isolated virtualenv with pinned requirements |
| 4 | Every login invalidated after a restart | `SECRET_KEY` regenerated on each start | Persisted in gitignored `.env` |
| 5 | A 401 shown as *"backend is unavailable"* | Every error treated as a network failure | `isBackendUnreachable()`; 401 → sign out |
| 6 | Real error masked by *"Missing bearer token"* | Query **retried** the 401 after the token was cleared | Never retry auth errors |
| 7 | Parallel queries fired without a token | One 401 cleared the token mid-flight | `api.ts` fails closed |
| 8 | Budget form silently did nothing | `min="1"` + `step="500"` failed HTML validation with no message | `step="1"` on money inputs |
| 9 | Groq rejected all tool calls | Model sent `"month": null`; strict schema | Optional params typed `["string","null"]` |

**Observation:** defects 5–7 were *cascading* — the fix for one exposed the next.

---

## Slide 24 — Defects Found by Audit (Round 2) ⭐

*A full audit of numbers, UI and edge cases after the MongoDB migration.*

| # | Defect | Effect | Fix |
|---|---|---|---|
| 10 | SIPs counted as spending | Disciplined savers saw **negative savings** | "Investments" category excluded from spend, shown as "invested" |
| 11 | Substring keyword matching | "Premium" → EMI, "Coca cola" → Transport | Whole-word regex patterns |
| 12 | Waterfall took investments first | ₹40,000 income split into ₹50,000 | Every bucket draws from `remaining` |
| 13 | Allocation splits summed to 105% / 90% | Advice exceeded or wasted capacity | Each profile sums to 100% |
| 14 | Savings rate from ₹0 income | Rate shown as −5% before salary credit | Savings and rate use the same income |
| 15 | Salary listed as a recurring drain | Copilot called income a subscription | Recurring detection: expenses only |
| 16 | POST retried after timeout | Same budget created three times | Retry only GET/HEAD |
| 17 | 422 errors displayed `[object Object]` | Unreadable validation messages | Flatten FastAPI `detail` arrays |
| 18 | Copilot "reasoning limit" on multi-part questions | No answer after 5 tool rounds | Forced final answer round |
| 19 | Groq `400 tool_use_failed` on that final round | `tool_choice="none"` ignored by the model | Final request sends no tools |
| 20 | Logout left the token valid | A copied token kept working for 24 h | `jti` revocation + TTL index |
| 21 | Previous user's data flashed after switching accounts | Query cache not keyed by user | Clear cache when the session changes |
| 22 | Grey text failed WCAG contrast (2.6 : 1 light, 3.9 : 1 dark) | Hard to read labels and table headers | Shades adjusted to ≥ 4.5 : 1 in both themes |
| 23 | Import failing part-way kept half the rows | No multi-document transactions on a standalone server | Batch rolled back by `_id` on failure; ids reserved in one counter update |

**Lesson:** round 2 found mostly *numerical* bugs that no exception would ever reveal — the app ran, but the numbers were wrong. Each now has a regression test.

---

## Slide 25 — End-to-End Verification

Full user journey exercised against the running system:

| Step | Verification | Result |
|---|---|---|
| 1. Register a new user | `POST /auth/register` | `201 Created` — no income asked |
| 2. Log in | `POST /auth/login` | Token issued |
| 3. Dashboard before import | `GET /dashboard/summary` | All zeros + empty-state prompt (no fake data) |
| 4. Import CSV | `POST /transactions/upload` | Rows imported, duplicates reported, income derived |
| 5. Dashboard after import | `GET /dashboard/summary` | Income ₹1,25,000 · Spend ₹87,128 · Invested ₹18,000 · Savings rate 30.3% |
| 6. Create budget | `POST /budgets` | `201` — Food ₹12,000; a second Food budget → `409` |
| 7. Create debt | `POST /debt-accounts` | `201` — Home Loan @ 8.65% |
| 8. Save investment profile | `PUT /investment-profile` | `200` — allocation sums to capacity |
| 9. Budget alerts | `GET /budgets/alerts` | Food 108.2% **overspent**, Bills 90.2% **warning** |
| 10. Salary plan | `GET /salary-plan` | Buckets sum exactly to income |
| 11. Copilot query | `POST /copilot/ask` | Named the Food overspend from live data; a 10-part question answered via the final round |
| 12. Delete + authorisation | `DELETE /budgets/{id}` | `204`; another user's id → `404` |
| 13. Logout | `POST /auth/logout`, then `/auth/me` | `204`, then `401` with the same token |

**Security check:** another user's resource returns `404`, not `403` — avoiding disclosure of whether the record exists.

**UI checks:** axe found no violations on any page; a contrast script verified every text element in light and dark themes; no horizontal overflow at 375 px width.

---

## Slide 26 — Multi-User Validation Dataset

Five CSV datasets modelling distinct financial personas, all parsing with **zero rejected rows**:

| User | Persona | Income | Expense | Tests |
|---|---|---|---|---|
| Priya | Fresher, PG rent, education loan | ₹84,000 | ₹59,495 | Low income, healthy surplus |
| Rahul | IT professional, family, home loan | ₹2,50,000 | ₹2,10,726 | Multi-category, school fees |
| Ananya | Freelancer, irregular income | ₹1,90,000 | ₹1,99,396 | **Variable income**, large one-off purchase |
| Vikram | Senior manager, overspender | ₹5,00,000 | ₹6,00,998 | **Negative savings**, multiple loans |
| Meera | Newlywed, car loan, disciplined saver | ₹1,70,000 | ₹1,75,696 | Balanced profile |

Each file spans **two months**, so trend charts, recurring detection and the income average have data.

**Deliberate edge cases:** Ananya and Vikram spend more than they earn, so negative savings, over-limit budgets and deficit handling are tested — not just profitable users.

---

## Slide 27 — CI/CD Pipeline

**GitHub Actions — three jobs:**

| Job | Steps |
|---|---|
| **backend** | Python 3.12 → MongoDB 8.0 service container → install deps → `ruff` (version pinned) → `pytest` |
| **frontend** | Node 20 → `npm ci` → `tsc --noEmit` → `npm run build` |
| **docker** | Build both images with `build-push-action` + layer cache (after backend and frontend pass) |

**No secrets required** — tests use a throwaway MongoDB database and empty AI keys, so the copilot exercises its deterministic fallback path.

**Lint rules pinned in `ruff.toml`:** ruff 0.16 widened its default rule set and turned a passing check into 140 errors with no code change; the rule set and the ruff version are now fixed.

**Containerisation:**
- **Backend:** multi-stage `python:3.12-slim`, non-root user, `HEALTHCHECK`; indexes created on startup (no migration step — MongoDB is schemaless)
- **Frontend:** `node:20-alpine` build → `nginx:1.27-alpine` serve, SPA fallback, `/api/` reverse proxy, gzip
- **Compose:** `mongo:8.0` with health check and a named volume; backend starts only once MongoDB is healthy; `.env`, databases and virtualenvs are excluded from images

---

## Slide 28 — Results Summary

| Area | Outcome |
|---|---|
| **Algorithms** | 16 implemented across security, ingestion, analytics, planning, and AI |
| **Performance** | All analytics run as indexed aggregation pipelines in MongoDB |
| **Correctness** | Exact decimal arithmetic end to end; allocations always sum to income |
| **Security** | Argon2id, JWT with revocation, rate limiting, per-user data isolation |
| **AI grounding** | Tool-calling loop; numbers only from real pipeline results; always returns an answer |
| **Testing** | 143 automated tests passing; 23 real defects found and fixed |
| **Quality gates** | `ruff`, `tsc --noEmit`, production build, axe accessibility, contrast in both themes |
| **Deployment** | Dockerised, CI-verified on every push |

---

## Slide 29 — Challenges & Learnings

| Challenge | Resolution | Learning |
|---|---|---|
| Numbers wrong without any error | Regression test for every numerical defect | "It runs" is not "it is correct" — check the arithmetic |
| SQL → MongoDB migration | Same API contract, integer ids, Decimal codec; tests re-run for parity | Keep the interface stable and the migration is invisible to users |
| `Decimal` at every boundary | Codec at the driver, `float` only in JSON | Type systems end at serialisation layers |
| LLMs hallucinate figures | Mandatory tool calling | Constrain the model's inputs rather than trusting its output |
| Provider quirks (`tool_choice="none"` ignored) | Remove tools on the final request | Test against the real API, not only mocks |
| Silent HTML form validation failure | `step="1"` on money inputs | Absence of an error message is *not* evidence of correctness |

---

## Slide 30 — Future Enhancements

- Bank API integration (Account Aggregator framework) to replace manual CSV upload
- ML-based categorisation trained on user corrections, layered over the rule-based baseline
- Goal-based planning with projected timelines
- Multi-currency support
- Mobile application (React Native)
- Redis-backed distributed rate limiting for multi-instance deployment

---

## Slide 31 — Conclusion

FinFlow AI addresses fragmented personal finance management for Indian salaried professionals through:

1. **Automated ingestion** — CSV parsing, categorisation, duplicate detection and income derivation remove manual data entry
2. **Efficient analytics** — aggregation pipelines inside MongoDB instead of in-memory computation
3. **Deterministic planning** — avalanche debt prioritisation and a waterfall that can never over-allocate
4. **Grounded AI** — a tool-calling loop that makes hallucinated figures structurally impossible and always answers
5. **Verified quality** — 143 automated tests, CI/CD, and 23 documented defects found and fixed

Every figure the application displays is computed from the user's own transactions.

---

## Presentation Notes

**Suggested timing (~15 min):** Problem 1 min · Algorithms 8 min · Implementation 3 min · Testing 3 min

**Slides to emphasise** (⭐): Slide 9 (aggregation pipeline — the core optimisation), Slide 15 (agentic AI loop — the novel component), Slides 23–24 (defects found — proves rigorous testing).

**Likely examiner questions and answers:**

- *"Why MongoDB?"* → The analytics are naturally expressed as aggregation pipelines (`$group`, `$lookup`, `$cond`), TTL indexes handle session expiry for free, and Decimal128 keeps money exact. The API contract did not change during the migration.
- *"MongoDB has no transactions here — how is an import kept consistent?"* → All rows are parsed and de-duplicated before anything is written, then inserted as one batch. If the batch fails part-way, the documents it wrote are deleted again (a compensating rollback). Income is recomputed afterwards, and again on every login if that step ever fails.
- *"Why avalanche and not snowball?"* → Avalanche minimises total interest; snowball is motivating but strictly more expensive.
- *"Why rule-based categorisation instead of ML?"* → Deterministic, explainable, no training data, zero latency; whole-word patterns fix the false matches of plain substring search.
- *"How do you stop the AI inventing numbers?"* → It has no figures except tool results from real pipelines; the prompt forbids unsupported claims; the loop is bounded and ends with a forced answer.
- *"Why Decimal instead of float?"* → `0.1 + 0.2 != 0.3` in binary floating point; errors accumulate across thousands of transactions.
- *"How is test isolation guaranteed?"* → A random throwaway database per run, every collection emptied after each test, and a guard that refuses any database not named `finflow_test_…`.
- *"JWTs are stateless — how does logout work?"* → Each token carries a random `jti`; logout stores it with the token's expiry, and a TTL index removes it once the token would have expired anyway.
- *"Why 404 rather than 403 for another user's resource?"* → A 403 would confirm the record exists.
