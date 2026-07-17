import { formatCurrency } from '../utils/calculations'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function scheduleLabel(rule) {
  if (rule.cadence === 'weekly') return `Every ${WEEKDAYS[rule.anchorDay] || 'week'}`
  return `Monthly on the ${ordinal(rule.anchorDay)}`
}

function nextLabel(nextDue) {
  return new Date(nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RecurringSection({ rules, onCreate, onEdit, onDelete }) {
  return (
    <section className="recurring-section">
      <div className="section-header">
        <h2 className="section-title">Recurring</h2>
        <button type="button" className="btn btn-text" onClick={onCreate}>
          New
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="empty-state">
          No recurring items. Add rent, salary, or subscriptions to post them automatically.
        </p>
      ) : (
        <ul className="recurring-list">
          {rules.map((rule) => (
            <li key={rule.id}>
              <article className="recurring-card">
                <button
                  type="button"
                  className="recurring-main"
                  onClick={() => onEdit(rule)}
                  aria-label={`Edit ${rule.description}`}
                >
                  <span className={`tx-prefix ${rule.type === 'income' ? 'bulk-income' : 'bulk-expense'}`}>
                    {rule.type === 'income' ? '+' : '−'}
                  </span>
                  <span className="recurring-amount">{formatCurrency(rule.amount)}</span>
                  <span className="recurring-info">
                    <span className="recurring-desc">{rule.description}</span>
                    <span className="recurring-schedule">
                      {scheduleLabel(rule)} · next {nextLabel(rule.nextDue)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost-danger btn-sm"
                  onClick={() => onDelete(rule)}
                  aria-label={`Delete ${rule.description}`}
                >
                  Delete
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
