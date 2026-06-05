export function getActiveGoals(savingsGoals) {
  return savingsGoals.filter((g) => !g.completedAt)
}

export function computeTotalBalance(transactions) {
  return transactions.reduce((sum, t) => {
    if (t.type === 'income') return sum + t.amount
    if (t.type === 'expense' || t.type === 'goal_complete') return sum - t.amount
    return sum
  }, 0)
}

export function computeAllocatedSavings(savingsGoals) {
  return getActiveGoals(savingsGoals).reduce((sum, g) => sum + g.currentAmount, 0)
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
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

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function isLongTerm(goal) {
  return goal.kind === 'long_term'
}
