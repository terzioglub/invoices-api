import { z } from "zod";

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type PageQuery = z.infer<typeof pageQuery>;

export function offsetFor({ page, limit }: PageQuery): number {
  return (page - 1) * limit;
}

export function paginated<T>(data: T[], query: PageQuery, total: number) {
  return { data, page: query.page, limit: query.limit, total };
}
