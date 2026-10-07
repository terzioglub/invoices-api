import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "../src/db.js";

const dir = join(import.meta.dirname, "..", "supabase", "migrations");

await sql`create schema if not exists supabase_migrations`;
await sql`
  create table if not exists supabase_migrations.schema_migrations (
    version text primary key,
    statements text[],
    name text
  )
`;

const applied = new Set(
  (await sql<{ version: string }[]>`select version from supabase_migrations.schema_migrations`).map((r) => r.version),
);

for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
  const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
  if (!version || applied.has(version)) continue;

  const body = await readFile(join(dir, file), "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(body).simple();
    await tx`
      insert into supabase_migrations.schema_migrations (version, statements, name)
      values (${version}, ${[body]}, ${rest.join("_")})
    `;
  });
  console.log(`applied ${file}`);
}

await sql.end();
