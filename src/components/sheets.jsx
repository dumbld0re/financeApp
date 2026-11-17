import { useMemo, useRef, useState } from 'react'
import { formatCurrency, formatDateLabel, generateId, roundToCents } from '../utils/calculations'
import { categoriesForType, defaultCategoryForType } from '../utils/categories'
import { parseBulkTransactions } from '../utils/parseTransactions'
import { computeFirstDue } from '../utils/recurring'
import Icon from './Icon'
import Sheet, { useSheetClose } from './Sheet'
import { AmountField, Chips, Seg, TickText, cleanAmount } from './controls'

/* ------------------------------------------------------------ confirm */
function ConfirmBody({ message, confirmLabel, danger, onConfirm }) {
  const close = useSheetClose()
  const done = useRef(false)
  return (
    <>
      <p className="copy">{message}</p>
      <div className="stack">
        <button
          type="button"
          className={danger ? 'cta danger press' : 'cta press'}
          data-autofocus
          onClick={() => {
            if (done.current) return
            done.current = true
            onConfirm()
            close()
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="ghost press" onClick={close}>Cancel</button>
      </div>
    </>
  )
}
export function ConfirmSheet({ title, onClose, ...rest }) {
  return (
    <Sheet title={title} onClose={onClose} role="alertdialog">
      <ConfirmBody {...rest} />
    </Sheet>
  )
}

/* ------------------------------------------------------------ goal */
function GoalBody({ onSubmit }) {
  const close = useSheetClose()
  const [kind, setKind] = useState('goal')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Give it a name')
    const t = roundToCents(parseFloat(target))
    if (kind === 'goal' && !(t > 0)) return setError('Set a target amount')
    onSubmit({ name: name.trim(), kind, targetAmount: kind === 'goal' ? t : 0 })
    close()
  }

  return (
    <form onSubmit={submit}>
      <Seg
        label="Kind"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'goal', label: 'Goal' },
          { value: 'long_term', label: 'Long-term' },
        ]}
      />
      <p className="copy" style={{ margin: '14px 0 18px' }}>
        {kind === 'goal' ? 'Save toward something specific, then mark it bought.' : 'A pot that stays, like an emergency fund.'}
      </p>
      <label className="field">
        <span className="label">Name</span>
        <input data-autofocus className="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'goal' ? 'New phone' : 'Emergency fund'} />
      </label>
      <div className={kind === 'goal' ? 'fold show' : 'fold'}>
        <div>
          <label className="field">
            <span className="label">Target</span>
            <span className="prefix">
              <span>$</span>
              <input className="text" inputMode="decimal" placeholder="0" value={target} onChange={(e) => setTarget(cleanAmount(e.target.value))} tabIndex={kind === 'goal' ? 0 : -1} />
            </span>
          </label>
        </div>
      </div>
      {error && <p className="msg-err">{error}</p>}
      <button type="submit" className="cta press">Create</button>
    </form>
  )
}
export function GoalSheet({ onClose, onSubmit }) {
  return (
    <Sheet title="New savings" onClose={onClose}>
      <GoalBody onSubmit={onSubmit} />
    </Sheet>
  )
}

/* ------------------------------------------------------------ withdraw */
function WithdrawBody({ goal, onSubmit }) {
  const close = useSheetClose()
  const [amount, setAmount] = useState('')
  const [shake, setShake] = useState(0)
  const parsed = roundToCents(parseFloat(amount))
  const tooMuch = parsed > goal.currentAmount
  const ok = parsed > 0 && !tooMuch

  function submit() {
    if (!ok) return setShake((n) => n + 1)
    onSubmit(goal, parsed)
    close()
  }

  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())}>
      <p className="copy" style={{ marginBottom: 0 }}>
        {formatCurrency(goal.currentAmount)} in {goal.name}. What you take out goes back to spendable.
      </p>
      <AmountField value={amount} onChange={setAmount} onEnter={submit} shake={shake} />
      <div className="chips" style={{ justifyContent: 'center', marginBottom: 18 }}>
        {[0.25, 0.5, 1].map((f) => (
          <button key={f} type="button" className="chip press" onClick={() => setAmount(String(roundToCents(goal.currentAmount * f)))}>
            {f === 1 ? 'All' : `${f * 100}%`}
          </button>
        ))}
      </div>
      <div className={tooMuch ? 'fold show' : 'fold'}>
        <p className="msg-err">Only {formatCurrency(goal.currentAmount)} is in this pot.</p>
      </div>
      <button type="submit" className="cta press" disabled={!ok}>
        <TickText>{ok ? `Withdraw ${formatCurrency(parsed)}` : 'Withdraw'}</TickText>
      </button>
    </form>
  )
}
export function WithdrawSheet({ goal, onClose, onSubmit }) {
  return (
    <Sheet title={`Withdraw from ${goal.name}`} onClose={onClose}>
      <WithdrawBody goal={goal} onSubmit={onSubmit} />
    </Sheet>
  )
}

/* ------------------------------------------------------------ sync + backup */
function SyncBody({ enabled, message, onSave, onDisable, onExport, onImport }) {
  const close = useSheetClose()
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const file = useRef(null)

  async function pick(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setResult(onImport(await f.text()))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!secret.trim()) return setError('Enter your sync key')
        onSave(secret.trim())
        close()
      }}
    >
      <p className="copy">
        {enabled
          ? 'Sync is on for this device. Enter a new key to replace it, or turn sync off.'
          : 'Enter the sync key (the SYNC_SECRET set on Vercel) to keep this device in step with your others. It stays on this device only.'}
      </p>
      {enabled && message && <p className="msg-warn">{message}</p>}
      <label className="field">
        <span className="label">Sync key</span>
        <input data-autofocus className="text" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={enabled ? '••••••••' : 'Your sync key'} />
      </label>
      {error && <p className="msg-err">{error}</p>}
      <button type="submit" className="cta press">{enabled ? 'Replace key' : 'Turn on sync'}</button>
      {enabled && (
        <button
          type="button"
          className="ghost danger press"
          style={{ marginTop: 6 }}
          onClick={() => {
            onDisable()
            close()
          }}
        >
          Turn off sync
        </button>
      )}

      <h3 className="sub-title">Backup</h3>
      <div className="pair">
        <button type="button" className="chip press" onClick={onExport}><Icon name="download" size={16} />&nbsp; Export</button>
        <button type="button" className="chip press" onClick={() => file.current?.click()}><Icon name="upload" size={16} />&nbsp; Import</button>
      </div>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={pick} />
      <div className={result ? 'fold show' : 'fold'}>
        <p className={result?.ok ? 'msg-ok' : 'msg-err'} style={{ paddingTop: 12 }}>{result?.message}</p>
      </div>
    </form>
  )
}
export function SyncSheet({ onClose, ...rest }) {
  return (
    <Sheet title="Sync & backup" onClose={onClose}>
      <SyncBody {...rest} />
    </Sheet>
  )
}

/* ------------------------------------------------------------ budgets */
function BudgetBody({ categories, budgets, onSubmit }) {
  const close = useSheetClose()
  const names = categoriesForType('expense', categories)
  const [limits, setLimits] = useState(() => Object.fromEntries(names.map((n) => [n, budgets?.[n] > 0 ? String(budgets[n]) : ''])))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const next = {}
        for (const [n, raw] of Object.entries(limits)) {
          const v = roundToCents(parseFloat(raw))
          if (v > 0) next[n] = v
        }
        onSubmit(next)
        close()
      }}
    >
      <p className="copy">A monthly limit per category. Leave one blank for no limit.</p>
      <div className="group">
        {names.map((n, i) => (
          <label key={n} className="budget-row">
            <span>{n}</span>
            <span className="prefix">
              <span>$</span>
              <input
                className="text"
                inputMode="decimal"
                placeholder="No limit"
                value={limits[n] ?? ''}
                {...(i === 0 ? { 'data-autofocus': true } : {})}
                onChange={(e) => setLimits((p) => ({ ...p, [n]: cleanAmount(e.target.value) }))}
              />
            </span>
          </label>
        ))}
      </div>
      <button type="submit" className="cta press">Save budgets</button>
    </form>
  )
}
export function BudgetSheet({ onClose, ...rest }) {
  return (
    <Sheet title="Monthly budgets" onClose={onClose}>
      <BudgetBody {...rest} />
    </Sheet>
  )
}

/* ------------------------------------------------------------ categories */
function CategoryGroup({ title, type, items, onAdd, onRemove }) {
  const [name, setName] = useState('')
  return (
    <div className="group">
      <h3 className="sub-title" style={{ marginTop: 6 }}>{title}</h3>
      {items.map((c) => (
        <div key={c} className="manage-row">
          <span>{c}</span>
          <button type="button" className="press" onClick={() => onRemove(type, c)} disabled={items.length <= 1} aria-label={`Remove ${c}`}>
            Remove
          </button>
        </div>
      ))}
      <form
        className="inline-add"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          onAdd(type, name.trim())
          setName('')
        }}
      >
        <input className="text" placeholder={`New ${title.toLowerCase()} category`} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="chip press" disabled={!name.trim()}>Add</button>
      </form>
    </div>
  )
}
export function CategoriesSheet({ categories, onClose, onAdd, onRemove }) {
  return (
    <Sheet title="Categories" onClose={onClose}>
      <CategoryGroup title="Expense" type="expense" items={categories.expense} onAdd={onAdd} onRemove={onRemove} />
      <CategoryGroup title="Income" type="income" items={categories.income} onAdd={onAdd} onRemove={onRemove} />
    </Sheet>
  )
}

/* ------------------------------------------------------------ bulk add */
const BULK_HINT = `-64.20 groceries\n-48 fuel @Gas\n+400 freelance edit 14/11\n-22.40 ride home @Transport`

function BulkBody({ categories, onSubmit }) {
  const close = useSheetClose()
  const [text, setText] = useState('')
  const results = useMemo(() => parseBulkTransactions(text, categories), [text, categories])
  const good = results.filter((r) => r.ok)
  const bad = results.length - good.length

  return (
    <>
      <p className="copy">
        One per line: <code>-</code> or <code>+</code>, the amount, a description, an optional date, and <code>@Category</code>.
      </p>
      <textarea data-autofocus className="text group" rows={6} placeholder={BULK_HINT} value={text} onChange={(e) => setText(e.target.value)} />
      <div className={text.trim() ? 'fold show' : 'fold'}>
        <div>
          <p className="label">{good.length} ready{bad > 0 && `, ${bad} to fix`}</p>
          <div className="bulk-list">
            {results.map((r, i) =>
              r.ok ? (
                <div key={i} className="bulk-row">
                  <span>{r.transaction.description || r.transaction.category}</span>
                  <span style={{ color: r.transaction.type === 'income' ? 'var(--pos)' : undefined, fontWeight: 560 }}>
                    {r.transaction.type === 'income' ? '+' : '−'}
                    {formatCurrency(r.transaction.amount)}
                  </span>
                  <span className="label">
                    {r.transaction.category} · {formatDateLabel(r.transaction.date)}
                    {r.warning ? ` · ${r.warning}` : ''}
                  </span>
                </div>
              ) : (
                <div key={i} className="bulk-row bad">
                  <span>{r.raw.trim()}</span>
                  <span className="label">{r.error}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="cta press"
        disabled={!good.length}
        onClick={() => {
          onSubmit(good.map((r) => r.transaction))
          close()
        }}
      >
        <TickText>{good.length ? `Add ${good.length} ${good.length === 1 ? 'entry' : 'entries'}` : 'Add entries'}</TickText>
      </button>
    </>
  )
}
export function BulkSheet({ onClose, ...rest }) {
  return (
    <Sheet title="Bulk add" onClose={onClose}>
      <BulkBody {...rest} />
    </Sheet>
  )
}

/* ------------------------------------------------------------ recurring */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function RecurringBody({ rule, categories, onSubmit, onDelete }) {
  const close = useSheetClose()
  const editing = Boolean(rule)
  const [type, setType] = useState(rule?.type ?? 'expense')
  const [amount, setAmount] = useState(rule ? String(rule.amount) : '')
  const [description, setDescription] = useState(rule?.description ?? '')
  const [category, setCategory] = useState(rule?.category ?? defaultCategoryForType('expense', categories))
  const [cadence, setCadence] = useState(rule?.cadence ?? 'monthly')
  const [anchorDay, setAnchorDay] = useState(rule ? String(rule.anchorDay) : '1')
  const [shake, setShake] = useState(0)
  const [error, setError] = useState('')

  const parsed = roundToCents(parseFloat(amount))

  function submit() {
    if (!(parsed > 0)) return setShake((n) => n + 1)
    if (!description.trim()) return setError('Give it a name, like Rent')
    const day = Number(anchorDay)
    onSubmit({
      id: editing ? rule.id : generateId(),
      type,
      amount: parsed,
      description: description.trim(),
      category,
      cadence,
      anchorDay: day,
      // keep the schedule position when editing unless the schedule changed
      nextDue: editing && rule.cadence === cadence && rule.anchorDay === day ? rule.nextDue : computeFirstDue(cadence, day),
      createdAt: editing ? rule.createdAt : Date.now(),
    })
    close()
  }

  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())}>
      <Seg
        label="Type"
        value={type}
        onChange={(t) => {
          setType(t)
          setCategory(defaultCategoryForType(t, categories))
        }}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
      />
      <AmountField value={amount} onChange={setAmount} onEnter={submit} shake={shake} />
      <input className="text group" placeholder={type === 'income' ? 'Salary' : 'Rent'} value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Name" />
      <p className="label lbl">Category</p>
      <div className="group">
        <Chips label="Category" swapKey={type} value={category} onChange={setCategory} options={categoriesForType(type, categories)} />
      </div>
      <p className="label lbl">Repeats</p>
      <div className="group">
        <Seg
          label="Repeats"
          value={cadence}
          onChange={(c) => {
            setCadence(c)
            setAnchorDay('1')
          }}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />
      </div>
      <label className="field">
        <span className="label">{cadence === 'monthly' ? 'Day of the month' : 'Day of the week'}</span>
        <select className="text" value={anchorDay} onChange={(e) => setAnchorDay(e.target.value)}>
          {cadence === 'monthly'
            ? Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)
            : WEEKDAYS.map((n, i) => <option key={n} value={i}>{n}</option>)}
        </select>
      </label>
      {error && <p className="msg-err">{error}</p>}
      <button type="submit" className="cta press">
        <TickText>{parsed > 0 ? `${editing ? 'Save' : 'Create'} · ${type === 'income' ? '+' : '−'}${formatCurrency(parsed)} ${cadence}` : editing ? 'Save' : 'Create'}</TickText>
      </button>
      {editing && (
        <button
          type="button"
          className="ghost danger press"
          style={{ marginTop: 6 }}
          onClick={() => {
            onDelete(rule)
            close()
          }}
        >
          Stop this recurring entry
        </button>
      )}
    </form>
  )
}
export function RecurringSheet({ rule, onClose, ...rest }) {
  return (
    <Sheet title={rule ? 'Edit recurring' : 'New recurring'} onClose={onClose}>
      <RecurringBody rule={rule} {...rest} />
    </Sheet>
  )
}
