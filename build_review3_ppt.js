/**
 * Review-3 deck generator — FinFlow AI
 * Content source: REVIEW3_CONTENT.md (all figures verified against the codebase)
 */
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.author = "Kuppili Nikhilesh Raju";
pres.title = "FinFlow AI — Review 3";

// ── Palette: deep teal/ink, taken from the product's own UI accent ───────────
const INK = "0B1F2A";
const INK_SOFT = "143444";
const TEAL = "0F766E";
const MINT = "14B8A6";
const MINT_L = "7FE3D2";
const WHITE = "FFFFFF";
const SURFACE = "F2F6F5";
const SURFACE_2 = "E4EDEB";
const TEXT = "0F172A";
const MUTED = "5B6B78";
const AMBER = "C2740B";
const ROSE = "D01843";
const EMERALD = "0A7C55";

const HEAD = "Cambria";
const BODY = "Calibri";
const MONO = "Courier New";

const W = 13.33;
const M = 0.62; // page margin
const CW = W - M * 2; // content width

const shadow = () => ({ type: "outer", color: "0B1F2A", opacity: 0.1, blur: 10, offset: 2, angle: 90 });

/** Dark slide used for the title, section breaks, and the conclusion. */
function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: INK };
  // Soft geometric motif: concentric rings, bottom-right
  s.addShape(pres.ShapeType.ellipse, {
    x: W - 2.6, y: 5.0, w: 3.6, h: 3.6,
    fill: { color: TEAL, transparency: 82 }, line: { color: TEAL, transparency: 70, width: 1 },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: W - 1.9, y: 5.7, w: 2.2, h: 2.2,
    fill: { color: MINT, transparency: 88 }, line: { type: "none" },
  });
  return s;
}

/** Standard light content slide with kicker + title. */
function slide(kicker, title) {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  s.addText(kicker.toUpperCase(), {
    x: M, y: 0.42, w: CW, h: 0.26, margin: 0,
    fontFace: BODY, fontSize: 11.5, bold: true, color: TEAL, charSpacing: 1.6,
  });
  s.addText(title, {
    x: M, y: 0.72, w: CW, h: 0.62, margin: 0,
    fontFace: HEAD, fontSize: 30, bold: true, color: TEXT,
  });
  return s;
}

/** Rounded surface card. */
function card(s, x, y, w, h, opts = {}) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.09,
    fill: { color: opts.fill || SURFACE },
    line: opts.line || { color: SURFACE_2, width: 1 },
    shadow: opts.shadow === false ? undefined : shadow(),
  });
}

/** Numbered badge circle. */
function badge(s, x, y, label, opts = {}) {
  const d = opts.d || 0.42;
  s.addShape(pres.ShapeType.ellipse, {
    x, y, w: d, h: d, fill: { color: opts.fill || TEAL }, line: { type: "none" },
  });
  s.addText(label, {
    x, y, w: d, h: d, margin: 0, align: "center", valign: "middle",
    fontFace: BODY, fontSize: opts.fs || 13, bold: true, color: opts.color || WHITE,
  });
}

/** Monospace code / SQL block on a dark panel. */
function code(s, x, y, w, h, lines, fs = 10.5) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.05, fill: { color: INK }, line: { type: "none" },
  });
  s.addText(lines.join("\n"), {
    x: x + 0.16, y: y + 0.12, w: w - 0.32, h: h - 0.24, margin: 0,
    fontFace: MONO, fontSize: fs, color: MINT_L, lineSpacing: fs * 1.42, valign: "top",
  });
}

/** Big number callout. */
function stat(s, x, y, w, value, label, color = TEAL) {
  s.addText(value, {
    x, y, w, h: 0.72, margin: 0, align: "center",
    fontFace: HEAD, fontSize: 40, bold: true, color,
  });
  s.addText(label, {
    x, y: y + 0.72, w, h: 0.34, margin: 0, align: "center",
    fontFace: BODY, fontSize: 11.5, color: MUTED,
  });
}

/** Table with the deck's house styling. */
function table(s, rows, x, y, w, colW, opts = {}) {
  s.addTable(rows, {
    x, y, w, colW,
    border: { type: "solid", pt: 0.5, color: SURFACE_2 },
    fontFace: BODY, fontSize: opts.fs || 11.5, color: TEXT,
    rowH: opts.rowH || 0.3, valign: "middle", margin: opts.margin || 0.06,
    autoPage: false,
  });
}

function headRow(cells) {
  return cells.map((c) => ({
    text: c,
    options: { bold: true, color: WHITE, fill: { color: TEAL }, fontFace: BODY, fontSize: 11.5 },
  }));
}

function footer(s, n) {
  s.addText(`FinFlow AI  ·  Review 3`, {
    x: M, y: 7.02, w: 4, h: 0.26, margin: 0,
    fontFace: BODY, fontSize: 9, color: "9AA9B2",
  });
  s.addText(String(n), {
    x: W - M - 0.6, y: 7.02, w: 0.6, h: 0.26, margin: 0, align: "right",
    fontFace: BODY, fontSize: 9, color: "9AA9B2",
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 1 — TITLE
// ════════════════════════════════════════════════════════════════════════════
{
  const s = darkSlide();
  s.addText("REVIEW 3  ·  20-08-2026", {
    x: M, y: 1.62, w: CW, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 12.5, bold: true, color: MINT, charSpacing: 2.4,
  });
  s.addText("FinFlow AI", {
    x: M, y: 2.05, w: CW, h: 1.15, margin: 0,
    fontFace: HEAD, fontSize: 62, bold: true, color: WHITE,
  });
  s.addText("A personal financial copilot for Indian salaried professionals", {
    x: M, y: 3.22, w: 8.6, h: 0.5, margin: 0,
    fontFace: BODY, fontSize: 18, color: "B9CBD3",
  });
  s.addShape(pres.ShapeType.rect, {
    x: M, y: 4.12, w: 1.5, h: 0.028, fill: { color: MINT }, line: { type: "none" },
  });
  s.addText("Algorithms used to overcome the problem   ·   Implementation and testing", {
    x: M, y: 4.4, w: 9.4, h: 0.34, margin: 0,
    fontFace: BODY, fontSize: 13.5, color: "8FA6B0",
  });
  s.addText("Kuppili Nikhilesh Raju", {
    x: M, y: 6.28, w: 6, h: 0.32, margin: 0,
    fontFace: BODY, fontSize: 14, bold: true, color: WHITE,
  });
  s.addNotes("Review 3 covers two areas: the algorithms chosen to solve the problem, and how the system was implemented and tested.");
}

// ════════════════════════════════════════════════════════════════════════════
// 2 — PROBLEM RECAP
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Context", "The problem being solved");
  s.addText(
    "Salaried individuals in India have their financial life scattered across bank SMS, PDF statements and spreadsheets. Three concrete problems follow from that:",
    { x: M, y: 1.5, w: 11.2, h: 0.42, margin: 0, fontFace: BODY, fontSize: 14, color: MUTED }
  );

  const items = [
    ["01", "No consolidated view", "Spending is spread across accounts, so overspending is discovered only after the fact."],
    ["02", "Manual categorisation", "Tagging hundreds of transactions by hand is tedious and abandoned quickly."],
    ["03", "Generic advice", "Standard guidance is not grounded in the user's actual numbers."],
  ];
  const cw = 3.72, gap = 0.32;
  items.forEach((it, i) => {
    const x = M + i * (cw + gap);
    card(s, x, 2.25, cw, 2.05);
    badge(s, x + 0.3, 2.5, it[0], { d: 0.46, fs: 13 });
    s.addText(it[1], {
      x: x + 0.3, y: 3.08, w: cw - 0.6, h: 0.34, margin: 0,
      fontFace: HEAD, fontSize: 16, bold: true, color: TEXT,
    });
    s.addText(it[2], {
      x: x + 0.3, y: 3.45, w: cw - 0.6, h: 0.7, margin: 0,
      fontFace: BODY, fontSize: 12, color: MUTED,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 4.72, w: CW, h: 0.82, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Design goal:  ", options: { bold: true, color: MINT } },
      { text: "every insight is computed from the user's own transaction data — even monthly income is derived from the imported salary credits.", options: { color: "D5E3E8" } },
    ],
    { x: M + 0.34, y: 4.72, w: CW - 0.68, h: 0.82, margin: 0, valign: "middle", fontFace: BODY, fontSize: 14.5 }
  );
  footer(s, 2);
}

// ════════════════════════════════════════════════════════════════════════════
// 3 — ALGORITHM MAP
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Overview", "16 algorithms across six layers");
  const layers = [
    ["Security", "Argon2id password hashing  ·  JWT HS256 authentication with server-side revocation", TEAL],
    ["Data ingestion", "CSV parsing & sign normalisation  ·  Whole-word categorisation  ·  Duplicate fingerprinting  ·  Income derivation", INK],
    ["Analytics (pipelines)", "Conditional aggregation  ·  Recurring detection  ·  Budget alerts  ·  Category breakdown", TEAL],
    ["Financial planning", "Debt avalanche  ·  Salary allocation waterfall  ·  Risk-based investment split  ·  Emergency-fund gap", INK],
    ["AI  +  cross-cutting", "Agentic tool-calling loop with forced final answer  ·  Decimal128 fixed-point arithmetic", TEAL],
  ];
  let y = 1.62;
  layers.forEach((l) => {
    card(s, M, y, CW, 1.0);
    s.addShape(pres.ShapeType.roundRect, {
      x: M + 0.26, y: y + 0.26, w: 2.72, h: 0.48, rectRadius: 0.24,
      fill: { color: l[2] }, line: { type: "none" },
    });
    s.addText(l[0], {
      x: M + 0.26, y: y + 0.26, w: 2.72, h: 0.48, margin: 0, align: "center", valign: "middle",
      fontFace: BODY, fontSize: 12.5, bold: true, color: WHITE,
    });
    s.addText(l[1], {
      x: M + 3.24, y: y, w: CW - 3.6, h: 1.0, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 12.5, color: TEXT,
    });
    y += 1.11;
  });
  footer(s, 3);
}

// ════════════════════════════════════════════════════════════════════════════
// 4 — SECTION: PART A
// ════════════════════════════════════════════════════════════════════════════
{
  const s = darkSlide();
  s.addText("PART A", {
    x: M, y: 2.5, w: CW, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 14, bold: true, color: MINT, charSpacing: 3,
  });
  s.addText("Algorithms", {
    x: M, y: 2.95, w: CW, h: 1.1, margin: 0,
    fontFace: HEAD, fontSize: 54, bold: true, color: WHITE,
  });
  s.addText("Security  ·  Ingestion  ·  Analytics  ·  Planning  ·  AI", {
    x: M, y: 4.12, w: CW, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 16, color: "8FA6B0",
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 5 — ARGON2ID
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 1  ·  Security", "Argon2id password hashing");
  s.addText("Problem: plain or weakly-hashed passwords are recoverable if the database leaks.", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  card(s, M, 1.94, 6.15, 3.05);
  s.addText("Why memory-hard?", {
    x: M + 0.3, y: 2.12, w: 5.55, h: 0.32, margin: 0,
    fontFace: HEAD, fontSize: 17, bold: true, color: TEXT,
  });
  s.addText(
    "Argon2id deliberately consumes a large amount of RAM per hash. GPUs and ASICs parallelise arithmetic cheaply, but cannot cheaply replicate memory — so the attacker's hardware advantage disappears.\n\nWinner of the 2015 Password Hashing Competition and the current OWASP recommendation.",
    { x: M + 0.3, y: 2.5, w: 5.55, h: 1.72, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED }
  );

  table(s, [
    headRow(["Parameter", "Value", "Purpose"]),
    ["time_cost", "3", "Iteration count"],
    ["memory_cost", "65536 KB", "64 MB — above OWASP min"],
    ["parallelism", "4", "Threads"],
    ["hash_len", "32 bytes", "Digest size"],
    ["salt_len", "16 bytes", "Random per password"],
  ], 7.05, 1.94, 5.66, [1.62, 1.32, 2.72], { rowH: 0.5 });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 5.24, w: CW, h: 1.0, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: MINT, width: 1.25 },
  });
  s.addText(
    [
      { text: "Transparent rehashing.  ", options: { bold: true, color: TEAL } },
      { text: "On every successful login the stored hash is checked with ", options: { color: TEXT } },
      { text: "check_needs_rehash()", options: { fontFace: MONO, color: TEXT } },
      { text: ". If the parameters have since been strengthened, the password is silently re-hashed with the new settings — security improves without forcing a password reset.", options: { color: TEXT } },
    ],
    { x: M + 0.32, y: 5.24, w: CW - 0.64, h: 1.0, margin: 0, valign: "middle", fontFace: BODY, fontSize: 12.5 }
  );
  s.addText("Migrated from PBKDF2 during the security overhaul.", {
    x: M, y: 6.38, w: CW, h: 0.28, margin: 0, fontFace: BODY, fontSize: 10.5, italic: true, color: MUTED,
  });
  footer(s, 5);
  s.addNotes("Argon2id is memory-hard: it needs lots of RAM per hash, which removes the GPU advantage attackers rely on. We also rehash on login so parameters can be strengthened over time.");
}

// ════════════════════════════════════════════════════════════════════════════
// 6 — JWT
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 2  ·  Security", "JWT authentication with revocation");
  s.addText("Problem: server sessions need shared state — but a purely stateless token cannot be withdrawn when the user signs out.", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  code(s, M, 1.94, 6.15, 2.1, [
    "payload = { sub: <email>, iat: <issued at>,",
    "            exp: <issued + 24h>,",
    "            jti: <random 128-bit id> }",
    "token = b64(header).b64(payload)",
    "        .HMAC_SHA256(secret, …)",
  ], 11);

  s.addText("Verification steps", {
    x: 7.05, y: 1.94, w: 5.66, h: 0.32, margin: 0,
    fontFace: HEAD, fontSize: 17, bold: true, color: TEXT,
  });
  const steps = [
    "Recompute the HMAC with the server secret; reject on mismatch (forgery)",
    "Require sub, exp and iat; reject if exp has passed",
    "Reject if jti is in revoked_tokens — \"Session has been signed out\"",
    "Load the user identified by sub",
  ];
  steps.forEach((t, i) => {
    const y = 2.42 + i * 0.62;
    badge(s, 7.05, y, String(i + 1), { d: 0.32, fs: 11 });
    s.addText(t, {
      x: 7.5, y: y - 0.04, w: 5.2, h: 0.42, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 12, color: TEXT,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 4.34, w: 6.15, h: 1.06, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: SURFACE_2, width: 1 },
  });
  s.addText(
    [
      { text: "Logout. ", options: { bold: true, color: TEAL } },
      { text: "POST /auth/logout stores { jti, expires_at }. A MongoDB TTL index deletes each entry when the token would have expired anyway — the deny-list never grows.", options: { color: TEXT } },
    ],
    { x: M + 0.28, y: 4.34, w: 5.6, h: 1.06, margin: 0, valign: "middle", fontFace: BODY, fontSize: 12 }
  );

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.05, y: 4.96, w: 5.66, h: 0.9, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Per session.  ", options: { bold: true, color: MINT } },
      { text: "Signing out on one device leaves the others signed in; verification stays one indexed lookup.", options: { color: "D5E3E8" } },
    ],
    { x: 7.31, y: 4.96, w: 5.14, h: 0.9, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );

  s.addText("Library note: migrated from the unmaintained python-jose to PyJWT.", {
    x: M, y: 5.56, w: 6.15, h: 0.28, margin: 0, fontFace: BODY, fontSize: 10.5, italic: true, color: MUTED,
  });
  footer(s, 6);
}

// ════════════════════════════════════════════════════════════════════════════
// 7 — CSV PARSING
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 3  ·  Ingestion", "CSV parsing & sign normalisation");
  s.addText("Problem: every bank exports a different format. Some mark debits with a type column, some with negative amounts, some with neither.", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  code(s, M, 1.94, 6.7, 2.95, [
    "1. type ∈ {debit,expense,dr} → (\"expense\", −|amt|)",
    "2. type ∈ {credit,income,cr} → (\"income\",  +|amt|)",
    "3. type == transfer          → (\"transfer\", amt)",
    "4. no usable type → infer from sign:",
    "       amt > 0  → (\"income\",  amt)",
    "       amt ≤ 0  → (\"expense\", amt)",
    "",
    "Also applied to manually entered transactions",
  ], 10);

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 5.06, w: 6.7, h: 1.0, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Invariant established:  ", options: { bold: true, color: MINT } },
      { text: "after parsing, expenses are always negative and income always positive. Every downstream analytic depends on this.", options: { color: "D5E3E8" } },
    ],
    { x: M + 0.28, y: 5.06, w: 6.14, h: 1.0, margin: 0, valign: "middle", fontFace: BODY, fontSize: 12 }
  );

  s.addText("Robustness handling", {
    x: 7.65, y: 1.94, w: 5.06, h: 0.32, margin: 0,
    fontFace: HEAD, fontSize: 17, bold: true, color: TEXT,
  });
  s.addText(
    [
      { text: "BOM stripped; headers trimmed and lower-cased", options: { bullet: true, breakLine: true } },
      { text: "₹, Rs., INR and Indian commas removed (1,25,000 → 125000); (500) → −500", options: { bullet: true, breakLine: true } },
      { text: "NaN, Infinity and absurd amounts rejected; rounded to paise", options: { bullet: true, breakLine: true } },
      { text: "ISO and Indian day-first dates (01/06/2026, 01-06-2026, 01.06.2026)", options: { bullet: true, breakLine: true } },
      { text: "5 MB upload limit (HTTP 413)", options: { bullet: true, breakLine: true } },
      { text: "Partial success — bad rows reported, valid rows import", options: { bullet: true, breakLine: true } },
      { text: "All-or-nothing insert — a failure part-way deletes what was written", options: { bullet: true } },
    ],
    { x: 7.65, y: 2.4, w: 5.06, h: 4.1, margin: 0, valign: "top", fontFace: BODY, fontSize: 12, color: TEXT, paraSpaceAfter: 10 }
  );
  footer(s, 7);
  s.addNotes("The cascade normalises every bank format into one invariant: expenses negative, income positive. One malformed row never fails the whole file.");
}

// ════════════════════════════════════════════════════════════════════════════
// 8 — CATEGORISATION
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 4  ·  Ingestion", "Whole-word keyword categorisation");
  s.addText("Problem: users will not manually tag hundreds of transactions.  58 keywords · 9 categories · ordered first match.", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  code(s, M, 1.9, 6.2, 2.05, [
    "1. specific bank category → keep it",
    "2. searchable = lower(description + merchant)",
    "3. for pattern, category in PATTERNS:",
    "       if pattern matches → category",
    "4. else → Salary/Income if credit, else Other",
  ], 10.5);

  s.addText("Substring matching → whole words  \\bsip(?:s|es)?\\b", {
    x: M, y: 4.1, w: 6.2, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12, bold: true, color: TEAL,
  });
  table(s, [
    headRow(["Transaction", "Substring hit", "Whole word"]),
    ["Insurance premium", "EMI/Loan (emi)", "no match ✓"],
    ["Coca cola crate", "Transport (ola)", "no match ✓"],
    ["Current account charges", "Bills (rent)", "no match ✓"],
    ["Monthly SIPs (plural)", "Investments", "Investments ✓"],
  ], M, 4.46, 6.2, [2.5, 2.05, 1.65], { rowH: 0.38, fs: 10.5 });

  s.addText("Why rule-based, not machine learning?", {
    x: 7.15, y: 1.9, w: 5.56, h: 0.32, margin: 0,
    fontFace: HEAD, fontSize: 17, bold: true, color: TEXT,
  });
  table(s, [
    headRow(["Rule-based (chosen)", "ML classifier"]),
    ["Deterministic, explainable", "Probabilistic, opaque"],
    ["No training data needed", "Needs labelled corpus"],
    ["Instant, no inference cost", "Latency + compute cost"],
    ["Extend with one dict entry", "Requires retraining"],
  ], 7.15, 2.4, 5.56, [2.78, 2.78], { rowH: 0.53, fs: 11 });

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.15, y: 5.24, w: 5.56, h: 1.2, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: MINT, width: 1.25 },
  });
  s.addText("Investment keywords (SIP, ELSS, mutual fund, PPF, NPS, Groww, Zerodha) are checked first, so savings are never claimed by a broader keyword.", {
    x: 7.43, y: 5.24, w: 5.0, h: 1.2, margin: 0, valign: "middle",
    fontFace: BODY, fontSize: 12, color: TEXT,
  });
  footer(s, 8);
}

// ════════════════════════════════════════════════════════════════════════════
// 9 — DUPLICATE DETECTION
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 5  ·  Ingestion", "Duplicate detection & income derivation");
  s.addText("Problem: re-uploaded statements duplicate rows and corrupt totals — and income typed in at sign-up goes stale.", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  code(s, M, 1.94, 7.3, 2.7, [
    "fingerprint(row) = ( transaction_date,",
    "                     lower(trim(description)),",
    "                     lower(trim(merchant)),",
    "                     round(amount, 2) )",
    "",
    "seen = { fingerprint(t) for t in existing }   # O(N)",
    "for row in incoming:                          # O(M)",
    "    if fingerprint(row) in seen: skip",
    "    else: import; seen.add(fingerprint(row))",
  ], 10);

  card(s, 8.2, 1.94, 4.51, 1.5);
  s.addText("Complexity", {
    x: 8.48, y: 2.08, w: 3.95, h: 0.28, margin: 0,
    fontFace: BODY, fontSize: 11, bold: true, color: TEAL,
  });
  s.addText("O(N + M)", {
    x: 8.48, y: 2.36, w: 3.95, h: 0.42, margin: 0,
    fontFace: HEAD, fontSize: 26, bold: true, color: TEXT,
  });
  s.addText("vs O(N × M) for pairwise comparison", {
    x: 8.48, y: 2.78, w: 3.95, h: 0.28, margin: 0,
    fontFace: BODY, fontSize: 11, color: MUTED,
  });

  card(s, 8.2, 3.58, 4.51, 1.06);
  s.addText("Also de-duplicates in-batch", {
    x: 8.48, y: 3.66, w: 3.95, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 12.5, bold: true, color: TEXT,
  });
  s.addText("seen.add() in the loop removes duplicates within one uploaded file too.", {
    x: 8.48, y: 3.96, w: 3.95, h: 0.6, margin: 0,
    fontFace: BODY, fontSize: 11, color: MUTED,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 4.84, w: CW, h: 1.56, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: MINT, width: 1.25 },
  });
  s.addText("Income derivation", {
    x: M + 0.3, y: 4.96, w: 4, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: TEAL,
  });
  s.addText(
    [
      { text: "monthly_income = average income of the 3 most recent months that contain income", options: { fontFace: MONO, fontSize: 11, color: TEXT, breakLine: true } },
      { text: "A month still waiting for salary does not drag the average down · recomputed after each import and on login · never overwritten with 0 · seeds the emergency target (3 × income) only if the user has not set one.", options: { fontSize: 11.5, color: MUTED } },
    ],
    { x: M + 0.3, y: 5.28, w: CW - 0.6, h: 1.04, margin: 0, valign: "top", fontFace: BODY, paraSpaceAfter: 6 }
  );
  footer(s, 9);
}

// ════════════════════════════════════════════════════════════════════════════
// 10 — SQL CONDITIONAL AGGREGATION  ★
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 6  ·  Analytics", "Conditional aggregation pipeline");
  s.addShape(pres.ShapeType.roundRect, {
    x: 11.55, y: 0.72, w: 1.16, h: 0.42, rectRadius: 0.2,
    fill: { color: AMBER }, line: { type: "none" },
  });
  s.addText("CORE", {
    x: 11.55, y: 0.72, w: 1.16, h: 0.42, margin: 0, align: "center", valign: "middle",
    fontFace: BODY, fontSize: 11, bold: true, color: WHITE,
  });

  s.addText("Problem: looping over every transaction in application code costs O(N) memory and transfer on every dashboard load.", {
    x: M, y: 1.48, w: 11.9, h: 0.32, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  code(s, M, 1.94, 7.3, 3.28, [
    "db.transactions.aggregate([",
    "  { $match: { user_id: uid, transaction_type: { $ne: 'transfer' },",
    "              transaction_date: { $gte: start, $lt: end } } },",
    "  { $group: { _id: null,",
    "      income:   { $sum: { $cond: [isIncome, '$amount', 0] } },",
    "      expense:  { $sum: { $cond: [isSpend, { $abs: '$amount' }, 0] } },",
    "      invested: { $sum: { $cond: [isInvestment, { $abs: '$amount' }, 0] } }",
    "  } } ])",
    "isSpend = expense AND category ≠ 'Investments'",
  ], 10);

  table(s, [
    headRow(["", "App loop", "Pipeline"]),
    ["Documents sent", "All N", "1 result"],
    ["Aggregation", "Application", "DB engine"],
    ["Memory", "O(N)", "O(1)"],
    ["Index used", "None", "(user_id, date)"],
  ], 8.2, 1.94, 4.51, [1.55, 1.36, 1.6], { rowH: 0.62, fs: 11 });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 5.44, w: 7.3, h: 0.96, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: MINT, width: 1.25 },
  });
  s.addText(
    [
      { text: "Investments are not spending. ", options: { bold: true, color: TEAL } },
      { text: "A SIP is money the user kept. Counting it as spend showed disciplined savers a negative savings rate — it is now reported separately as \"invested\".", options: { color: TEXT } },
    ],
    { x: M + 0.28, y: 5.44, w: 6.74, h: 0.96, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );

  s.addText("Single pass: income, spend and invested come from one $group, not three queries. The date range lets the compound index do the filtering.", {
    x: 8.2, y: 5.44, w: 4.51, h: 0.96, margin: 0, valign: "middle",
    fontFace: BODY, fontSize: 11, italic: true, color: MUTED,
  });
  footer(s, 10);
  s.addNotes("This is the core optimisation. Aggregation runs inside MongoDB as a pipeline, so only one result document crosses the network instead of every transaction.");
}

// ════════════════════════════════════════════════════════════════════════════
// 11 — RECURRING DETECTION
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 7  ·  Analytics", "Recurring payment detection");
  s.addText("Problem: identify subscriptions and silent recurring drains — the classic unused-subscription wealth leak.", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  code(s, M, 1.94, 7.3, 3.0, [
    "{ $match: { user_id: uid, transaction_type: 'expense' } },",
    "{ $group: { _id: { merchant: { $toLower: merchant },",
    "                   category: '$category' },",
    "            count: { $sum: 1 },",
    "            avg_amount: { $avg: { $abs: '$amount' } },",
    "            months: { $addToSet: month } } },",
    "{ $match: { $or: [ { count: { $gte: 2 } },     // HAVING",
    "                   { 'months.1': { $exists: true } } ] } },",
    "{ $sort: { avg_amount: -1 } }",
  ], 9);

  s.addText("Two-condition heuristic", {
    x: 8.2, y: 1.94, w: 4.51, h: 0.3, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: TEXT,
  });
  const conds = [
    ["count ≥ 2", "Appears repeatedly — e.g. two Netflix charges"],
    ["≥ 2 distinct months", "Appears across separate months — catches a monthly bill billed once per month"],
  ];
  conds.forEach((c, i) => {
    const y = 2.4 + i * 1.24;
    card(s, 8.2, y, 4.51, 1.1);
    s.addText(c[0], {
      x: 8.46, y: y + 0.1, w: 4.0, h: 0.28, margin: 0,
      fontFace: MONO, fontSize: 11.5, bold: true, color: TEAL,
    });
    s.addText(c[1], {
      x: 8.46, y: y + 0.4, w: 4.0, h: 0.62, margin: 0,
      fontFace: BODY, fontSize: 11, color: MUTED,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 5.14, w: 7.3, h: 0.9, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: SURFACE_2, width: 1 },
  });
  s.addText(
    [
      { text: "Normalisation. ", options: { bold: true, color: TEAL } },
      { text: "$toLower merges \"NETFLIX\" and \"netflix\". Expenses only — listing the salary credit made the copilot call income a subscription.", options: { color: TEXT } },
    ],
    { x: M + 0.28, y: 5.14, w: 6.74, h: 0.9, margin: 0, valign: "middle", fontFace: BODY, fontSize: 12 }
  );
  footer(s, 11);
}

// ════════════════════════════════════════════════════════════════════════════
// 12 — BUDGET ALERTS
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 8  ·  Analytics", "Budget alert classification");
  s.addText("Problem: warn the user before a budget is blown, not after.", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  const states = [
    ["safe", "usage < 80%", EMERALD, "On track"],
    ["warning", "usage ≥ 80%", AMBER, "Early warning"],
    ["overspent", "remaining < 0", ROSE, "Limit breached"],
  ];
  const cw = 3.9, gap = 0.31;
  states.forEach((st, i) => {
    const x = M + i * (cw + gap);
    card(s, x, 1.9, cw, 1.34, { fill: WHITE, line: { color: st[2], width: 1.5 } });
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.28, y: 2.2, w: 0.3, h: 0.3, fill: { color: st[2] }, line: { type: "none" },
    });
    s.addText(st[0], {
      x: x + 0.68, y: 2.14, w: cw - 0.96, h: 0.4, margin: 0, valign: "middle",
      fontFace: HEAD, fontSize: 18, bold: true, color: st[2],
    });
    s.addText(st[1], {
      x: x + 0.28, y: 2.58, w: cw - 0.56, h: 0.28, margin: 0,
      fontFace: MONO, fontSize: 11, color: TEXT,
    });
    s.addText(st[3], {
      x: x + 0.28, y: 2.8, w: cw - 0.56, h: 0.24, margin: 0,
      fontFace: BODY, fontSize: 10.5, color: MUTED,
    });
  });

  code(s, M, 3.5, 7.3, 2.7, [
    "db.budgets.aggregate([",
    "  { $match: { user_id: uid } },",
    "  { $lookup: { from: 'transactions', as: 'spend',",
    "      let: { cat: '$category' },",
    "      pipeline: [",
    "        { $match: { same user, category = $$cat,",
    "                    type = 'expense', date in month } },",
    "        { $group: { _id: null, spent: { $sum: { $abs: '$amount' } } } }",
    "  ] } } ])",
  ], 9);

  card(s, 8.2, 3.5, 4.51, 1.28);
  s.addText(
    [
      { text: "Why a left join ($lookup)? ", options: { bold: true, color: TEAL } },
      { text: "A budget with no spending still comes through with an empty spend array and shows ₹0 used. An inner join would hide new budgets.", options: { color: TEXT } },
    ],
    { x: 8.46, y: 3.5, w: 4.0, h: 1.28, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );
  card(s, 8.2, 4.92, 4.51, 1.28);
  s.addText(
    [
      { text: "One budget per category. ", options: { bold: true, color: TEAL } },
      { text: "Enforced case-insensitively — two Food budgets counted the same spend and made alerts contradict each other.", options: { color: TEXT } },
    ],
    { x: 8.46, y: 4.92, w: 4.0, h: 1.28, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );
  footer(s, 12);
}

// ════════════════════════════════════════════════════════════════════════════
// 13 — DEBT AVALANCHE
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 9  ·  Planning", "Debt avalanche prioritisation");
  s.addText("Problem: with several loans, which should receive surplus money first?", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  card(s, M, 1.9, 6.1, 1.6, { fill: WHITE, line: { color: TEAL, width: 1.75 } });
  s.addText("Avalanche  — chosen", {
    x: M + 0.3, y: 2.04, w: 5.5, h: 0.32, margin: 0,
    fontFace: HEAD, fontSize: 17, bold: true, color: TEAL,
  });
  s.addText("Order by highest interest rate first  ·  optimises minimum total interest paid", {
    x: M + 0.3, y: 2.4, w: 5.5, h: 0.78, margin: 0,
    fontFace: BODY, fontSize: 12, color: TEXT,
  });

  card(s, 6.92, 1.9, 5.79, 1.6);
  s.addText("Snowball", {
    x: 7.2, y: 2.04, w: 5.2, h: 0.32, margin: 0,
    fontFace: HEAD, fontSize: 17, bold: true, color: MUTED,
  });
  s.addText("Order by smallest balance first  ·  optimises psychological quick wins", {
    x: 7.2, y: 2.4, w: 5.2, h: 0.78, margin: 0,
    fontFace: BODY, fontSize: 12, color: MUTED,
  });

  s.addText("Algorithm", {
    x: M, y: 3.74, w: 6.1, h: 0.3, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: TEXT,
  });
  const algo = [
    "Pay the minimum EMI on every account (avoids default)",
    "Sort accounts by interest_rate DESC",
    "Direct all surplus cash to accounts[0]",
    "When it clears, roll that payment into the next account",
  ];
  algo.forEach((t, i) => {
    const y = 4.18 + i * 0.56;
    badge(s, M, y, String(i + 1), { d: 0.3, fs: 10.5 });
    s.addText(t, {
      x: M + 0.42, y: y - 0.04, w: 5.66, h: 0.4, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 11.5, color: TEXT,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 6.92, y: 3.74, w: 5.79, h: 1.44, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Justification.  ", options: { bold: true, color: MINT } },
      { text: "Avalanche is mathematically optimal — interest accrues fastest on the highest-rate balance, so every rupee sent there removes the most future interest.", options: { color: "D5E3E8" } },
    ],
    { x: 7.2, y: 3.74, w: 5.23, h: 1.44, margin: 0, valign: "middle", fontFace: BODY, fontSize: 12 }
  );

  code(s, 6.92, 5.34, 5.79, 1.14, [
    "interest  = remaining × annual_rate / 12",
    "principal = EMI − interest",
    "remaining = max(remaining − principal, 0)",
    "EMI ≤ interest → warn \"EMI does not cover interest\"",
  ], 9);
  footer(s, 13);
  s.addNotes("Examiner question: why avalanche not snowball? Avalanche minimises total interest paid and is mathematically optimal. Snowball is motivating but strictly more expensive.");
}

// ════════════════════════════════════════════════════════════════════════════
// 14 — SALARY WATERFALL
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 10  ·  Planning", "Salary allocation waterfall");
  s.addText("Problem: split incoming salary into purposeful buckets before discretionary spending starts — a pay-yourself-first system.", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  code(s, M, 1.9, 7.05, 3.2, [
    "remaining   = max(income − debt_emis, 0)   # 1 contractual",
    "essentials  = min(income × 0.50, remaining) # 2",
    "remaining  −= essentials",
    "emergency   = min(gap / 12, income × 0.15,  # 3",
    "                  remaining)",
    "remaining  −= emergency",
    "investments = min(desired, remaining)       # 4",
    "flexible    = remaining − investments       # 5",
    "shortfall   = max(debt_emis − income, 0)",
  ], 9.5);

  s.addText("Guard clauses", {
    x: 7.95, y: 1.9, w: 4.76, h: 0.3, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: TEXT,
  });
  table(s, [
    headRow(["Guard", "Purpose"]),
    ["draw from remaining", "Buckets sum to exactly income"],
    ["essentials before investments", "Living costs funded before optional saving"],
    ["gap / 12, cap 15%", "Spreads the shortfall over a year"],
    ["shortfall", "EMIs above income shown, not hidden"],
  ], 7.95, 2.36, 4.76, [2.06, 2.7], { rowH: 0.55, fs: 10.5 });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 5.34, w: 7.05, h: 1.0, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: MINT, width: 1.25 },
  });
  s.addText(
    [
      { text: "Result: ", options: { bold: true, color: TEAL } },
      { text: "the waterfall cannot over-allocate. Each bucket draws only from what is left, in priority order, and the flexible bucket absorbs the remainder.", options: { color: TEXT } },
    ],
    { x: M + 0.28, y: 5.34, w: 6.49, h: 1.0, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.95, y: 5.34, w: 4.76, h: 1.0, rectRadius: 0.08,
    fill: { color: "FBE9EC" }, line: { color: ROSE, width: 1.25 },
  });
  s.addText(
    [
      { text: "Found in audit. ", options: { bold: true, color: ROSE } },
      { text: "The old order took investments first and split ₹40,000 income into ₹50,000 of buckets.", options: { color: "6B1024" } },
    ],
    { x: 8.2, y: 5.34, w: 4.26, h: 1.0, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11 }
  );
  footer(s, 14);
}

// ════════════════════════════════════════════════════════════════════════════
// 15 — INVESTMENT ALLOCATION (chart)
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 11  ·  Planning", "Risk-based investment allocation");
  s.addText("Problem: suggest an instrument mix appropriate to the user's declared risk tolerance.", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  const cats = ["Index SIP", "Emergency", "Fixed Dep.", "Gold ETF", "Liquid"];
  s.addChart(
    pres.ChartType.bar,
    [
      { name: "Conservative", labels: cats, values: [20, 25, 30, 5, 20] },
      { name: "Balanced", labels: cats, values: [35, 15, 20, 10, 20] },
      { name: "Growth", labels: cats, values: [55, 15, 10, 10, 10] },
    ],
    {
      x: M, y: 1.9, w: 7.5, h: 4.4,
      barDir: "col", barGrouping: "clustered",
      chartColors: ["9CC4BF", TEAL, INK],
      showTitle: true, title: "Allocation % of monthly capacity",
      titleFontFace: BODY, titleFontSize: 12, titleColor: MUTED,
      showValue: true, dataLabelPosition: "outEnd",
      dataLabelFontFace: BODY, dataLabelFontSize: 8.5, dataLabelColor: TEXT,
      showLegend: true, legendPos: "b", legendFontFace: BODY, legendFontSize: 10,
      catAxisLabelFontFace: BODY, catAxisLabelFontSize: 10, catAxisLabelColor: MUTED,
      valAxisLabelFontFace: BODY, valAxisLabelFontSize: 9, valAxisLabelColor: MUTED,
      valGridLine: { color: SURFACE_2, size: 1 },
      catGridLine: { style: "none" },
      valAxisMaxVal: 60,
    }
  );

  s.addText("Each profile sums to 100%", {
    x: 8.35, y: 1.9, w: 4.36, h: 0.3, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: TEXT,
  });
  s.addText("As risk rises, weight shifts from FD and liquid funds toward the equity index SIP. Audit finding: conservative used to sum to 105% and growth to 90%.", {
    x: 8.35, y: 2.34, w: 4.36, h: 1.0, margin: 0,
    fontFace: BODY, fontSize: 11.5, color: MUTED,
  });

  card(s, 8.35, 3.52, 4.36, 1.24);
  s.addText(
    [
      { text: "Readiness gate. ", options: { bold: true, color: TEAL } },
      { text: "gap = max(target − saved, 0). The emergency share is capped at the gap; once the fund is ready, the unused share moves to the SIP.", options: { color: TEXT } },
    ],
    { x: 8.61, y: 3.52, w: 3.84, h: 1.24, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );

  s.addShape(pres.ShapeType.roundRect, {
    x: 8.35, y: 4.94, w: 4.36, h: 1.36, rectRadius: 0.08,
    fill: { color: "FBEEE6" }, line: { color: AMBER, width: 1.25 },
  });
  s.addText(
    [
      { text: "Compliance. ", options: { bold: true, color: AMBER } },
      { text: "The app is not a SEBI-registered advisor. The system prompt enforces general financial education only, with an explicit recommendation to consult a qualified advisor.", options: { color: "6B4405" } },
    ],
    { x: 8.61, y: 4.94, w: 3.84, h: 1.36, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11 }
  );
  footer(s, 15);
}

// ════════════════════════════════════════════════════════════════════════════
// 16 — AGENTIC LOOP  ★
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 12  ·  Artificial intelligence", "Agentic tool-calling loop");
  s.addShape(pres.ShapeType.roundRect, {
    x: 11.55, y: 0.72, w: 1.16, h: 0.42, rectRadius: 0.2,
    fill: { color: AMBER }, line: { type: "none" },
  });
  s.addText("NOVEL", {
    x: 11.55, y: 0.72, w: 1.16, h: 0.42, margin: 0, align: "center", valign: "middle",
    fontFace: BODY, fontSize: 11, bold: true, color: WHITE,
  });

  s.addText("Problem: a language model asked about personal finances will hallucinate numbers. It must be forced to read real data.", {
    x: M, y: 1.48, w: 11.9, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  code(s, M, 1.9, 7.1, 3.24, [
    "convo = [system_prompt, ...last 10 messages, question]",
    "",
    "for round in 1..5:                   # tool budget",
    "    response = LLM(convo, tools=TOOL_DEFINITIONS)",
    "    if no tool calls: return response.text",
    "    for each tool_call:",
    "        result = execute_tool(name, args)  # real pipeline",
    "        convo.append(tool result)",
    "",
    "# round 6: forced answer — NO tools sent",
    "return LLM(answer-only prompt + gathered results)",
  ], 9.5);

  s.addText("Guarantees", {
    x: 8.0, y: 1.9, w: 4.71, h: 0.3, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: TEXT,
  });
  const guards = [
    "Numbers enter context only via tool results — real pipeline output",
    "Always answers: a 5-part question used to end in \"reasoning limit\"",
    "Groq ignored tool_choice=\"none\" (400) — so the last call has no tools",
    "Arguments validated; no key or rate limit → rule-based answer",
  ];
  guards.forEach((t, i) => {
    const y = 2.4 + i * 0.76;
    badge(s, 8.0, y, "✓", { d: 0.3, fs: 11, fill: EMERALD });
    s.addText(t, {
      x: 8.42, y: y - 0.06, w: 4.29, h: 0.56, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 11.5, color: TEXT,
    });
  });

  s.addText("The 10 tools — each maps to one analytics function", {
    x: M, y: 5.32, w: 12.1, h: 0.28, margin: 0,
    fontFace: BODY, fontSize: 11.5, bold: true, color: TEAL,
  });
  const tools = [
    "dashboard_summary", "category_breakdown", "monthly_spend_trend", "income_vs_expense", "budget_alerts",
    "top_merchants", "recurring_transactions", "salary_plan", "debt_strategy", "investment_profile",
  ];
  tools.forEach((t, i) => {
    const col = i % 5, row = Math.floor(i / 5);
    const x = M + col * 2.44, y = 5.64 + row * 0.46;
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: 2.3, h: 0.34, rectRadius: 0.17,
      fill: { color: SURFACE }, line: { color: SURFACE_2, width: 1 },
    });
    s.addText(t, {
      x, y, w: 2.3, h: 0.34, margin: 0, align: "center", valign: "middle",
      fontFace: MONO, fontSize: 8.5, color: TEXT,
    });
  });
  footer(s, 16);
  s.addNotes("Examiner question: how do you stop the AI inventing numbers? It has no access to figures except through tool calls that run real aggregation pipelines. The loop allows 5 tool rounds, then a forced answer round with no tools. Providers: Groq openai/gpt-oss-120b and Anthropic claude-opus-5.");
}

// ════════════════════════════════════════════════════════════════════════════
// 17 — DECIMAL ARITHMETIC
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Algorithm 13  ·  Cross-cutting", "Fixed-point decimal arithmetic");
  s.addText("Problem: IEEE-754 binary floating point cannot represent most decimal fractions exactly.", {
    x: M, y: 1.48, w: CW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  code(s, M, 1.94, 6.3, 1.16, [
    ">>> 0.1 + 0.2",
    "0.30000000000000004    # error accumulates",
  ], 12);

  s.addText("Errors compound across thousands of transactions — unacceptable in financial calculations.", {
    x: M, y: 3.24, w: 6.3, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED,
  });

  table(s, [
    headRow(["Layer", "Type used"]),
    ["Database", "BSON Decimal128 (34 significant digits)"],
    ["Driver boundary", "TypeCodec: Decimal128 ⇄ Decimal"],
    ["Service / schema", "decimal.Decimal, quantised to paise"],
    ["JSON boundary", "Converted to float for transport"],
  ], 7.15, 1.94, 5.56, [1.85, 3.71], { rowH: 0.44, fs: 11 });

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.15, y: 4.3, w: 5.56, h: 1.0, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: SURFACE_2, width: 1 },
  });
  s.addText("The codec is registered once on the MongoDB client, so every collection reads and writes Decimal — no value ever passes through a float.", {
    x: 7.43, y: 4.3, w: 5.0, h: 1.0, margin: 0, valign: "middle",
    fontFace: BODY, fontSize: 11.5, color: TEXT,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 3.82, w: 6.3, h: 1.28, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Boundary conversion.  ", options: { bold: true, color: MINT } },
      { text: "Decimal has no native JSON form — serialising it naively produces a string, which breaks arithmetic in the browser. This was a real defect found in testing (see Defects slide).", options: { color: "D5E3E8" } },
    ],
    { x: M + 0.28, y: 3.82, w: 5.74, h: 1.28, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );
  footer(s, 17);
}

// ════════════════════════════════════════════════════════════════════════════
// 18 — COMPLEXITY SUMMARY
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Analysis", "Algorithm complexity summary");
  table(s, [
    headRow(["Algorithm", "Complexity", "Notes"]),
    ["Argon2id hashing", "O(m) memory-hard", "Intentionally slow — that is the defence"],
    ["JWT verify + revocation", "O(1) + one indexed lookup", "Unique index on jti"],
    ["CSV parse", "O(N)", "Single pass over rows"],
    ["Categorisation", "O(K) per row", "K = 58 keywords — effectively constant"],
    ["Duplicate detection", "O(N + M)", "Hash-set membership"],
    ["Income derivation", "O(N) in DB", "$group by month, $limit 3"],
    ["Monthly summary", "O(N) in DB, O(1) transferred", "Index range scan; one result document"],
    ["Category / recurring", "O(N log N) in DB", "$group + $sort / $group + $match"],
    ["Budget alerts", "O(B × T) in DB", "One $lookup, not B queries"],
    ["Debt avalanche", "O(D log D)", "Index-backed sort by interest rate"],
    ["Salary waterfall", "O(1)", "Fixed arithmetic sequence"],
    ["Agentic loop", "O(R × T)", "R ≤ 5 tool rounds + 1 answer round"],
  ], M, 1.5, CW, [3.3, 3.1, 5.69], { rowH: 0.31, fs: 11 });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 5.62, w: CW, h: 0.78, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Headline result:  ", options: { bold: true, color: MINT } },
      { text: "all aggregation runs inside the database — application memory is O(1) no matter how many transactions a user has.", options: { color: "D5E3E8" } },
    ],
    { x: M + 0.32, y: 5.62, w: CW - 0.64, h: 0.78, margin: 0, valign: "middle", fontFace: BODY, fontSize: 13 }
  );
  footer(s, 18);
}

// ════════════════════════════════════════════════════════════════════════════
// 19 — SECTION: PART B
// ════════════════════════════════════════════════════════════════════════════
{
  const s = darkSlide();
  s.addText("PART B", {
    x: M, y: 2.5, w: CW, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 14, bold: true, color: MINT, charSpacing: 3,
  });
  s.addText("Implementation & Testing", {
    x: M, y: 2.95, w: CW, h: 1.1, margin: 0,
    fontFace: HEAD, fontSize: 50, bold: true, color: WHITE,
  });
  s.addText("Stack  ·  Architecture  ·  Test strategy  ·  Defects found  ·  CI/CD", {
    x: M, y: 4.12, w: CW, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 16, color: "8FA6B0",
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 20 — TECH STACK
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Implementation", "Technology stack");
  table(s, [
    headRow(["Layer", "Technology", "Reason for the choice"]),
    ["Backend", "FastAPI (Python 3.12)", "Automatic OpenAPI docs, native Pydantic validation"],
    ["Database", "MongoDB 8.0 + PyMongo", "Aggregation pipelines for analytics; TTL indexes; Decimal128"],
    ["Validation", "Pydantic v2", "Request and response schemas"],
    ["Authentication", "PyJWT + argon2-cffi", "Maintained libraries, OWASP-recommended hashing"],
    ["Rate limiting", "SlowAPI", "Brute-force protection on auth routes"],
    ["AI", "Groq (gpt-oss-120b) · Claude (opus-5)", "Free tier by default; provider-agnostic design"],
    ["Frontend", "React 18 + TypeScript + Vite", "Type safety, fast hot reload"],
    ["Server state", "TanStack Query v5 + Zustand", "Caching and refetching; light auth store"],
    ["Charts / styling", "Recharts + Tailwind CSS v4", "Declarative charts, utility-first CSS, light and dark themes"],
    ["Deployment", "Docker multi-stage + nginx", "Reproducible builds"],
    ["CI", "GitHub Actions + MongoDB service", "Lint, tests against a real database, build"],
  ], M, 1.56, CW, [1.95, 3.75, 6.39], { rowH: 0.42, fs: 11 });
  footer(s, 20);
}

// ════════════════════════════════════════════════════════════════════════════
// 21 — SCALE + ARCHITECTURE
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Implementation", "Scale and architecture");

  const stats = [
    ["43", "API endpoints"], ["9", "Collections"], ["10", "Frontend pages"],
    ["10", "AI tools"], ["143", "Automated tests"],
  ];
  stats.forEach((st, i) => {
    const x = M + i * 2.47;
    card(s, x, 1.5, 2.3, 1.16);
    stat(s, x, 1.66, 2.3, st[0], st[1]);
  });

  s.addText("Layered architecture", {
    x: M, y: 2.94, w: 6.1, h: 0.32, margin: 0,
    fontFace: HEAD, fontSize: 17, bold: true, color: TEXT,
  });
  code(s, M, 3.34, 6.1, 3.0, [
    "app/",
    " ├── api/routes/   HTTP layer      — requests only",
    " ├── services/     Business logic  — pipelines, CSV",
    " ├── ai/           AI layer        — loops + tools",
    " ├── models/       Document models (Pydantic)",
    " ├── schemas/      API contracts",
    " ├── core/         Config, security, rate limiting",
    " └── db/           Mongo client, Decimal codec, ids",
  ], 9.5);

  s.addText("Code volume", {
    x: 7.0, y: 2.94, w: 5.71, h: 0.32, margin: 0,
    fontFace: HEAD, fontSize: 17, bold: true, color: TEXT,
  });
  table(s, [
    headRow(["Component", "Lines of code"]),
    ["Backend (Python)", "~2,940"],
    ["Frontend (TypeScript/React)", "~3,160"],
    ["Database migration", "SQL → MongoDB, API unchanged"],
  ], 7.0, 3.34, 5.71, [2.81, 2.9], { rowH: 0.55, fs: 11.5 });

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.0, y: 5.66, w: 5.71, h: 0.68, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: MINT, width: 1.25 },
  });
  s.addText("Each layer depends only on the one beneath it, so business logic is unit-testable without HTTP.", {
    x: 7.26, y: 5.66, w: 5.19, h: 0.68, margin: 0, valign: "middle",
    fontFace: BODY, fontSize: 11.5, color: TEXT,
  });
  footer(s, 21);
}

// ════════════════════════════════════════════════════════════════════════════
// 22 — KEY DECISIONS
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Implementation", "Key implementation decisions");
  const decs = [
    ["Database-side aggregation", "Analytics are MongoDB pipelines with compound indexes on (user_id, date), (user_id, category), (user_id, interest_rate)."],
    ["Decimal money path", "Decimal128 in storage, Decimal in code — never float until the JSON boundary."],
    ["Stable integer ids", "A counters collection issues sequential ids, so URLs such as /budgets/12 survived the SQL → MongoDB migration."],
    ["Income from data", "Monthly income is derived from imported salary credits, not typed in at registration."],
    ["Safe retries", "Only GET/HEAD are retried — retrying a POST after a timeout had created the same budget three times."],
    ["Cache per user", "Mutations invalidate derived views; the whole query cache is cleared when the signed-in user changes."],
    ["Provider-agnostic AI", "Groq → Anthropic → deterministic fallback, so the app runs with no API key at all."],
  ];
  let y = 1.46;
  decs.forEach((d, i) => {
    card(s, M, y, CW, 0.66, { shadow: false });
    badge(s, M + 0.22, y + 0.14, String(i + 1), { d: 0.38, fs: 11.5 });
    s.addText(d[0], {
      x: M + 0.76, y: y + 0.05, w: 3.3, h: 0.28, margin: 0,
      fontFace: BODY, fontSize: 12, bold: true, color: TEAL,
    });
    s.addText(d[1], {
      x: M + 0.76, y: y + 0.32, w: CW - 1.03, h: 0.3, margin: 0,
      fontFace: BODY, fontSize: 10.5, color: MUTED,
    });
    y += 0.73;
  });
  footer(s, 22);
}

// ════════════════════════════════════════════════════════════════════════════
// 23 — TESTING STRATEGY
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Testing", "Four levels of testing");
  const levels = [
    ["Unit", "pytest, isolated functions", "Parsing, amounts, dates, categorisation"],
    ["Integration", "pytest + real MongoDB", "Pipelines, waterfall, income derivation"],
    ["API / E2E", "TestClient, fake AI clients", "Request → auth → DB → response; both AI loops offline"],
    ["Manual / UI", "Browser, axe, contrast", "Dark mode, 375 px mobile, accessibility"],
  ];
  const cw = 2.84, gap = 0.24;
  levels.forEach((l, i) => {
    const x = M + i * (cw + gap);
    card(s, x, 1.5, cw, 1.72);
    badge(s, x + 0.26, 1.72, String(i + 1), { d: 0.38, fs: 12 });
    s.addText(l[0], {
      x: x + 0.74, y: 1.72, w: cw - 1.0, h: 0.38, margin: 0, valign: "middle",
      fontFace: HEAD, fontSize: 15, bold: true, color: TEXT,
    });
    s.addText(l[1], {
      x: x + 0.26, y: 2.2, w: cw - 0.52, h: 0.34, margin: 0,
      fontFace: BODY, fontSize: 10.5, bold: true, color: TEAL,
    });
    s.addText(l[2], {
      x: x + 0.26, y: 2.52, w: cw - 0.52, h: 0.58, margin: 0,
      fontFace: BODY, fontSize: 10.5, color: MUTED,
    });
  });

  s.addText("Test infrastructure — fixture design (conftest.py)", {
    x: M, y: 3.44, w: 6.4, h: 0.32, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: TEXT,
  });
  table(s, [
    headRow(["Fixture", "Scope", "Purpose"]),
    ["test_database", "session", "Throwaway finflow_test_<random>, dropped at end"],
    ["db", "function", "Empties every collection after each test"],
    ["client", "function", "TestClient against the app"],
    ["user", "function", "Seeded user + investment profile"],
    ["auth_headers", "function", "Valid JWT bearer header"],
  ], M, 3.9, 6.4, [1.5, 1.0, 3.9], { rowH: 0.4, fs: 10.5 });

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.3, y: 3.9, w: 5.41, h: 1.16, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Test isolation.  ", options: { bold: true, color: MINT } },
      { text: "A random database per run, emptied after every test. A guard refuses to start unless the name begins with finflow_test_ — real data is never touched.", options: { color: "D5E3E8" } },
    ],
    { x: 7.56, y: 3.9, w: 4.89, h: 1.16, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );

  card(s, 7.3, 5.2, 5.41, 1.16);
  s.addText(
    [
      { text: "Why a real MongoDB, not mocks? ", options: { bold: true, color: TEAL } },
      { text: "The analytics layer is aggregation pipelines — a mock would test the mock. The suite still runs in about 5 seconds.", options: { color: TEXT } },
    ],
    { x: 7.56, y: 5.2, w: 4.89, h: 1.16, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );
  footer(s, 23);
}

// ════════════════════════════════════════════════════════════════════════════
// 24 — TEST RESULTS
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Testing", "Test suite results");

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 1.5, w: 4.3, h: 1.9, rectRadius: 0.1,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText("143", {
    x: M, y: 1.66, w: 4.3, h: 0.92, margin: 0, align: "center",
    fontFace: HEAD, fontSize: 62, bold: true, color: MINT,
  });
  s.addText("tests passing in 4.7 s", {
    x: M, y: 2.6, w: 4.3, h: 0.32, margin: 0, align: "center",
    fontFace: BODY, fontSize: 14, color: "D5E3E8",
  });
  s.addText("$ pytest -q", {
    x: M, y: 2.94, w: 4.3, h: 0.3, margin: 0, align: "center",
    fontFace: MONO, fontSize: 11, color: "8FA6B0",
  });

  card(s, M, 3.62, 4.3, 2.78);
  s.addText("Other quality gates — all clean", {
    x: M + 0.28, y: 3.78, w: 3.8, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12, bold: true, color: TEAL,
  });
  const gates = ["ruff (pinned rule set)", "tsc --noEmit", "npm run build", "axe accessibility scan", "WCAG contrast, light + dark", "No overflow at 375 px"];
  gates.forEach((g, i) => {
    const y = 4.18 + i * 0.36;
    badge(s, M + 0.28, y, "✓", { d: 0.26, fs: 9.5, fill: EMERALD });
    s.addText(g, {
      x: M + 0.66, y: y - 0.04, w: 3.4, h: 0.34, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 11.5, color: TEXT,
    });
  });

  s.addChart(
    pres.ChartType.bar,
    [{
      name: "Tests",
      labels: ["audit_regressions", "csv_import", "analytics", "categorization", "auth", "income_derivation",
        "copilot_loops", "sessions_uploads", "step4_finance", "investments_not_spend", "health"],
      values: [30, 21, 19, 16, 13, 11, 10, 9, 7, 6, 1],
    }],
    {
      x: 5.2, y: 1.5, w: 7.51, h: 4.9,
      barDir: "bar",
      chartColors: [TEAL],
      showTitle: true, title: "Tests per module",
      titleFontFace: BODY, titleFontSize: 12, titleColor: MUTED,
      showValue: true, dataLabelPosition: "outEnd",
      dataLabelFontFace: BODY, dataLabelFontSize: 10, dataLabelColor: TEXT,
      showLegend: false,
      catAxisOrientation: "maxMin",
      catAxisLabelFontFace: MONO, catAxisLabelFontSize: 9.5, catAxisLabelColor: TEXT,
      valAxisLabelFontFace: BODY, valAxisLabelFontSize: 9, valAxisLabelColor: MUTED,
      valGridLine: { color: SURFACE_2, size: 1 },
      catGridLine: { style: "none" },
      valAxisMaxVal: 35,
    }
  );
  footer(s, 24);
}

// ════════════════════════════════════════════════════════════════════════════
// 25 — DEFECTS FOUND  ★
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Testing  ·  Round 1", "Defects found by testing");
  s.addShape(pres.ShapeType.roundRect, {
    x: 11.32, y: 0.72, w: 1.39, h: 0.42, rectRadius: 0.2,
    fill: { color: ROSE }, line: { type: "none" },
  });
  s.addText("9 BUGS", {
    x: 11.32, y: 0.72, w: 1.39, h: 0.42, margin: 0, align: "center", valign: "middle",
    fontFace: BODY, fontSize: 11, bold: true, color: WHITE,
  });

  table(s, [
    headRow(["#", "Defect", "Root cause", "Fix"]),
    ["1", "Dashboard crash: toFixed is not a function", "FastAPI serialised Decimal as a JSON string", "Convert Decimal → float at service boundary"],
    ["2", "NameError on copilot history route", "Response model used but never imported", "Added the missing import"],
    ["3", "Login failed: InvalidHashError", "Wrong argon2-cffi version from system Python", "Isolated virtualenv, pinned requirements"],
    ["4", "All logins invalid after restart", "SECRET_KEY not persisted — JWTs re-signed each start", "Persisted generated key in gitignored .env"],
    ["5", "401 shown as \"backend unavailable\"", "Any error treated as a network failure", "isBackendUnreachable(); 401 clears session"],
    ["6", "Real error masked by \"Missing bearer token\"", "Query retried the 401 after token was cleared", "Never retry auth errors"],
    ["7", "Parallel queries fired without a token", "One 401 cleared the token mid-flight", "api.ts fails closed — no token, no request"],
    ["8", "Budget form silently did nothing", "min=1 with step=500 → 10000 fails HTML validation", "step=\"1\" on all money inputs"],
    ["9", "Groq rejected every tool call (400)", "Model emitted null for an optional parameter", "Widened optional params to [string, null]"],
  ], M, 1.48, CW, [0.42, 3.5, 3.6, 4.57], { rowH: 0.4, fs: 10 });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 5.66, w: CW, h: 0.86, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Worth noting:  ", options: { bold: true, color: MINT } },
      { text: "defects 5–7 were cascading — fixing one exposed the next. Defect 8 is a silent failure: no console error, no network request, no user feedback. Only inspecting form.checkValidity() revealed it.", options: { color: "D5E3E8" } },
    ],
    { x: M + 0.32, y: 5.66, w: CW - 0.64, h: 0.86, margin: 0, valign: "middle", fontFace: BODY, fontSize: 12 }
  );
  footer(s, 25);
  s.addNotes("This slide shows testing did real work. Nine genuine defects, each with root cause and fix. The cascading auth bugs and the silent form-validation failure are the most instructive.");
}

// ════════════════════════════════════════════════════════════════════════════
// 26 — DEFECTS FOUND BY AUDIT (ROUND 2)  ★
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Testing  ·  Round 2", "Defects found by full audit");
  s.addShape(pres.ShapeType.roundRect, {
    x: 11.32, y: 0.72, w: 1.39, h: 0.42, rectRadius: 0.2,
    fill: { color: ROSE }, line: { type: "none" },
  });
  s.addText("14 BUGS", {
    x: 11.32, y: 0.72, w: 1.39, h: 0.42, margin: 0, align: "center", valign: "middle",
    fontFace: BODY, fontSize: 11, bold: true, color: WHITE,
  });

  table(s, [
    headRow(["#", "Defect", "Effect", "Fix"]),
    ["10", "SIPs counted as spending", "Savers shown negative savings", "Investments excluded from spend"],
    ["11", "Substring keyword matching", "\"premium\" → EMI, \"cola\" → Transport", "Whole-word regex patterns"],
    ["12", "Waterfall took investments first", "₹40,000 split into ₹50,000", "Every bucket draws from remaining"],
    ["13", "Allocation splits summed to 105% / 90%", "Advice exceeded or wasted capacity", "Each profile sums to 100%"],
    ["14", "Savings rate from ₹0 income", "−5% before salary was credited", "Same income for savings and rate"],
    ["15", "Salary listed as a recurring drain", "Copilot called income a subscription", "Recurring: expenses only"],
    ["16", "POST retried after a timeout", "Same budget created three times", "Retry only GET/HEAD"],
    ["17", "422 errors shown as [object Object]", "Unreadable validation messages", "Flatten FastAPI detail arrays"],
    ["18", "Multi-part copilot questions", "\"Reasoning limit\", no answer", "Forced final answer round"],
    ["19", "Groq 400 on that final round", "tool_choice=\"none\" ignored", "Final request sends no tools"],
    ["20", "Logout left the token valid", "Copied token worked for 24 h", "jti revocation + TTL index"],
    ["21", "Account switch in the same tab", "Previous user's data flashed", "Clear query cache on session change"],
    ["22", "Grey text contrast 2.6 : 1 / 3.9 : 1", "Failed WCAG AA", "≥ 4.5 : 1 in both themes"],
    ["23", "Import failing part-way", "Half a statement saved", "Rollback by _id; ids in one update"],
  ], M, 1.44, CW, [0.46, 3.66, 3.9, 4.07], { rowH: 0.325, fs: 9.5 });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 6.4, w: CW, h: 0.54, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Lesson:  ", options: { bold: true, color: MINT } },
      { text: "mostly numerical bugs that raised no error — the app ran, but the numbers were wrong. Each now has a regression test.", options: { color: "D5E3E8" } },
    ],
    { x: M + 0.32, y: 6.4, w: CW - 0.64, h: 0.54, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );
  footer(s, 26);
  s.addNotes("Round two was a full audit after the MongoDB migration. Most defects were numerical: nothing crashed, but savings, allocations and rates were wrong. Every one of them now has a regression test.");
}

// ════════════════════════════════════════════════════════════════════════════
// 27 — E2E VERIFICATION
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Testing", "End-to-end verification");
  s.addText("The full user journey exercised against the running system:", {
    x: M, y: 1.44, w: CW, h: 0.28, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  table(s, [
    headRow(["Step", "Request", "Result"]),
    ["1  Register (no income asked)", "POST /auth/register", "201 Created"],
    ["2  Log in", "POST /auth/login", "Token issued"],
    ["3  Dashboard before import", "GET /dashboard/summary", "All zeros + empty state (no fake data)"],
    ["4  Import CSV", "POST /transactions/upload", "Rows imported, duplicates reported, income derived"],
    ["5  Dashboard after import", "GET /dashboard/summary", "₹1,25,000 income · ₹87,128 spend · ₹18,000 invested · 30.3%"],
    ["6  Create budget", "POST /budgets", "201 — Food ₹12,000; second Food budget → 409"],
    ["7  Create debt", "POST /debt-accounts", "201 — Home Loan @ 8.65%"],
    ["8  Budget alerts", "GET /budgets/alerts", "Food 108.2% overspent, Bills 90.2% warning"],
    ["9  Salary plan", "GET /salary-plan", "Buckets sum exactly to income"],
    ["10  Copilot query", "POST /copilot/ask", "Names the Food overspend; 10-part question answered"],
    ["11  Authorisation check", "DELETE another user's budget", "404 — existence not disclosed"],
    ["12  Logout", "POST /auth/logout → GET /auth/me", "204, then 401 with the same token"],
  ], M, 1.78, CW, [3.3, 3.5, 5.29], { rowH: 0.31, fs: 10.5 });

  card(s, M, 5.96, 6.1, 0.9);
  s.addText(
    [
      { text: "UI checks. ", options: { bold: true, color: TEAL } },
      { text: "axe: no violations on any page · contrast verified in light and dark · no horizontal overflow at 375 px.", options: { color: TEXT } },
    ],
    { x: M + 0.28, y: 5.96, w: 5.54, h: 0.9, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11 }
  );

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.0, y: 5.96, w: 5.71, h: 0.9, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: MINT, width: 1.25 },
  });
  s.addText(
    [
      { text: "Security detail. ", options: { bold: true, color: TEAL } },
      { text: "Another user's resource returns 404, not 403 — the response never reveals whether the record exists.", options: { color: TEXT } },
    ],
    { x: 7.26, y: 5.96, w: 5.19, h: 0.9, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11 }
  );
  footer(s, 27);
}

// ════════════════════════════════════════════════════════════════════════════
// 28 — DATASET
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Testing", "Multi-user validation dataset");
  s.addText("Five CSV datasets modelling distinct financial personas — all parsing with zero rejected rows.", {
    x: M, y: 1.44, w: CW, h: 0.28, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  table(s, [
    headRow(["User", "Persona", "Income", "Expense", "What it tests"]),
    ["Priya", "Fresher, PG rent, education loan", "₹84,000", "₹59,495", "Low income, healthy surplus"],
    ["Rahul", "IT professional, family, home loan", "₹2,50,000", "₹2,10,726", "Multi-category, school fees"],
    ["Ananya", "Freelancer, irregular income", "₹1,90,000", "₹1,99,396", "Variable income, one-off purchase"],
    ["Vikram", "Senior manager, overspender", "₹5,00,000", "₹6,00,998", "Negative savings, multiple loans"],
    ["Meera", "Newlywed, car loan, disciplined saver", "₹1,70,000", "₹1,75,696", "Balanced profile"],
  ], M, 1.8, CW, [1.25, 4.05, 1.55, 1.55, 3.69], { rowH: 0.5, fs: 11 });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 4.9, w: 6.1, h: 1.2, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: SURFACE_2, width: 1 },
  });
  s.addText(
    [
      { text: "Deliberate edge cases. ", options: { bold: true, color: TEAL } },
      { text: "Ananya and Vikram both spend more than they earn — validating that negative savings rates, over-limit budgets and deficit handling all behave correctly.", options: { color: TEXT } },
    ],
    { x: M + 0.28, y: 4.9, w: 5.54, h: 1.2, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.0, y: 4.9, w: 5.71, h: 1.2, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Two months of data each,  ", options: { bold: true, color: MINT } },
      { text: "so trend charts, recurring detection and the income average have enough history to work against.", options: { color: "D5E3E8" } },
    ],
    { x: 7.26, y: 4.9, w: 5.19, h: 1.2, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );
  footer(s, 28);
}

// ════════════════════════════════════════════════════════════════════════════
// 29 — CI/CD
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Deployment", "CI/CD pipeline and containerisation");
  s.addText("GitHub Actions — backend and frontend in parallel, then Docker on push", {
    x: M, y: 1.44, w: CW, h: 0.28, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  const jobs = [
    ["backend", ["Python 3.12 + MongoDB 8.0 service", "ruff — version and rules pinned", "pytest — 143 tests"]],
    ["frontend", ["Node 20 + npm ci", "tsc --noEmit type check", "npm run build + artifact"]],
    ["docker", ["Runs after both jobs pass", "Build backend and frontend images", "GHA layer caching"]],
  ];
  const cw = 3.82, gap = 0.32;
  jobs.forEach((j, i) => {
    const x = M + i * (cw + gap);
    card(s, x, 1.82, cw, 1.9);
    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.26, y: 2.0, w: 1.72, h: 0.4, rectRadius: 0.2,
      fill: { color: TEAL }, line: { type: "none" },
    });
    s.addText(j[0], {
      x: x + 0.26, y: 2.0, w: 1.72, h: 0.4, margin: 0, align: "center", valign: "middle",
      fontFace: MONO, fontSize: 11, bold: true, color: WHITE,
    });
    s.addText(
      j[1].map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < j[1].length - 1 } })),
      { x: x + 0.26, y: 2.54, w: cw - 0.52, h: 1.08, margin: 0, fontFace: BODY, fontSize: 11.5, color: TEXT, paraSpaceAfter: 6 }
    );
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 3.88, w: CW, h: 0.82, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: MINT, width: 1.25 },
  });
  s.addText(
    [
      { text: "No secrets required. ", options: { bold: true, color: TEAL } },
      { text: "Tests use a throwaway MongoDB database and empty AI keys, so the copilot exercises its deterministic fallback. Ruff 0.16 widened its default rules and turned a passing check into 140 errors — so the rule set and version are pinned.", options: { color: TEXT } },
    ],
    { x: M + 0.3, y: 3.88, w: CW - 0.6, h: 0.82, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5 }
  );

  s.addText("Containerisation", {
    x: M, y: 4.86, w: CW, h: 0.3, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: TEXT,
  });
  table(s, [
    headRow(["Image", "Build strategy"]),
    ["Backend", "Multi-stage python:3.12-slim · non-root user · HEALTHCHECK · indexes created at startup (no migrations)"],
    ["Frontend", "node:20-alpine build → nginx:1.27-alpine serve · SPA fallback · /api/ reverse proxy · gzip"],
    ["Compose", "mongo:8.0 with health check + named volume · backend waits for healthy MongoDB · prod override enables auth"],
    ["Image hygiene", ".env, local databases and virtualenvs excluded via .dockerignore"],
  ], M, 5.22, CW, [1.6, 10.49], { rowH: 0.33, fs: 10.5 });
  footer(s, 29);
}

// ════════════════════════════════════════════════════════════════════════════
// 30 — RESULTS SUMMARY
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Outcome", "Results summary");
  table(s, [
    headRow(["Area", "Outcome"]),
    ["Algorithms", "16 implemented across security, ingestion, analytics, planning and AI"],
    ["Performance", "All analytics run as indexed aggregation pipelines inside MongoDB"],
    ["Correctness", "Exact decimal arithmetic end to end; allocations always sum to income"],
    ["Security", "Argon2id, JWT with revocation, rate limiting, per-user data isolation"],
    ["AI grounding", "Figures only from real pipeline results — and every question gets an answer"],
    ["Testing", "143 automated tests passing; 23 real defects found and fixed"],
    ["Quality gates", "ruff, tsc --noEmit, production build, axe and contrast checks all clean"],
    ["Deployment", "Dockerised and CI-verified on every push"],
  ], M, 1.58, CW, [2.6, 9.49], { rowH: 0.43, fs: 12.5 });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 5.62, w: CW, h: 0.8, rectRadius: 0.08,
    fill: { color: INK }, line: { type: "none" },
  });
  s.addText(
    [
      { text: "Every figure the application displays is computed from the user's own transactions.", options: { bold: true, color: MINT } },
    ],
    { x: M + 0.32, y: 5.62, w: CW - 0.64, h: 0.8, margin: 0, valign: "middle", fontFace: BODY, fontSize: 14.5 }
  );
  footer(s, 30);
}

// ════════════════════════════════════════════════════════════════════════════
// 31 — CHALLENGES & LEARNINGS
// ════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Reflection", "Challenges and learnings");
  table(s, [
    headRow(["Challenge", "Resolution", "Learning"]),
    ["Numbers wrong without any error", "A regression test for every numerical defect", "\"It runs\" is not \"it is correct\" — check the arithmetic"],
    ["SQL → MongoDB migration", "Same API, integer ids, Decimal codec; tests re-run", "A stable interface makes a migration invisible to users"],
    ["Decimal at every boundary", "Codec at the driver, float only in JSON", "Type systems end at serialisation layers"],
    ["LLMs hallucinate figures", "Mandatory tool calling", "Constrain the model's inputs rather than trusting its output"],
    ["Provider quirks (tool_choice ignored)", "No tools on the final request", "Test against the real API, not only mocks"],
    ["Silent HTML form validation failure", "step=\"1\" on money inputs", "Absence of an error is not evidence of correctness"],
  ], M, 1.56, CW, [3.5, 3.7, 4.89], { rowH: 0.46, fs: 11.5 });

  s.addText("Future enhancements", {
    x: M, y: 5.1, w: CW, h: 0.3, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: TEXT,
  });
  const future = [
    "Bank API integration (account aggregator)", "ML categorisation over the rule-based baseline",
    "Goal-based planning with timelines", "Multi-currency support",
    "React Native mobile app", "Redis distributed rate limiting",
  ];
  future.forEach((t, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * 4.06, y = 5.5 + row * 0.46;
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: 3.85, h: 0.36, rectRadius: 0.18,
      fill: { color: SURFACE }, line: { color: SURFACE_2, width: 1 },
    });
    s.addText(t, {
      x: x + 0.14, y, w: 3.57, h: 0.36, margin: 0, valign: "middle",
      fontFace: BODY, fontSize: 10.5, color: TEXT,
    });
  });
  footer(s, 31);
}

// ════════════════════════════════════════════════════════════════════════════
// 32 — CONCLUSION
// ════════════════════════════════════════════════════════════════════════════
{
  const s = darkSlide();
  s.addText("CONCLUSION", {
    x: M, y: 0.85, w: CW, h: 0.34, margin: 0,
    fontFace: BODY, fontSize: 12.5, bold: true, color: MINT, charSpacing: 2.6,
  });
  s.addText("FinFlow AI", {
    x: M, y: 1.2, w: CW, h: 0.82, margin: 0,
    fontFace: HEAD, fontSize: 40, bold: true, color: WHITE,
  });

  const points = [
    ["Automated ingestion", "Parsing, categorisation, duplicate detection and income derivation remove manual entry"],
    ["Efficient analytics", "Aggregation pipelines inside MongoDB instead of in-memory computation"],
    ["Deterministic planning", "Avalanche prioritisation and a salary waterfall that cannot over-allocate"],
    ["Grounded AI", "Figures only from real data — and every question gets an answer"],
    ["Verified quality", "143 automated tests, CI/CD, and 23 documented defects found and fixed"],
  ];
  let y = 2.26;
  points.forEach((p, i) => {
    badge(s, M, y + 0.04, String(i + 1), { d: 0.38, fs: 12, fill: MINT, color: INK });
    s.addText(p[0], {
      x: M + 0.58, y, w: 3.1, h: 0.34, margin: 0,
      fontFace: BODY, fontSize: 13.5, bold: true, color: MINT,
    });
    s.addText(p[1], {
      x: M + 3.75, y, w: 8.2, h: 0.46, margin: 0,
      fontFace: BODY, fontSize: 12.5, color: "C4D5DC",
    });
    y += 0.66;
  });

  s.addShape(pres.ShapeType.rect, {
    x: M, y: 5.82, w: 1.5, h: 0.028, fill: { color: MINT }, line: { type: "none" },
  });
  s.addText("Every figure the application displays is computed from the user's own transactions.", {
    x: M, y: 6.02, w: 11, h: 0.4, margin: 0,
    fontFace: HEAD, fontSize: 17, italic: true, color: WHITE,
  });
  s.addText("Thank you", {
    x: M, y: 6.58, w: 6, h: 0.34, margin: 0,
    fontFace: BODY, fontSize: 13, color: "8FA6B0",
  });
}

pres.writeFile({ fileName: "FinFlow_AI_Review3.pptx" }).then((f) => console.log("Written:", f));
