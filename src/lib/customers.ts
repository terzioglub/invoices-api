import { toTimestamp } from "./dates.js";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  created_at: Date;
}

export function toCustomerDto(row: CustomerRow) {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    company: row.company,
    created_at: toTimestamp(row.created_at),
  };
}
