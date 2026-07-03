import { useWalletConnection } from '../hooks/useWalletConnection'

const badgeBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  whiteSpace: 'nowrap',
}

const correctStyle: React.CSSProperties = {
  ...badgeBase,
  background: 'rgba(34, 197, 94, 0.15)',
  color: '#16a34a',
}

const wrongStyle: React.CSSProperties = {
  ...badgeBase,
  background: 'rgba(239, 68, 68, 0.15)',
  color: '#dc2626',
  cursor: 'pointer',
}

const disconnectedStyle: React.CSSProperties = {
  ...badgeBase,
  background: 'var(--code-bg, #f4f3ec)',
  color: 'var(--text, #6b6375)',
}

/**
 * Shows the current network and warns if it's the wrong one.
 *
 * When on the wrong network, clicking the badge triggers a switch.
 */
export function NetworkBadge() {
  const {
    isConnected,
    isCorrectNetwork,
    chainName,
    targetNetwork,
    switchToTargetNetwork,
    isSwitchingNetwork,
  } = useWalletConnection()

  if (!isConnected) {
    return (
      <span style={disconnectedStyle}>
        ⚪ Not Connected
      </span>
    )
  }

  if (!isCorrectNetwork) {
    return (
      <button
        type="button"
        style={wrongStyle}
        onClick={switchToTargetNetwork}
        disabled={isSwitchingNetwork}
        title={`Switch to ${targetNetwork}`}
      >
        {isSwitchingNetwork ? '⟳ Switching…' : `⚠ Wrong Network (${chainName ?? 'Unknown'})`}
      </button>
    )
  }

  return (
    <span style={correctStyle}>
      ● {chainName ?? 'Unknown'}
    </span>
  )
}
