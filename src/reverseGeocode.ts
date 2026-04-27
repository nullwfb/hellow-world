import { toHans } from './zhHans'

type BdcClient = {
  principalSubdivision?: string
  city?: string
  locality?: string
}

function stripMuni(s: string) {
  return s
    .replace(
      /(维吾尔自治区|壮族自治区|回族自治区|自治区|特别行政区|省|市)$/,
      '',
    )
    .trim()
}

/**
 * bigdatacloud 逆地理，结果转简体（繁体区名 t2s）。
 * 与 fetchWeather 并行调用可缩短总等待时间。
 */
export async function bdcPlaceLine(
  lat: number,
  lon: number,
): Promise<string | null> {
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
    if (city && dist) return toHans(`${city}-${dist}`)
    if (dist) return toHans(dist)
    if (city) return toHans(city)
    return null
  } catch {
    return null
  }
}
