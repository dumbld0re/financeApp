import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { roundToCents } from '../utils/calculations'

const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

export function prefersReducedMotion() {
  return Boolean(query?.matches)
}

export function useMedia(q) {
  const [match, setMatch] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [q])
  return match
}

// Counts from the previous value to the new one by writing straight to the
// DOM each frame, so a tween never re-renders React. First paint counts up
// from `from` (0 by default) once `start` is true.
export function Count({ value, format, start = true, from = 0, duration = 750, className }) {
  const ref = useRef(null)
  const shown = useRef(from)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (!start) {
      el.textContent = format(shown.current)
      return
    }
    const a = shown.current
    const b = value
    if (prefersReducedMotion() || a === b) {
      shown.current = b
      el.textContent = format(b)
      return
    }
    const t0 = performance.now()
    let raf
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      const v = a + (b - a) * (1 - Math.pow(1 - p, 4))
      shown.current = v
      el.textContent = format(p === 1 ? b : v)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, start, format, duration])

  return <span ref={ref} className={className} />
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

function Digit({ d, delay }) {
  return (
    <span className="dg">
      <span
        className="st"
        style={{ transform: `translateY(${-d}em)`, transitionDelay: `${delay}ms` }}
      >
        {DIGITS.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </span>
    </span>
  )
}

// Rolling-digit figure: dollars full size, cents small and raised. Every digit
// is a 0–9 strip that slides to its value, staggered right to left.
export function Odometer({ value, start = true }) {
  const v = roundToCents(value)
  const [whole, cents] = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(Math.abs(v))
    .split('.')

  const chars = [...whole, ...cents]
  const digitCount = chars.filter((c) => /\d/.test(c)).length
  let di = 0
  const render = (c, i) => {
    if (!/\d/.test(c)) return <span key={`s${i}`} className="sym">{c}</span>
    const delay = prefersReducedMotion() ? 0 : (digitCount - 1 - di) * 45
    di++
    // key by position from the right so digits keep their strip as the
    // number grows, and the roll stays continuous
    return <Digit key={`d${chars.length - i}`} d={start ? Number(c) : 0} delay={delay} />
  }

  return (
    <span className="odo" aria-hidden="true">
      <span className="sym">{v < 0 && start ? '−$' : '$'}</span>
      {[...whole].map(render)}
      <span className="c">
        <span className="sym">.</span>
        {[...cents].map((c, i) => render(c, whole.length + i))}
      </span>
    </span>
  )
}

// Ready flag set one frame after fonts load, so entrance transitions run
// against real glyph metrics.
export function useReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    const go = () => requestAnimationFrame(() => !cancelled && setReady(true))
    if (document.fonts?.ready) document.fonts.ready.then(go)
    else go()
    return () => {
      cancelled = true
    }
  }, [])
  return ready
}
