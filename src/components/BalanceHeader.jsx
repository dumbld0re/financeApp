import { formatCurrency } from '../utils/calculations'

const SYNC_LABELS = {
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline',
}

export default function BalanceHeader({
  totalBalance,
  netBalance,
  savingsPercentage,
  syncEnabled,
  syncStatus,
  syncMessage,
  onOpenSync,
}) {
  const savingsLabel =
    savingsPercentage === null ? '--' : `${Math.round(savingsPercentage)}%`

  const syncLabel = syncEnabled ? SYNC_LABELS[syncStatus] || 'Sync' : 'Sync off'

  return (
    <header className="balance-header">
      <p className="greeting">hey [your name]</p>
      <p className="balance-label">Total balance</p>
      <h1 className="balance-amount">{formatCurrency(totalBalance)}</h1>
      <p className="balance-net">Net: {formatCurrency(netBalance)}</p>
      <p className="balance-savings">Savings: {savingsLabel}</p>
      <button type="button" className="sync-status sync-status--btn" onClick={onOpenSync}>
        {syncLabel}
      </button>
      {syncEnabled && syncMessage && <p className="sync-detail">{syncMessage}</p>}
    </header>
  )
}
