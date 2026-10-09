# invoices-api

> **This repo is an experiment.** We used it to test one question: **does an AI code reviewer catch more real problems when it gets more context?** The app is a small demo, and all the data is fake. Some problems in the data were planted on purpose. The full results are below.

## The short answer

Yes, but each kind of context does a different job:

- **A good prompt alone** already finds logic bugs in the code. But it can only guess about data ("if any such rows exist…").
- **Access** (the frontend repo and read-only access to the database) turns guesses into facts ("37 duplicate groups"). It also catches breaks outside this repo.
- **Team skills** (short notes on how this team works) catch problems that only people on the team know about, like the rollout plan. They also set the right severity.
- **More context did not add noise.** On the clean PR, every reviewer left the same single note.

## The setup

The app is a REST API for invoices: customers, invoices and line items on Postgres (Supabase). The frontend is [invoices-web](https://github.com/terzioglub/invoices-web).

Every pull request is reviewed by an AI agent on [epho](https://epho.io). The workflow is `.github/workflows/epho-code-review.yml`. The reviewer's instructions are in `.github/epho-review/`.

We built **three reviewers**. They are the same in every way except what they get:

| Reviewer | What it gets | Branch |
| --- | --- | --- |
| **Prompt only** | The review prompt and this repo | [`exp-a`](../../tree/exp-a) |
| **Prompt + access** | The above, plus the invoices-web repo and read-only database access | [`exp-b`](../../tree/exp-b) |
| **Prompt + access + team skills** | The above, plus 4 short skill files about this team | [`exp-c`](../../tree/exp-c) |

The skills are `migrations`, `api-change`, `amount-cents-rollout` and `invoice-lifecycle`. You can read them in [`exp-c/.github/epho-review/skills/`](../../tree/exp-c/.github/epho-review/skills).

**How it works:** the workflow reads the prompt and skills from the PR's *base* branch. So a PR opened into `exp-b` is reviewed by the "prompt + access" reviewer. The app code is the same on all three branches. Only `.github/epho-review/` is different.

**Held the same for every run:** the OpenCode harness, the model `opencode/gpt-6.1-sol`, the prompt, and the day (2026-10-08).

## The four test PRs

Each test PR is one branch, opened into all three reviewers. We ran each one **3 times**, so 4 × 3 reviewers × 3 tries = **36 reviews**.

1. **Search invoices.** A clean change with no problem in it. This checks for noise: does more context make the reviewer nitpick?
2. **List overdue invoices.** The query uses `paid_at is null` to mean "not paid". But old paid invoices have no `paid_at`, because the column did not exist then. The query returns 3,171 invoices, and only 465 are really overdue. Reminders would go to 2,056 paid, 636 void and 14 draft invoices.
3. **Make customer emails unique.** It adds a unique index on `lower(email)`. But the database already has 37 groups of emails that differ only in case (74 customers), so the migration fails on deploy.
4. **Finish moving amounts to cents.** This PR has three problems:
   - invoices-web still reads `invoice.amount`, so every amount shows as `$NaN`.
   - The backfill sets 20 paid invoices to $0, because they have no line items.
   - It skips a step of the team's rollout plan.

## Results

Each cell shows how many of the 3 runs caught the problem.

| PR | Problem | Prompt only | Prompt + access | + team skills |
| --- | --- | --- | --- | --- |
| Search | No problem (noise check) | 1 small note | 1 small note | 1 small note |
| Overdue | Paid, void and draft invoices get reminders | **3/3**, no numbers | **3/3**, with real counts | **3/3**, with real counts |
| Unique email | The migration fails on existing duplicates | **3/3**, but only as a guess | **3/3**, "37 groups" as fact, P1 | **3/3**, as fact, **P0** |
| Unique email | The frontend crashes on the new 409 error (not planted) | 0/3 | 0/3 | **3/3** |
| Cents | The backfill sets 20 paid invoices to $0 | **3/3**, no count | **3/3**, finds the 20 | **3/3**, finds the 20 |
| Cents | The frontend shows `$NaN` | 0/3 | **3/3** | **3/3** |
| Cents | Skips a step of the rollout plan | 0/3 | 0/3 | **3/3** |

**Severity:** P0 means "blocks the merge". P1 is a real bug. P2 is a smaller note.

**Speed:** the median review took about 3 minutes (from 1.8 to 4.9 minutes).

### What the reviews said

> "If any such rows exist, this index creation fails with a unique violation."
>
> Prompt only, unique email, [#74](../../pull/74). A guess, with no data.

> "The connected database already contains 37 duplicate `lower(email)` groups covering 74 customers… Those customers have 378 linked invoices."
>
> Prompt + access, unique email, [#78](../../pull/78)

> "A read-only check of this predicate matches 2,056 paid invoices, 636 void invoices, and 14 drafts; the default first page contains 24 paid invoices and one void invoice."
>
> Prompt + access, overdue, [#42](../../pull/42)

> "This combines the backfill (phase 2) with removal (phase 4) before the frontend cutover (phase 3), and no matching frontend PR is linked."
>
> Prompt + access + team skills, cents, [#73](../../pull/73)

## Read the raw data

- **Every review:** the PRs themselves, #38 to #73, plus #74 to #82 for the unique email re-run. [`experiment/prs.csv`](experiment/prs.csv) links each one, with its test PR, try and reviewer.
- **Every review as JSON:** [`experiment/results/`](experiment/results)
- **The PR titles and descriptions:** [`experiment/scenarios.json`](experiment/scenarios.json)
- **The scripts that opened the PRs and collected the reviews:** [`experiment/scripts/`](experiment/scripts)
- **The starting point:** the tag [`exp-base`](../../tree/exp-base). The test branches are `exp/<scenario>-t1`, `-t2` and `-t3`.

## What we threw out, and why

We threw out two runs because the reviewer could see the answer:

- **Run 1 (PRs #2 to #37).** The script that made the fake data was in the repo. The prompt-only reviewer read the planted problems from it. We removed the script and ran everything again.
- **The first unique email run.** The PR description said the duplicates already existed. We closed those PRs and re-ran them with a neutral description (#74 to #82).

The rule we learned: the PR text and the repo must never state the planted problem.

## Limits

- **Small sample.** 3 runs per cell shows a clear difference, not an exact rate.
- **We wrote both sides.** The same people wrote the test PRs and the skills. Read the [skills](../../tree/exp-c/.github/epho-review/skills) and judge for yourself whether they give the answer away. (They never name the planted problems.)
- **One model, one app.** Results may be different with another model or a bigger codebase.

## Run the app

```sh
cp .env.example .env   # set DATABASE_URL
npm install
npm run db:migrate     # applies supabase/migrations
npm run dev            # http://localhost:3001
```

The planted data is not in this repo, so a fresh database starts empty.

## Endpoints

| Method | Path | |
| --- | --- | --- |
| GET | `/customers?page&limit` | list customers |
| GET | `/customers/:id` | customer with their invoices |
| POST | `/customers` | `{ name, email, company? }` |
| PATCH | `/customers/:id` | update name, email or company |
| GET | `/invoices?page&limit&status&customer_id` | list invoices |
| GET | `/invoices/:id` | invoice with line items |
| POST | `/invoices` | `{ customer_id, currency, due_date, issued_at?, line_items: [{ description, quantity, unit_price }] }` |
| PATCH | `/invoices/:id` | `{ status }`: draft → sent → paid, or void |

## Status

The experiment is finished. The review workflow is turned off, and this repo does not accept pull requests.
