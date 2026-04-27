import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { useMemo } from 'react'
import type { ChartPoint } from './weatherApi'

const stroke = 'var(--chart-stroke)'

type Props = {
  points: ChartPoint[]
  unitF: boolean
}

export function WeatherChart({ points, unitF }: Props) {
  const { data, tickIdx } = useMemo(() => {
    const data = points.map((p) => {
      const v = unitF ? p.tempC * (9 / 5) + 32 : p.tempC
      return {
        x: p.idx,
        t: p.tickLabel,
        temp: Math.round(v * 10) / 10,
      }
    })
    const tickIdx = points.filter((p) => p.tickLabel).map((p) => p.idx)
    return { data, tickIdx }
  }, [points, unitF])

  if (data.length === 0) return null
  const ticksX =
    tickIdx.length > 0
      ? tickIdx
      : (data[0] && data[data.length - 1] ? [data[0]!.x, data[data.length - 1]!.x] as number[] : [])

  return (
    <div className="chart-wrap" aria-label="近 48 小时气温">
      <ResponsiveContainer width="100%" height={210}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 6, left: -2, bottom: 4 }}
        >
          <defs>
            <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="x"
            type="number"
            scale="linear"
            domain={['dataMin', 'dataMax']}
            ticks={ticksX}
            tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-axis)' }}
            height={32}
            tickFormatter={(v) => {
              const d = data.find((row) => row.x === v)
              return d?.t || ''
            }}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
            width={40}
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-axis)' }}
            unit={unitF ? '°F' : '°C'}
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
          />
          <Area
            type="monotone"
            dataKey="temp"
            stroke={stroke}
            strokeWidth={2.5}
            fill="url(#tempFill)"
            isAnimationActive
            dot={false}
            activeDot={{ r: 4, fill: stroke }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
