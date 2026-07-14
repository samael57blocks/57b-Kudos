/**
 * Shared inline style tokens (React.CSSProperties) extracted from
 * components to prevent drift. Import and spread as needed.
 */

/** Skeleton loading placeholder — animation: pulse 1.5s */
export const skeletonStyle: React.CSSProperties = {
  height: '16px',
  background: 'var(--bg-subtle, #f0f0f5)',
  borderRadius: '4px',
  animation: 'pulse 1.5s ease-in-out infinite',
}

/** Form label — flex column, 13px semibold */
export const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-h, #08060d)',
}

/** Text input — 14px, 6px radius */
export const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '6px',
  background: 'var(--bg, #fff)',
  color: 'var(--text, #08060d)',
}

/** Primary action button — accent bg, white text */
export const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  background: 'var(--accent, #aa3bff)',
  color: '#fff',
}

/** Disabled variant of buttonStyle */
export const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
}

/** Inline validation error — 12px red */
export const errorStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#e53e3e',
  marginTop: '2px',
}

/** Hyperlink-style text — accent color, underline */
export const linkStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--accent, #aa3bff)',
  textDecoration: 'underline',
}
