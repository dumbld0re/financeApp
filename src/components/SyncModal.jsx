import { useState, useRef } from 'react'

export default function SyncModal({ enabled, onClose, onSave, onDisable, onExport, onImport }) {
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [importOk, setImportOk] = useState(true)
  const fileRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = secret.trim()
    if (!trimmed) {
      setError('Enter your sync key')
      return
    }
    onSave(trimmed)
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const text = await file.text()
    const result = onImport(text)
    setImportOk(result.ok)
    setImportMessage(result.message)
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal--compact"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-modal-title"
      >
        <div className="modal-header">
          <h2 id="sync-modal-title">Sync &amp; data</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <p className="confirm-message">
            {enabled
              ? 'Sync is on. Enter a new key to replace the current one, or turn sync off.'
              : 'Enter the sync key (the SYNC_SECRET value set on Vercel). It is stored only on this device.'}
          </p>

          <label className="field">
            <span>Sync key</span>
            <input
              type="password"
              placeholder={enabled ? '••••••••' : 'Your sync key'}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
            />
          </label>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-full">
            Save
          </button>
          {enabled && (
            <button type="button" className="btn btn-ghost-danger btn-full" onClick={onDisable}>
              Turn off sync
            </button>
          )}

          <h3 className="subsection-title modal-subsection">Backup</h3>
          <div className="type-buttons">
            <button type="button" className="btn btn-secondary" onClick={onExport}>
              Export JSON
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileRef.current?.click()}
            >
              Import JSON
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {importMessage && (
            <p className={importOk ? 'confirm-message' : 'field-error'}>{importMessage}</p>
          )}
        </form>
      </div>
    </div>
  )
}
