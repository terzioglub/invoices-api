import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "../src/db.js";

const [row] = await sql<{ count: number }[]>`select count(*)::int as count from customers`;
const count = row?.count ?? 0;
if (count > 0) {
  console.error(`customers already has ${count} rows; seed only runs on an empty database`);
  process.exit(1);
}

const body = await readFile(join(import.meta.dirname, "..", "supabase", "seed.sql"), "utf8");
await sql.begin((tx) => tx.unsafe(body).simple());
console.log("seeded");

await sql.end();
