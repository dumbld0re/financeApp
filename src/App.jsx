import { useState, useEffect, useRef } from 'react'
import { setData, initializeDataIfEmpty, isValidData } from './utils/localStorage'
import { migrateData } from './utils/migrate'
import {
  mergeData,
  pullData,
  pushData,
  checkHealth,
  getClientSecret,
  setClientSecret,
} from './utils/sync'
import {
  computeNetBalance,
  computeTotalBalance,
  computeTotalSavings,
  computeSavingsPercentage,
  formatCurrency,
  generateId,
  roundToCents,
} from './utils/calculations'
import BalanceHeader from './components/BalanceHeader'
import MonthlySummary from './components/MonthlySummary'
import SavingsGoals from './components/SavingsGoals'
import WithdrawModal from './components/WithdrawModal'
import TransactionList from './components/TransactionList'
import TransactionModal from './components/TransactionModal'
import GoalModal from './components/GoalModal'
import ConfirmModal from './components/ConfirmModal'
import CategoriesModal from './components/CategoriesModal'
import SyncModal from './components/SyncModal'

export default function App() {
  const [data, setDataState] = useState(() => initializeDataIfEmpty())
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false)
  const [addToGoalId, setAddToGoalId] = useState(null)
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [goalToComplete, setGoalToComplete] = useState(null)
  const [goalToWithdraw, setGoalToWithdraw] = useState(null)
  const [transactionToEdit, setTransactionToEdit] = useState(null)
  const [transactionToDelete, setTransactionToDelete] = useState(null)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncSecret, setSyncSecretState] = useState(() => getClientSecret())
  const [syncStatus, setSyncStatus] = useState(getClientSecret() ? 'syncing' : 'local')
  const [syncMessage, setSyncMessage] = useState(null)
  const dataRef = useRef(data)
  const lastSyncedRef = useRef(null)
  const pullDoneRef = useRef(false)

  const syncEnabled = Boolean(syncSecret)

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

  function handleSaveSyncSecret(secret) {
    setClientSecret(secret)
    setSyncSecretState(secret)
    setSyncModalOpen(false)
  }

  function handleDisableSync() {
    setClientSecret('')
    setSyncSecretState('')
    setSyncModalOpen(false)
  }

  const totalSavings = computeTotalSavings(data.savingsGoals)
  const netBalance = computeNetBalance(data.transactions, data.savingsGoals)
  const totalBalance = computeTotalBalance(data.transactions)
  const savingsPercentage = computeSavingsPercentage(totalBalance, totalSavings)

  function persist(next) {
    setDataState({ ...next, updatedAt: Date.now() })
  }

  function handleAddTransaction(transaction) {
    const next = { ...data, transactions: [transaction, ...data.transactions] }

    if (transaction.type === 'savings_transfer' && transaction.goalId) {
      next.savingsGoals = data.savingsGoals.map((g) =>
        g.id === transaction.goalId
          ? { ...g, currentAmount: roundToCents(g.currentAmount + transaction.amount) }
          : g
      )
    }

    persist(next)
  }

  function handleCreateGoal({ name, targetAmount, kind }) {
    const goal = {
      id: generateId(),
      name,
      kind: kind === 'long_term' ? 'long_term' : 'goal',
      targetAmount,
      currentAmount: 0,
      createdAt: Date.now(),
    }
    persist({ ...data, savingsGoals: [...data.savingsGoals, goal] })
  }

  function handleConfirmDeleteGoal() {
    if (!goalToDelete) return

    const amount = goalToDelete.currentAmount
    let transactions = data.transactions

    if (amount > 0) {
      transactions = [
        {
          id: generateId(),
          type: 'savings_release',
          amount,
          description: `Released from ${goalToDelete.name}`,
          goalId: goalToDelete.id,
          date: Date.now(),
        },
        ...transactions,
      ]
    }

    persist({
      ...data,
      transactions,
      savingsGoals: data.savingsGoals.filter((g) => g.id !== goalToDelete.id),
    })
    setGoalToDelete(null)
  }

  function handleConfirmCompleteGoal() {
    if (!goalToComplete) return

    const amount = goalToComplete.currentAmount
    if (amount <= 0) {
      setGoalToComplete(null)
      return
    }

    persist({
      ...data,
      transactions: [
        {
          id: generateId(),
          type: 'goal_complete',
          amount,
          description: `Purchased: ${goalToComplete.name}`,
          goalId: goalToComplete.id,
          date: Date.now(),
        },
        ...data.transactions,
      ],
      savingsGoals: data.savingsGoals.map((g) =>
        g.id === goalToComplete.id
          ? { ...g, currentAmount: 0, completedAt: Date.now() }
          : g
      ),
    })
    setGoalToComplete(null)
  }

  function adjustGoalAmount(goals, goalId, delta) {
    return goals.map((g) =>
      g.id === goalId
        ? { ...g, currentAmount: Math.max(0, roundToCents(g.currentAmount + delta)) }
        : g
    )
  }

  function handleWithdrawFromGoal(goal, amount) {
    persist({
      ...data,
      transactions: [
        {
          id: generateId(),
          type: 'savings_withdrawal',
          amount,
          description: `Withdrawn from ${goal.name}`,
          goalId: goal.id,
          date: Date.now(),
        },
        ...data.transactions,
      ],
      savingsGoals: adjustGoalAmount(data.savingsGoals, goal.id, -amount),
    })
    setGoalToWithdraw(null)
  }

  function handleUpdateTransaction(updated) {
    const prev = data.transactions.find((t) => t.id === updated.id)
    if (!prev) return

    let savingsGoals = data.savingsGoals
    if (prev.type === 'savings_transfer' && prev.goalId) {
      savingsGoals = adjustGoalAmount(savingsGoals, prev.goalId, -prev.amount)
    }
    if (updated.type === 'savings_transfer' && updated.goalId) {
      savingsGoals = adjustGoalAmount(savingsGoals, updated.goalId, updated.amount)
    }

    persist({
      ...data,
      transactions: data.transactions.map((t) => (t.id === updated.id ? updated : t)),
      savingsGoals,
    })
    setTransactionToEdit(null)
  }

  function requestDeleteTransaction(transaction) {
    setTransactionToEdit(null)
    setTransactionToDelete(transaction)
  }

  function handleConfirmDeleteTransaction() {
    const tx = transactionToDelete
    if (!tx) return

    let savingsGoals = data.savingsGoals
    if (tx.type === 'savings_transfer' && tx.goalId) {
      savingsGoals = adjustGoalAmount(savingsGoals, tx.goalId, -tx.amount)
    }

    persist({
      ...data,
      transactions: data.transactions.filter((t) => t.id !== tx.id),
      savingsGoals,
    })
    setTransactionToDelete(null)
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

  function handleImport(text) {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return { ok: false, message: 'Not a valid JSON file' }
    }
    if (!isValidData(parsed)) {
      return { ok: false, message: 'Not a finance backup file' }
    }

    const cleaned = migrateData({
      ...parsed,
      transactions: parsed.transactions
        .filter(
          (t) =>
            t &&
            t.id &&
            Number.isFinite(Number(t.amount)) &&
            Number(t.amount) >= 0 &&
            Number.isFinite(Number(t.date))
        )
        .map((t) => ({ ...t, amount: roundToCents(Number(t.amount)), date: Number(t.date) })),
    })

    const merged = mergeData(cleaned, data)
    if (merged === data) {
      return { ok: true, message: 'Nothing new to import' }
    }

    const added = merged.transactions.length - data.transactions.length
    persist(merged)
    return { ok: true, message: `Imported ${added} new transaction${added === 1 ? '' : 's'}` }
  }

  function handleAddCategory(type, name) {
    const list = data.categories[type]
    // block duplicates across both types: the filter chips and category
    // lookups treat names as unique
    if (data.categories.income.includes(name) || data.categories.expense.includes(name)) return
    persist({
      ...data,
      categories: {
        ...data.categories,
        [type]: [...list, name],
      },
    })
  }

  function handleRemoveCategory(type, name) {
    const list = data.categories[type]
    if (list.length <= 1) return
    persist({
      ...data,
      categories: {
        ...data.categories,
        [type]: list.filter((c) => c !== name),
      },
    })
  }

  function openAddToGoal(goalId) {
    setAddToGoalId(goalId)
    setTransactionModalOpen(true)
  }

  return (
    <div className="app">
      <main className="main">
        <BalanceHeader
          totalBalance={totalBalance}
          netBalance={netBalance}
          savingsPercentage={savingsPercentage}
          syncEnabled={syncEnabled}
          syncStatus={syncStatus}
          syncMessage={syncMessage}
          onOpenSync={() => setSyncModalOpen(true)}
        />

        <SavingsGoals
          goals={data.savingsGoals}
          onAddToGoal={openAddToGoal}
          onWithdrawGoal={setGoalToWithdraw}
          onCreateGoal={() => setGoalModalOpen(true)}
          onDeleteGoal={setGoalToDelete}
          onCompleteGoal={setGoalToComplete}
        />

        <MonthlySummary transactions={data.transactions} />

        <TransactionList
          transactions={data.transactions}
          goals={data.savingsGoals}
          categories={data.categories}
          onManageCategories={() => setCategoriesModalOpen(true)}
          onEditTransaction={setTransactionToEdit}
        />
      </main>

      <button
        type="button"
        className="fab"
        onClick={() => {
          setAddToGoalId(null)
          setTransactionModalOpen(true)
        }}
        aria-label="Add transaction"
      >
        +
      </button>

      {transactionModalOpen && (
        <TransactionModal
          goals={data.savingsGoals}
          categories={data.categories}
          preselectedGoalId={addToGoalId}
          netBalance={netBalance}
          onClose={() => {
            setTransactionModalOpen(false)
            setAddToGoalId(null)
          }}
          onSubmit={handleAddTransaction}
        />
      )}

      {goalModalOpen && (
        <GoalModal
          onClose={() => setGoalModalOpen(false)}
          onSubmit={handleCreateGoal}
        />
      )}

      {transactionToEdit && (
        <TransactionModal
          transaction={transactionToEdit}
          goals={data.savingsGoals}
          categories={data.categories}
          netBalance={netBalance}
          onClose={() => setTransactionToEdit(null)}
          onSubmit={handleUpdateTransaction}
          onDelete={requestDeleteTransaction}
        />
      )}

      {transactionToDelete && (
        <ConfirmModal
          title="Delete transaction?"
          message={
            transactionToDelete.type === 'savings_transfer'
              ? `Delete this ${formatCurrency(transactionToDelete.amount)} transfer? The amount will be removed from the goal and return to your spendable balance.`
              : `Delete ${formatCurrency(transactionToDelete.amount)} — ${transactionToDelete.description || transactionToDelete.category || 'transaction'}? This cannot be undone.`
          }
          confirmLabel="Delete"
          onClose={() => setTransactionToDelete(null)}
          onConfirm={handleConfirmDeleteTransaction}
        />
      )}

      {syncModalOpen && (
        <SyncModal
          enabled={syncEnabled}
          onClose={() => setSyncModalOpen(false)}
          onSave={handleSaveSyncSecret}
          onDisable={handleDisableSync}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}

      {categoriesModalOpen && (
        <CategoriesModal
          categories={data.categories}
          onClose={() => setCategoriesModalOpen(false)}
          onAdd={handleAddCategory}
          onRemove={handleRemoveCategory}
        />
      )}

      {goalToWithdraw && (
        <WithdrawModal
          goal={goalToWithdraw}
          onClose={() => setGoalToWithdraw(null)}
          onSubmit={handleWithdrawFromGoal}
        />
      )}

      {goalToDelete && (
        <ConfirmModal
          title={goalToDelete.kind === 'long_term' ? 'Remove long-term savings?' : 'Delete goal?'}
          message={
            goalToDelete.currentAmount > 0
              ? `Are you sure? ${goalToDelete.name} has ${formatCurrency(goalToDelete.currentAmount)} that will return to your spendable balance.`
              : `Remove "${goalToDelete.name}"?`
          }
          confirmLabel={goalToDelete.kind === 'long_term' ? 'Remove' : 'Delete'}
          onClose={() => setGoalToDelete(null)}
          onConfirm={handleConfirmDeleteGoal}
        />
      )}

      {goalToComplete && (
        <ConfirmModal
          title="Complete goal?"
          message={`Mark "${goalToComplete.name}" as purchased? ${formatCurrency(goalToComplete.currentAmount)} will be recorded as spent.`}
          confirmLabel="Complete"
          onClose={() => setGoalToComplete(null)}
          onConfirm={handleConfirmCompleteGoal}
        />
      )}
    </div>
  )
}
