import type { GeoItem } from './weatherApi'

const TIMEOUT_MS = 12_000

type AmapTipsPayload = {
  status: string
  info: string
  count?: string
  tips?: {
    name: string
    district: string
    adname: string
    address?: string
    location: string
  }[]
}

/** 高德「输入提示」v3，用 JSONP 免服务端代理。需在 .env 配置 VITE_AMAP_KEY。 */
export function amapInputTips(
  key: string,
  keywords: string,
): Promise<GeoItem[] | null> {
  if (typeof document === 'undefined' || !key) return Promise.resolve(null)

  const q = keywords.trim()
  if (!q) return Promise.resolve(null)

  return new Promise((resolve) => {
    const cb = `amapIT_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`
    const timer = setTimeout(cleanup, TIMEOUT_MS)

    function cleanup() {
      clearTimeout(timer)
      delete (window as unknown as Record<string, unknown>)[cb]
    }

    ;(window as unknown as Record<string, (p: AmapTipsPayload) => void>)[cb] = (
      data: AmapTipsPayload,
    ) => {
      try {
        script.remove()
        cleanup()
        if (data.status !== '1' || !data.tips?.length) {
          resolve(null)
          return
        }
        const out: GeoItem[] = []
        for (const t of data.tips) {
          const loc = t.location
          if (!loc) continue
          const [lonStr, latStr] = loc.split(',')
          const lon = Number(lonStr)
          const lat = Number(latStr)
          if (Number.isNaN(lat) || Number.isNaN(lon)) continue
          out.push({
            name: t.name,
            admin1: t.adname,
            country: '中国',
            district: t.district || t.address,
            population: 0,
            geoSource: 'amap' as const,
            latitude: lat,
            longitude: lon,
          })
        }
        resolve(out.length ? out : null)
      } catch {
        script.remove()
        cleanup()
        resolve(null)
      }
    }

    const script = document.createElement('script')
    const u = new URL('https://restapi.amap.com/v3/assistant/inputtips')
    u.searchParams.set('key', key)
    u.searchParams.set('keywords', q)
    u.searchParams.set('output', 'json')
    u.searchParams.set('callback', cb)
    u.searchParams.set('datatype', 'all')
    script.src = u.toString()
    script.onerror = () => {
      script.remove()
      cleanup()
      resolve(null)
    }
    document.head.appendChild(script)
  })
}
