export function computeNetBalance(transactions) {
  return transactions.reduce((sum, t) => {
    if (t.type === 'income') return sum + t.amount
    if (t.type === 'expense' || t.type === 'savings_transfer') return sum - t.amount
    return sum
  }, 0)
}

export function computeTotalSavings(savingsGoals) {
  return savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0)
}

export function computeTotalBalance(transactions, savingsGoals) {
  const liquid = computeNetBalance(transactions)
  const savings = computeTotalSavings(savingsGoals)
  return liquid + savings
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

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
