const DEMO_FLAG = 'finance_demo_seeded_v2'

export function applySampleDataIfNeeded(data) {
  try {
    if (localStorage.getItem(DEMO_FLAG)) return data
  } catch {
    return data
  }

  const now = Date.now()
  const day = 86400000

  const goalPhone = {
    id: 'demo-goal-phone',
    name: 'Phone',
    targetAmount: 1000,
    currentAmount: 150,
    createdAt: now - day * 30,
  }

  const sampleTransactions = [
    {
      id: 'demo-tx-1',
      type: 'income',
      amount: 3500,
      description: 'Salary',
      category: 'Salary',
      date: now - day * 2,
    },
    {
      id: 'demo-tx-2',
      type: 'expense',
      amount: 45,
      description: 'Bus pass',
      category: 'Transport',
      date: now - day * 2 + 3600000,
    },
    {
      id: 'demo-tx-3',
      type: 'expense',
      amount: 82,
      description: 'Groceries',
      category: 'Food',
      date: now - day,
    },
    {
      id: 'demo-tx-4',
      type: 'expense',
      amount: 60,
      description: 'Fill-up',
      category: 'Gas',
      date: now - day + 7200000,
    },
    {
      id: 'demo-tx-5',
      type: 'expense',
      amount: 120,
      description: 'Winter jacket',
      category: 'Clothes',
      date: now - 43200000,
    },
    {
      id: 'demo-tx-6',
      type: 'expense',
      amount: 28,
      description: 'Uber',
      category: 'Transport',
      date: now - 21600000,
    },
    {
      id: 'demo-tx-7',
      type: 'savings_transfer',
      amount: 150,
      description: 'Transfer to Phone',
      goalId: 'demo-goal-phone',
      date: now - day * 3,
    },
  ]

  const existingIds = new Set(data.transactions.map((t) => t.id))
  const newTransactions = sampleTransactions.filter((t) => !existingIds.has(t.id))

  const hasGoal = data.savingsGoals.some((g) => g.id === goalPhone.id)
  const savingsGoals = hasGoal ? data.savingsGoals : [...data.savingsGoals, goalPhone]

  const merged = {
    transactions: [...newTransactions, ...data.transactions],
    savingsGoals,
  }

  try {
    localStorage.setItem(DEMO_FLAG, '1')
  } catch {
    // ignore
  }

  return merged
}
