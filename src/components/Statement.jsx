import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatCurrency, formatDateLabel, roundToCents } from '../utils/calculations'
import { allCategories } from '../utils/categories'
import Icon from './Icon'
import { useMedia } from './motion'

const PAGE_DESKTOP = 60
const PAGE_PHONE = 15
const exact = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
const EDITABLE = new Set(['income', 'expense', 'savings_transfer'])

function goalName(goals, id) {
  return goals.find((g) => g.id === id)?.name ?? 'savings'
}

// Display fields for one entry, whatever its type.
export function describe(tx, goals) {
  const { type, description, category, amount } = tx
  const money = formatCurrency(amount)
  switch (type) {
    case 'income':
      return { label: description && description !== category ? description : category || 'Income', cat: category || 'Income', amt: `+${money}`, tone: 'in' }
    case 'expense':
      return { label: description || category || 'Expense', cat: category || 'Expense', amt: `−${money}`, tone: '' }
    case 'savings_transfer':
      return { label: `To ${goalName(goals, tx.goalId)}`, cat: 'Savings', amt: `→ ${money}`, tone: 'soft' }
    case 'goal_complete':
      return { label: description || 'Goal purchase', cat: 'Goal', amt: `−${money}`, tone: '' }
    default:
      return {
        label: `${type === 'savings_withdrawal' ? 'Withdrawn from' : 'Released from'} ${goalName(goals, tx.goalId)}`,
        cat: 'Savings',
        amt: `↩ ${money}`,
        tone: 'soft',
      }
  }
}

function Row({ tx, info, bal, index, isNew, hidden, leaving, onEdit }) {
  const [entered, setEntered] = useState(!isNew)
  useEffect(() => {
    if (!isNew) return
    let r2
    const r1 = requestAnimationFrame(() => (r2 = requestAnimationFrame(() => setEntered(true))))
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [isNew])

  const editable = EDITABLE.has(tx.type)
  const Tag = editable ? 'button' : 'div'
  const cls = ['rw', (!entered || leaving) && 'collapsed', hidden && 'hide', isNew && 'fresh'].filter(Boolean).join(' ')

  return (
    <div className={cls} style={{ '--d': Math.min(index, 14) }}>
      <div className="rw-in">
        <Tag
          className="row"
          {...(editable ? { type: 'button', onClick: () => onEdit(tx), 'aria-label': `Edit ${info.label} ${info.amt}` } : {})}
          tabIndex={hidden ? -1 : undefined}
        >
          <span className="row-desc">{info.label}</span>
          <span className="row-cat">{info.cat}</span>
          <span className={`row-amt ${info.tone}`}>{info.amt}</span>
          <span className="row-bal">{exact(bal)}</span>
        </Tag>
      </div>
    </div>
  )
}

export default function Statement({
  transactions,
  goals,
  categories,
  totalBalance,
  leaving,
  searchRef,
  onEdit,
  onBulkAdd,
  onCategories,
}) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState(null)
  const desktop = useMedia('(min-width: 1024px)')
  const PAGE = desktop ? PAGE_DESKTOP : PAGE_PHONE
  const [extra, setExtra] = useState(0)
  const limit = PAGE + extra
  const [intro, setIntro] = useState(true)
  const seen = useRef(null)
  const freshAt = useRef(new Map())

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 2400)
    return () => clearTimeout(t)
  }, [])

  // newest first, each with the balance right after it posted
  const rows = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => (b.date || 0) - (a.date || 0))
    let running = totalBalance
    return sorted.map((tx) => {
      const bal = roundToCents(running)
      if (tx.type === 'income') running -= tx.amount
      else if (tx.type === 'expense' || tx.type === 'goal_complete') running += tx.amount
      return { tx, bal, info: describe(tx, goals) }
    })
  }, [transactions, totalBalance, goals])

  // ids that appeared since the last render get the expand + flash entrance
  const now = performance.now()
  if (seen.current === null) seen.current = new Set(rows.map((r) => r.tx.id))
  for (const r of rows) {
    if (!seen.current.has(r.tx.id)) freshAt.current.set(r.tx.id, now)
  }
  useLayoutEffect(() => {
    seen.current = new Set(rows.map((r) => r.tx.id))
  })

  const q = query.trim().toLowerCase()
  const filtering = Boolean(q) || cat !== null
  const matches = (r) =>
    (cat === null || r.tx.category === cat) &&
    (!q || `${r.info.label} ${r.info.cat}`.toLowerCase().includes(q))

  const shown = filtering ? rows : rows.slice(0, limit)
  const visibleCount = shown.filter(matches).length
  const cats = allCategories(categories)

  // day headers for the phone layout; hidden when every row under them is
  const items = []
  let lastKey = null
  shown.forEach((r, i) => {
    const key = new Date(r.tx.date || 0).toDateString()
    if (key !== lastKey) {
      const dayRows = shown.filter((x) => new Date(x.tx.date || 0).toDateString() === key)
      items.push(
        <div key={`h-${key}`} className={dayRows.some(matches) ? 'rw' : 'rw hide'}>
          <div className="rw-in">
            <div className="day">
              <span className="label">{formatDateLabel(r.tx.date)}</span>
            </div>
          </div>
        </div>
      )
      lastKey = key
    }
    const t = freshAt.current.get(r.tx.id)
    items.push(
      <Row
        key={r.tx.id}
        tx={r.tx}
        info={r.info}
        bal={r.bal}
        index={i}
        isNew={t !== undefined && now - t < 2600}
        hidden={!matches(r)}
        leaving={leaving.has(r.tx.id)}
        onEdit={onEdit}
      />
    )
  })

  return (
    <section id="statement" aria-labelledby="statement-title">
      <div className="sec-head">
        <h2 className="sec-title" id="statement-title">Statement</h2>
        <div className="sec-tools">
          {transactions.length > 0 && (
            <label className={q ? 'search has' : 'search'}>
              <Icon name="search" size={15} />
              <input
                ref={searchRef}
                type="search"
                placeholder="Search"
                aria-label="Search entries"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setQuery('')
                    e.currentTarget.blur()
                  }
                }}
              />
            </label>
          )}
          <button type="button" className="tool press" onClick={onBulkAdd}>Bulk add</button>
          <button type="button" className="tool press" onClick={onCategories} aria-label="Categories">
            <Icon name="tag" size={15} />
          </button>
        </div>
      </div>

      {transactions.length > 0 && cats.length > 1 && (
        <div className="filters" role="group" aria-label="Filter by category">
          {[null, ...cats].map((c) => (
            <button
              key={c ?? 'all'}
              type="button"
              className="chip press"
              aria-pressed={cat === c}
              onClick={() => setCat((prev) => (prev === c || c === null ? null : c))}
            >
              <span className="ck"><Icon name="check" size={14} /></span>
              {c ?? 'All'}
            </button>
          ))}
        </div>
      )}

      <div className="cols label" aria-hidden="true">
        <span>Description</span><span>Category</span><span className="r">Amount</span><span className="r">Balance</span>
      </div>

      <div className={intro ? 'intro' : undefined}>{items}</div>

      <div className={transactions.length === 0 || (filtering && visibleCount === 0) ? 'fold show empty' : 'fold empty'}>
        <p>
          {transactions.length === 0
            ? 'No entries yet. Add your first one, or paste a few with Bulk add.'
            : q
              ? `Nothing matches “${query.trim()}”.`
              : `No ${cat} entries yet.`}
        </p>
      </div>

      {!filtering && rows.length > limit && (
        <button type="button" className="ghost press more-btn" onClick={() => setExtra((x) => x + PAGE)}>
          Show {Math.min(PAGE, rows.length - limit)} more
        </button>
      )}
    </section>
  )
}
