import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon'

const SheetCtx = createContext(() => {})

// Children call this instead of their onClose so the sheet can animate out
// first; the parent's onClose (which unmounts it) runs when the slide ends.
export function useSheetClose() {
  return useContext(SheetCtx)
}

const EXIT_MS = 420

// Bottom sheet on phones (drag the top edge down to dismiss), a floating
// drawer on the right from 1024px up. Escape closes, Tab stays inside.
export default function Sheet({ title, onClose, role = 'dialog', children }) {
  const titleId = useId()
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const closing = useRef(false)
  const returnFocus = useRef(null)

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    setOpen(false)
    document.body.classList.remove('sheet-open')
    setTimeout(() => {
      onClose()
      returnFocus.current?.focus?.({ preventScroll: true })
    }, EXIT_MS)
  }, [onClose])

  useEffect(() => {
    returnFocus.current = document.activeElement
    document.body.classList.add('sheet-open')
    const raf = requestAnimationFrame(() => setOpen(true))
    const focusTimer = setTimeout(() => {
      const el = ref.current?.querySelector('[data-autofocus]') || ref.current?.querySelector('input, button:not(.x)')
      el?.focus({ preventScroll: true })
    }, 140)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(focusTimer)
      document.body.classList.remove('sheet-open')
    }
  }, [])

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== 'Tab') return
    const items = [...ref.current.querySelectorAll('button:not(:disabled), input, select, textarea')].filter(
      (el) => el.offsetParent !== null
    )
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // drag-to-dismiss from the grip/header on touch layouts
  const drag = useRef(null)
  function onPointerDown(e) {
    if (window.matchMedia('(min-width: 1024px)').matches || e.target.closest('button')) return
    drag.current = { y0: e.clientY, dy: 0, t0: performance.now() }
    ref.current.classList.add('dragging')
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e) {
    if (!drag.current) return
    const dy = e.clientY - drag.current.y0
    drag.current.dy = dy
    ref.current.style.transform = `translateY(${dy > 0 ? dy : dy / 6}px)`
  }
  function onPointerUp() {
    if (!drag.current) return
    const { dy, t0 } = drag.current
    drag.current = null
    const el = ref.current
    el.classList.remove('dragging')
    el.style.transform = ''
    if (dy > 110 || dy / (performance.now() - t0) > 0.6) close()
  }

  return (
    <SheetCtx.Provider value={close}>
      <div className={open ? 'scrim open' : 'scrim'} onClick={close} role="presentation" />
      <section
        ref={ref}
        className={open ? 'drawer open' : 'drawer'}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <div
          className="d-grab"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="grip" aria-hidden="true" />
          <header className="d-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="x press" onClick={close} aria-label="Close">
              <Icon name="close" size={16} />
            </button>
          </header>
        </div>
        {children}
      </section>
    </SheetCtx.Provider>
  )
}
