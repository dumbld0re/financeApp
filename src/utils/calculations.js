export function getActiveGoals(savingsGoals) {
  return savingsGoals.filter((g) => !g.completedAt)
}

export function roundToCents(amount) {
  return Math.round(amount * 100) / 100
}

export function computeTotalBalance(transactions) {
  return roundToCents(
    transactions.reduce((sum, t) => {
      if (t.type === 'income') return sum + t.amount
      if (t.type === 'expense' || t.type === 'goal_complete') return sum - t.amount
      return sum
    }, 0)
  )
}

export function computeAllocatedSavings(savingsGoals) {
  return roundToCents(
    getActiveGoals(savingsGoals).reduce((sum, g) => sum + g.currentAmount, 0)
  )
}

export function computeNetBalance(transactions, savingsGoals) {
  return computeTotalBalance(transactions) - computeAllocatedSavings(savingsGoals)
}

export function computeTotalSavings(savingsGoals) {
  return computeAllocatedSavings(savingsGoals)
}

export function computeSavingsPercentage(totalBalance, totalSavings) {
  if (totalBalance <= 0) return null
  return (totalSavings / totalBalance) * 100
}

export function formatCurrency(amount) {
  // whole dollars stay clean ($120), cents show when present ($10.50)
  const hasCents = !Number.isInteger(roundToCents(amount))
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount)
}

export function formatDateLabel(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startOfToday - startOfDate) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

export function groupTransactionsByDate(transactions) {
  const groups = []

  for (const tx of transactions) {
    const key = new Date(tx.date || 0).toDateString()
    const last = groups[groups.length - 1]

    if (last && new Date(last.date).toDateString() === key) {
      last.items.push(tx)
    } else {
      groups.push({ date: tx.date || 0, items: [tx] })
    }
  }

  return groups
}

export function computeMonthSummary(transactions, year, month) {
  let income = 0
  let spent = 0
  let saved = 0
  const spentByCategory = new Map()

  for (const t of transactions) {
    const d = new Date(t.date || 0)
    if (d.getFullYear() !== year || d.getMonth() !== month) continue

    if (t.type === 'income') {
      income += t.amount
    } else if (t.type === 'expense') {
      spent += t.amount
      const cat = t.category || 'Other'
      spentByCategory.set(cat, (spentByCategory.get(cat) || 0) + t.amount)
    } else if (t.type === 'goal_complete') {
      spent += t.amount
      spentByCategory.set(
        'Goal purchases',
        (spentByCategory.get('Goal purchases') || 0) + t.amount
      )
    } else if (t.type === 'savings_transfer') {
      saved += t.amount
    }
  }

  const categories = [...spentByCategory.entries()]
    .map(([name, amount]) => ({ name, amount: roundToCents(amount) }))
    .sort((a, b) => b.amount - a.amount)

  return {
    income: roundToCents(income),
    spent: roundToCents(spent),
    saved: roundToCents(saved),
    net: roundToCents(income - spent),
    categories,
  }
}

// Budget progress for a given month. Pairs each budgeted expense category with
// what was actually spent in that month, sorted by how close to (or over) the
// limit each one is, so the tightest categories surface first.
export function computeBudgetStatus(transactions, budgets, year, month) {
  const { categories } = computeMonthSummary(transactions, year, month)
  const spentByCategory = new Map(categories.map((c) => [c.name, c.amount]))

  const rows = Object.entries(budgets || {})
    .filter(([, limit]) => Number(limit) > 0)
    .map(([name, limit]) => {
      const lim = roundToCents(Number(limit))
      const spent = roundToCents(spentByCategory.get(name) || 0)
      return {
        name,
        limit: lim,
        spent,
        remaining: roundToCents(lim - spent),
        pct: lim > 0 ? (spent / lim) * 100 : 0,
        over: spent > lim,
      }
    })
    .sort((a, b) => b.pct - a.pct)

  const totalLimit = roundToCents(rows.reduce((s, r) => s + r.limit, 0))
  const totalSpent = roundToCents(rows.reduce((s, r) => s + r.spent, 0))

  return {
    rows,
    totalLimit,
    totalSpent,
    totalRemaining: roundToCents(totalLimit - totalSpent),
  }
}

// Income / spent / net for the last `monthsBack` months up to and including the
// month of `refDate`, oldest first — the shape the insights trend chart wants.
export function computeMonthlyTrend(transactions, monthsBack = 6, refDate = new Date()) {
  const months = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1)
    const s = computeMonthSummary(transactions, d.getFullYear(), d.getMonth())
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      income: s.income,
      spent: s.spent,
      net: s.net,
    })
  }
  return months
}

export function toDateInputValue(timestamp) {
  const d = new Date(timestamp)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateInputValue(value) {
  const [y, m, d] = value.split('-').map(Number)
  // midday keeps the date stable across timezones
  return new Date(y, m - 1, d, 12).getTime()
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function isLongTerm(goal) {
  return goal.kind === 'long_term'
}
