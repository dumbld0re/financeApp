import { formatCurrency } from '../utils/calculations'
import { isSyncEnabled } from '../utils/sync'

const SYNC_LABELS = {
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline',
  local: '',
}

export default function BalanceHeader({
  totalBalance,
  netBalance,
  savingsPercentage,
  syncStatus,
}) {
  const savingsLabel =
    savingsPercentage === null ? '--' : `${Math.round(savingsPercentage)}%`

  const syncLabel = isSyncEnabled() ? SYNC_LABELS[syncStatus] || '' : ''

  return (
    <header className="balance-header">
      <p className="greeting">hey danny-miguel</p>
      <p className="balance-label">Total balance</p>
      <h1 className="balance-amount">{formatCurrency(totalBalance)}</h1>
      <p className="balance-net">Net: {formatCurrency(netBalance)}</p>
      <p className="balance-savings">Savings: {savingsLabel}</p>
      {syncLabel && <p className="sync-status">{syncLabel}</p>}
    </header>
  )
}
