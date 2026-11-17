import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

// Segmented switch with a sliding thumb.
export function Seg({ options, value, onChange, label }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      <span
        className="thumb"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => o.value !== value && onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Single-select chips. Changing `swapKey` replays the entrance stagger,
// used when the option set itself changes (e.g. switching entry type).
export function Chips({ options, value, onChange, swapKey, label }) {
  const first = useRef(true)
  const [swap, setSwap] = useState(false)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSwap(true)
    const t = setTimeout(() => setSwap(false), 600)
    return () => clearTimeout(t)
  }, [swapKey])

  return (
    <div className={swap ? 'chips swap' : 'chips'} role="group" aria-label={label}>
      {options.map((o, i) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <button
            key={`${swapKey}-${v}`}
            type="button"
            className="chip press"
            aria-pressed={v === value}
            style={{ '--d': i }}
            onClick={() => onChange(v)}
          >
            <span className="ck"><Icon name="check" size={14} /></span>
            {l}
          </button>
        )
      })}
    </div>
  )
}

export function cleanAmount(raw) {
  let v = raw.replace(/[^\d.]/g, '')
  const dot = v.indexOf('.')
  if (dot >= 0) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '').slice(0, 2)
  return v.replace(/^0+(?=\d)/, '').slice(0, 10)
}

// Big centered amount input: grows with its digits, pulses on each keystroke,
// shakes when a submit is attempted without a value (pass a changing `shake`).
export function AmountField({ value, onChange, onEnter, shake, label = 'Amount' }) {
  const wrap = useRef(null)
  const len = Math.max(1, (value || '0').length)

  function replay(cls) {
    const el = wrap.current
    if (!el) return
    el.classList.remove(cls)
    void el.offsetWidth
    el.classList.add(cls)
  }

  useEffect(() => {
    if (shake) replay('shake')
  }, [shake])

  return (
    <label ref={wrap} className={value ? 'amount has' : 'amount'}>
      <span className="cur">$</span>
      <input
        data-autofocus
        inputMode="decimal"
        placeholder="0"
        autoComplete="off"
        aria-label={label}
        value={value}
        style={{ width: `${len + 0.4}ch`, fontSize: len > 8 ? '3rem' : len > 6 ? '3.625rem' : undefined }}
        onChange={(e) => {
          onChange(cleanAmount(e.target.value))
          replay('bump')
        }}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      />
    </label>
  )
}

// Text that re-plays a small rise whenever it changes (CTA labels).
export function TickText({ children }) {
  const ref = useRef(null)
  const prev = useRef(children)
  useEffect(() => {
    if (prev.current === children) return
    prev.current = children
    const el = ref.current
    el.classList.remove('tick')
    void el.offsetWidth
    el.classList.add('tick')
  }, [children])
  return <span ref={ref} className="cta-t">{children}</span>
}
