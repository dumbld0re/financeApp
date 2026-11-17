import { useCallback, useEffect, useRef, useState } from 'react'
import { setData, initializeDataIfEmpty, isValidData } from './utils/localStorage'
import { migrateData } from './utils/migrate'
import { mergeData, pullData, pushData, checkHealth, getClientSecret, setClientSecret } from './utils/sync'
import {
  computeMonthSummary,
  computeNetBalance,
  computeTotalBalance,
  computeTotalSavings,
  formatCurrency,
  generateId,
  roundToCents,
} from './utils/calculations'
import { applyRecurring } from './utils/recurring'
import Hero from './components/Hero'
import Statement, { describe } from './components/Statement'
import MonthSection from './components/MonthSection'
import SavingsSection from './components/SavingsSection'
import { BudgetsSection, RecurringSection } from './components/PlanSections'
import EntrySheet from './components/EntrySheet'
import {
  BudgetSheet,
  BulkSheet,
  CategoriesSheet,
  ConfirmSheet,
  GoalSheet,
  RecurringSheet,
  SyncSheet,
  WithdrawSheet,
} from './components/sheets'
import Icon, { Mark } from './components/Icon'
import { prefersReducedMotion, useMedia, useReady } from './components/motion'

const LEAVE_MS = 420

function adjustGoal(goals, goalId, delta) {
  return goals.map((g) =>
    g.id === goalId ? { ...g, currentAmount: Math.max(0, roundToCents(g.currentAmount + delta)) } : g
  )
}

export default function App() {
  const [data, setDataState] = useState(() => initializeDataIfEmpty())
  const [sheet, setSheet] = useState(null) // { kind, ...payload }
  const [leaving, setLeaving] = useState(() => new Set())
  const [toast, setToast] = useState(null) // { text, undo }
  const [syncSecret, setSyncSecretState] = useState(() => getClientSecret())
  const [syncStatus, setSyncStatus] = useState(getClientSecret() ? 'syncing' : 'local')
  const [syncMessage, setSyncMessage] = useState(null)
  const [active, setActive] = useState('overview')
  const [mini, setMini] = useState(false)

  const ready = useReady()
  const desktop = useMedia('(min-width: 1024px)')
  const dataRef = useRef(data)
  const lastSyncedRef = useRef(null)
  const pullDoneRef = useRef(false)
  const toastTimer = useRef(0)
  const searchRef = useRef(null)
  const figRef = useRef(null)

  const syncEnabled = Boolean(syncSecret)

  /* ------------------------------------------------------------ sync (unchanged logic) */
  useEffect(() => {
    if (!syncSecret) {
      setSyncStatus('local')
      setSyncMessage(null)
      return
    }
    let cancelled = false
    pullDoneRef.current = false

    async function syncFromCloud() {
      setSyncStatus('syncing')
      setSyncMessage(null)
      const health = await checkHealth()
      if (cancelled) return
      if (health && !health.redis) {
        pullDoneRef.current = true
        setSyncStatus('offline')
        setSyncMessage(health.detail || 'Redis missing — add Upstash Redis integration on Vercel')
        return
      }
      if (health && !health.serverSecret) {
        pullDoneRef.current = true
        setSyncStatus('offline')
        setSyncMessage('Add SYNC_SECRET on Vercel, then redeploy')
        return
      }
      const { data: remote, error } = await pullData()
      if (cancelled) return
      pullDoneRef.current = true
      if (error) {
        setSyncStatus('offline')
        setSyncMessage(error)
        return
      }
      if (!remote) {
        const snapshot = dataRef.current
        const result = await pushData(snapshot)
        if (cancelled) return
        if (result.ok) {
          lastSyncedRef.current = snapshot
          setSyncStatus('synced')
          setSyncMessage(null)
        } else {
          setSyncStatus('offline')
          setSyncMessage(result.error)
        }
        return
      }
      const migratedRemote = migrateData(remote)
      lastSyncedRef.current = migratedRemote
      // mergeData is pure and returns migratedRemote itself when local has
      // nothing new, so the push effect below can tell the two cases apart.
      setDataState((local) => mergeData(local, migratedRemote))
    }

    syncFromCloud()
    return () => {
      cancelled = true
    }
  }, [syncSecret])

  useEffect(() => {
    dataRef.current = data
    setData(data)
    if (!syncEnabled || !pullDoneRef.current) return
    if (data === lastSyncedRef.current) {
      setSyncStatus('synced')
      setSyncMessage(null)
      return
    }
    const timer = setTimeout(async () => {
      setSyncStatus('syncing')
      const snapshot = dataRef.current
      const result = await pushData(snapshot)
      if (result.ok) {
        lastSyncedRef.current = snapshot
        setSyncStatus('synced')
        setSyncMessage(null)
      } else {
        setSyncStatus('offline')
        setSyncMessage(result.error)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [data, syncEnabled])

  // Post any recurring items that have come due. applyRecurring returns null
  // once caught up, so this settles after at most one persist per due date.
  useEffect(() => {
    const result = applyRecurring(data)
    if (result) persist({ ...data, ...result })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.recurring, data.transactions.length])

  /* ------------------------------------------------------------ derived */
  const totalSavings = computeTotalSavings(data.savingsGoals)
  const netBalance = computeNetBalance(data.transactions, data.savingsGoals)
  const totalBalance = computeTotalBalance(data.transactions)
  const now = new Date()
  const month = computeMonthSummary(data.transactions, now.getFullYear(), now.getMonth())

  /* ------------------------------------------------------------ helpers */
  function persist(next) {
    setDataState({ ...next, updatedAt: Date.now() })
  }

  const showToast = useCallback((text, undo) => {
    clearTimeout(toastTimer.current)
    setToast({ text, undo, key: Date.now() })
    toastTimer.current = setTimeout(() => setToast((t) => (t ? { ...t, hide: true } : t)), undo ? 5000 : 2200)
  }, [])

  // every undoable change restores the snapshot taken just before it
  function withUndo(text, next, before = data) {
    persist(next)
    showToast(text, () => {
      persist(before)
      showToast('Undone')
    })
  }

  const open = (kind, payload = {}) => setSheet({ kind, ...payload })
  const closeSheet = useCallback(() => setSheet(null), [])

  /* ------------------------------------------------------------ transactions */
  function handleAddTransaction(tx) {
    const next = { ...data, transactions: [tx, ...data.transactions] }
    if (tx.type === 'savings_transfer' && tx.goalId) {
      next.savingsGoals = adjustGoal(data.savingsGoals, tx.goalId, tx.amount)
    }
    const d = describe(tx, next.savingsGoals)
    withUndo(tx.type === 'savings_transfer' ? `Saved ${formatCurrency(tx.amount)}` : `Added ${d.label} ${d.amt}`, next)
  }

  function handleUpdateTransaction(updated) {
    const prev = data.transactions.find((t) => t.id === updated.id)
    if (!prev) return
    let goals = data.savingsGoals
    if (prev.type === 'savings_transfer' && prev.goalId) goals = adjustGoal(goals, prev.goalId, -prev.amount)
    if (updated.type === 'savings_transfer' && updated.goalId) goals = adjustGoal(goals, updated.goalId, updated.amount)
    withUndo('Entry updated', {
      ...data,
      transactions: data.transactions.map((t) => (t.id === updated.id ? updated : t)),
      savingsGoals: goals,
    })
  }

  // the row folds away first, then the data changes
  function handleDeleteTransaction(tx) {
    setLeaving((s) => new Set(s).add(tx.id))
    setTimeout(() => {
      setDataState((current) => {
        let goals = current.savingsGoals
        if (tx.type === 'savings_transfer' && tx.goalId) goals = adjustGoal(goals, tx.goalId, -tx.amount)
        const next = {
          ...current,
          transactions: current.transactions.filter((t) => t.id !== tx.id),
          savingsGoals: goals,
          updatedAt: Date.now(),
        }
        showToast(`Deleted ${describe(tx, current.savingsGoals).label}`, () => {
          setDataState({ ...current, updatedAt: Date.now() })
          showToast('Restored')
        })
        return next
      })
      setLeaving((s) => {
        const n = new Set(s)
        n.delete(tx.id)
        return n
      })
    }, LEAVE_MS)
  }

  function handleBulkAdd(list) {
    if (!list.length) return
    withUndo(`Added ${list.length} ${list.length === 1 ? 'entry' : 'entries'}`, {
      ...data,
      transactions: [...list, ...data.transactions],
    })
  }

  /* ------------------------------------------------------------ goals */
  function handleCreateGoal({ name, targetAmount, kind }) {
    persist({
      ...data,
      savingsGoals: [
        ...data.savingsGoals,
        { id: generateId(), name, kind: kind === 'long_term' ? 'long_term' : 'goal', targetAmount, currentAmount: 0, createdAt: Date.now() },
      ],
    })
    showToast(`${name} created`)
  }

  function handleDeleteGoal(goal) {
    const transactions =
      goal.currentAmount > 0
        ? [
            { id: generateId(), type: 'savings_release', amount: goal.currentAmount, description: `Released from ${goal.name}`, goalId: goal.id, date: Date.now() },
            ...data.transactions,
          ]
        : data.transactions
    withUndo(`${goal.name} removed`, {
      ...data,
      transactions,
      savingsGoals: data.savingsGoals.filter((g) => g.id !== goal.id),
    })
  }

  function handleCompleteGoal(goal) {
    if (goal.currentAmount <= 0) return
    withUndo(`${goal.name} marked bought`, {
      ...data,
      transactions: [
        { id: generateId(), type: 'goal_complete', amount: goal.currentAmount, description: `Purchased: ${goal.name}`, goalId: goal.id, date: Date.now() },
        ...data.transactions,
      ],
      savingsGoals: data.savingsGoals.map((g) => (g.id === goal.id ? { ...g, currentAmount: 0, completedAt: Date.now() } : g)),
    })
  }

  function handleWithdraw(goal, amount) {
    withUndo(`Withdrew ${formatCurrency(amount)}`, {
      ...data,
      transactions: [
        { id: generateId(), type: 'savings_withdrawal', amount, description: `Withdrawn from ${goal.name}`, goalId: goal.id, date: Date.now() },
        ...data.transactions,
      ],
      savingsGoals: adjustGoal(data.savingsGoals, goal.id, -amount),
    })
  }

  /* ------------------------------------------------------------ recurring, budgets, categories */
  function handleSaveRecurring(rule) {
    const rules = data.recurring || []
    const exists = rules.some((r) => r.id === rule.id)
    persist({ ...data, recurring: exists ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule] })
    showToast(exists ? 'Recurring updated' : `${rule.description} will post itself`)
  }

  function handleDeleteRecurring(rule) {
    withUndo(`${rule.description} stopped`, {
      ...data,
      recurring: (data.recurring || []).filter((r) => r.id !== rule.id),
    })
  }

  function handleSaveBudgets(budgets) {
    persist({ ...data, budgets })
    showToast('Budgets saved')
  }

  function handleAddCategory(type, name) {
    // names are unique across both types: filters and lookups rely on it
    if (data.categories.income.includes(name) || data.categories.expense.includes(name)) return
    persist({ ...data, categories: { ...data.categories, [type]: [...data.categories[type], name] } })
  }

  function handleRemoveCategory(type, name) {
    const list = data.categories[type]
    if (list.length <= 1) return
    const budgets = { ...(data.budgets || {}) }
    delete budgets[name] // no orphaned budget for a removed category
    persist({ ...data, categories: { ...data.categories, [type]: list.filter((c) => c !== name) }, budgets })
  }

  /* ------------------------------------------------------------ sync + backup */
  function handleSaveSyncSecret(secret) {
    setClientSecret(secret)
    setSyncSecretState(secret)
  }

  function handleDisableSync() {
    setClientSecret('')
    setSyncSecretState('')
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // keeps only categories; undo restores everything
  function handleStartFresh() {
    withUndo('Started fresh, categories kept', {
      ...data,
      transactions: [],
      savingsGoals: [],
      recurring: [],
      budgets: {},
    })
  }

  function handleImport(text) {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return { ok: false, message: 'That isn’t a valid JSON file.' }
    }
    if (!isValidData(parsed)) return { ok: false, message: 'That isn’t a finance backup file.' }

    const cleaned = migrateData({
      ...parsed,
      transactions: parsed.transactions
        .filter((t) => t && t.id && Number.isFinite(Number(t.amount)) && Number(t.amount) >= 0 && Number.isFinite(Number(t.date)))
        .map((t) => ({ ...t, amount: roundToCents(Number(t.amount)), date: Number(t.date) })),
    })
    const merged = mergeData(cleaned, data)
    if (merged === data) return { ok: true, message: 'Nothing new to import.' }
    const added = merged.transactions.length - data.transactions.length
    persist(merged)
    return { ok: true, message: `Imported ${added} new ${added === 1 ? 'entry' : 'entries'}.` }
  }

  /* ------------------------------------------------------------ scroll spy, mini bar, keys */
  useEffect(() => {
    let raf = 0
    const run = () => {
      raf = 0
      const line = window.innerHeight * 0.42
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      const map = [['statement', 'overview'], ['savings', 'savings'], ['budgets', 'plan']]
      let key = map[0][1]
      for (const [id, k] of map) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < line) key = k
      }
      setActive(atEnd && window.scrollY > 0 ? map[map.length - 1][1] : key)
      if (!desktop) setMini((figRef.current?.getBoundingClientRect().bottom ?? 1) < 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(run)
    }
    run()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [desktop])

  function go(target) {
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
    if (target === 'top') window.scrollTo({ top: 0, behavior })
    else document.getElementById(target)?.scrollIntoView({ behavior, block: 'start' })
  }

  useEffect(() => {
    function onKey(e) {
      if (sheet || e.metaKey || e.ctrlKey || e.altKey) return
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        open('entry')
      } else if (e.key === '/') {
        e.preventDefault()
        go('statement')
        searchRef.current?.focus({ preventScroll: true })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ------------------------------------------------------------ render */
  return (
    <div className={['app', ready && 'ready', syncStatus === 'syncing' && 'syncing'].filter(Boolean).join(' ')}>
      <div className={mini ? 'mini show' : 'mini'} inert={!mini}>
        <Mark size={22} />
        <span className="mini-l">Spendable</span>
        <span className="mini-v">{formatCurrency(netBalance)}</span>
        <button type="button" className="add-m press" onClick={() => open('entry')} aria-label="New entry">
          <Icon name="plus" size={16} />
        </button>
      </div>

      <Hero
        ready={ready}
        totalBalance={totalBalance}
        netBalance={netBalance}
        totalSavings={totalSavings}
        monthIncome={month.income}
        monthSpent={month.spent}
        syncState={syncStatus}
        onOpenSync={() => open('sync')}
        navActive={active}
        onGo={go}
        onNew={() => open('entry')}
        figRef={figRef}
      />

      <main className="panel">
        <Statement
          transactions={data.transactions}
          goals={data.savingsGoals}
          categories={data.categories}
          totalBalance={totalBalance}
          leaving={leaving}
          searchRef={searchRef}
          onEdit={(tx) => open('entry', { transaction: tx })}
          onBulkAdd={() => open('bulk')}
          onCategories={() => open('categories')}
        />
        <div className="more">
          <MonthSection transactions={data.transactions} ready={ready} />
          <SavingsSection
            goals={data.savingsGoals}
            total={totalSavings}
            ready={ready}
            onNew={() => open('goal')}
            onAdd={(goalId) => open('entry', { goalId })}
            onWithdraw={(goal) => open('withdraw', { goal })}
            onComplete={(goal) => open('complete', { goal })}
            onDelete={(goal) => open('deleteGoal', { goal })}
          />
          <BudgetsSection transactions={data.transactions} budgets={data.budgets || {}} ready={ready} onEdit={() => open('budgets')} />
          <RecurringSection rules={data.recurring || []} onNew={() => open('recurring')} onEdit={(rule) => open('recurring', { rule })} />
        </div>
      </main>

      {sheet?.kind === 'entry' && (
        <EntrySheet
          goals={data.savingsGoals}
          categories={data.categories}
          preselectedGoalId={sheet.goalId}
          transaction={sheet.transaction}
          netBalance={netBalance}
          onClose={closeSheet}
          onSubmit={sheet.transaction ? handleUpdateTransaction : handleAddTransaction}
          onDelete={handleDeleteTransaction}
        />
      )}
      {sheet?.kind === 'goal' && <GoalSheet onClose={closeSheet} onSubmit={handleCreateGoal} />}
      {sheet?.kind === 'withdraw' && <WithdrawSheet goal={sheet.goal} onClose={closeSheet} onSubmit={handleWithdraw} />}
      {sheet?.kind === 'complete' && (
        <ConfirmSheet
          title="Mark as bought?"
          message={`${formatCurrency(sheet.goal.currentAmount)} in ${sheet.goal.name} will be recorded as spent.`}
          confirmLabel="Mark bought"
          onConfirm={() => handleCompleteGoal(sheet.goal)}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'deleteGoal' && (
        <ConfirmSheet
          title={sheet.goal.kind === 'long_term' ? 'Remove this pot?' : 'Delete this goal?'}
          message={
            sheet.goal.currentAmount > 0
              ? `${formatCurrency(sheet.goal.currentAmount)} in ${sheet.goal.name} goes back to your spendable balance.`
              : `${sheet.goal.name} has nothing in it yet.`
          }
          confirmLabel={sheet.goal.kind === 'long_term' ? 'Remove' : 'Delete'}
          danger
          onConfirm={() => handleDeleteGoal(sheet.goal)}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'sync' && (
        <SyncSheet
          enabled={syncEnabled}
          message={syncMessage}
          onClose={closeSheet}
          onSave={handleSaveSyncSecret}
          onDisable={handleDisableSync}
          onExport={handleExport}
          onImport={handleImport}
          onStartFresh={handleStartFresh}
        />
      )}
      {sheet?.kind === 'budgets' && (
        <BudgetSheet categories={data.categories} budgets={data.budgets || {}} onClose={closeSheet} onSubmit={handleSaveBudgets} />
      )}
      {sheet?.kind === 'categories' && (
        <CategoriesSheet categories={data.categories} onClose={closeSheet} onAdd={handleAddCategory} onRemove={handleRemoveCategory} />
      )}
      {sheet?.kind === 'bulk' && <BulkSheet categories={data.categories} onClose={closeSheet} onSubmit={handleBulkAdd} />}
      {sheet?.kind === 'recurring' && (
        <RecurringSheet
          rule={sheet.rule}
          categories={data.categories}
          onClose={closeSheet}
          onSubmit={handleSaveRecurring}
          onDelete={handleDeleteRecurring}
        />
      )}

      <div className={toast && !toast.hide ? 'toast show' : 'toast'} role="status" aria-live="polite">
        <span className="toast-t">{toast?.text}</span>
        {toast?.undo && (
          <button
            type="button"
            className="press"
            tabIndex={toast.hide ? -1 : 0}
            onClick={() => {
              const undo = toast.undo
              setToast((t) => ({ ...t, undo: null }))
              undo()
            }}
          >
            Undo
          </button>
        )}
      </div>
    </div>
  )
}
