import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "../db.js";
import { toCustomerDto, type CustomerRow } from "../lib/customers.js";
import { isUniqueViolation } from "../lib/db-errors.js";
import { toInvoiceDto, type InvoiceRow } from "../lib/invoices.js";
import { offsetFor, pageQuery, paginated } from "../lib/pagination.js";

const idParam = z.object({ id: z.coerce.number().int().positive() });

const emailTaken = { error: "a customer with this email already exists" } as const;

const customerBody = z.object({
  name: z.string().trim().min(1),
  email: z.email().transform((email) => email.toLowerCase()),
  company: z.string().trim().min(1).nullish(),
});

export const customers = new Hono()
  .get("/", zValidator("query", pageQuery), async (c) => {
    const query = c.req.valid("query");
    const [rows, [count]] = await Promise.all([
      sql<CustomerRow[]>`
        select id, name, email, company, created_at
        from customers
        order by created_at desc, id desc
        limit ${query.limit} offset ${offsetFor(query)}
      `,
      sql<{ total: number }[]>`select count(*)::int as total from customers`,
    ]);
    return c.json(paginated(rows.map(toCustomerDto), query, count?.total ?? 0));
  })

  .get("/:id", zValidator("param", idParam), async (c) => {
    const { id } = c.req.valid("param");
    const [customer] = await sql<CustomerRow[]>`
      select id, name, email, company, created_at from customers where id = ${id}
    `;
    if (!customer) return c.json({ error: "customer not found" }, 404);

    const invoices = await sql<InvoiceRow[]>`
      select i.id, i.number, i.customer_id, ${customer.name} as customer_name, i.status, i.currency,
             i.amount, i.issued_at, i.due_date, i.paid_at
      from invoices i
      where i.customer_id = ${id}
      order by i.issued_at desc, i.id desc
    `;
    return c.json({ ...toCustomerDto(customer), invoices: invoices.map(toInvoiceDto) });
  })

  .post("/", zValidator("json", customerBody), async (c) => {
    const body = c.req.valid("json");
    try {
      const [customer] = await sql<CustomerRow[]>`
        insert into customers (name, email, company)
        values (${body.name}, ${body.email}, ${body.company ?? null})
        returning id, name, email, company, created_at
      `;
      return c.json(toCustomerDto(customer!), 201);
    } catch (err) {
      if (isUniqueViolation(err)) return c.json(emailTaken, 409);
      throw err;
    }
  })

  .patch("/:id", zValidator("param", idParam), zValidator("json", customerBody.partial()), async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    try {
      const [customer] = await sql<CustomerRow[]>`
        update customers set
          name = coalesce(${body.name ?? null}, name),
          email = coalesce(${body.email ?? null}, email),
          company = case when ${body.company !== undefined} then ${body.company ?? null} else company end
        where id = ${id}
        returning id, name, email, company, created_at
      `;
      if (!customer) return c.json({ error: "customer not found" }, 404);
      return c.json(toCustomerDto(customer));
    } catch (err) {
      if (isUniqueViolation(err)) return c.json(emailTaken, 409);
      throw err;
    }
  });
