import { useState } from 'react'
import { formatCurrency } from '../utils/calculations'

export default function EditIncomeModal({ transaction, categories, onClose, onSubmit }) {
  const [category, setCategory] = useState(transaction.category || '')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!category) {
      setError('Select an income type')
      return
    }
    onSubmit(transaction.id, category)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal--compact"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-income-modal-title"
      >
        <div className="modal-header">
          <h2 id="edit-income-modal-title">Change income type</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <p className="confirm-message">
            {formatCurrency(transaction.amount)} income
          </p>

          <label className="field">
            <span>Income type</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              autoFocus
            >
              {categories.income.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-full">
            Save
          </button>
        </form>
      </div>
    </div>
  )
}
