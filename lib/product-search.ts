/** Build versatile SQL LIKE patterns for product search. */

export function normalizeSearchQuery(query: string): string {
  return String(query || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Token patterns: each word must appear somewhere (order flexible).
 * Also a char-flex pattern so "gld" can match "gold".
 */
export function buildSearchPatterns(query: string): {
  tokens: string[];
  flexPattern: string | null;
} {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return { tokens: [], flexPattern: null };

  const tokens = normalized.split(' ').filter(Boolean);
  const compact = normalized.replace(/\s+/g, '');
  const flexPattern =
    compact.length >= 2
      ? `%${compact.split('').join('%')}%`
      : null;

  return { tokens, flexPattern };
}

export function scoreProductMatch(
  product: {
    name?: string;
    sku?: string;
    code?: string;
    category_name?: string | null;
    barcode_payload?: string | null;
  },
  query: string
): number {
  const q = normalizeSearchQuery(query);
  if (!q) return 0;
  const name = (product.name || '').toLowerCase();
  const sku = (product.sku || product.code || '').toLowerCase();
  const cat = (product.category_name || '').toLowerCase();
  const barcode = (product.barcode_payload || '').toLowerCase();
  const hay = `${name} ${sku} ${cat} ${barcode}`;

  let score = 0;
  if (name === q || sku === q) score += 100;
  if (name.startsWith(q) || sku.startsWith(q)) score += 50;
  if (name.includes(q) || sku.includes(q)) score += 30;

  for (const token of q.split(' ')) {
    if (!token) continue;
    if (hay.includes(token)) score += 10;
  }

  // loose letter-order match
  const compact = q.replace(/\s+/g, '');
  if (compact.length >= 2) {
    let idx = 0;
    let matched = 0;
    for (const ch of name.replace(/\s+/g, '')) {
      if (ch === compact[idx]) {
        matched += 1;
        idx += 1;
        if (idx >= compact.length) break;
      }
    }
    if (matched === compact.length) score += 15;
  }

  return score;
}
