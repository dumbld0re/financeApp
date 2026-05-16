import { DEFAULT_CATEGORIES } from './categories'

const DEMO_PREFIX = 'demo-'

function stripDemo(data) {
  return {
    transactions: data.transactions.filter((t) => !String(t.id).startsWith(DEMO_PREFIX)),
    savingsGoals: data.savingsGoals.filter((g) => !String(g.id).startsWith(DEMO_PREFIX)),
  }
}

function normalizeGoal(goal) {
  return {
    id: goal.id,
    name: goal.name,
    kind: goal.kind === 'long_term' ? 'long_term' : 'goal',
    targetAmount: Number(goal.targetAmount) || 0,
    currentAmount: Number(goal.currentAmount) || 0,
    createdAt: Number(goal.createdAt) || Date.now(),
    ...(goal.completedAt ? { completedAt: Number(goal.completedAt) } : {}),
  }
}

export function migrateData(data) {
  try {
    localStorage.removeItem('finance_demo_seeded')
    localStorage.removeItem('finance_demo_seeded_v2')
  } catch {
    // ignore
  }

  const stripped = stripDemo(data)

  const categories = {
    income: Array.isArray(data.categories?.income)
      ? [...data.categories.income]
      : [...DEFAULT_CATEGORIES.income],
    expense: Array.isArray(data.categories?.expense)
      ? [...data.categories.expense]
      : [...DEFAULT_CATEGORIES.expense],
  }

  const savingsGoals = stripped.savingsGoals.map(normalizeGoal)

  return {
    transactions: stripped.transactions,
    savingsGoals,
    categories,
    ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
  }
}
