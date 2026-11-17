import { computeBudgetStatus, formatCurrency, roundToCents } from '../utils/calculations'
import { Count } from './motion'

const money = (to) => (v) => formatCurrency(roundToCents(Number.isInteger(roundToCents(to)) ? Math.round(v) : v))
const leftOrOver = (rem) => (v) => `${money(rem)(Math.abs(v))} ${rem < 0 ? 'over' : 'left'}`

export function BudgetsSection({ transactions, budgets, ready, onEdit }) {
  const now = new Date()
  const status = computeBudgetStatus(transactions, budgets, now.getFullYear(), now.getMonth())
  const has = status.rows.length > 0

  return (
    <section className="block bud" id="budgets" aria-labelledby="budgets-title">
      <div className="sec-head">
        <h2 className="sec-title" id="budgets-title">Budgets</h2>
        <div className="sec-tools">
          <button type="button" className="tool link press" onClick={onEdit}>{has ? 'Edit' : 'Set'}</button>
        </div>
      </div>

      {!has ? (
        <p className="empty" style={{ paddingTop: 16 }}>No budgets yet. Give a category a monthly limit to see what’s left.</p>
      ) : (
        <>
          <div className="bud-sub">
            <span className="label">{now.toLocaleDateString('en-US', { month: 'long' })}</span>
            <span className={status.totalRemaining < 0 ? 'label over' : 'label'}>
              <Count value={status.totalRemaining} start={ready} format={leftOrOver(status.totalRemaining)} />
              {' '}of {formatCurrency(status.totalLimit)}
            </span>
          </div>
          {status.rows.map((r) => (
            <div key={r.name} className="kv wrap">
              <span className="kv-k">{r.name}</span>
              <span className={r.over ? 'kv-v over' : 'kv-v'}>
                <Count value={r.remaining} start={ready} format={leftOrOver(r.remaining)} />
              </span>
              <span
                className={r.over ? 'meter over' : 'meter'}
                role="progressbar"
                aria-label={`${r.name}: ${formatCurrency(r.spent)} of ${formatCurrency(r.limit)}`}
                aria-valuenow={Math.round(r.pct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: ready ? `${Math.min(100, r.pct)}%` : 0 }} />
              </span>
            </div>
          ))}
        </>
      )}
    </section>
  )
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function RecurringSection({ rules, onNew, onEdit }) {
  return (
    <section className="block" id="recurring" aria-labelledby="recurring-title">
      <div className="sec-head">
        <h2 className="sec-title" id="recurring-title">Recurring</h2>
        <div className="sec-tools">
          {rules.length > 0 && <span className="label">{rules.length} active</span>}
          <button type="button" className="tool link press" onClick={onNew}>New</button>
        </div>
      </div>

      {rules.length === 0 && (
        <p className="empty" style={{ paddingTop: 16 }}>Rent, salary or subscriptions can post themselves when they come due.</p>
      )}

      {rules.map((r) => (
        <button key={r.id} type="button" className="kv" onClick={() => onEdit(r)} aria-label={`Edit ${r.description}`}>
          <span className="kv-k">
            {r.description}
            <span className="kv-sub">
              {r.cadence === 'weekly' ? `Every ${WEEKDAYS[r.anchorDay] || 'week'}` : `Monthly on the ${ordinal(r.anchorDay)}`}
            </span>
          </span>
          <span className="kv-v">
            {r.type === 'income' ? '+' : '−'}
            {formatCurrency(r.amount)}
            <small>{new Date(r.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small>
          </span>
        </button>
      ))}
    </section>
  )
}
