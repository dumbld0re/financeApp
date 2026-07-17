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
    if (description && category && description !== category) return `${description} · ${category}`
    return description || category || 'Expense'
  }
  return description || 'Transaction'
}

function TransactionItem({ transaction, goals, onEditTransaction }) {
  const { type, amount } = transaction
  const label = getLabel(transaction)

  if (type === 'income' || type === 'expense' || type === 'savings_transfer') {
    const prefix = type === 'income' ? '+' : type === 'expense' ? '−' : '→'
    const desc =
      type === 'savings_transfer' ? `to ${getGoalName(goals, transaction.goalId)}` : label
    const kindClass =
      type === 'income' ? 'tx-income' : type === 'expense' ? 'tx-expense' : 'tx-transfer'

    return (
      <li className={`tx-item ${kindClass} tx-item--editable`}>
        <button
          type="button"
          className="tx-item-btn"
          onClick={() => onEditTransaction(transaction)}
          aria-label={`Edit ${formatCurrency(amount)} ${desc}`}
        >
          <span className="tx-prefix">{prefix}</span>
          <span className="tx-amount">{formatCurrency(amount)}</span>
          <span className="tx-desc">{desc}</span>
        </button>
      </li>
    )
  }

  if (type === 'goal_complete') {
    return (
      <li className="tx-item tx-expense">
        <span className="tx-prefix">−</span>
        <span className="tx-amount">{formatCurrency(amount)}</span>
        <span className="tx-desc">{label}</span>
      </li>
    )
  }

  const goalName = getGoalName(goals, transaction.goalId)
  const releaseWord = type === 'savings_withdrawal' ? 'withdrawn from' : 'released from'
  return (
    <li className="tx-item tx-release">
      <span className="tx-prefix">↩</span>
      <span className="tx-amount">{formatCurrency(amount)}</span>
      <span className="tx-desc">
        {releaseWord} {goalName}
      </span>
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
  onBulkAdd,
  onEditTransaction,
}) {
  const [filterCategory, setFilterCategory] = useState(null)
  const [query, setQuery] = useState('')

  function selectCategory(cat) {
    setFilterCategory((prev) => (prev === cat ? null : cat))
  }

  const sorted = [...transactions].sort((a, b) => (b.date || 0) - (a.date || 0))

  const q = query.trim().toLowerCase()
  const filtered = sorted.filter((tx) => {
    if (filterCategory !== null && tx.category !== filterCategory) return false
    if (!q) return true
    const goalName = tx.goalId ? getGoalName(goals, tx.goalId) : ''
    const haystack = `${tx.description || ''} ${tx.category || ''} ${goalName}`.toLowerCase()
    return haystack.includes(q)
  })

  const groups = groupTransactionsByDate(filtered)

  return (
    <section className="transactions-section">
      <div className="section-header">
        <h2 className="section-title">Timeline</h2>
        <div className="section-header-actions">
          <button type="button" className="btn btn-text" onClick={onBulkAdd}>
            Bulk add
          </button>
          <button type="button" className="btn btn-text" onClick={onManageCategories}>
            Categories
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="empty-state">
          No transactions yet. Tap + to add one, or use Bulk add to paste several.
        </p>
      ) : (
        <>
          <input
            type="search"
            className="tx-search"
            placeholder="Search transactions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search transactions"
          />
          <CategoryFilters
            categories={categories}
            filterCategory={filterCategory}
            onSelect={selectCategory}
          />
          {filtered.length === 0 ? (
            <p className="empty-state">
              {q ? `No matches for "${query.trim()}".` : `No ${filterCategory} transactions yet.`}
            </p>
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
                        onEditTransaction={onEditTransaction}
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
