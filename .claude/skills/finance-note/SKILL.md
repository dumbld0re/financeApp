---
name: finance-note
description: Convert a photo or image of handwritten notes, receipts, or a bank/transaction statement into the finance tracker's Bulk add shorthand — one transaction per line, ready to paste. Use whenever the user shares an image of spending/income and wants it turned into finance-tracker format, or says "make this a note", "convert to bulk add", or similar.
---

# Image → Finance Tracker note

Turn an image of transactions (a handwritten list, a receipt, a bank statement
screenshot) into text that pastes directly into the app's **Bulk add** box.

The output must obey the exact grammar the parser in
`src/utils/parseTransactions.js` accepts. Produce lines that parse with **zero
errors and no ⚠ warnings** in the app's preview.

## Output grammar (one transaction per line)

```
[sign] <amount> <description> [date] [@Category]
```

- **Sign** — begin the line with `-` for an expense or `+` for income.
  Always write the sign explicitly (a line with no sign is treated as an
  expense, but be explicit so intent is never guessed).
- **Amount** — the first number on the line. Digits with an optional decimal
  point only. Strip currency symbols (`$`, `R`, `€`), thousands separators
  (`1,500` → `1500`), and any trailing `.00`-style noise. Must be greater
  than zero.
- **Description** — a short human label. Keep it brief; drop filler.
- **Date** — optional, placed at the end. Accepted forms, all fine:
  `2/7`, `2/7/2026`, `2 July`, `2/July`, `Jul 2`, `2026-07-02`.
  Day-first is assumed for the `2/7` form. If no date is written on/near the
  item, omit it — the app defaults to today. A date with no year that lands
  in the future is automatically rolled back a year by the app.
- **@Category** — optional but **strongly recommended** (see below).

Lines starting with `#` and blank lines are ignored, so you may add `#`
section comments for readability.

## Always emit an explicit @Category

The app auto-picks a category only when a category name literally appears in
the description; otherwise it falls back to the **first** category for that
type, which is usually wrong. To make the output deterministic, append an
explicit `@Category` to every line.

Map each item to the closest category the user actually has. The stock
categories are:

- **income**: `Salary`
- **expense**: `Transport`, `Gas`, `Clothes`, `Food`

Most users add more. If you don't know the user's real list, use this common
set (and tell the user which ones you assumed so they can adjust):

- income: `Salary`, `Tutoring`, `Freelance`, `Gift`
- expense: `Food`, `Transport`, `Airtime`, `Entertainment`, `Subscriptions`,
  `Loans`, `Cash`, `Fees`, `Clothes`, `Gas`, `Health`, `Rent`

Guidance for mapping:
- groceries / restaurant / metro-for-food → `Food`
- taxi / bus / fuel / ride-hailing (Yango, Uber, Bolt) → `Transport`
- phone credit / data / airtime → `Airtime`
- games, going out, drinks, passes → `Entertainment`
- app stores, streaming, monthly services → `Subscriptions`
- money sent as a loan / repayment → `Loans`
- ATM / cardless withdrawal → `Cash`
- bank / service charges → `Fees`
- tutoring, gigs, salary → the matching income category

> ⚠ If you emit an `@Category` that isn't in the user's real list, the app
> shows a ⚠ and falls back to the default. That's non-fatal, but prefer names
> you're confident exist. When unsure, ask the user for their category list,
> or have them export their data (sync button → Export JSON) and read the
> `categories` field.

## Process

1. **Read the image** with the Read tool. Transcribe every transaction line.
2. **Use layout cues the parser can't see.** Handwritten notes often group
   several items under one date with a brace or a heading, or write the date
   once for a run of lines. Propagate that date to each grouped line
   explicitly. Ignore non-transaction marks: totals, subtotals, arrows,
   braces, underlines, page numbers, and doodles.
3. **Determine sign** from the leading `+`/`-`, the words income/in/salary vs
   spent/paid/bought, or the statement's debit/credit column.
4. **Normalize amounts** — strip symbols and separators; keep the decimal.
5. **Assign a category** to every line per the mapping above; emit `@Category`.
6. **Order** oldest-to-newest or as written — order doesn't affect the app
   (the timeline sorts by date), so preserve the note's order for easy
   cross-checking.
7. **Emit one fenced code block** with the finished note and nothing else
   inside it, so the user can copy the whole block in one go.
8. **Below the block**, briefly flag anything low-confidence: unreadable
   amounts, guessed dates, or categories you assumed. Keep it short.

## Savings transfers are out of scope

Bulk add handles income and expenses only. If the note mentions moving money
into a savings goal, don't invent a line for it — mention it separately and
tell the user to add it with the app's **+** button (Savings Transfer), which
needs a specific goal.

## Example

For a note reading "−167.77 metro (groceries) 2 July · −70 airtime 3 July ·
+240 inga tutoring 7 July · −97.60 yango transport 7 July":

```
# July
-167.77 metro groceries 2/July @Food
-70 airtime 3/July @Airtime
+240 inga tutoring 7/July @Tutoring
-97.60 yango transport 7/July @Transport
```

Then: paste into the app's **Bulk add** box (Timeline → Bulk add), check the
preview, and commit.
