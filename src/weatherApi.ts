/** Open-Meteo 地理编码与预报，无需 API Key。文档：https://open-meteo.com/ */

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
}

type GeoResponse = { results?: GeoItem[] }

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

function safeJson(res: Response): Promise<unknown> {
  if (!res.ok) {
    throw new WeatherApiError(
      `服务返回 ${res.status}，请稍后重试。`,
      'invalid_response',
    )
  }
  return res.json()
}

export async function searchLocation(
  name: string,
  count = 8,
): Promise<GeoItem[]> {
  const q = name.trim()
  if (!q) {
    return []
  }
  const u = new URL(GEO)
  u.searchParams.set('name', q)
  u.searchParams.set('count', String(count))
  u.searchParams.set('language', 'zh')

  let res: Response
  try {
    res = await fetch(u.toString(), { method: 'GET' })
  } catch {
    throw new WeatherApiError('网络错误，请检查网络后重试。', 'network')
  }
  const data = (await safeJson(res)) as GeoResponse
  if (!data.results?.length) {
    throw new WeatherApiError('未找到该城市，请换个关键词试试。', 'not_found')
  }
  return data.results
}

export type WeatherBundle = {
  current: CurrentWeather
  highC: number
  lowC: number
  nextHours: { time: string; tempC: number; code: number; label: string }[]
  timezone: string
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
  u.searchParams.set('forecast_days', '1')

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
  if (hourlyTime && hourlyT && hourlyC) {
    const now = new Date()
    for (let i = 0; i < Math.min(24, hourlyTime.length); i++) {
      const t = new Date(hourlyTime[i])
      if (t < now) continue
      if (nextHours.length >= 8) break
      const code = hourlyC[i] ?? 0
      nextHours.push({
        time: hourlyTime[i]!.slice(11, 16),
        tempC: Math.round((hourlyT[i] as number) * 10) / 10,
        code,
        label: labelForCode(code),
      })
    }
  }

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
    timezone: raw.timezone ?? 'local',
  }
}
