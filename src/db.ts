import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const sql = postgres(url, {
  prepare: false,
  onnotice: (notice) => {
    if (notice.code === "00000") console.log(notice.message);
  },
});
