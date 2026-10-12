# RoomieSplit

**Shared life. Clear balances.** A local-first expense splitter for exactly three roommates.
React + Vite + Tailwind CSS + Lucide. No backend, database, accounts or APIs. Everything lives in your browser's `localStorage`.

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm test` (unit tests), `npm run build` (production bundle in `dist/`), `npm run preview`, `npm run lint`.

After the first load the app works offline (all assets are bundled; no network calls are made).

## Using it

1. **First visit:** name your roomies (defaults A, B, C can be kept) and pick colours and animals.
2. **Add Expense:** description, amount, who covered it, date, optional category and notes. A live equal-split preview shows each share.
3. **Settle up:** suggested payments appear automatically. Press **Record Payment**, confirm, and the balances update. Partial payments are allowed, but never more than what is owed.
4. **History:** search and filter (roommate, category, date range), expand rows for shares and notes, edit or delete (with confirmation).
5. **Settings:** rename roommates and change avatars (history is unaffected), export or import a JSON backup, export CSV, reset all data (type `RESET`), and toggle the dark theme from the header.

> **Data lives only in this browser.** It does not sync across devices or browsers, and clearing site data erases it. Export a backup regularly (Settings → Export backup).

## Project layout

```
src/
  components/{common,dashboard,expenses,settlements,roommates}/
  hooks/useRoomieSplit.js   state + persistence wiring (no maths)
  utils/finance.js          all financial logic and pure ledger operations
  utils/storage.js          versioned localStorage, validation, import/export
  utils/formatCurrency.js   display-only ₹ and date formatting
  utils/constants.js        categories, avatars, defaults, schema version
  tests/                    Vitest unit tests
```

## How the money works

Everything is **integer paise** (₹100.50 = `10050`). Input is parsed from strings, never with float multiplication; formatting only happens at display time.

| Function (`utils/finance.js`) | Purpose |
|---|---|
| `convertToPaise` | Strict parser: rejects blanks, negatives, NaN/Infinity, exponents, >2 decimals |
| `allocateEqualShares` | Equal 3-way split with the rounding policy below |
| `calculateExpenseBalances` | Per roommate: paid, share, net = paid − share |
| `calculateOutstandingBalances` | Outstanding = net + repayments sent − repayments received |
| `generateSettlementSuggestions` | Greedy creditor/debtor matching, at most 2 payments for 3 people |
| `validateExpense` | Form validation and normalisation |
| `checkInvariants` | Allocated shares = total; balances sum to 0 (the app shows a banner if violated) |
| `addExpense / updateExpense / deleteExpense / recordSettlement` | Pure state transitions (idempotent by ID) |
| `loadStoredData / saveStoredData / parseImport` (`storage.js`) | Safe persistence and backup validation |

### Rounding policy

`base = floor(A / 3)`, `remainder = A mod 3`. Every roommate gets `base`; the leftover 1–2 paise go to the **first roommates in sorted stable-ID order** (`roommate-a`, `roommate-b`, `roommate-c`). The payer gets no special treatment. Shares are stored on each expense, so renames, reloads or later changes never alter historical allocations. ₹1,000.00 → ₹333.34 / ₹333.33 / ₹333.33.

### Settlements and the ledger

Balances are never stored; they are recomputed from expenses + repayments on every change. Repayments are a separate append-only ledger. Recording one never edits an expense.

- **Edit expense:** same ID, shares recomputed, change logged in the audit log.
- **Delete expense:** removed after confirmation; a snapshot goes to the audit log and the activity feed. Repayments are kept, so if the deletion leaves a repayment that no longer matches, a correcting payment is suggested instead of history being rewritten.
- **Duplicate submits:** each form/dialog generates its record ID once; re-submits are ignored, and buttons are locked after the first click.

### Decisions on ambiguous points

- Leftover paise follow stable-ID order (not rotating, not payer-based).
- Repayments are capped at the current suggested amount (partial allowed, over-payment rejected).
- Maximum expense: ₹10,00,00,000.00.
- The settlement sign convention is "toward zero": the payer's outstanding balance rises, the receiver's falls.
- Reversal of recorded repayments is not implemented (the ledger is append-only).

## Tests

`npm test` runs 40 tests in `src/tests/`:

- Parsing/formatting, rounding, and property checks over thousands of amounts.
- The ₹300, ₹100 and multi-payer scenarios.
- The exact ₹1,000 groceries then ₹600 electricity example (A −333.34 / B −333.33 / C +666.67, then A +66.66 / B −533.33 / C +466.67).
- Full settlement, partial payments, debtor-to-creditor flips, edit, and delete with existing repayments.
- Duplicate-submit idempotency, invalid IDs and amounts, and a 300-step randomised invariants test.
- Persistence round-trip, corrupted/blocked storage fallbacks, and JSON export → import.
- Filtering, category breakdown and CSV export (with spreadsheet-formula neutralising).
