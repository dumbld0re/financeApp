import { roundToCents } from './calculations'

const CADENCES = ['weekly', 'monthly']

export function dateKey(timestamp) {
  const d = new Date(timestamp)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Next occurrence at/after `now` for a rule's cadence + anchor.
export function computeFirstDue(cadence, anchorDay, now = new Date()) {
  if (cadence === 'weekly') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
    const diff = (Number(anchorDay) - d.getDay() + 7) % 7
    d.setDate(d.getDate() + diff)
    return d.getTime()
  }
  // monthly
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const day = Math.min(Number(anchorDay), dim)
  let due = new Date(now.getFullYear(), now.getMonth(), day, 12)
  if (due < today) {
    const nextDim = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()
    due = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(Number(anchorDay), nextDim), 12)
  }
  return due.getTime()
}

export function advanceDue(rule, from) {
  const d = new Date(from)
  if (rule.cadence === 'weekly') {
    d.setDate(d.getDate() + 7)
    return d.getTime()
  }
  // monthly — clamp the anchor day into the next month's length
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(Number(rule.anchorDay), dim))
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

export function normalizeRule(rule) {
  const cadence = CADENCES.includes(rule.cadence) ? rule.cadence : 'monthly'
  return {
    id: String(rule.id),
    type: rule.type === 'income' ? 'income' : 'expense',
    amount: roundToCents(Number(rule.amount) || 0),
    description: String(rule.description ?? ''),
    category: String(rule.category ?? ''),
    cadence,
    anchorDay: Number(rule.anchorDay) || (cadence === 'weekly' ? 0 : 1),
    nextDue: Number(rule.nextDue) || Date.now(),
    createdAt: Number(rule.createdAt) || Date.now(),
  }
}

// Posts any occurrences due at/before `now`, advancing each rule's nextDue.
// Auto-posted transactions carry a deterministic id so the same occurrence
// posted on two devices collapses to one row on sync. Idempotent: an id that
// already exists is never posted again. Returns null when nothing changed.
export function applyRecurring(data, now = new Date()) {
  const rules = data.recurring || []
  if (rules.length === 0) return null

  const nowTs = now.getTime()
  const existing = new Set(data.transactions.map((t) => t.id))
  const newTransactions = []
  let changed = false

  const recurring = rules.map((rule) => {
    let due = rule.nextDue
    let guard = 0
    while (due <= nowTs && guard < 240) {
      guard += 1
      const id = `recur-${rule.id}-${dateKey(due)}`
      if (!existing.has(id)) {
        existing.add(id)
        newTransactions.push({
          id,
          type: rule.type,
          amount: rule.amount,
          description: rule.description || rule.category,
          category: rule.category,
          date: due,
          recurringId: rule.id,
        })
        changed = true
      }
      due = advanceDue(rule, due)
    }
    if (due !== rule.nextDue) {
      changed = true
      return { ...rule, nextDue: due }
    }
    return rule
  })

  if (!changed) return null

  return {
    transactions: [...newTransactions, ...data.transactions],
    recurring,
  }
}
