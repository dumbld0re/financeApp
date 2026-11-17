import { useState } from 'react'
import {
  formatCurrency,
  fromDateInputValue,
  generateId,
  getActiveGoals,
  roundToCents,
  toDateInputValue,
} from '../utils/calculations'
import { categoriesForType, defaultCategoryForType } from '../utils/categories'
import Sheet, { useSheetClose } from './Sheet'
import { AmountField, Chips, Seg, TickText } from './controls'

const TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'savings_transfer', label: 'Save' },
]

function dayChoice(ts) {
  const today = toDateInputValue(Date.now())
  const yest = toDateInputValue(Date.now() - 86400000)
  const v = toDateInputValue(ts)
  return v === today ? 'today' : v === yest ? 'yesterday' : 'other'
}

function Form({ goals, categories, preselectedGoalId, transaction, netBalance, onSubmit, onDelete }) {
  const close = useSheetClose()
  const editing = Boolean(transaction)
  const goalAdd = Boolean(preselectedGoalId)

  const [type, setType] = useState(editing ? transaction.type : goalAdd ? 'savings_transfer' : 'expense')
  const [amount, setAmount] = useState(editing ? String(transaction.amount) : '')
  const [note, setNote] = useState(() => {
    if (!editing) return ''
    if (transaction.type === 'income') return transaction.description !== transaction.category ? transaction.description || '' : ''
    if (transaction.type === 'savings_transfer') return ''
    return transaction.description || ''
  })
  const [category, setCategory] = useState(editing ? transaction.category || '' : defaultCategoryForType('expense', categories))
  const [goalId, setGoalId] = useState(preselectedGoalId ?? (editing ? transaction.goalId || '' : ''))
  const [day, setDay] = useState(editing ? dayChoice(transaction.date) : 'today')
  const [dateStr, setDateStr] = useState(toDateInputValue(editing ? transaction.date : Date.now()))
  const [shake, setShake] = useState(0)

  // categories that were removed after an entry used them stay selectable
  const base = categoriesForType(type, categories)
  const catOptions = editing && transaction.category && !base.includes(transaction.category) ? [transaction.category, ...base] : base

  let goalOptions = getActiveGoals(goals)
  if (editing && transaction.goalId && !goalOptions.some((g) => g.id === transaction.goalId)) {
    const known = goals.find((g) => g.id === transaction.goalId)
    goalOptions = [known || { id: transaction.goalId, name: 'Former goal' }, ...goalOptions]
  }
  const goalPick = goalId || goalOptions[0]?.id || ''

  const parsed = roundToCents(parseFloat(amount))
  const valid = parsed > 0 && (type !== 'savings_transfer' || goalPick)

  // money already counted by the entry being edited comes back first
  const refund = editing && (transaction.type === 'expense' || transaction.type === 'savings_transfer') ? transaction.amount : 0
  const available = roundToCents((netBalance ?? 0) + refund)
  const overspend = valid && type !== 'income' && parsed > available

  function changeType(next) {
    setType(next)
    setCategory(defaultCategoryForType(next, categories))
  }

  function submit() {
    if (!valid) {
      setShake((n) => n + 1)
      return
    }
    const picked = day === 'today' ? toDateInputValue(Date.now()) : day === 'yesterday' ? toDateInputValue(Date.now() - 86400000) : dateStr
    let date
    if (editing && picked === toDateInputValue(transaction.date)) date = transaction.date
    else if (picked === toDateInputValue(Date.now())) date = Date.now()
    else date = fromDateInputValue(picked)

    const goal = goalOptions.find((g) => g.id === goalPick)
    const next = {
      id: editing ? transaction.id : generateId(),
      type,
      amount: parsed,
      date,
      description:
        type === 'savings_transfer'
          ? note.trim() || `Transfer to ${goal?.name ?? 'savings'}`
          : note.trim() || category,
    }
    if (type === 'income' || type === 'expense') next.category = category
    if (type === 'savings_transfer') next.goalId = goalPick
    onSubmit(next)
    close()
  }

  const sign = type === 'income' ? '+' : type === 'expense' ? '−' : ''
  const goalName = goalOptions.find((g) => g.id === goalPick)?.name
  const cta = !valid
    ? type === 'savings_transfer' && !goalOptions.length
      ? 'Create a savings goal first'
      : editing ? 'Save changes' : 'Add entry'
    : editing
      ? `Save ${sign}${formatCurrency(parsed)}`
      : type === 'savings_transfer'
        ? `Save ${formatCurrency(parsed)} to ${goalName}`
        : `${overspend ? 'Add anyway' : 'Add'} ${sign}${formatCurrency(parsed)}`

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {!editing && !goalAdd && <Seg label="Type" options={TYPES} value={type} onChange={changeType} />}

      <AmountField value={amount} onChange={setAmount} onEnter={submit} shake={shake} />

      {type !== 'savings_transfer' && (
        <input
          className="text group"
          placeholder={type === 'income' ? 'From where? (optional)' : 'What was it?'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoComplete="off"
          aria-label="Note"
        />
      )}

      <p className="label lbl">{type === 'savings_transfer' ? 'Save to' : 'Category'}</p>
      <div className="group">
        {type === 'savings_transfer' ? (
          goalOptions.length ? (
            <Chips
              label="Save to"
              swapKey={type}
              value={goalPick}
              onChange={setGoalId}
              options={goalOptions.map((g) => ({ value: g.id, label: g.name }))}
            />
          ) : (
            <p className="copy">No savings goals yet. Create one from Savings.</p>
          )
        ) : (
          <Chips label="Category" swapKey={type} value={category} onChange={setCategory} options={catOptions} />
        )}
      </div>

      <p className="label lbl">Date</p>
      <div className="group">
        <Chips
          label="Date"
          value={day}
          onChange={setDay}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'yesterday', label: 'Yesterday' },
            { value: 'other', label: 'Pick a date' },
          ]}
        />
        <div className={day === 'other' ? 'fold show' : 'fold'}>
          <div>
            <input
              type="date"
              className="text"
              style={{ marginTop: 10 }}
              value={dateStr}
              max={toDateInputValue(Date.now() + 86400000 * 366)}
              onChange={(e) => setDateStr(e.target.value)}
              tabIndex={day === 'other' ? 0 : -1}
              aria-label="Date"
            />
          </div>
        </div>
      </div>

      <div className={overspend ? 'fold show' : 'fold'} aria-live="polite">
        <p className="msg-warn">That’s more than the {formatCurrency(available)} you have free. You can still add it.</p>
      </div>

      <button type="submit" className={valid ? 'cta press' : 'cta idle press'} disabled={type === 'savings_transfer' && !goalOptions.length}>
        <TickText>{cta}</TickText>
      </button>
      {editing && (
        <button
          type="button"
          className="ghost danger press"
          style={{ marginTop: 6 }}
          onClick={() => {
            onDelete(transaction)
            close()
          }}
        >
          Delete entry
        </button>
      )}
    </form>
  )
}

export default function EntrySheet(props) {
  const title = props.transaction ? 'Edit entry' : props.preselectedGoalId ? 'Add to savings' : 'New entry'
  return (
    <Sheet title={title} onClose={props.onClose}>
      <Form {...props} />
    </Sheet>
  )
}
