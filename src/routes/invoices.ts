import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "../db.js";
import {
  canTransition,
  currencies,
  invoiceStatuses,
  invoiceTotal,
  toInvoiceDto,
  toLineItemDto,
  type InvoiceRow,
  type LineItemRow,
} from "../lib/invoices.js";
import { offsetFor, pageQuery, paginated } from "../lib/pagination.js";

const idParam = z.object({ id: z.coerce.number().int().positive() });

const listQuery = pageQuery.extend({
  status: z.enum(invoiceStatuses).optional(),
  customer_id: z.coerce.number().int().positive().optional(),
});

const createBody = z.object({
  customer_id: z.number().int().positive(),
  currency: z.enum(currencies),
  issued_at: z.iso.date().optional(),
  due_date: z.iso.date(),
  line_items: z
    .array(
      z.object({
        description: z.string().trim().min(1),
        quantity: z.number().int().positive(),
        unit_price: z.number().nonnegative(),
      }),
    )
    .min(1),
});

const statusBody = z.object({ status: z.enum(invoiceStatuses) });

async function findInvoice(id: number) {
  const [row] = await sql<InvoiceRow[]>`
    select i.id, i.number, i.customer_id, c.name as customer_name, i.status, i.currency,
           i.amount, i.issued_at, i.due_date, i.paid_at
    from invoices i
    join customers c on c.id = i.customer_id
    where i.id = ${id}
  `;
  return row;
}

export const invoices = new Hono()
  .get("/", zValidator("query", listQuery), async (c) => {
    const query = c.req.valid("query");
    const status = query.status ?? null;
    const customerId = query.customer_id ?? null;
    const where = sql`
      where (${status}::text is null or i.status = ${status})
        and (${customerId}::bigint is null or i.customer_id = ${customerId})
    `;
    const [rows, [count]] = await Promise.all([
      sql<InvoiceRow[]>`
        select i.id, i.number, i.customer_id, c.name as customer_name, i.status, i.currency,
               i.amount, i.issued_at, i.due_date, i.paid_at
        from invoices i
        join customers c on c.id = i.customer_id
        ${where}
        order by i.issued_at desc, i.id desc
        limit ${query.limit} offset ${offsetFor(query)}
      `,
      sql<{ total: number }[]>`select count(*)::int as total from invoices i ${where}`,
    ]);
    return c.json(paginated(rows.map(toInvoiceDto), query, count?.total ?? 0));
  })

  .get("/:id", zValidator("param", idParam), async (c) => {
    const { id } = c.req.valid("param");
    const invoice = await findInvoice(id);
    if (!invoice) return c.json({ error: "invoice not found" }, 404);

    const lineItems = await sql<LineItemRow[]>`
      select id, position, description, quantity, unit_price
      from line_items
      where invoice_id = ${id}
      order by position, id
    `;
    return c.json({ ...toInvoiceDto(invoice), line_items: lineItems.map(toLineItemDto) });
  })

  .post("/", zValidator("json", createBody), async (c) => {
    const body = c.req.valid("json");
    const [customer] = await sql`select id from customers where id = ${body.customer_id}`;
    if (!customer) return c.json({ error: "customer not found" }, 422);

    const id = await sql.begin(async (tx) => {
      const [invoice] = await tx<{ id: string }[]>`
        insert into invoices (customer_id, currency, amount, issued_at, due_date)
        values (${body.customer_id}, ${body.currency}, ${invoiceTotal(body.line_items)},
                coalesce(${body.issued_at ?? null}::date, current_date), ${body.due_date})
        returning id
      `;
      const items = body.line_items.map((item, position) => ({
        invoice_id: invoice!.id,
        position,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));
      await tx`insert into line_items ${tx(items)}`;
      return Number(invoice!.id);
    });

    return c.json(await findInvoice(id).then((row) => toInvoiceDto(row!)), 201);
  })

  .patch("/:id", zValidator("param", idParam), zValidator("json", statusBody), async (c) => {
    const { id } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const invoice = await findInvoice(id);
    if (!invoice) return c.json({ error: "invoice not found" }, 404);
    if (!canTransition(invoice.status, status)) {
      return c.json({ error: `cannot move an invoice from ${invoice.status} to ${status}` }, 409);
    }

    await sql`
      update invoices
      set status = ${status},
          paid_at = case when ${status} = 'paid' then now() else paid_at end
      where id = ${id}
    `;
    return c.json(toInvoiceDto((await findInvoice(id))!));
  });
