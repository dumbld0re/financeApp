import { migrateData } from './migrate'
import { DEFAULT_CATEGORIES } from './categories'

const STORAGE_KEY = 'finance_data'

export const DEFAULT_DATA = {
  transactions: [],
  savingsGoals: [],
  recurring: [],
  categories: { ...DEFAULT_CATEGORIES },
}

export function isValidData(data) {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.transactions) &&
    Array.isArray(data.savingsGoals)
  )
}

export function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_DATA }
    const parsed = JSON.parse(raw)
    if (!isValidData(parsed)) return { ...DEFAULT_DATA }
    return migrateData(parsed)
  } catch {
    return { ...DEFAULT_DATA }
  }
}

export function setData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore quota / private mode errors
  }
}

export function initializeDataIfEmpty() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setData({ ...DEFAULT_DATA })
      return { ...DEFAULT_DATA }
    }
    const parsed = JSON.parse(raw)
    if (!isValidData(parsed)) {
      setData({ ...DEFAULT_DATA })
      return { ...DEFAULT_DATA }
    }
    const migrated = migrateData(parsed)
    setData(migrated)
    return migrated
  } catch {
    setData({ ...DEFAULT_DATA })
    return { ...DEFAULT_DATA }
  }
}
