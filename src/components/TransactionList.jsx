import { useState } from 'react'
import { formatCurrency, formatDateLabel, groupTransactionsByDate } from '../utils/calculations'
import { allCategories } from '../utils/categories'

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
  return description || 'Transaction'
}

function TransactionItem({ transaction, goals, onEditIncome }) {
  const { type, amount } = transaction
  const label = getLabel(transaction)

  if (type === 'income') {
    return (
      <li className="tx-item tx-income tx-item--editable">
        <button
          type="button"
          className="tx-item-btn"
          onClick={() => onEditIncome(transaction)}
          aria-label={`Edit income type for ${label}`}
        >
          <span className="tx-prefix">+</span>
          <span className="tx-amount">{formatCurrency(amount)}</span>
          <span className="tx-desc">{label}</span>
        </button>
      </li>
    )
  }

  if (type === 'expense' || type === 'goal_complete') {
    return (
      <li className="tx-item tx-expense">
        <span className="tx-prefix">−</span>
        <span className="tx-amount">{formatCurrency(amount)}</span>
        <span className="tx-desc">{label}</span>
      </li>
    )
  }

  if (type === 'savings_release') {
    const goalName = getGoalName(goals, transaction.goalId)
    return (
      <li className="tx-item tx-release">
        <span className="tx-prefix">↩</span>
        <span className="tx-amount">{formatCurrency(amount)}</span>
        <span className="tx-desc">released from {goalName}</span>
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

function CategoryFilters({ categories, filterCategory, onSelect }) {
  const cats = allCategories(categories)

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
      {cats.map((cat) => (
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

export default function TransactionList({
  transactions,
  goals,
  categories,
  onManageCategories,
  onEditIncome,
}) {
  const [filterCategory, setFilterCategory] = useState(null)

  function selectCategory(cat) {
    setFilterCategory((prev) => (prev === cat ? null : cat))
  }

  const sorted = [...transactions].sort((a, b) => (b.date || 0) - (a.date || 0))

  const filtered =
    filterCategory === null
      ? sorted
      : sorted.filter((tx) => tx.category === filterCategory)

  const groups = groupTransactionsByDate(filtered)

  return (
    <section className="transactions-section">
      <div className="section-header">
        <h2 className="section-title">Timeline</h2>
        <button type="button" className="btn btn-text" onClick={onManageCategories}>
          Categories
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="empty-state">No transactions yet. Tap + to add one.</p>
      ) : (
        <>
          <CategoryFilters
            categories={categories}
            filterCategory={filterCategory}
            onSelect={selectCategory}
          />
          {filtered.length === 0 ? (
            <p className="empty-state">No {filterCategory} transactions yet.</p>
          ) : (
            <div className="tx-groups">
              {groups.map((group) => (
                <div key={group.date} className="tx-group">
                  <h3 className="tx-date-label">{formatDateLabel(group.date)}</h3>
                  <ul className="tx-list">
                    {group.items.map((tx) => (
                      <TransactionItem
                        key={tx.id}
                        transaction={tx}
                        goals={goals}
                        onEditIncome={onEditIncome}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
