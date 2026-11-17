import { useId } from 'react'

// One stroke icon family (24 grid, 1.75 stroke, round caps) so every glyph
// shares weight and optical size with Allo at UI sizes.
const PATHS = {
  home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  activity: 'M4 6h16M4 12h16M4 18h10',
  savings: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  plan: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8.5 3.5v4M15.5 3.5v4',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.4-4.4',
  left: 'M14.5 6 8.5 12l6 6',
  right: 'M9.5 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  repeat: 'M17 3.5 20 6.5l-3 3M4 11.5v-1a4 4 0 0 1 4-4h12M7 20.5 4 17.5l3-3M20 12.5v1a4 4 0 0 1-4 4H4',
  paste: 'M9 4.5h6v3H9zM9 6H6.5a1 1 0 0 0-1 1v12.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H15M9 12h6M9 16h4',
  tag: 'M4 4h7.2l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-5.1 5.1a1.5 1.5 0 0 1-2.1 0L4 11.2zM8.25 8.25h.01',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14',
  upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14',
}

export default function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      className={`i ${className}`}
      width={size}
      height={size}
      style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

// The Split mark: a coin cut by a ledger line into what you can spend (top)
// and what is set aside (below).
export function Mark({ size = 28, className = '' }) {
  const id = useId()
  return (
    <svg className={`mark ${className}`} width={size} height={size} style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }} viewBox="0 0 512 512" aria-hidden="true">
      <clipPath id={id}>
        <circle cx="256" cy="256" r="232" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect className="mark-hi" width="512" height="280" fill="currentColor" />
        <rect className="mark-lo" y="308" width="512" height="300" fill="currentColor" />
      </g>
    </svg>
  )
}
