import { useState, useEffect, useRef } from 'react'
import { setData, initializeDataIfEmpty } from './utils/localStorage'
import { migrateData } from './utils/migrate'
import {
  mergeData,
  pullData,
  pushData,
  isSyncEnabled,
  checkHealth,
  getSyncSetupHint,
} from './utils/sync'
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
import CategoriesModal from './components/CategoriesModal'
import EditIncomeModal from './components/EditIncomeModal'

export default function App() {
  const [data, setDataState] = useState(() => initializeDataIfEmpty())
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false)
  const [addToGoalId, setAddToGoalId] = useState(null)
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [goalToComplete, setGoalToComplete] = useState(null)
  const [incomeToEdit, setIncomeToEdit] = useState(null)
  const [syncStatus, setSyncStatus] = useState(isSyncEnabled() ? 'syncing' : 'local')
  const [syncMessage, setSyncMessage] = useState(getSyncSetupHint())
  const skipCloudPush = useRef(true)

  useEffect(() => {
    if (!isSyncEnabled()) return

    let cancelled = false

    async function syncFromCloud() {
      setSyncStatus('syncing')
      setSyncMessage(null)

      const health = await checkHealth()
      if (cancelled) return

      if (health && !health.redis) {
        setSyncStatus('offline')
        setSyncMessage(health.detail || 'Redis missing — add Upstash Redis integration on Vercel')
        return
      }

      if (health && !health.serverSecret) {
        setSyncStatus('offline')
        setSyncMessage('Add SYNC_SECRET on Vercel, then redeploy')
        return
      }

      const { data: remote, error } = await pullData()
      if (cancelled) return

      if (error) {
        setSyncStatus('offline')
        setSyncMessage(error)
        return
      }

      setDataState((local) => {
        if (!remote) {
          pushData(local).then((result) => {
            if (cancelled) return
            if (result.ok) {
              setSyncStatus('synced')
              setSyncMessage(null)
            } else {
              setSyncStatus('offline')
              setSyncMessage(result.error)
            }
          })
          return local
        }

        const merged = migrateData(mergeData(local, remote))
        setData(merged)

        if ((local.updatedAt || 0) > (remote.updatedAt || 0)) {
          pushData(merged).then((result) => {
            if (cancelled) return
            if (result.ok) {
              setSyncStatus('synced')
              setSyncMessage(null)
            } else {
              setSyncStatus('offline')
              setSyncMessage(result.error)
            }
          })
        } else {
          setSyncStatus('synced')
          setSyncMessage(null)
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
      const result = await pushData(data)
      if (result.ok) {
        setSyncStatus('synced')
        setSyncMessage(null)
      } else {
        setSyncStatus('offline')
        setSyncMessage(result.error)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [data])

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
          ? { ...g, currentAmount: g.currentAmount + transaction.amount }
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

  function handleUpdateIncomeCategory(transactionId, category) {
    persist({
      ...data,
      transactions: data.transactions.map((t) =>
        t.id === transactionId && t.type === 'income'
          ? { ...t, category, description: category }
          : t
      ),
    })
  }

  function handleAddCategory(type, name) {
    const list = data.categories[type]
    if (list.includes(name)) return
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
          syncStatus={syncStatus}
          syncMessage={syncMessage}
        />

        <SavingsGoals
          goals={data.savingsGoals}
          onAddToGoal={openAddToGoal}
          onCreateGoal={() => setGoalModalOpen(true)}
          onDeleteGoal={setGoalToDelete}
          onCompleteGoal={setGoalToComplete}
        />

        <TransactionList
          transactions={data.transactions}
          goals={data.savingsGoals}
          categories={data.categories}
          onManageCategories={() => setCategoriesModalOpen(true)}
          onEditIncome={setIncomeToEdit}
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

      {incomeToEdit && (
        <EditIncomeModal
          transaction={incomeToEdit}
          categories={data.categories}
          onClose={() => setIncomeToEdit(null)}
          onSubmit={handleUpdateIncomeCategory}
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

      {goalToDelete && (
        <ConfirmModal
          title={goalToDelete.kind === 'long_term' ? 'Remove long-term savings?' : 'Delete goal?'}
          message={
            goalToDelete.currentAmount > 0
              ? `Are you sure? ${goalToDelete.name} has ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(goalToDelete.currentAmount)} that will return to your spendable balance.`
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
          message={`Mark "${goalToComplete.name}" as purchased? ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(goalToComplete.currentAmount)} will be recorded as spent.`}
          confirmLabel="Complete"
          onClose={() => setGoalToComplete(null)}
          onConfirm={handleConfirmCompleteGoal}
        />
      )}
    </div>
  )
}
