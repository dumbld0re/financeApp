import { useState } from 'react'
import { generateId, roundToCents } from '../utils/calculations'
import { computeFirstDue } from '../utils/recurring'
import { categoriesForType, defaultCategoryForType } from '../utils/categories'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function RecurringModal({ rule, categories, onClose, onSubmit }) {
  const editing = Boolean(rule)

  const [type, setType] = useState(rule?.type ?? 'expense')
  const [amount, setAmount] = useState(rule ? String(rule.amount) : '')
  const [description, setDescription] = useState(rule?.description ?? '')
  const [category, setCategory] = useState(
    rule?.category ?? defaultCategoryForType('expense', categories)
  )
  const [cadence, setCadence] = useState(rule?.cadence ?? 'monthly')
  const [anchorDay, setAnchorDay] = useState(rule ? String(rule.anchorDay) : '1')
  const [error, setError] = useState('')

  function changeType(next) {
    setType(next)
    setCategory(defaultCategoryForType(next, categories))
  }

  function changeCadence(next) {
    setCadence(next)
    setAnchorDay(next === 'weekly' ? '1' : '1')
  }

  function handleSubmit(e) {
    e.preventDefault()
    const parsedAmount = roundToCents(parseFloat(amount))
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (!description.trim()) {
      setError('Description is required')
      return
    }

    const day = Number(anchorDay)
    const next = {
      id: editing ? rule.id : generateId(),
      type,
      amount: parsedAmount,
      description: description.trim(),
      category,
      cadence,
      anchorDay: day,
      // keep the schedule position when editing; recompute for a new rule
      nextDue: editing ? rule.nextDue : computeFirstDue(cadence, day),
      createdAt: editing ? rule.createdAt : Date.now(),
    }

    onSubmit(next)
    onClose()
  }

  const categoryOptions = categoriesForType(type, categories)

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-modal-title"
      >
        <div className="modal-header">
          <h2 id="recurring-modal-title">{editing ? 'Edit recurring' : 'New recurring'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <label className="field">
            <span>Type</span>
            <select value={type} onChange={(e) => changeType(e.target.value)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>

          <label className="field">
            <span>Amount</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span>Description</span>
            <input
              type="text"
              placeholder={type === 'income' ? 'e.g. Salary' : 'e.g. Rent'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Repeats</span>
            <select value={cadence} onChange={(e) => changeCadence(e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>

          {cadence === 'monthly' ? (
            <label className="field">
              <span>Day of month</span>
              <select value={anchorDay} onChange={(e) => setAnchorDay(e.target.value)}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Day of week</span>
              <select value={anchorDay} onChange={(e) => setAnchorDay(e.target.value)}>
                {WEEKDAYS.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-full">
            {editing ? 'Save' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  )
}
