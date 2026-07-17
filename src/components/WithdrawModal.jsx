import { useState } from 'react'
import { formatCurrency, roundToCents } from '../utils/calculations'

export default function WithdrawModal({ goal, onClose, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const parsed = roundToCents(parseFloat(amount))

    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (parsed > goal.currentAmount) {
      setError(`Only ${formatCurrency(goal.currentAmount)} available`)
      return
    }

    onSubmit(goal, parsed)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal--compact"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-modal-title"
      >
        <div className="modal-header">
          <h2 id="withdraw-modal-title">Withdraw from {goal.name}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <p className="confirm-message">
            {formatCurrency(goal.currentAmount)} available. Withdrawn money returns to your
            spendable balance.
          </p>

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

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-full">
            Withdraw
          </button>
        </form>
      </div>
    </div>
  )
}
