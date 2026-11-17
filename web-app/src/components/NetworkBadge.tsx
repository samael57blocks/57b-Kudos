import { useWalletConnection } from '../hooks/useWalletConnection'
import styles from './NetworkBadge.module.css'

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
      <span className={styles.disconnected}>
        ⚪ Not Connected
      </span>
    )
  }

  if (!isCorrectNetwork) {
    return (
      <button
        type="button"
        className={styles.wrong}
        onClick={switchToTargetNetwork}
        disabled={isSwitchingNetwork}
        title={`Switch to ${targetNetwork}`}
      >
        {isSwitchingNetwork ? '⟳ Switching…' : `⚠ Wrong Network (${chainName ?? 'Unknown'})`}
      </button>
    )
  }

  return (
    <span className={styles.correct}>
      ● {chainName ?? 'Unknown'}
    </span>
  )
}
