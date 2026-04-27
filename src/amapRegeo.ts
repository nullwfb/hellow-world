/** 高德逆地理，JSONP。需 VITE_AMAP_KEY。展示为「市-区」如 北京-朝阳区 */

const TIMEOUT_MS = 12_000

type AmapRegeoPayload = {
  status: string
  regeocode?: {
    addressComponent: {
      province: string
      city: string | string[]
      district: string
    }
  }
}

function stripAdmin(s: string) {
  return s
    .replace(/(维吾尔自治区|壮族自治区|回族自治区|自治区|特别行政区|省|市)$/, '')
    .trim()
}

export function amapRegeoLine(
  key: string,
  lat: number,
  lon: number,
): Promise<string | null> {
  if (typeof document === 'undefined' || !key) return Promise.resolve(null)

  return new Promise((resolve) => {
    const cb = `amapRG_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`
    const timer = setTimeout(cleanup, TIMEOUT_MS)

    function cleanup() {
      clearTimeout(timer)
      delete (window as unknown as Record<string, unknown>)[cb]
    }

    ;(window as unknown as Record<string, (p: AmapRegeoPayload) => void>)[cb] = (
      data: AmapRegeoPayload,
    ) => {
      try {
        script.remove()
        cleanup()
        if (data.status !== '1' || !data.regeocode?.addressComponent) {
          resolve(null)
          return
        }
        const ac = data.regeocode.addressComponent
        const prov = (ac.province || '').trim()
        const dist = (ac.district || '').trim()
        let cityName: string
        if (Array.isArray(ac.city)) {
          if (ac.city.length === 0) {
            cityName = stripAdmin(prov) || prov
          } else {
            cityName = stripAdmin(String(ac.city[0])) || String(ac.city[0])
          }
        } else {
          const c = (ac.city || '').trim()
          cityName = c ? stripAdmin(c) : stripAdmin(prov) || prov
        }
        if (cityName && dist) {
          resolve(`${cityName}-${dist}`)
        } else {
          resolve(cityName || dist || null)
        }
      } catch {
        script.remove()
        cleanup()
        resolve(null)
      }
    }

    const script = document.createElement('script')
    const u = new URL('https://restapi.amap.com/v3/geocode/regeo')
    u.searchParams.set('key', key)
    u.searchParams.set('location', `${lon},${lat}`)
    u.searchParams.set('output', 'json')
    u.searchParams.set('callback', cb)
    u.searchParams.set('extensions', 'base')
    script.src = u.toString()
    script.onerror = () => {
      script.remove()
      cleanup()
      resolve(null)
    }
    document.head.appendChild(script)
  })
}
