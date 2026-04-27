import { useState, type ReactElement } from 'react'
import {
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartPoint } from './weatherApi'

const stroke = 'var(--chart-stroke)'

type Row = {
  idx: number
  displayTime: string
  fullTime: string
  wmo: string
  temp: number
  tick: string
  unit: string
}

type Props = {
  points: ChartPoint[]
  unitF: boolean
}

function toRows(points: ChartPoint[], unit: string, unitF: boolean): Row[] {
  return points.map((p) => {
    const v = unitF ? p.tempC * (9 / 5) + 32 : p.tempC
    return {
      idx: p.idx,
      displayTime: p.displayTime,
      fullTime: p.fullTime,
      wmo: p.label,
      temp: Math.round(v * 10) / 10,
      tick: p.tickLabel,
      unit,
    }
  })
}

type Tip = TooltipProps<number, string>
function TooltipContent(tip: Tip) {
  const p = (tip.payload?.[0] as { payload?: Row } | undefined)?.payload
  if (!tip.active || !p) return null
  return (
    <div className="recharts-tooltip-diy">
      <p className="recharts-tooltip-t">{p.displayTime}</p>
      <p className="recharts-tooltip-main">
        温度 {p.temp} {p.unit}
      </p>
      <p className="recharts-tooltip-w">{p.wmo}</p>
    </div>
  )
}

type DotP = { cx?: number; cy?: number; payload?: Row; index?: number }

function ClickableDots(
  p: DotP,
  onPick: (r: Row) => void,
): ReactElement<SVGElement> {
  if (p.cx == null || p.cy == null || p.payload == null) {
    return <g />
  }
  return (
    <circle
      cx={p.cx}
      cy={p.cy}
      r={3.5}
      fill="var(--chart-dot)"
      stroke={stroke}
      strokeWidth={1.2}
      className="chart-data-dot"
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation()
        onPick(p.payload!)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onPick(p.payload!)
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${p.payload.displayTime} ${p.payload.temp}${p.payload.unit} ${p.payload.wmo}`}
    />
  )
}

export function WeatherChart({ points, unitF }: Props) {
  const u = unitF ? '℉' : '℃'
  const [picked, setPicked] = useState<Row | null>(null)

  const data = toRows(points, u, unitF)
  if (data.length === 0) return null

  const tickValues = data.filter((r) => r.tick).map((r) => r.idx)
  const ticksX =
    tickValues.length > 0 ? tickValues : [data[0]!.idx, data[data.length - 1]!.idx]

  return (
    <div className="chart-outer" aria-label="近 48 小时气温，可拖选下方滑块平移或缩放时间范围，悬停或点圆点看详情">
      <div className="chart-main">
        <ResponsiveContainer width="100%" height={420}>
          <ComposedChart
            data={data}
            margin={{ top: 14, right: 6, left: 2, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--chart-grid)"
              strokeOpacity={0.45}
            />
            <XAxis
              dataKey="idx"
              type="number"
              domain={['dataMin', 'dataMax']}
              ticks={ticksX}
              tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-axis)' }}
              height={48}
              tickFormatter={(v) => {
                const r = data.find((d) => d.idx === v)
                return r?.tick || ''
              }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
              width={44}
              tickLine={false}
              domain={['dataMin - 1', 'dataMax + 1']}
              label={{
                value: `温度（${u}）`,
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'var(--chart-tick)', fontSize: 11 },
                offset: 2,
              }}
            />
            <Tooltip
              content={(tip) => <TooltipContent {...(tip as Tip)} />}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="temp"
              name="温度"
              stroke={stroke}
              strokeWidth={2.8}
              isAnimationActive
              dot={(dotProps) =>
                ClickableDots(dotProps as DotP, setPicked)
              }
              activeDot={{ r: 5, fill: stroke }}
            />
            <Brush
              dataKey="idx"
              height={48}
              stroke="var(--chart-brush-stroke)"
              fill="var(--chart-brush-bg)"
              travellerWidth={10}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {picked && (
        <p className="chart-picked" role="status" aria-live="polite">
          已选：<span className="chart-picked-time">{picked.displayTime}</span>
          温度 {picked.temp}
          {picked.unit} · {picked.wmo} · 接口时间 {picked.fullTime}
        </p>
      )}
    </div>
  )
}
