---
name: invoice-lifecycle
description: The rules for invoice statuses, due dates, overdue invoices and paid_at. Use when a pull request touches invoice status, transitions, due dates, reminders, overdue logic or paid_at.
---

# Invoice lifecycle

## States

```
draft ──> sent ──> paid
  │         │
  └──> void <┘
```

`paid` and `void` are final. Nothing moves out of them.

## Rules

- A status change goes through `canTransition` in `src/lib/invoices.ts`. Code that writes `status` directly skips the rules.
- An invoice is overdue only when its status is `sent` and its `due_date` is before today. A draft, paid or void invoice is never overdue.
- Today is the current date in UTC. In SQL, use `current_date`. Do not compare a date with a timestamp.
- `paid_at` is set when an invoice moves to `paid`, and only then. Paid invoices from before 2025-03-11 have no `paid_at`, because the column did not exist. Do not treat them as broken.
- A query that selects invoices for an action (a reminder, a report, a job) must filter on `status` explicitly.

## Procedure

1. Find each place where the diff reads or writes `status`, `due_date` or `paid_at`.
2. Check each one against the rules.
3. If the diff adds or changes a query that selects invoices, run it on production with `execute_sql` (read-only). Count the result by status:

   ```sql
   select status, count(*) from (<the query, with today's date>) q group by status order by 2 desc;
   ```

   Each row with a status that the rules do not allow is a bug. Give the counts in the comment.
