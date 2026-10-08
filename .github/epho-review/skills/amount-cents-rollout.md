---
name: amount-cents-rollout
description: The rollout that moves invoice amounts from amount (numeric dollars) to amount_cents (integer cents). Use when a pull request touches amount, amount_cents, unit prices, totals, or how invoices-web shows money.
---

# Amount to cents rollout

Invoice amounts are moving from `amount` (`numeric(12, 2)`) to `amount_cents` (`bigint`). The move has four phases. Each phase ships and settles before the next one starts.

| Phase | What changes | Status |
| --- | --- | --- |
| 1 | Add `amount_cents`. New invoices write both columns. | Done: `20260918093000_add_invoice_amount_cents.sql` |
| 2 | Backfill `amount_cents` for the existing invoices. | **Current** |
| 3 | invoices-web reads `amount_cents`. The API returns both fields. | Not started |
| 4 | The API stops returning `amount`. The column is dropped later. | Not started |

## Rules

- A pull request does one phase. It must not skip a phase. A pull request that skips a phase is P0.
- Until phase 3 is done, the API must return `amount`, because invoices-web reads it.
- Until phase 4, code that writes an amount must write both columns.
- The backfill source is the stored `amount`: `amount_cents = round(amount * 100)`. The stored amount is what the customer was billed. Do not calculate it again from line items.
- A phase is done when its pull request is merged and deployed. A pull request for the next phase must say that in its description.

## Procedure

1. Find the phase that the pull request does. If it does more than one, report it.
2. Check the pull request against the rules for that phase.
3. For a backfill, use the migrations skill. Compare the new `amount_cents` with `round(amount * 100)` for every row. Each difference is a finding.
4. For a change to the API response or to invoices-web, use the api-change skill.
