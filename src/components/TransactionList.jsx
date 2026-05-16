import { useState } from 'react'
import { formatCurrency } from '../utils/calculations'
import { ALL_CATEGORIES } from '../utils/categories'

function getGoalName(goals, goalId) {
  return goals.find((g) => g.id === goalId)?.name ?? 'savings'
}

function getLabel(transaction) {
  const { type, description, category } = transaction
  if (type === 'income') return category || description || 'Income'
  if (type === 'expense') {
    if (description && category) return `${description} · ${category}`
    return description || category || 'Expense'
  }
  return description || 'Transfer'
}

function TransactionItem({ transaction, goals }) {
  const { type, amount } = transaction
  const label = getLabel(transaction)

  if (type === 'income') {
    return (
      <li className="tx-item tx-income">
        <span className="tx-prefix">+</span>
        <span className="tx-amount">{formatCurrency(amount)}</span>
        <span className="tx-desc">{label}</span>
      </li>
    )
  }

  if (type === 'expense') {
    return (
      <li className="tx-item tx-expense">
        <span className="tx-prefix">−</span>
        <span className="tx-amount">{formatCurrency(amount)}</span>
        <span className="tx-desc">{label}</span>
      </li>
    )
  }

  const goalName = getGoalName(goals, transaction.goalId)
  return (
    <li className="tx-item tx-transfer">
      <span className="tx-prefix">→</span>
      <span className="tx-amount">{formatCurrency(amount)}</span>
      <span className="tx-desc">to {goalName}</span>
    </li>
  )
}

function CategoryFilters({ filterCategory, onSelect }) {
  return (
    <div className="category-filters" role="group" aria-label="Filter by category">
      <button
        type="button"
        className={`category-chip ${filterCategory === null ? 'category-chip--active' : ''}`}
        onClick={() => onSelect(null)}
        aria-pressed={filterCategory === null}
      >
        All
      </button>
      {ALL_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          className={`category-chip ${filterCategory === cat ? 'category-chip--active' : ''}`}
          onClick={() => onSelect(cat)}
          aria-pressed={filterCategory === cat}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

export default function TransactionList({ transactions, goals }) {
  const [filterCategory, setFilterCategory] = useState(null)

  function selectCategory(cat) {
    setFilterCategory((prev) => (prev === cat ? null : cat))
  }

  const sorted = [...transactions].sort((a, b) => b.date - a.date)

  const filtered =
    filterCategory === null
      ? sorted
      : sorted.filter((tx) => tx.category === filterCategory)

  if (sorted.length === 0) return null

  return (
    <section className="transactions-section">
      <h2 className="section-title">Timeline</h2>
      <CategoryFilters filterCategory={filterCategory} onSelect={selectCategory} />
      {filtered.length === 0 ? (
        <p className="empty-state">No {filterCategory} transactions yet.</p>
      ) : (
        <ul className="tx-list">
          {filtered.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} goals={goals} />
          ))}
        </ul>
      )}
    </section>
  )
}
