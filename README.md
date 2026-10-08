# invoices-api

REST API for a small invoicing app: customers, invoices and line items on Postgres (Supabase). The frontend lives in `invoices-web`.

## Run it

```sh
cp .env.example .env   # set DATABASE_URL
npm install
npm run db:migrate     # applies supabase/migrations
npm run dev            # http://localhost:3001
```

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

## Code review

Every pull request is reviewed by an agent running on [epho](https://epho.io). Everything it knows is in `.github/epho-review/`:

- `system-prompt.md`: how to review and post, with the generic code review and security checks. Nothing in it is specific to this repo, so it can be copied as is.
- `skills/`: what this team knows. `migrations` and `api-change` check a change against production data and against invoices-web; `amount-cents-rollout` and `invoice-lifecycle` hold the rules for two areas of the code.
- `request.jq`: what the agent gets: this repo, invoices-web, read-only production data through the Supabase MCP server, and the skills.

The workflow reads the prompt and skills from the base branch, so a pull request can't change the rules it's reviewed by. `.github/CODEOWNERS` says who approves changes to them.
