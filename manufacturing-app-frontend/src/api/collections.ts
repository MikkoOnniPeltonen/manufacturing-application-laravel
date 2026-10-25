export interface Page<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export function collectionItems<T>(payload: T[] | Page<T> | null | undefined): T[] {
  if (Array.isArray(payload)) return payload;
  return payload?.data ?? [];
}

// Option lists use bounded requests; transactional lists use server pagination.
export async function fetchCollection<T>(
  loadPage: (page: number) => Promise<{ data?: Page<T>; error?: unknown }>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await loadPage(page);
    if (error || !data) throw error ?? new Error('Unable to load collection.');
    if (!Number.isInteger(data.last_page) || data.last_page < 1 || !Array.isArray(data.data)) {
      throw new Error('Invalid collection pagination.');
    }
    items.push(...data.data);
    if (page >= data.last_page) return items;
    if (page >= 1000) throw new Error('Too many options. Narrow your selection.');
  }
}
