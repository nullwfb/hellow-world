import Chinese from 'chinese-s2t'
const t2s = (Chinese as { t2s: (s: string) => string }).t2s

export function toHans(s: string): string {
  if (!s) return s
  return t2s(s)
}
