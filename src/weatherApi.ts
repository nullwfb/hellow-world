/**
 * 地理：优先 ① 国内内置坐标 ② 可选高德输入提示 ③ Open-Meteo 兜底（不做逆地理，避免额外请求）
 * 预报：仍用 Open-Meteo。文档：open-meteo.com
 */

import { amapInputTips } from './amapInputTips'
import { lookupChinaBuiltin } from './chinaBuiltinCities'

const GEO =
  'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST = 'https://api.open-meteo.com/v1/forecast'

export class WeatherApiError extends Error {
  readonly causeType: 'network' | 'not_found' | 'invalid_response'

  constructor(
    message: string,
    causeType: 'network' | 'not_found' | 'invalid_response',
  ) {
    super(message)
    this.name = 'WeatherApiError'
    this.causeType = causeType
  }
}

export type GeoItem = {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
  /** 区县或更细，可选（高德等） */
  district?: string
  /** Open-Meteo 会返回；用于同名地排序/过滤 */
  population?: number
  /** 数据来自哪条链 */
  geoSource?: 'amap' | 'builtin' | 'open_meteo'
  id?: number
  featureCode?: string
}

type GeoOsmResult = {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
  admin2?: string
  population?: number
  feature_code?: string
}

type GeoResponse = { results?: GeoOsmResult[] }

export type CurrentWeather = {
  time: string
  tempC: number
  humidity: number
  weatherCode: number
  windKmh: number
  weatherLabel: string
}

type ForecastResponse = {
  current?: {
    time: string
    temperature_2m: number
    relative_humidity_2m: number
    weather_code: number
    wind_speed_10m: number
  }
  current_units?: {
    temperature_2m?: string
  }
  daily?: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
  hourly?: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
  }
}

const WMO_LABEL_ZH: Record<number, string> = {
  0: '晴朗',
  1: '大部晴朗',
  2: '间晴',
  3: '阴天',
  45: '有雾',
  48: '有雾/沉积霜雾',
  51: '小毛毛雨',
  53: '中毛毛雨',
  55: '大毛毛雨',
  56: '冻毛毛雨',
  57: '大冻毛毛雨',
  61: '小阵雨',
  63: '中雨',
  65: '大雨',
  66: '冻雨',
  67: '大冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '小阵雨',
  81: '阵雨',
  82: '强阵雨',
  85: '小阵雪',
  86: '大阵雪',
  95: '雷暴',
  96: '雷暴伴小冰雹',
  99: '雷暴伴大冰雹',
}

function labelForCode(code: number): string {
  return WMO_LABEL_ZH[code] ?? `天气代码 ${code}`
}

const MUNI_短: Record<string, string> = {
  北: '北京市',
  北京: '北京市',
  京: '北京市',
  上: '上海市',
  上海: '上海市',
  天: '天津市',
  天津: '天津市',
  重: '重庆市',
  重庆: '重庆市',
  渝: '重庆市',
}
const 直辖市_单名: Record<string, string> = {
  北京: '北京',
  上海: '上海',
  天津: '天津',
  重庆: '重庆',
}
function filterMunicipalityHomonyms(
  r: GeoOsmResult,
): boolean {
  const n = (r.name || '').trim()
  if (!(n in 直辖市_单名)) return true
  const want = 直辖市_单名[n]!
  const a1 = (r.admin1 || '').replace(/省|市$/, '') // 简化为可比对
  if (a1 === want) return true
  if (r.admin1 === `${want}市` || r.admin1 === want) return true
  if (a1 === want) return true
  return false
}

function expandChinaQueryForOM(q: string): string[] {
  const t = q.trim()
  if (!t) return []
  const s = new Set<string>([t])
  if (MUNI_短[t]) s.add(MUNI_短[t]!)
  if (!t.includes('市') && t.length <= 3) s.add(t + '市')
  return Array.from(s)
}

function safeJson(res: Response): Promise<unknown> {
  if (!res.ok) {
    throw new WeatherApiError(
      `服务返回 ${res.status}，请稍后重试。`,
      'invalid_response',
    )
  }
  return res.json()
}

async function openMeteoSearch(
  name: string,
  perQuery: number,
): Promise<GeoItem[]> {
  const queries = expandChinaQueryForOM(name)
  const fetches = queries.map(async (qu) => {
    const u = new URL(GEO)
    u.searchParams.set('name', qu)
    u.searchParams.set('count', String(Math.max(10, perQuery * 2)))
    u.searchParams.set('language', 'zh')
    u.searchParams.set('format', 'json')
    let res: Response
    try {
      res = await fetch(u.toString(), { method: 'GET' })
    } catch {
      return [] as GeoOsmResult[]
    }
    if (!res.ok) return []
    const data = (await res.json()) as GeoResponse
    return data.results ?? []
  })
  const batches = await Promise.all(fetches)
  const byId = new Map<number, GeoOsmResult>()
  for (const arr of batches) {
    for (const r of arr) {
      if (!byId.has(r.id)) {
        byId.set(r.id, r)
      }
    }
  }
  const list = Array.from(byId.values()).filter(filterMunicipalityHomonyms)
  list.sort((a, b) => {
    const p = (b.population || 0) - (a.population || 0)
    if (p !== 0) return p
    const fc = a.feature_code === 'PPLC' || a.feature_code === 'PPLA' ? 1 : 0
    const fd = b.feature_code === 'PPLC' || b.feature_code === 'PPLA' ? 1 : 0
    if (fd !== fc) return fd - fc
    return (a.name || '').length - (b.name || '').length
  })
  return list.map((r) => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
    district: r.admin2,
    population: r.population,
    geoSource: 'open_meteo' as const,
    id: r.id,
    featureCode: r.feature_code,
  }))
}

export async function searchLocation(
  name: string,
  count = 8,
): Promise<GeoItem[]> {
  const q = name.trim()
  if (!q) {
    return []
  }

  const b = lookupChinaBuiltin(q)
  if (b) {
    b.geoSource = 'builtin'
    return [b]
  }

  const amapKey = import.meta.env.VITE_AMAP_KEY || ''
  if (amapKey) {
    const fromAmap = await amapInputTips(amapKey, q)
    if (fromAmap && fromAmap.length > 0) {
      return fromAmap.slice(0, count)
    }
  }

  const om = await openMeteoSearch(q, count)
  if (!om.length) {
    throw new WeatherApiError('未找到该城市，请换个关键词试试。', 'not_found')
  }
  return om.slice(0, count)
}

export type ChartPoint = {
  /** 6 小时间隔显示在 X 轴，否则只参与曲线与点选 */
  tickLabel: string
  /** 本地化的「4/28 16:00」等，给 Tooltip/详情 */
  displayTime: string
  fullTime: string
  tempC: number
  code: number
  label: string
  idx: number
}

export type WeatherBundle = {
  current: CurrentWeather
  highC: number
  lowC: number
  nextHours: { time: string; tempC: number; code: number; label: string }[]
  /** 约 48h 整点，用于折线图 */
  chartPoints: ChartPoint[]
  timezone: string
  currentLocalTimeLabel: string
}

export async function fetchWeather(
  lat: number,
  lon: number,
): Promise<WeatherBundle> {
  const u = new URL(FORECAST)
  u.searchParams.set('latitude', String(lat))
  u.searchParams.set('longitude', String(lon))
  u.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
  )
  u.searchParams.set('hourly', 'temperature_2m,weather_code')
  u.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,weather_code',
  )
  u.searchParams.set('timezone', 'auto')
  u.searchParams.set('forecast_days', '2')

  let res: Response
  try {
    res = await fetch(u.toString(), { method: 'GET' })
  } catch {
    throw new WeatherApiError('网络错误，请检查网络后重试。', 'network')
  }
  const raw = (await safeJson(res)) as ForecastResponse & { timezone: string }
  const cur = raw.current
  if (!cur) {
    throw new WeatherApiError('未能解析天气数据。', 'invalid_response')
  }

  const high = raw.daily?.temperature_2m_max?.[0] ?? cur.temperature_2m
  const low = raw.daily?.temperature_2m_min?.[0] ?? cur.temperature_2m
  const hourlyT = raw.hourly?.temperature_2m
  const hourlyC = raw.hourly?.weather_code
  const hourlyTime = raw.hourly?.time
  const nextHours: WeatherBundle['nextHours'] = []
  const chartPoints: ChartPoint[] = []
  if (hourlyTime && hourlyT && hourlyC) {
    const now = new Date()
    for (let i = 0; i < hourlyTime.length; i++) {
      const t = new Date(hourlyTime[i]!)
      const code = hourlyC[i] ?? 0
      const te = Math.round((hourlyT[i] as number) * 10) / 10
      if (t < now) continue
      if (nextHours.length < 8) {
        nextHours.push({
          time: hourlyTime[i]!.slice(11, 16),
          tempC: te,
          code,
          label: labelForCode(code),
        })
      }
      if (chartPoints.length < 48) {
        const m = t.getMonth() + 1
        const d = t.getDate()
        const h = t.getHours()
        const showTick = h % 6 === 0
        chartPoints.push({
          displayTime: `${m}/${d} ${String(h).padStart(2, '0')}:00`,
          tickLabel: showTick
            ? `${m}/${d} ${String(h).padStart(2, '0')}:00`
            : '',
          fullTime: hourlyTime[i]!,
          tempC: te,
          code,
          label: labelForCode(code),
          idx: chartPoints.length,
        })
      }
    }
  }

  const cdt = new Date()
  const currentLocalTimeLabel = `${String(cdt.getMonth() + 1).toString()}/${String(cdt.getDate()).padStart(2, '0')} ${String(cdt.getHours()).padStart(2, '0')}:${String(cdt.getMinutes()).padStart(2, '0')}`

  return {
    current: {
      time: cur.time,
      tempC: cur.temperature_2m,
      humidity: cur.relative_humidity_2m,
      weatherCode: cur.weather_code,
      windKmh: cur.wind_speed_10m,
      weatherLabel: labelForCode(cur.weather_code),
    },
    highC: high,
    lowC: low,
    nextHours,
    chartPoints,
    timezone: raw.timezone ?? 'local',
    currentLocalTimeLabel,
  }
}
