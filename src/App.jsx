import { useState, useEffect, useRef } from 'react'
import { setData, initializeDataIfEmpty } from './utils/localStorage'
import { mergeData, pullData, pushData, isSyncEnabled } from './utils/sync'
import {
  computeNetBalance,
  computeTotalBalance,
  computeTotalSavings,
  computeSavingsPercentage,
  generateId,
} from './utils/calculations'
import BalanceHeader from './components/BalanceHeader'
import SavingsGoals from './components/SavingsGoals'
import TransactionList from './components/TransactionList'
import TransactionModal from './components/TransactionModal'
import GoalModal from './components/GoalModal'
import ConfirmModal from './components/ConfirmModal'

export default function App() {
  const [data, setDataState] = useState(() => initializeDataIfEmpty())
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [addToGoalId, setAddToGoalId] = useState(null)
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [syncStatus, setSyncStatus] = useState(isSyncEnabled() ? 'syncing' : 'local')
  const skipCloudPush = useRef(true)

  useEffect(() => {
    if (!isSyncEnabled()) return

    let cancelled = false

    async function syncFromCloud() {
      setSyncStatus('syncing')
      const remote = await pullData()
      if (cancelled) return

      setDataState((local) => {
        if (!remote) {
          pushData(local).then((ok) => {
            if (!cancelled) setSyncStatus(ok ? 'synced' : 'offline')
          })
          return local
        }

        const merged = mergeData(local, remote)
        setData(merged)

        if ((local.updatedAt || 0) > (remote.updatedAt || 0)) {
          pushData(merged).then((ok) => {
            if (!cancelled) setSyncStatus(ok ? 'synced' : 'offline')
          })
        } else {
          setSyncStatus('synced')
        }

        return merged
      })
    }

    syncFromCloud()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setData(data)

    if (!isSyncEnabled()) return

    if (skipCloudPush.current) {
      skipCloudPush.current = false
      return
    }

    const timer = setTimeout(async () => {
      setSyncStatus('syncing')
      const ok = await pushData(data)
      setSyncStatus(ok ? 'synced' : 'offline')
    }, 600)

    return () => clearTimeout(timer)
  }, [data])

  const totalSavings = computeTotalSavings(data.savingsGoals)
  const netBalance = computeNetBalance(data.transactions)
  const totalBalance = computeTotalBalance(data.transactions, data.savingsGoals)
  const savingsPercentage = computeSavingsPercentage(totalBalance, totalSavings)

  function persist(next) {
    setDataState({ ...next, updatedAt: Date.now() })
  }

  function handleAddTransaction(transaction) {
    const next = { ...data, transactions: [transaction, ...data.transactions] }

    if (transaction.type === 'savings_transfer' && transaction.goalId) {
      next.savingsGoals = data.savingsGoals.map((g) =>
        g.id === transaction.goalId
          ? { ...g, currentAmount: g.currentAmount + transaction.amount }
          : g
      )
    }

    persist(next)
  }

  function handleCreateGoal({ name, targetAmount }) {
    const goal = {
      id: generateId(),
      name,
      targetAmount,
      currentAmount: 0,
      createdAt: Date.now(),
    }
    persist({ ...data, savingsGoals: [...data.savingsGoals, goal] })
  }

  function handleConfirmDeleteGoal() {
    if (!goalToDelete) return
    persist({
      ...data,
      savingsGoals: data.savingsGoals.filter((g) => g.id !== goalToDelete.id),
    })
    setGoalToDelete(null)
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
          syncStatus={syncStatus}
        />

        <SavingsGoals
          goals={data.savingsGoals}
          onAddToGoal={openAddToGoal}
          onCreateGoal={() => setGoalModalOpen(true)}
          onDeleteGoal={setGoalToDelete}
        />

        <TransactionList transactions={data.transactions} goals={data.savingsGoals} />
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
          preselectedGoalId={addToGoalId}
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

      {goalToDelete && (
        <ConfirmModal
          title="Delete goal?"
          message={`Are you sure you want to delete "${goalToDelete.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onClose={() => setGoalToDelete(null)}
          onConfirm={handleConfirmDeleteGoal}
        />
      )}
    </div>
  )
}
