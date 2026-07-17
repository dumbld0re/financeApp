import { useState } from 'react'
import { computeMonthSummary, formatCurrency } from '../utils/calculations'

function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export default function MonthlySummary({ transactions }) {
  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const earliest = transactions.reduce(
    (min, t) => Math.min(min, t.date || Infinity),
    Infinity
  )
  const earliestDate = Number.isFinite(earliest) ? new Date(earliest) : now
  const hasPrev =
    view.year > earliestDate.getFullYear() ||
    (view.year === earliestDate.getFullYear() && view.month > earliestDate.getMonth())
  const isCurrentMonth =
    view.year === now.getFullYear() && view.month === now.getMonth()

  function shiftMonth(delta) {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  const summary = computeMonthSummary(transactions, view.year, view.month)
  const isEmpty = summary.income === 0 && summary.spent === 0 && summary.saved === 0
  const maxCategory = summary.categories[0]?.amount || 0

  if (transactions.length === 0) return null

  return (
    <section className="summary-section">
      <div className="section-header">
        <h2 className="section-title">Monthly</h2>
        <div className="month-nav">
          <button
            type="button"
            className="month-nav-btn"
            onClick={() => shiftMonth(-1)}
            disabled={!hasPrev}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="month-nav-label">{monthLabel(view.year, view.month)}</span>
          <button
            type="button"
            className="month-nav-btn"
            onClick={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {isEmpty ? (
        <p className="empty-state">No activity in {monthLabel(view.year, view.month)}.</p>
      ) : (
        <>
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="summary-stat-label">Income</span>
              <span className="summary-stat-value summary-stat--income">
                +{formatCurrency(summary.income)}
              </span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Spent</span>
              <span className="summary-stat-value summary-stat--expense">
                −{formatCurrency(summary.spent)}
              </span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Saved</span>
              <span className="summary-stat-value summary-stat--saved">
                {formatCurrency(summary.saved)}
              </span>
            </div>
          </div>

          <p className="summary-net">
            Net:{' '}
            <strong className={summary.net < 0 ? 'summary-stat--expense' : 'summary-stat--income'}>
              {formatCurrency(summary.net)}
            </strong>
          </p>

          {summary.categories.length > 0 && (
            <ul className="summary-cats">
              {summary.categories.map((c) => (
                <li key={c.name} className="summary-cat">
                  <div className="summary-cat-row">
                    <span>{c.name}</span>
                    <span>{formatCurrency(c.amount)}</span>
                  </div>
                  <div className="summary-bar">
                    <div
                      className="summary-bar-fill"
                      style={{ width: `${(c.amount / maxCategory) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
