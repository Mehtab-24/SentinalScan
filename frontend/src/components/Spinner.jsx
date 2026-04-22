/**
 * Spinner — neon glowing loading indicator.
 * @param {{ size?: string, color?: string }} props
 */
export default function Spinner({ size = 'h-5 w-5', color = 'text-cyan-400' }) {
  return (
    <svg
      className={`animate-spin ${size} ${color}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
      style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
    >
      <circle
        className="opacity-15"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}
