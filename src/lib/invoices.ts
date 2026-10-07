import { toDateString, toTimestamp } from "./dates.js";

export const invoiceStatuses = ["draft", "sent", "paid", "void"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const currencies = ["USD", "EUR", "GBP"] as const;

const transitions: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent", "void"],
  sent: ["paid", "void"],
  paid: [],
  void: [],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return transitions[from].includes(to);
}

export interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export function invoiceTotal(items: LineItemInput[]): number {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  return Math.round(total * 100) / 100;
}

export interface InvoiceRow {
  id: string;
  number: string;
  customer_id: string;
  customer_name: string;
  status: InvoiceStatus;
  currency: string | null;
  amount: string;
  issued_at: Date | string;
  due_date: Date | string;
  paid_at: Date | null;
}

export function toInvoiceDto(row: InvoiceRow) {
  return {
    id: Number(row.id),
    number: row.number,
    customer_id: Number(row.customer_id),
    customer_name: row.customer_name,
    status: row.status,
    currency: row.currency,
    amount: Number(row.amount),
    issued_at: toDateString(row.issued_at),
    due_date: toDateString(row.due_date),
    paid_at: toTimestamp(row.paid_at),
  };
}

export interface LineItemRow {
  id: string;
  position: number;
  description: string;
  quantity: number;
  unit_price: string;
}

export function toLineItemDto(row: LineItemRow) {
  return {
    id: Number(row.id),
    position: row.position,
    description: row.description,
    quantity: row.quantity,
    unit_price: Number(row.unit_price),
  };
}
