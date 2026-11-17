import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const valueOf = (o) => (typeof o === 'string' ? o : o.value)
const labelOf = (o) => (typeof o === 'string' ? o : o.label)

// Arrow/Home/End move the selection through a radio-style group and focus
// the newly picked item; Enter hands control back to the form (Shift+Enter
// = back). Shared by the segmented switch and the chip groups.
function useRovingKeys({ values, value, onChange, onEnter, root }) {
  return (e) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault()
      onEnter(e.shiftKey)
      return
    }
    const i = Math.max(0, values.indexOf(value))
    let n = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % values.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + values.length) % values.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = values.length - 1
    if (n === null) return
    e.preventDefault()
    if (values[n] !== value) onChange(values[n])
    root.current?.querySelectorAll('[role="radio"]')[n]?.focus()
  }
}

// Focus the checked item of a radio group (or its first item).
export function focusGroup(el) {
  if (!el) return false
  const target = el.querySelector('[role="radio"][aria-checked="true"]') || el.querySelector('[role="radio"]')
  target?.focus()
  return Boolean(target)
}

// Segmented switch with a sliding thumb.
export function Seg({ options, value, onChange, label, onEnter, groupRef }) {
  const root = useRef(null)
  const values = options.map(valueOf)
  const i = Math.max(0, values.indexOf(value))
  const onKeyDown = useRovingKeys({ values, value, onChange, onEnter, root })
  return (
    <div
      className="seg"
      role="radiogroup"
      aria-label={label}
      ref={(el) => {
        root.current = el
        if (groupRef) groupRef.current = el
      }}
      onKeyDown={onKeyDown}
    >
      <span
        className="thumb"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o, n) => (
        <button
          key={valueOf(o)}
          type="button"
          role="radio"
          aria-checked={valueOf(o) === value}
          tabIndex={n === i ? 0 : -1}
          onClick={() => valueOf(o) !== value && onChange(valueOf(o))}
        >
          {labelOf(o)}
        </button>
      ))}
    </div>
  )
}

// Single-select chips (a radio group: Tab lands on the picked chip, arrows
// change it). Changing `swapKey` replays the entrance stagger, used when the
// option set itself changes (e.g. switching entry type).
export function Chips({ options, value, onChange, swapKey, label, onEnter, groupRef }) {
  const root = useRef(null)
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

  const values = options.map(valueOf)
  const picked = values.indexOf(value)
  const onKeyDown = useRovingKeys({ values, value, onChange, onEnter, root })

  return (
    <div
      className={swap ? 'chips swap' : 'chips'}
      role="radiogroup"
      aria-label={label}
      ref={(el) => {
        root.current = el
        if (groupRef) groupRef.current = el
      }}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => {
        const v = valueOf(o)
        return (
          <button
            key={`${swapKey}-${v}`}
            type="button"
            role="radio"
            aria-checked={v === value}
            tabIndex={i === (picked < 0 ? 0 : picked) ? 0 : -1}
            className="chip press"
            style={{ '--d': i }}
            onClick={() => onChange(v)}
          >
            <span className="ck"><Icon name="check" size={14} /></span>
            {labelOf(o)}
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
// Enter calls onEnter (Shift+Enter passes true) instead of submitting the form.
export function AmountField({ value, onChange, onEnter, shake, inputRef, label = 'Amount' }) {
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
        ref={inputRef}
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
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            // stop the form's own submit so Enter never fires twice
            e.preventDefault()
            onEnter(e.shiftKey)
          }
        }}
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
