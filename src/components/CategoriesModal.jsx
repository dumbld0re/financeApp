import { useState } from 'react'

function CategoryGroup({ title, type, items, onAdd, onRemove }) {
  const [name, setName] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(type, name.trim())
    setName('')
  }

  return (
    <div className="category-group">
      <h3 className="subsection-title">{title}</h3>
      <ul className="category-manage-list">
        {items.map((cat) => (
          <li key={cat} className="category-manage-item">
            <span>{cat}</span>
            <button
              type="button"
              className="btn btn-ghost-danger btn-sm"
              onClick={() => onRemove(type, cat)}
              aria-label={`Remove ${cat}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form className="category-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="New category"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary btn-sm">
          Add
        </button>
      </form>
    </div>
  )
}

export default function CategoriesModal({ categories, onClose, onAdd, onRemove }) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="categories-modal-title"
      >
        <div className="modal-header">
          <h2 id="categories-modal-title">Categories</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <CategoryGroup
            title="Income"
            type="income"
            items={categories.income}
            onAdd={onAdd}
            onRemove={onRemove}
          />
          <CategoryGroup
            title="Expenses"
            type="expense"
            items={categories.expense}
            onAdd={onAdd}
            onRemove={onRemove}
          />
          <button type="button" className="btn btn-primary btn-full" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
