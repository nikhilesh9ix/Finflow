# Paste-ready prompt — 5-minute version (10 slides)

Paste the whole thing into Gamma, Canva Magic, Copilot in PowerPoint, or ChatGPT/Claude.
Every number is verified against the real codebase (updated 14-09-2026) — the tool must not invent or round any of them.

---

Create a **10-slide** academic project review presentation titled **"FinFlow AI — Review 3"**, paced for a **5-minute talk** (~30 seconds per slide).

**Context:** BTech mini-project review by Kuppili Nikhilesh Raju. The two assessed topics are (1) algorithms used to overcome the specific problem and (2) implementation and testing. Audience is engineering faculty. Tone: technical and precise, no marketing language. Because time is short, each slide must carry one idea with a strong visual — not dense paragraphs.

**Design:** Deep teal and ink palette — ink `#0B1F2A`, teal `#0F766E`, mint accent `#14B8A6`, light surface `#F2F6F5`. Dark slides for title and conclusion, light for content. Serif headings (Cambria) with sans body (Calibri). Every slide needs a visual — cards, tables, comparison columns, monospace code blocks, or a chart. No accent stripes or underlines beneath titles. 16:9.

---

**Slide 1 — Title (dark).**
"FinFlow AI" · A personal financial copilot for Indian salaried professionals · Review 3 · Kuppili Nikhilesh Raju · subtitle "Algorithms · Implementation · Testing".

**Slide 2 — The problem.**
Salaried individuals in India have their financial life scattered across bank SMS, PDF statements and spreadsheets. Three cards: (1) *No consolidated view* — overspending is discovered only after the fact. (2) *Manual categorisation* — tagging hundreds of transactions is abandoned quickly. (3) *Generic advice* — not grounded in the user's actual numbers. Close with a dark callout: **every insight is computed from the user's own transaction data — even monthly income is derived from imported salary credits.**

**Slide 3 — 16 algorithms across six layers.**
One card per layer: **Security** — Argon2id hashing (memory-hard, 64 MB), JWT HS256 with server-side revocation (jti + TTL index). **Ingestion** — CSV parsing with sign normalisation, whole-word keyword categorisation (58 keywords, 9 categories), duplicate fingerprinting in O(N+M), income derived as a 3-month average of salary credits. **Analytics** — MongoDB aggregation pipelines: conditional sums, category breakdown, recurring detection, budget alerts. **Planning** — debt avalanche, salary waterfall, risk-based investment split. **AI** — agentic tool-calling loop with a forced final answer. **Cross-cutting** — Decimal128 money, because `0.1 + 0.2 != 0.3` in binary floating point.

**Slide 4 — Core optimisation: conditional aggregation pipeline.** ⭐
Problem: looping over every transaction in Python costs O(N) memory and transfer per dashboard load. Solution: one `$group` stage with `$sum` of `$cond` computes income, spend and invested in a single pass inside MongoDB, after `$match` on user and month range. Before/after table: documents transferred **all N → 1**; aggregation **application → database**; memory **O(N) → O(1)**; index **none → compound (user_id, transaction_date)**. Key correctness point: **investments are not spending** — SIPs are money kept, so they are excluded from spend and shown as "invested"; counting them gave disciplined savers a negative savings rate. Show the pipeline as a monospace block.

**Slide 5 — Novel component: agentic tool-calling loop.** ⭐
Problem: a language model asked about personal finances will hallucinate numbers. Solution: a bounded ReAct loop — the model gets 10 tools (dashboard summary, category breakdown, budget alerts, salary plan, debt strategy, recurring payments, top merchants, monthly trend, income vs expense, investment profile), each running a real aggregation pipeline; results are appended and the loop repeats for up to 5 rounds. A **6th forced-answer round** answers from the data gathered, because a five-part question used to end in "reasoning limit". On Groq, `tool_choice="none"` was ignored and returned `400 tool_use_failed`, so the final request carries **no tools** at all. Guarantees: **numbers can only enter the context through tool results**; model arguments are validated; with no key or on rate limit it falls back to deterministic answers. Providers: Groq `openai/gpt-oss-120b` and Anthropic `claude-opus-5`.

**Slide 6 — Planning algorithms that cannot over-allocate.**
Two columns. **Debt avalanche:** pay minimum EMIs, sort by interest rate descending, send surplus to the highest-rate balance — minimises total interest; snowball is strictly more expensive. Warns when an EMI does not even cover interest. **Salary waterfall:** each bucket draws only from what is left — EMIs → essentials (≤ 50%) → emergency fund (gap/12, ≤ 15%) → investments → flexible; EMIs above income are shown as a shortfall. Buckets always sum exactly to income (the old order split ₹40,000 into ₹50,000). Investment splits per risk profile each sum to 100%. Compliance note: **not** a SEBI-registered advisor — general education only.

**Slide 7 — Implementation.**
Big-number callouts: **43** API endpoints · **9** MongoDB collections · **10** frontend pages · **10** AI tools · **~6,100** lines of code (2,940 backend Python, 3,160 frontend TypeScript). Stack table: FastAPI on Python 3.12, MongoDB 8.0 + PyMongo (Decimal128, TTL indexes), PyJWT + argon2-cffi, React 18 + TypeScript + Vite, TanStack Query, Recharts + Tailwind (light/dark), Docker + nginx, GitHub Actions. Note: integer ids from a counters collection kept every URL unchanged through the SQL → MongoDB migration.

**Slide 8 — Testing.**
Headline stat: **143 tests passing in about 5 s** — plus ruff, `tsc --noEmit`, production build, axe accessibility and a contrast check in both themes. Breakdown chart: audit regressions 30, CSV import 21, analytics 19, categorisation 16, auth 13, income derivation 11, copilot loops 10, sessions & uploads 9, finance 7, investments 6, health 1. Two points: **real MongoDB, not mocks** — the analytics *are* pipelines, so a mock would test the mock; each run uses a random throwaway database, collections are emptied after every test, and a guard refuses any database not named `finflow_test_`. **AI loops tested offline** with scripted fake clients that record every request parameter.

**Slide 9 — Defects found and fixed: 23.** ⭐
Table of the six most instructive:
1. Dashboard crash "toFixed is not a function" — `Decimal` serialised as a JSON string — convert at the service boundary.
2. Budget form silently did nothing — `min="1"` with `step="500"` failed HTML validation with **no error at all** — `step="1"`.
3. Disciplined savers shown **negative savings** — SIPs counted as spending — Investments excluded from spend.
4. Salary waterfall split ₹40,000 into ₹50,000 — investments taken first — every bucket draws from what remains.
5. Groq `400 tool_use_failed` — `tool_choice="none"` ignored by the model — final request sends no tools.
6. Logout left the token valid for 24 hours — stateless JWT — jti revocation with a TTL index.
Closing line: the second audit found mostly **numerical** bugs that raised no error — the app ran, but the numbers were wrong. Every one now has a regression test.

**Slide 10 — Results and conclusion (dark).**
Five numbered points: **Automated ingestion** — parsing, categorisation, duplicate detection and income derivation remove manual entry. **Efficient analytics** — aggregation pipelines inside MongoDB. **Deterministic planning** — avalanche prioritisation and a waterfall that cannot over-allocate. **Grounded AI** — figures only from real data, and every question gets an answer. **Verified quality** — 143 tests, CI/CD, 23 defects found and fixed. Close on: *every figure the application displays is computed from the user's own transactions.*

---

**Timing guide for the notes:** problem 30 s (slides 1–2) · algorithms 2 min (slides 3–6) · implementation 45 s (slide 7) · testing 1 min 15 s (slides 8–9) · conclusion 30 s (slide 10).

**Speaker notes — anticipate these examiner questions:**
- *Why MongoDB?* Analytics map naturally to aggregation pipelines, TTL indexes expire revoked sessions automatically, Decimal128 keeps money exact.
- *Why avalanche and not snowball?* Avalanche minimises total interest paid; snowball is strictly more expensive.
- *Why rule-based categorisation instead of ML?* Deterministic, explainable, no training data or latency; whole-word matching removed substring false positives.
- *How do you stop the AI inventing numbers?* It sees figures only through tool results from real pipelines; the loop is bounded and ends with a forced answer.
- *Why Decimal instead of float?* Binary floating point cannot represent decimal fractions exactly.
- *How is test isolation guaranteed?* A throwaway database per run, emptied after each test, with a guard against touching real data.
