import { useState } from 'react'
import { formatCurrency, isLongTerm, roundToCents } from '../utils/calculations'
import { Count } from './motion'

const money = (to) => (v) => formatCurrency(roundToCents(Number.isInteger(roundToCents(to)) ? Math.round(v) : v))

export default function SavingsSection({ goals, total, ready, onNew, onAdd, onWithdraw, onComplete, onDelete }) {
  const [open, setOpen] = useState(null)
  const active = goals.filter((g) => !g.completedAt)
  const sorted = [...active.filter(isLongTerm), ...active.filter((g) => !isLongTerm(g))]

  return (
    <section className="block" id="savings" aria-labelledby="savings-title">
      <div className="sec-head">
        <h2 className="sec-title" id="savings-title">Savings</h2>
        <div className="sec-tools">
          <span className="label"><Count value={total} start={ready} format={money(total)} /></span>
          <button type="button" className="tool link press" onClick={onNew}>New</button>
        </div>
      </div>

      {sorted.length === 0 && <p className="empty" style={{ paddingTop: 16 }}>Nothing set aside yet. Start a goal or a long-term pot.</p>}

      {sorted.map((g) => {
        const long = isLongTerm(g)
        const pct = !long && g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : null
        const isOpen = open === g.id
        return (
          <div key={g.id} className="goal">
            <button
              type="button"
              className="kv wrap"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : g.id)}
            >
              <span className="kv-k">
                {g.name}
                <span className="kv-sub">
                  {long ? 'Long-term' : `${Math.round(pct ?? 0)}% of ${formatCurrency(g.targetAmount)}`}
                </span>
              </span>
              <span className="kv-v"><Count value={g.currentAmount} start={ready} format={money(g.currentAmount)} /></span>
              {pct !== null && (
                <span className="meter g" aria-hidden="true"><span style={{ width: ready ? `${pct}%` : 0 }} /></span>
              )}
            </button>
            <div className={isOpen ? 'fold show' : 'fold'}>
              <div>
                <div className="acts" style={{ paddingTop: pct !== null ? 4 : 0 }}>
                  <button type="button" className="chip press" tabIndex={isOpen ? 0 : -1} onClick={() => onAdd(g.id)}>Add</button>
                  {g.currentAmount > 0 && (
                    <button type="button" className="chip press" tabIndex={isOpen ? 0 : -1} onClick={() => onWithdraw(g)}>Withdraw</button>
                  )}
                  {!long && g.currentAmount > 0 && (
                    <button type="button" className="chip press" tabIndex={isOpen ? 0 : -1} onClick={() => onComplete(g)}>Mark bought</button>
                  )}
                  <button type="button" className="chip danger press" tabIndex={isOpen ? 0 : -1} onClick={() => onDelete(g)}>
                    {long ? 'Remove' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
