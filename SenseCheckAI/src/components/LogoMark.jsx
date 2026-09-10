/** LogoMark.jsx — SVG mark reused across all pages */
export default function LogoMark({ size = 22, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <g transform="rotate(-30 12 12)">
        <circle cx="7.3"  cy="3.2"  r="1.45" />
        <rect   x="5.5"   y="4.7"   width="3.6" height="14.6" rx="1.8" />
        <rect   x="14.9"  y="4.7"   width="3.6" height="14.6" rx="1.8" />
        <circle cx="16.7" cy="20.8" r="1.45" />
      </g>
    </svg>
  )
}
