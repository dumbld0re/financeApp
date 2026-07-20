import { useState } from 'react'
import {
  computeMonthSummary,
  computeMonthlyTrend,
  formatCurrency,
} from '../utils/calculations'

// Categorical palette (validated colorblind-safe, fixed order — never cycled).
// A 9th+ category folds into "Other" rather than reusing a hue.
// Values live in index.css so they can lift for the dark theme; the order and
// the colours themselves are unchanged.
const SLICE_COLORS = [
  'var(--slice-1)', // blue
  'var(--slice-2)', // green
  'var(--slice-3)', // magenta
  'var(--slice-4)', // yellow
  'var(--slice-5)', // aqua
  'var(--slice-6)', // orange
  'var(--slice-7)', // violet
  'var(--slice-8)', // red
]
const OTHER_COLOR = 'var(--slice-other)'
const MAX_SLICES = 8

function buildSlices(categories) {
  const total = categories.reduce((sum, c) => sum + c.amount, 0)
  if (total <= 0) return { slices: [], total: 0 }

  let head = categories
  let tail = []
  if (categories.length > MAX_SLICES) {
    head = categories.slice(0, MAX_SLICES - 1)
    tail = categories.slice(MAX_SLICES - 1)
  }

  const slices = head.map((c, i) => ({
    name: c.name,
    amount: c.amount,
    pct: (c.amount / total) * 100,
    color: SLICE_COLORS[i],
  }))

  if (tail.length) {
    const amount = tail.reduce((sum, c) => sum + c.amount, 0)
    slices.push({ name: 'Other', amount, pct: (amount / total) * 100, color: OTHER_COLOR })
  }

  return { slices, total }
}

function Donut({ slices }) {
  const size = 168
  const stroke = 26
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <svg
      className="donut"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Spending by category"
    >
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {slices.map((s) => {
          // 2px surface gap between fills so adjacent slices read as separate
          const gap = slices.length > 1 ? 2 : 0
          const len = Math.max(0, (s.pct / 100) * c - gap)
          const circle = (
            <circle
              key={s.name}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              style={{ stroke: s.color }}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            >
              <title>{`${s.name}: ${formatCurrency(s.amount)} (${s.pct.toFixed(0)}%)`}</title>
            </circle>
          )
          offset += (s.pct / 100) * c
          return circle
        })}
      </g>
    </svg>
  )
}

function Trend({ months }) {
  const max = Math.max(1, ...months.map((m) => Math.abs(m.net)))
  const height = 64

  return (
    <div className="trend">
      <div className="trend-bars">
        {months.map((m) => {
          const h = (Math.abs(m.net) / max) * height
          const positive = m.net >= 0
          return (
            <div key={`${m.year}-${m.month}`} className="trend-col">
              <div className="trend-bar-track" style={{ height }}>
                <div
                  className={positive ? 'trend-bar trend-bar--pos' : 'trend-bar trend-bar--neg'}
                  style={{ height: Math.max(2, h) }}
                  title={`${m.label}: net ${formatCurrency(m.net)}`}
                />
              </div>
              <span className="trend-label">{m.label}</span>
            </div>
          )
        })}
      </div>
      <p className="trend-caption">Net by month (last 6)</p>
    </div>
  )
}

export default function InsightsSection({ transactions }) {
  const [tab, setTab] = useState('spending')
  const now = new Date()
  const summary = computeMonthSummary(transactions, now.getFullYear(), now.getMonth())
  const { slices, total } = buildSlices(summary.categories)
  const trend = computeMonthlyTrend(transactions, 6, now)
  const hasTrend = trend.some((m) => m.income !== 0 || m.spent !== 0)

  if (transactions.length === 0) return null

  return (
    <section className="insights-section">
      <div className="section-header">
        <h2 className="section-title">Insights</h2>
        <div className="insights-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'spending'}
            className={tab === 'spending' ? 'insights-tab insights-tab--active' : 'insights-tab'}
            onClick={() => setTab('spending')}
          >
            Spending
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'trend'}
            className={tab === 'trend' ? 'insights-tab insights-tab--active' : 'insights-tab'}
            onClick={() => setTab('trend')}
          >
            Trend
          </button>
        </div>
      </div>

      {tab === 'spending' ? (
        total <= 0 ? (
          <p className="empty-state">No spending this month yet.</p>
        ) : (
          <div className="donut-wrap">
            <div className="donut-figure">
              <Donut slices={slices} />
              <div className="donut-center">
                <span className="donut-center-label">Spent</span>
                <span className="donut-center-value">{formatCurrency(total)}</span>
              </div>
            </div>
            <ul className="donut-legend">
              {slices.map((s) => (
                <li key={s.name} className="donut-legend-item">
                  <span className="donut-swatch" style={{ background: s.color }} aria-hidden="true" />
                  <span className="donut-legend-name">{s.name}</span>
                  <span className="donut-legend-amt">
                    {formatCurrency(s.amount)} · {s.pct.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : hasTrend ? (
        <Trend months={trend} />
      ) : (
        <p className="empty-state">Not enough history yet for a trend.</p>
      )}
    </section>
  )
}
