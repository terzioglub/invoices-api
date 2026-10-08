import { describe, expect, it } from "vitest";
import { canTransition, invoiceTotal, toCents, toInvoiceDto, toLineItemDto } from "../src/lib/invoices.js";

describe("invoiceTotal", () => {
  it("sums quantity times unit price", () => {
    expect(
      invoiceTotal([
        { description: "Consulting (hours)", quantity: 12, unit_price: 150 },
        { description: "Hosting (monthly)", quantity: 1, unit_price: 49.99 },
      ]),
    ).toBe(1849.99);
  });

  it("rounds to cents", () => {
    expect(invoiceTotal([{ description: "API requests (per 1k)", quantity: 3, unit_price: 0.1 }])).toBe(0.3);
  });
});

describe("toCents", () => {
  it("converts an amount to whole cents", () => {
    expect(toCents(1849.99)).toBe(184999);
    expect(toCents(0.3)).toBe(30);
  });
});

describe("canTransition", () => {
  it("allows the normal lifecycle", () => {
    expect(canTransition("draft", "sent")).toBe(true);
    expect(canTransition("sent", "paid")).toBe(true);
    expect(canTransition("sent", "void")).toBe(true);
  });

  it("keeps paid and void invoices final", () => {
    expect(canTransition("paid", "void")).toBe(false);
    expect(canTransition("void", "sent")).toBe(false);
    expect(canTransition("draft", "paid")).toBe(false);
  });
});

describe("toInvoiceDto", () => {
  it("serializes ids, money and dates for the API", () => {
    expect(
      toInvoiceDto({
        id: "42",
        number: "INV-000042",
        customer_id: "7",
        customer_name: "Ana Silva",
        status: "paid",
        currency: null,
        amount_cents: "184999",
        issued_at: new Date("2026-09-01T00:00:00Z"),
        due_date: new Date("2026-10-01T00:00:00Z"),
        paid_at: new Date("2026-09-20T14:00:00Z"),
      }),
    ).toEqual({
      id: 42,
      number: "INV-000042",
      customer_id: 7,
      customer_name: "Ana Silva",
      status: "paid",
      currency: null,
      amount_cents: 184999,
      issued_at: "2026-09-01",
      due_date: "2026-10-01",
      paid_at: "2026-09-20T14:00:00.000Z",
    });
  });
});

describe("toLineItemDto", () => {
  it("returns unit price as a number", () => {
    expect(
      toLineItemDto({ id: "3", position: 0, description: "Team plan seat", quantity: 10, unit_price: "29.00" }),
    ).toEqual({ id: 3, position: 0, description: "Team plan seat", quantity: 10, unit_price: 29 });
  });
});
