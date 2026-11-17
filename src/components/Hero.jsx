import { useLayoutEffect, useRef } from 'react'
import { formatCurrency, roundToCents } from '../utils/calculations'
import Icon, { Mark } from './Icon'
import { Count, Odometer } from './motion'

const SYNC_LABEL = { local: 'Sync off', syncing: 'Syncing', synced: 'Synced', offline: 'Offline' }
const exact = (v) => formatCurrency(roundToCents(v)).replace(/^(-?\$[\d,]+)$/, '$1.00')
const money = (to) => (v) => formatCurrency(roundToCents(Number.isInteger(roundToCents(to)) ? Math.round(v) : v))

function today() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Nav whose pill indicator glides to the active item (scroll-spy driven).
export function SpyNav({ className, items, active, onGo, label, ready, children }) {
  const nav = useRef(null)
  const ind = useRef(null)

  useLayoutEffect(() => {
    const place = () => {
      const a = nav.current?.querySelector(`a[data-key="${active}"]`)
      if (!a || !ind.current) return
      // sub-pixel boxes so the pill sits exactly on the item
      const box = a.getBoundingClientRect()
      const host = nav.current.getBoundingClientRect()
      ind.current.style.width = `${box.width}px`
      ind.current.style.transform = `translateX(${box.left - host.left - nav.current.clientLeft}px)`
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [active, ready])

  return (
    <nav ref={nav} className={className} aria-label={label}>
      <span className="ind" ref={ind} aria-hidden="true" />
      {items.map((it) => (
        <a
          key={it.key}
          href={`#${it.target}`}
          data-key={it.key}
          className={active === it.key ? 'on' : undefined}
          aria-current={active === it.key ? 'true' : undefined}
          aria-label={it.icon ? it.label : undefined}
          onClick={(e) => {
            e.preventDefault()
            onGo(it.target)
          }}
        >
          {it.icon ? <Icon name={it.icon} size={20} /> : it.label}
        </a>
      ))}
      {children}
    </nav>
  )
}

export default function Hero({
  ready,
  totalBalance,
  netBalance,
  totalSavings,
  monthIncome,
  monthSpent,
  syncState,
  onOpenSync,
  navActive,
  onGo,
  onNew,
  figRef,
}) {
  const over = netBalance < 0

  return (
    <section className="flood" id="top">
      <div className="top">
        <div className="brand rv" style={{ '--d': 0 }}>
          <Mark size={28} />
          Finance
        </div>
        <div className="top-r rv" style={{ '--d': 0 }}>
          <button type="button" className="sync press" data-state={syncState} onClick={onOpenSync}>
            {SYNC_LABEL[syncState] || 'Sync'}
          </button>
          <button type="button" className="add-m press" onClick={onNew} aria-label="New entry">
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>

      <div className="hero">
        <p className="label rv" style={{ '--d': 1 }}>{today()}</p>
        <p className="lede-a rv" style={{ '--d': 2 }}>{over ? 'You’re over by' : 'You have'}</p>
        <p className="lede-fig rv" style={{ '--d': 2 }} ref={figRef} aria-label={exact(Math.abs(netBalance))}>
          <Odometer value={Math.abs(netBalance)} start={ready} />
        </p>
        <p className="lede-b rv" style={{ '--d': 3 }}>
          {over ? 'beyond what’s free, with' : 'to spend, with'}{' '}
          <b><Count value={totalSavings} start={ready} format={money(totalSavings)} /></b> set aside.
        </p>
        <div className="figs rv" style={{ '--d': 4 }}>
          <div className="fig">
            <p className="label">Total balance</p>
            <Count className="fig-v" value={totalBalance} start={ready} format={exact} />
          </div>
          <div className="fig">
            <p className="label">In this month</p>
            <span className="fig-v pos">{monthIncome > 0 && '+'}<Count value={monthIncome} start={ready} format={money(monthIncome)} /></span>
          </div>
          <div className="fig">
            <p className="label">Out this month</p>
            <span className="fig-v">{monthSpent > 0 && '−'}<Count value={monthSpent} start={ready} format={money(monthSpent)} /></span>
          </div>
        </div>
      </div>

      <div className="foot rv" style={{ '--d': 5 }}>
        <SpyNav
          className="nav"
          label="Sections"
          ready={ready}
          active={navActive}
          onGo={onGo}
          items={[
            { key: 'overview', target: 'statement', label: 'Overview' },
            { key: 'savings', target: 'savings', label: 'Savings' },
            { key: 'plan', target: 'budgets', label: 'Plan' },
          ]}
        />
        <button type="button" className="add press" onClick={onNew}>
          <Icon name="plus" size={16} />
          New entry
          <span className="kbd" aria-hidden="true">N</span>
        </button>
      </div>
    </section>
  )
}
