export const DEFAULT_CATEGORIES = {
  income: ['Salary'],
  expense: ['Transport', 'Gas', 'Clothes', 'Food'],
}

export function allCategories(categories) {
  // dedupe: older data may have the same name in both income and expense
  return [...new Set([...(categories?.income ?? []), ...(categories?.expense ?? [])])]
}

export function categoriesForType(type, categories) {
  if (type === 'income') return categories?.income ?? DEFAULT_CATEGORIES.income
  if (type === 'expense') return categories?.expense ?? DEFAULT_CATEGORIES.expense
  return []
}

export function defaultCategoryForType(type, categories) {
  const list = categoriesForType(type, categories)
  return list[0] ?? ''
}
