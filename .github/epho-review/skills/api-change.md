---
name: api-change
description: Find the code in invoices-web that breaks when a pull request changes an endpoint, its parameters, its request body or its response. Use when the diff touches src/routes/ or the DTO helpers in src/lib/.
---

# API change

invoices-web calls this API over REST. It ships separately and keeps its own copy of the response types, so its compiler does not see a change here. It is cloned at `$WEB_REPO_DIR`.

## Rules

- Prefer additive changes: a new optional field or a new endpoint.
- A breaking change needs the matching invoices-web pull request linked in the description. That change ships first or at the same time.
- An additive change needs no comment.

## Procedure

1. Sync the clone of invoices-web:

   ```sh
   cd "$WEB_REPO_DIR" && git fetch origin main && git checkout --detach FETCH_HEAD
   ```

2. List each contract change in the diff. Look at the route handlers and at the serializers that they call (`toInvoiceDto`, `toCustomerDto`). Most response changes happen in the serializers.
   - an endpoint that is added, removed or moved
   - a query parameter or body field that is added, removed, renamed or made required
   - a response field that is removed, renamed, or changed in type, nullability, unit or format
   - a status code or an error body
3. Find the consumers of each change:

   ```sh
   cd "$WEB_REPO_DIR" && grep -rn --include='*.ts' --include='*.tsx' -e '<field or path>' .
   ```

   Start with `lib/api.ts`, the client and its types. Then read each page and component that uses the field.
4. Decide if each consumer breaks. A missing field shows as `undefined` or `NaN`. A changed unit shows a wrong value with no error. A renamed query parameter is ignored with no error.
5. Report each break on the line in this repo that causes it. List the invoices-web files and lines that break, and how they break. Suggest an additive path: keep the old field until invoices-web moves to the new one.
