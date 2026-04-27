import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { placeLineForCoords } from './reverseGeocode'
import {
  type GeoItem,
  type WeatherBundle,
  WeatherApiError,
  fetchWeather,
  searchLocation,
} from './weatherApi'
import './App.css'

const WeatherChart = lazy(() =>
  import('./WeatherChart').then((m) => ({ default: m.WeatherChart })),
)

const LS_KEY = 'weather-last-query'

const amapKey = import.meta.env.VITE_AMAP_KEY || ''

function placeLabel(p: GeoItem): string {
  return [p.name, p.district, p.admin1, p.country].filter(Boolean).join(' · ')
}

function App() {
  const [query, setQuery] = useState(() => {
    if (typeof localStorage === 'undefined') return ''
    return localStorage.getItem(LS_KEY) ?? ''
  })
  const [candidates, setCandidates] = useState<GeoItem[]>([])
  const [placeLine, setPlaceLine] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<
    'init' | 'idle' | 'searching' | 'picking' | 'loading' | 'geo'
  >('init')
  const [useF, setUseF] = useState(false)

  const runGeo = useCallback(async (lat: number, lon: number) => {
    setCandidates([])
    setPlaceLine(null)
    setStage('loading')
    try {
      const [line, w] = await Promise.all([
        placeLineForCoords(lat, lon, amapKey),
        fetchWeather(lat, lon),
      ])
      setWeather(w)
      setPlaceLine(line || '当前位置')
    } catch (err) {
      if (err instanceof WeatherApiError) {
        setError(err.message)
      } else {
        setError('加载天气失败。')
      }
    } finally {
      setStage('idle')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      queueMicrotask(() => {
        setStage('idle')
        if (!('geolocation' in navigator)) {
          setError('环境不支持自动定位，请用下方城市搜索。')
        }
      })
      return
    }
    queueMicrotask(() => {
      setError(null)
      setStage('geo')
    })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void runGeo(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setStage('idle')
        setError('无法使用当前位置。可在下方搜索城市。')
      },
      { enableHighAccuracy: true, timeout: 18_000, maximumAge: 120_000 },
    )
  }, [runGeo])

  const onSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const q = query.trim()
      if (!q) {
        setError('请输入城市名称。')
        return
      }
      setError(null)
      setWeather(null)
      setPlaceLine(null)
      setCandidates([])
      setStage('searching')
      try {
        const list = await searchLocation(q, 8)
        setCandidates(list)
        if (list.length === 1) {
          const p0 = list[0]!
          setStage('loading')
          const w = await fetchWeather(p0.latitude, p0.longitude)
          setWeather(w)
          const line = await placeLineForCoords(
            p0.latitude,
            p0.longitude,
            amapKey,
          )
          setPlaceLine(line || placeLabel(p0))
          setStage('idle')
        } else {
          setStage('picking')
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LS_KEY, q)
        }
      } catch (err) {
        setStage('idle')
        if (err instanceof WeatherApiError) {
          setError(err.message)
        } else {
          setError('查询失败，请重试。')
        }
      }
    },
    [query],
  )

  const pickAndLoad = useCallback(async (p: GeoItem) => {
    setError(null)
    setStage('loading')
    setCandidates([])
    try {
      const w = await fetchWeather(p.latitude, p.longitude)
      setWeather(w)
      const line = await placeLineForCoords(p.latitude, p.longitude, amapKey)
      setPlaceLine(line || placeLabel(p))
    } catch (err) {
      if (err instanceof WeatherApiError) {
        setError(err.message)
      } else {
        setError('加载天气失败。')
      }
    } finally {
      setStage('idle')
    }
  }, [])

  const refreshPosition = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('当前浏览器不支持定位。')
      return
    }
    setError(null)
    setStage('geo')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void runGeo(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setStage('idle')
        setError('无法获取位置，请重试或改用下方搜索。')
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  }, [runGeo])

  const busy =
    stage === 'searching' ||
    stage === 'loading' ||
    stage === 'geo' ||
    stage === 'init'

  const tNow = weather
    ? useF
      ? Math.round(weather.current.tempC * (9 / 5) + 32)
      : Math.round(weather.current.tempC)
    : null
  const tHigh = weather
    ? useF
      ? Math.round(weather.highC * (9 / 5) + 32)
      : Math.round(weather.highC)
    : null
  const tLow = weather
    ? useF
      ? Math.round(weather.lowC * (9 / 5) + 32)
      : Math.round(weather.lowC)
    : null

  return (
    <div className="app page-gradient">
      <div className="app-inner">
        <header className="app-header">
          <p className="kicker">实时天气</p>
          {weather && (
            <h1 className="hero-temp" aria-label="当前气温">
              {tNow}
              <span className="unit">{useF ? '℉' : '℃'}</span>
            </h1>
          )}
          {stage === 'init' && !weather && (
            <h1 className="hero-temp dim">…</h1>
          )}

          {placeLine && <p className="place-line">{placeLine}</p>}

          <p className="time-line" aria-label="时间">
            {weather?.currentLocalTimeLabel
              ? weather.currentLocalTimeLabel
              : stage === 'init' || stage === 'geo'
                ? '定位与同步时间…'
                : '—'}
          </p>

          {weather && (
            <p className="line-highlow">
              {useF ? 'High' : '高'}/{tHigh} {useF ? 'Low' : '低'}/{tLow}
            </p>
          )}

          {weather && (
            <p className="line-cond">
              湿度 <strong>{weather.current.humidity}</strong> · 风{' '}
              {weather.current.windKmh != null
                ? (
                  <strong>
                    {useF
                      ? Math.round(weather.current.windKmh * 0.621371)
                      : Math.round(weather.current.windKmh)}
                  </strong>
                )
                : '—'}
              {weather.current.windKmh != null
                ? useF
                  ? ' mph'
                  : ' km/h'
                : ''}
            </p>
          )}

          <div className="row-unit">
            <span className="u-label">单位</span>
            <div className="u-toggle" role="group" aria-label="温度单位">
              <button
                type="button"
                className={!useF ? 'on' : ''}
                onClick={() => setUseF(false)}
                disabled={!weather}
              >
                摄氏度
              </button>
              <button
                type="button"
                className={useF ? 'on' : ''}
                onClick={() => setUseF(true)}
                disabled={!weather}
              >
                华氏度
              </button>
            </div>
          </div>
        </header>

        {error && (
          <p className="message error" role="alert">
            {error}
          </p>
        )}

        {weather && weather.chartPoints.length > 0 && (
          <section className="card chart-card">
            <div className="card-head">
              <h2>气温</h2>
            </div>
            <Suspense
              fallback={<div className="chart-skel">曲线加载中…</div>}
            >
              <WeatherChart points={weather.chartPoints} unitF={useF} />
            </Suspense>
          </section>
        )}

        {stage === 'loading' && !weather && (
          <p className="skeleton">加载天气中…</p>
        )}

        <section className="bottom-tool">
          <h3 className="bottom-title">查其他城市</h3>
          <p className="bottom-hint">不常用，默认使用上方当前位置与预报。</p>
          <form className="search-bar" onSubmit={onSearch}>
            <label htmlFor="q" className="visually-hidden">
              城市名称
            </label>
            <input
              id="q"
              className="search-input"
              type="search"
              name="q"
              placeholder="如：北京、上海"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
            <button type="submit" className="btn primary" disabled={busy}>
              {stage === 'searching' ? '搜索中' : '搜索'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={refreshPosition}
              disabled={stage === 'geo' || stage === 'loading'}
            >
              刷新位置
            </button>
          </form>

          {candidates.length > 1 && (
            <div className="candidates">
              <p className="hint">请选一项：</p>
              <ul>
                {candidates.map((p) => (
                  <li key={`${p.latitude},${p.longitude},${p.name}`}>
                    <button
                      type="button"
                      className="link"
                      onClick={() => void pickAndLoad(p)}
                    >
                      {placeLabel(p)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default App
