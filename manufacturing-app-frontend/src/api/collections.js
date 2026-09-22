export function collectionItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}
