import { useState } from 'react'

export default function GoalModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    const parsed = parseFloat(targetAmount)
    if (!parsed || parsed <= 0) {
      setError('Enter a valid target amount')
      return
    }

    onSubmit({ name: name.trim(), targetAmount: parsed })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-modal-title"
      >
        <div className="modal-header">
          <h2 id="goal-modal-title">New savings goal</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              placeholder="e.g. Emergency fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span>Target amount</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
            />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-full">
            Create goal
          </button>
        </form>
      </div>
    </div>
  )
}
