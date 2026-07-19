import { computeBudgetStatus, formatCurrency } from '../utils/calculations'

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long' })
}

export default function BudgetsSection({ transactions, budgets, onEdit }) {
  const now = new Date()
  const status = computeBudgetStatus(transactions, budgets, now.getFullYear(), now.getMonth())
  const hasBudgets = status.rows.length > 0

  return (
    <section className="budgets-section">
      <div className="section-header">
        <h2 className="section-title">Budgets</h2>
        <button type="button" className="btn btn-text" onClick={onEdit}>
          {hasBudgets ? 'Edit' : 'Set'}
        </button>
      </div>

      {!hasBudgets ? (
        <p className="empty-state">
          No budgets yet. Set a monthly limit per category to see what's left to spend.
        </p>
      ) : (
        <>
          <div className="budget-overview">
            <span className="budget-overview-label">{currentMonthLabel()}</span>
            <span
              className={
                status.totalRemaining < 0
                  ? 'budget-overview-value summary-stat--expense'
                  : 'budget-overview-value'
              }
            >
              {status.totalRemaining < 0
                ? `${formatCurrency(-status.totalRemaining)} over`
                : `${formatCurrency(status.totalRemaining)} left`}
            </span>
            <span className="budget-overview-sub">
              {formatCurrency(status.totalSpent)} of {formatCurrency(status.totalLimit)}
            </span>
          </div>

          <ul className="budget-list">
            {status.rows.map((row) => (
              <li key={row.name} className="budget-row">
                <div className="budget-row-top">
                  <span className="budget-row-name">{row.name}</span>
                  <span className={row.over ? 'budget-row-amt summary-stat--expense' : 'budget-row-amt'}>
                    {formatCurrency(row.spent)} / {formatCurrency(row.limit)}
                  </span>
                </div>
                <div className="budget-bar">
                  <div
                    className={row.over ? 'budget-bar-fill budget-bar-fill--over' : 'budget-bar-fill'}
                    style={{ width: `${Math.min(100, row.pct)}%` }}
                  />
                </div>
                <span className={row.over ? 'budget-row-note summary-stat--expense' : 'budget-row-note'}>
                  {row.over
                    ? `${formatCurrency(-row.remaining)} over budget`
                    : `${formatCurrency(row.remaining)} left`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
