import { useWalletConnection } from '../hooks/useWalletConnection'
import { formatAddress } from '../utils/format'
import styles from './ConnectButton.module.css'

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
      <button type="button" className={styles.button} disabled>
        Connecting…
      </button>
    )
  }

  if (isConnected && address) {
    return (
      <button
        type="button"
        className={styles.connected}
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
    <button type="button" className={styles.button} onClick={connect}>
      Connect Wallet
    </button>
  )
}
