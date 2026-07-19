import { useState } from 'react'
import { categoriesForType } from '../utils/categories'
import { roundToCents } from '../utils/calculations'

// One monthly limit per expense category. The form starts from the current
// budgets; a blank or zero field means "no budget" and drops the entry.
export default function BudgetModal({ categories, budgets, onClose, onSubmit }) {
  const expenseCategories = categoriesForType('expense', categories)

  const [limits, setLimits] = useState(() => {
    const initial = {}
    for (const name of expenseCategories) {
      const value = budgets?.[name]
      initial[name] = value > 0 ? String(value) : ''
    }
    return initial
  })

  function setLimit(name, value) {
    setLimits((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = {}
    for (const [name, raw] of Object.entries(limits)) {
      const value = roundToCents(parseFloat(raw))
      if (Number.isFinite(value) && value > 0) next[name] = value
    }
    onSubmit(next)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
      >
        <div className="modal-header">
          <h2 id="budget-modal-title">Monthly budgets</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <p className="field-hint">
            Set a monthly spending limit per category. Leave blank for no limit.
          </p>

          {expenseCategories.map((name) => (
            <label key={name} className="field budget-field">
              <span>{name}</span>
              <div className="budget-input">
                <span className="budget-input-prefix">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={limits[name] ?? ''}
                  onChange={(e) => setLimit(name, e.target.value)}
                />
              </div>
            </label>
          ))}

          <button type="submit" className="btn btn-primary btn-full">
            Save budgets
          </button>
        </form>
      </div>
    </div>
  )
}
