export const INCOME_CATEGORIES = ['Salary']

export const EXPENSE_CATEGORIES = ['Transport', 'Gas', 'Clothes', 'Food']

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export function categoriesForType(type) {
  if (type === 'income') return INCOME_CATEGORIES
  if (type === 'expense') return EXPENSE_CATEGORIES
  return []
}

export function defaultCategoryForType(type) {
  const list = categoriesForType(type)
  return list[0] ?? ''
}
