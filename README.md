# invoices-api

REST API for a small invoicing app: customers, invoices and line items on Postgres (Supabase). The frontend lives in `invoices-web`.

## Run it

```sh
cp .env.example .env   # set DATABASE_URL
npm install
npm run db:migrate     # applies supabase/migrations
npm run db:seed        # loads supabase/seed.sql into an empty database
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

Every pull request is reviewed by an agent running on [epho](https://epho.io). The workflow is `.github/workflows/epho-code-review.yml` and the reviewer's instructions are in `.github/epho-review/`. Changing how this repo gets reviewed is a pull request like any other.
