import { useState } from 'react'
import {
  generateId,
  getActiveGoals,
  roundToCents,
  toDateInputValue,
  fromDateInputValue,
} from '../utils/calculations'
import { categoriesForType, defaultCategoryForType } from '../utils/categories'

const TYPES = [
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
  { id: 'savings_transfer', label: 'Savings Transfer' },
]

export default function TransactionModal({
  goals,
  categories,
  preselectedGoalId,
  transaction,
  onClose,
  onSubmit,
  onDelete,
}) {
  const editing = Boolean(transaction)
  const isGoalAdd = Boolean(preselectedGoalId)
  const activeGoals = getActiveGoals(goals)

  const [step, setStep] = useState(editing || isGoalAdd ? 2 : 1)
  const [type, setType] = useState(
    editing ? transaction.type : isGoalAdd ? 'savings_transfer' : null
  )
  const [amount, setAmount] = useState(editing ? String(transaction.amount) : '')
  const [description, setDescription] = useState(
    editing && transaction.type !== 'income' ? transaction.description || '' : ''
  )
  const [category, setCategory] = useState(editing ? transaction.category || '' : '')
  const [goalId, setGoalId] = useState(
    preselectedGoalId ?? (editing ? transaction.goalId || '' : '')
  )
  const [dateStr, setDateStr] = useState(
    toDateInputValue(editing ? transaction.date : Date.now())
  )
  const [error, setError] = useState('')

  function selectType(selected) {
    setType(selected)
    setCategory(defaultCategoryForType(selected, categories))
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
    const parsedAmount = roundToCents(parseFloat(amount))

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount')
      return
    }

    if (!dateStr) {
      setError('Pick a date')
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
        setError('Select where to save')
        return
      }
    }

    // keep the exact original time when the day wasn't changed, so ordering
    // within a day is preserved; new transactions dated today keep "now"
    let date
    if (editing) {
      date = dateStr === toDateInputValue(transaction.date)
        ? transaction.date
        : fromDateInputValue(dateStr)
    } else {
      date = dateStr === toDateInputValue(Date.now()) ? Date.now() : fromDateInputValue(dateStr)
    }

    const next = {
      id: editing ? transaction.id : generateId(),
      type,
      amount: parsedAmount,
      description:
        type === 'income'
          ? category
          : type === 'savings_transfer'
            ? description.trim() ||
              `Transfer to ${goalOptions.find((g) => g.id === goalId)?.name ?? 'savings'}`
            : description.trim(),
      date,
    }

    if (type === 'income' || type === 'expense') {
      next.category = category
    }

    if (type === 'savings_transfer') {
      next.goalId = goalId
    }

    onSubmit(next)
    onClose()
  }

  const baseCategories = categoriesForType(type, categories)
  // when editing, keep a category that was removed from the list selectable
  const categoryOptions =
    editing && transaction.category && !baseCategories.includes(transaction.category)
      ? [transaction.category, ...baseCategories]
      : baseCategories

  // when editing a transfer to a completed/removed goal, keep it selectable
  let goalOptions = activeGoals
  if (editing && transaction.goalId && !activeGoals.some((g) => g.id === transaction.goalId)) {
    const known = goals.find((g) => g.id === transaction.goalId)
    goalOptions = [known || { id: transaction.goalId, name: 'Former goal' }, ...activeGoals]
  }

  const typeLabel = TYPES.find((t) => t.id === type)?.label

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
            {editing
              ? `Edit ${typeLabel?.toLowerCase() ?? 'transaction'}`
              : isGoalAdd
                ? 'Add to savings'
                : step === 1
                  ? 'New transaction'
                  : typeLabel}
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
            {!isGoalAdd && !editing && (
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

            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
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
                <span>Save to</span>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  required
                  disabled={isGoalAdd}
                >
                  <option value="">Select</option>
                  {goalOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.kind === 'long_term' ? '(long-term)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {error && <p className="field-error">{error}</p>}

            <button type="submit" className="btn btn-primary btn-full">
              Save
            </button>
            {editing && (
              <button
                type="button"
                className="btn btn-ghost-danger btn-full"
                onClick={() => onDelete(transaction)}
              >
                Delete transaction
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
