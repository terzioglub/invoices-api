---
name: migrations
description: Check a migration in supabase/migrations/ against production data with the read-only Supabase MCP tools. Use for every pull request that adds or changes a migration.
---

# Migrations

The diff shows what a migration does. Production data decides if it works. Do not assume that a column is full or that its values are clean.

## What to know about this system

- Production data comes from a v1 import and from everything that people entered after it.
- The API has no login. Anyone who can reach it can call every endpoint.
- Supabase exposes the `public` schema through a REST API with a public key. Row level security (RLS) is the only thing that protects a table from that API.

## Rules

- Do not run the migration. Make the same check with a SELECT.
- A merged migration must not change. A change goes in a new migration.
- Expand, then contract. Do not drop or rename a column in the same pull request that stops reading it.
- A backfill must give the correct value for every existing row, not only for the usual rows.
- A new table must enable row level security. A new table without it is P0.
- A `grant` to `anon` or `authenticated`, or a `security definer` function, needs a reason in the pull request.

## Tools

- `list_tables` with schemas `["public"]`: tables, columns and row counts.
- `execute_sql`: one read-only query for each call.

## Procedure

1. List each operation in the migration: unique constraint or index, NOT NULL, CHECK, foreign key, type change, dropped or renamed column, backfill, new table.
2. Get the row counts of the tables that it touches with `list_tables`.
3. Do the check for each operation. Write down the count.
4. Report each count that is not zero on the migration line. Say what happens on deploy: the migration fails, or rows get wrong values. Give a fix.

## Checks

Unique constraint or unique index, also on an expression such as `lower(email)`:

```sql
select count(*) as groups, coalesce(sum(n), 0) as rows
from (select <expr>, count(*) as n from <table> group by <expr> having count(*) > 1) d;
```

NOT NULL:

```sql
select count(*) from <table> where <column> is null;
```

CHECK: the rows where the condition is false:

```sql
select count(*) from <table> where not (<condition>);
```

Foreign key: the rows without a parent:

```sql
select count(*) from <child> c left join <parent> p on p.<pk> = c.<fk>
where c.<fk> is not null and p.<pk> is null;
```

Type change: the values that the cast rejects or changes:

```sql
select count(*) from <table> where <column> is not null and <column>::text !~ '<pattern the new type accepts>';
```

Backfill: run the backfill expression as a SELECT. Compare it with the value that it replaces, row by row:

```sql
select count(*) filter (where <new_expr> is null)             as nulls,
       count(*) filter (where <new_expr> <> <existing_value>) as differences
from <table> <the joins of the backfill>;
```

Then look at the rows that the usual case does not cover: rows without child rows, nulls, old statuses, rows from before a column existed.

Dropped or renamed column: grep this repo and `$WEB_REPO_DIR` for the old name. Each reader that is left is a breaking change.

Large tables: a type change, a NOT NULL without a validated CHECK first, or an index build without `concurrently` locks the table. Give the row count.

## Reporting

- Give counts and describe the pattern. Do not put rows, names, emails or ids in a comment.
- Give the query, so that the author can run it again.
- If a tool fails, say that you did not check the migration against production. Do not guess.
