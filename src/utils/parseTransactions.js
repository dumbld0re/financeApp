import { generateId, roundToCents } from './calculations'

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

function monthIndex(name) {
  const lower = name.toLowerCase()
  return MONTHS.findIndex((m) => m === lower || m.slice(0, 3) === lower.slice(0, 3))
}

// Pulls a date out of the line and returns { date, rest } with the matched
// text removed. Falls back to "today" (null) when no date token is present.
// Any date that lands in the future is rolled back a year, since forgotten
// transactions are always in the past (handles Jan entries for last December).
function makeDate(year, month, day) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  const d = new Date(year, month, day, 12)
  // reject rollovers like 31 Feb turning into early March
  if (d.getMonth() !== month || d.getDate() !== day) return null
  return d
}

function extractDate(line, now) {
  // ordered by specificity; each is tried against every match in the line so a
  // false early hit (e.g. "70 airtime" read as day/month) can't hide the real
  // date that appears later on the line.
  const patterns = [
    // ISO 2026-07-02
    { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, build: (m) => makeDate(+m[1], +m[2] - 1, +m[3]) },
    // 2 July / 2/July / 2-Jul
    {
      re: /\b(\d{1,2})[/\s-]([A-Za-z]{3,9})\b/g,
      build: (m) => {
        const mi = monthIndex(m[2])
        return mi < 0 ? null : makeDate(now.getFullYear(), mi, +m[1])
      },
    },
    // July 2 / Jul 2
    {
      re: /\b([A-Za-z]{3,9})[/\s-](\d{1,2})\b/g,
      build: (m) => {
        const mi = monthIndex(m[1])
        return mi < 0 ? null : makeDate(now.getFullYear(), mi, +m[2])
      },
    },
    // 2/7 or 2/7/2026 (day/month[/year])
    {
      re: /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g,
      build: (m) => {
        let year = now.getFullYear()
        if (m[3]) year = m[3].length === 2 ? 2000 + +m[3] : +m[3]
        return makeDate(year, +m[2] - 1, +m[1])
      },
    },
  ]

  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  for (const { re, build } of patterns) {
    for (const m of line.matchAll(re)) {
      const d = build(m)
      if (!d) continue
      // roll a future date back one year (unless the year was written explicitly)
      if (d > endOfToday && !/\d{4}/.test(m[0])) {
        d.setFullYear(d.getFullYear() - 1)
      }
      const rest = (line.slice(0, m.index) + line.slice(m.index + m[0].length))
        .replace(/\s+/g, ' ')
        .trim()
      return { date: d.getTime(), rest }
    }
  }

  return { date: null, rest: line }
}

function matchCategory(description, list) {
  const lower = description.toLowerCase()
  // longest name first so "Long Term Food" beats "Food" if both existed
  const sorted = [...list].sort((a, b) => b.length - a.length)
  for (const cat of sorted) {
    const re = new RegExp(`\\b${cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(lower)) return cat
  }
  return null
}

export function parseTransactionLine(rawLine, categories, now = new Date()) {
  const trimmed = rawLine.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  let line = trimmed
  let forcedCategory = null

  // explicit "@Category" override anywhere in the line
  const at = line.match(/@([A-Za-z0-9 ][A-Za-z0-9 ]*?)(?=\s@|\s*$)/)
  if (at) {
    forcedCategory = at[1].trim()
    line = (line.slice(0, at.index) + line.slice(at.index + at[0].length)).replace(/\s+/g, ' ').trim()
  }

  // leading sign decides type; default to expense (the common case)
  let type = 'expense'
  if (/^\+/.test(line)) {
    type = 'income'
    line = line.replace(/^\+/, '').trim()
  } else if (/^-/.test(line)) {
    line = line.replace(/^-/, '').trim()
  }

  // pull the date out before the amount so the date's digits aren't grabbed
  const { date: parsedDate, rest: afterDate } = extractDate(line, now)

  // first number token is the amount (strip thousands separators)
  const amountMatch = afterDate.match(/\d+(?:[.,]\d+)?/)
  if (!amountMatch) {
    return { ok: false, raw: rawLine, error: 'No amount found' }
  }
  const amount = roundToCents(parseFloat(amountMatch[0].replace(/,/g, '')))
  if (!amount || amount <= 0) {
    return { ok: false, raw: rawLine, error: 'Amount must be greater than zero' }
  }

  let description = (
    afterDate.slice(0, amountMatch.index) + afterDate.slice(amountMatch.index + amountMatch[0].length)
  )
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const list = type === 'income' ? categories.income : categories.expense
  let category = list[0] || ''
  let warning = null

  if (forcedCategory) {
    const found = list.find((c) => c.toLowerCase() === forcedCategory.toLowerCase())
    if (found) {
      category = found
    } else {
      warning = `Category "${forcedCategory}" not found — using ${category}`
    }
  } else {
    const matched = matchCategory(description, list)
    if (matched) category = matched
  }

  if (type === 'expense' && !description) {
    description = category
  }

  const transaction = {
    id: generateId(),
    type,
    amount,
    description: type === 'income' ? category : description,
    category,
    date: parsedDate ?? now.getTime(),
  }

  return { ok: true, raw: rawLine, transaction, dated: parsedDate != null, warning }
}

export function parseBulkTransactions(text, categories, now = new Date()) {
  return text
    .split('\n')
    .map((line) => parseTransactionLine(line, categories, now))
    .filter(Boolean)
}
