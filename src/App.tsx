import { useCallback, useState } from 'react'
import {
  type GeoItem,
  type WeatherBundle,
  WeatherApiError,
  fetchWeather,
  searchLocation,
} from './weatherApi'
import './App.css'

const LS_KEY = 'weather-last-city'

function placeLabel(p: GeoItem): string {
  return [p.name, p.admin1, p.country].filter(Boolean).join(' · ')
}

function App() {
  const [query, setQuery] = useState(() => {
    if (typeof localStorage === 'undefined') return ''
    return localStorage.getItem(LS_KEY) ?? ''
  })
  const [candidates, setCandidates] = useState<GeoItem[]>([])
  const [selected, setSelected] = useState<GeoItem | null>(null)
  const [weather, setWeather] = useState<WeatherBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<
    'idle' | 'searching' | 'picking' | 'loading' | 'geo'
  >('idle')
  const [geoNote, setGeoNote] = useState<string | null>(null)

  const onSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      setError('请输入城市名称。')
      return
    }
    setError(null)
    setWeather(null)
    setSelected(null)
    setCandidates([])
    setStage('searching')
    try {
      const list = await searchLocation(q, 8)
      setCandidates(list)
      if (list.length === 1) {
        setSelected(list[0]!)
        setStage('loading')
        const w = await fetchWeather(list[0]!.latitude, list[0]!.longitude)
        setWeather(w)
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
  }, [query])

  const pickAndLoad = useCallback(async (p: GeoItem) => {
    setError(null)
    setSelected(p)
    setStage('loading')
    setGeoNote(null)
    try {
      const w = await fetchWeather(p.latitude, p.longitude)
      setWeather(w)
      setCandidates([])
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

  const onUseGeo = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('当前浏览器不支持定位。')
      return
    }
    setError(null)
    setGeoNote(null)
    setStage('geo')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setSelected({ name: '当前位置', latitude: lat, longitude: lon })
        setCandidates([])
        try {
          const w = await fetchWeather(lat, lon)
          setWeather(w)
          setGeoNote(`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E · ${w.timezone}`)
        } catch (err) {
          if (err instanceof WeatherApiError) {
            setError(err.message)
          } else {
            setError('加载天气失败。')
          }
        } finally {
          setStage('idle')
        }
      },
      () => {
        setStage('idle')
        setError('无法获取位置权限或定位失败。')
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  }, [])

  const busy = stage === 'searching' || stage === 'loading' || stage === 'geo'

  return (
    <div className="app">
      <header className="app-header">
        <h1>城市天气</h1>
        <p className="lede">数据来自 Open-Meteo，无需申请 API Key。</p>
      </header>

      <form className="search-bar" onSubmit={onSearch}>
        <label htmlFor="q" className="visually-hidden">
          城市名称
        </label>
        <input
          id="q"
          className="search-input"
          type="search"
          name="q"
          placeholder="例如：北京、上海、Tokyo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          disabled={busy}
        />
        <button type="submit" className="btn primary" disabled={busy}>
          {stage === 'searching' ? '搜索中…' : '搜索'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={onUseGeo}
          disabled={busy}
        >
          {stage === 'geo' ? '定位中…' : '当前位置'}
        </button>
      </form>

      {error && <p className="message error" role="alert">{error}</p>}

      {candidates.length > 1 && (
        <div className="candidates">
          <p className="hint">请选择一个结果：</p>
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

      {weather && selected && (
        <section className="card main-weather" aria-live="polite">
          <h2>
            {selected.name === '当前位置' && geoNote
              ? '当前位置'
              : placeLabel(selected)}
          </h2>
          {geoNote && <p className="geo-note">{geoNote}</p>}
          <div className="temp-row">
            <span className="temp-now" aria-label="当前气温">
              {Math.round(weather.current.tempC)}°C
            </span>
            <div className="now-meta">
              <span className="condition">{weather.current.weatherLabel}</span>
              <span className="sub">
                今日 {Math.round(weather.highC)}° / {Math.round(weather.lowC)}°
              </span>
              <span className="sub">
                湿度 {weather.current.humidity}%
                {weather.current.windKmh != null && (
                  <> · 风 {Math.round(weather.current.windKmh)} km/h</>
                )}
              </span>
            </div>
          </div>
        </section>
      )}

      {weather && weather.nextHours.length > 0 && (
        <section className="card hourly" aria-label="逐小时">
          <h3>未来几小时</h3>
          <div className="hourly-strip">
            {weather.nextHours.map((h) => (
              <div
                className="hourly-cell"
                key={h.time}
                title={h.label}
              >
                <time>{h.time}</time>
                <span className="hourly-temp">{h.tempC}°</span>
                <span className="hourly-d">{h.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="foot">
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo
        </a>
      </footer>
    </div>
  )
}

export default App
