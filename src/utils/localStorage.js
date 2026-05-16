import { applySampleDataIfNeeded } from './sampleData'

const STORAGE_KEY = 'finance_data'

const DEFAULT_DATA = {
  transactions: [],
  savingsGoals: [],
}

function isValidData(data) {
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
    return parsed
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

function finalizeData(data) {
  const withSamples = applySampleDataIfNeeded(data)
  setData(withSamples)
  return withSamples
}

export function initializeDataIfEmpty() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return finalizeData({ ...DEFAULT_DATA })
    }
    const parsed = JSON.parse(raw)
    if (!isValidData(parsed)) {
      return finalizeData({ ...DEFAULT_DATA })
    }
    return finalizeData(parsed)
  } catch {
    return finalizeData({ ...DEFAULT_DATA })
  }
}
