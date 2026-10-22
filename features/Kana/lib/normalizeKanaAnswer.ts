/** Normalize keyboard width and combining marks without changing kana script. */
export const normalizeKanaAnswer = (value: string): string =>
  value.normalize('NFKC').replace(/\s+/g, '').toLowerCase();

/** Match alternatives without allocating their exponential Cartesian product. */
export function matchesKanaAnswerParts(
  input: string,
  options: string[][],
): boolean {
  let offsets = new Set([0]);
  for (const alternatives of options) {
    const next = new Set<number>();
    for (const offset of offsets) {
      for (const answer of alternatives) {
        const normalized = normalizeKanaAnswer(answer);
        if (normalized && input.startsWith(normalized, offset)) {
          next.add(offset + normalized.length);
        }
      }
    }
    if (next.size === 0) return false;
    offsets = next;
  }
  return offsets.has(input.length);
}
