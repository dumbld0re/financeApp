import { useState, useMemo } from 'react'
import { parseBulkTransactions } from '../utils/parseTransactions'
import { formatCurrency, formatDateLabel } from '../utils/calculations'

const PLACEHOLDER = `-167.77 metro groceries 2/7
-70 airtime
+240 tutoring 7/7
-97.60 yango transport @Transport`

export default function BulkAddModal({ categories, onClose, onSubmit }) {
  const [text, setText] = useState('')

  const results = useMemo(
    () => parseBulkTransactions(text, categories),
    [text, categories]
  )

  const okResults = results.filter((r) => r.ok)
  const errorResults = results.filter((r) => !r.ok)

  function handleSubmit() {
    if (okResults.length === 0) return
    onSubmit(okResults.map((r) => r.transaction))
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-add-title"
      >
        <div className="modal-header">
          <h2 id="bulk-add-title">Bulk add</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-step-label">
            One per line: sign, amount, description, optional date.
            Use <code>-</code> for expenses, <code>+</code> for income,
            and <code>@Category</code> to set a category.
          </p>

          <textarea
            className="bulk-input"
            rows={6}
            placeholder={PLACEHOLDER}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />

          {text.trim() && (
            <div className="bulk-preview">
              <p className="bulk-preview-label">
                Preview — {okResults.length} ready
                {errorResults.length > 0 && `, ${errorResults.length} to fix`}
              </p>
              <ul className="bulk-preview-list">
                {results.map((r, i) =>
                  r.ok ? (
                    <li key={i} className="bulk-row">
                      <span
                        className={`tx-prefix ${
                          r.transaction.type === 'income' ? 'bulk-income' : 'bulk-expense'
                        }`}
                      >
                        {r.transaction.type === 'income' ? '+' : '−'}
                      </span>
                      <span className="bulk-amount">{formatCurrency(r.transaction.amount)}</span>
                      <span className="bulk-cat">{r.transaction.category}</span>
                      <span className="bulk-date">{formatDateLabel(r.transaction.date)}</span>
                      {r.warning && <span className="bulk-warn">⚠</span>}
                    </li>
                  ) : (
                    <li key={i} className="bulk-row bulk-row--error">
                      <span className="bulk-error-text">{r.raw.trim()}</span>
                      <span className="bulk-error-reason">{r.error}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={handleSubmit}
            disabled={okResults.length === 0}
          >
            {okResults.length > 0
              ? `Add ${okResults.length} transaction${okResults.length === 1 ? '' : 's'}`
              : 'Add transactions'}
          </button>
        </div>
      </div>
    </div>
  )
}
