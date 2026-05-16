import { useState } from 'react'
import { generateId } from '../utils/calculations'
import { categoriesForType, defaultCategoryForType } from '../utils/categories'

const TYPES = [
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
  { id: 'savings_transfer', label: 'Savings Transfer' },
]

export default function TransactionModal({ goals, preselectedGoalId, onClose, onSubmit }) {
  const isGoalAdd = Boolean(preselectedGoalId)

  const [step, setStep] = useState(isGoalAdd ? 2 : 1)
  const [type, setType] = useState(isGoalAdd ? 'savings_transfer' : null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [goalId, setGoalId] = useState(preselectedGoalId ?? '')
  const [error, setError] = useState('')

  function selectType(selected) {
    setType(selected)
    setCategory(defaultCategoryForType(selected))
    setStep(2)
    setError('')
  }

  function handleBack() {
    if (isGoalAdd) {
      onClose()
      return
    }
    setStep(1)
    setType(null)
    setCategory('')
    setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount')
      return
    }

    if (type === 'expense') {
      if (!description.trim()) {
        setError('Description is required')
        return
      }
    }

    if (type === 'income' || type === 'expense') {
      if (!category) {
        setError('Select a category')
        return
      }
    }

    if (type === 'savings_transfer') {
      if (!goalId) {
        setError('Select a savings goal')
        return
      }
    }

    const transaction = {
      id: generateId(),
      type,
      amount: parsedAmount,
      description:
        type === 'income'
          ? category
          : type === 'savings_transfer'
            ? description.trim() ||
              `Transfer to ${goals.find((g) => g.id === goalId)?.name ?? 'goal'}`
            : description.trim(),
      date: Date.now(),
    }

    if (type === 'income' || type === 'expense') {
      transaction.category = category
    }

    if (type === 'savings_transfer') {
      transaction.goalId = goalId
    }

    onSubmit(transaction)
    onClose()
  }

  const categoryOptions = categoriesForType(type)

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
      >
        <div className="modal-header">
          <h2 id="transaction-modal-title">
            {isGoalAdd ? 'Add to goal' : step === 1 ? 'New transaction' : TYPES.find((t) => t.id === type)?.label}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {step === 1 && (
          <div className="modal-body">
            <p className="modal-step-label">Select type</p>
            <div className="type-buttons">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="btn btn-type"
                  onClick={() => selectType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <form className="modal-body" onSubmit={handleSubmit}>
            {!isGoalAdd && (
              <button type="button" className="btn btn-text back-btn" onClick={handleBack}>
                ← Back
              </button>
            )}

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

            {(type === 'income' || type === 'expense') && (
              <>
                <label className="field">
                  <span>Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                {type === 'expense' && (
                  <label className="field">
                    <span>Description</span>
                    <input
                      type="text"
                      placeholder="e.g. Groceries, bus pass"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </label>
                )}
              </>
            )}

            {type === 'savings_transfer' && (
              <label className="field">
                <span>Savings goal</span>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  required
                  disabled={isGoalAdd}
                >
                  <option value="">Select a goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {error && <p className="field-error">{error}</p>}

            <button type="submit" className="btn btn-primary btn-full">
              Save
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
