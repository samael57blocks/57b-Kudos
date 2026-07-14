import { useWalletConnection } from '../hooks/useWalletConnection'
import { formatAddress } from '../utils/format'

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid var(--border, #e5e4e7)',
  background: 'var(--accent-bg, rgba(170, 59, 255, 0.1))',
  color: 'var(--accent, #aa3bff)',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: '14px',
  fontWeight: 500,
  whiteSpace: 'nowrap',
}

const connectedStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--code-bg, #f4f3ec)',
  color: 'var(--text-h, #08060d)',
  cursor: 'default',
}

/**
 * Connect / disconnect button that shows the current connection state.
 */
export function ConnectButton() {
  const {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  } = useWalletConnection()

  if (isConnecting) {
    return (
      <button type="button" style={buttonStyle} disabled>
        Connecting…
      </button>
    )
  }

  if (isConnected && address) {
    return (
      <button
        type="button"
        style={connectedStyle}
        onClick={(e) => {
          e.stopPropagation()
          disconnect()
        }}
        title="Click to disconnect"
      >
        {formatAddress(address)}
      </button>
    )
  }

  return (
    <button type="button" style={buttonStyle} onClick={connect}>
      Connect Wallet
    </button>
  )
}
