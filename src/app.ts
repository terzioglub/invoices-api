import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { customers } from "./routes/customers.js";
import { invoices } from "./routes/invoices.js";

export const app = new Hono()
  .get("/health", (c) => c.json({ ok: true }))
  .route("/customers", customers)
  .route("/invoices", invoices)
  .notFound((c) => c.json({ error: "not found" }, 404))
  .onError((err, c) => {
    if (err instanceof HTTPException) return err.getResponse();
    console.error(err);
    return c.json({ error: "internal error" }, 500);
  });
