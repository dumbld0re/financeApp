import { useState } from 'react'
import { computeMonthSummary, computeMonthlyTrend, formatCurrency, roundToCents } from '../utils/calculations'
import Icon from './Icon'
import { Count } from './motion'

const SLICES = 8
const money = (to) => (v) => formatCurrency(roundToCents(Number.isInteger(roundToCents(to)) ? Math.round(v) : v))

function monthTitle(year, month) {
  const now = new Date()
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    ...(year !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

export default function MonthSection({ transactions, ready }) {
  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const earliest = transactions.reduce((m, t) => Math.min(m, t.date || Infinity), Infinity)
  const first = Number.isFinite(earliest) ? new Date(earliest) : now
  const hasPrev = view.year > first.getFullYear() || (view.year === first.getFullYear() && view.month > first.getMonth())
  const isCurrent = view.year === now.getFullYear() && view.month === now.getMonth()

  function shift(delta) {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  const s = computeMonthSummary(transactions, view.year, view.month)
  const trend = computeMonthlyTrend(transactions, 6, now)
  const max = Math.max(1, ...trend.map((m) => Math.abs(m.net)))

  const cats = s.categories.slice(0, SLICES)
  if (s.categories.length > SLICES) {
    const rest = s.categories.slice(SLICES - 1)
    cats.splice(SLICES - 1, 1, { name: 'Other', amount: roundToCents(rest.reduce((a, c) => a + c.amount, 0)) })
  }
  const spent = cats.reduce((a, c) => a + c.amount, 0)

  return (
    <section className="block" id="month" aria-labelledby="month-title">
      <div className="sec-head">
        <h2 className="sec-title" id="month-title">{monthTitle(view.year, view.month)}</h2>
        <div className="month-nav">
          <span className="label">
            {s.net >= 0 ? '+' : '−'}
            <Count value={Math.abs(s.net)} start={ready} format={money(s.net)} /> net
          </span>
          <button type="button" className="icon-btn press" onClick={() => shift(-1)} disabled={!hasPrev} aria-label="Previous month">
            <Icon name="left" size={16} />
          </button>
          <button type="button" className="icon-btn press" onClick={() => shift(1)} disabled={isCurrent} aria-label="Next month">
            <Icon name="right" size={16} />
          </button>
        </div>
      </div>

      <div className="mstats">
        <div className="mstat"><span className="label">In</span><b className="pos">{s.income > 0 && '+'}<Count value={s.income} start={ready} format={money(s.income)} /></b></div>
        <div className="mstat"><span className="label">Out</span><b>{s.spent > 0 && '−'}<Count value={s.spent} start={ready} format={money(s.spent)} /></b></div>
        <div className="mstat"><span className="label">Saved</span><b><Count value={s.saved} start={ready} format={money(s.saved)} /></b></div>
      </div>

      <div className="trend" aria-label="Net by month, last six months">
        {trend.map((m, i) => {
          const selected = m.year === view.year && m.month === view.month
          const tip = `${m.label} ${m.net >= 0 ? '+' : '−'}${formatCurrency(Math.abs(m.net))}`
          return (
            <button
              key={`${m.year}-${m.month}`}
              type="button"
              className={['bar-b', selected ? 'now' : m.net < 0 ? 'neg' : ''].join(' ')}
              style={{ '--d': i, height: `${Math.max(3, (Math.abs(m.net) / max) * 100)}%` }}
              data-tip={tip}
              aria-label={`${tip}. Show ${m.label}`}
              aria-pressed={selected}
              onClick={() => setView({ year: m.year, month: m.month })}
            />
          )
        })}
      </div>
      <div className="trend-l">
        {trend.map((m) => (
          <span key={`${m.year}-${m.month}`} className={m.year === view.year && m.month === view.month ? 'label sel' : 'label'}>
            {m.label}
          </span>
        ))}
      </div>

      {spent > 0 && (
        <>
          <div className="split-bar" role="img" aria-label="Spending by category">
            {cats.map((c, i) => (
              <span key={c.name} style={{ flexGrow: ready ? c.amount : 0, background: `var(--slice-${i + 1})` }} />
            ))}
          </div>
          {cats.map((c, i) => (
            <div key={c.name} className="kv">
              <span className="kv-k">
                <span className="cat-dot" style={{ background: `var(--slice-${i + 1})` }} />
                {c.name}
              </span>
              <span className="kv-v">
                {formatCurrency(c.amount)}
                <span className="label"> · {Math.round((c.amount / spent) * 100)}%</span>
              </span>
            </div>
          ))}
        </>
      )}
      {s.income === 0 && s.spent === 0 && s.saved === 0 && (
        <p className="empty" style={{ paddingTop: 16 }}>No activity in {monthTitle(view.year, view.month)}.</p>
      )}
    </section>
  )
}
