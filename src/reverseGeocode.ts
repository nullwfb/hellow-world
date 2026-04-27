import { amapRegeoLine } from './amapRegeo'

type BdcClient = {
  principalSubdivision?: string
  city?: string
  locality?: string
  countryName?: string
}

function stripMuni(s: string) {
  return s.replace(
    /(市|省|自治区|维吾尔自治区|壮族自治区|回族自治区|特别行政区)$/, '')
}

/** 无高德 Key 时用；有 Key 时优先进高德，失败再回退 */
export async function placeLineForCoords(
  lat: number,
  lon: number,
  amapKey: string,
): Promise<string | null> {
  if (amapKey) {
    const t = await amapRegeoLine(amapKey, lat, lon)
    if (t) return t
  }
  try {
    const u = new URL(
      'https://api.bigdatacloud.net/data/reverse-geocode-client',
    )
    u.searchParams.set('latitude', String(lat))
    u.searchParams.set('longitude', String(lon))
    u.searchParams.set('localityLanguage', 'zh')
    const res = await fetch(u.toString(), { method: 'GET' })
    if (!res.ok) return null
    const data = (await res.json()) as BdcClient
    const city = stripMuni(
      (data.principalSubdivision || data.city || '').trim() || '本地',
    )
    const dist = (data.locality || '').trim()
    if (city && dist) return `${city}-${dist}`
    if (dist) return dist
    if (city) return city
    return null
  } catch {
    return null
  }
}
