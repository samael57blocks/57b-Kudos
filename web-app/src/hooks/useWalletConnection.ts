import { useCallback } from 'react'
import { useConnection, useConnect, useDisconnect, useSwitchChain, useConnectors } from 'wagmi'
import { HARDHAT_CHAIN_ID, SEPOLIA_CHAIN_ID } from '../config/contracts'

export type ActiveNetwork = 'localhost' | 'sepolia'

/**
 * Derive the target network from the env var.
 */
function getTargetNetwork(): { chainId: 31337 | 11155111; name: ActiveNetwork } {
  const env = import.meta.env.VITE_ACTIVE_NETWORK ?? 'localhost'
  if (env === 'sepolia') {
    return { chainId: SEPOLIA_CHAIN_ID, name: 'sepolia' }
  }
  return { chainId: HARDHAT_CHAIN_ID, name: 'localhost' }
}

export interface WalletConnectionState {
  /** Connected wallet address */
  address: `0x${string}` | undefined
  /** Whether the wallet is connected */
  isConnected: boolean
  /** Whether a connection is in progress */
  isConnecting: boolean
  /** Whether the wallet is on the correct network */
  isCorrectNetwork: boolean
  /** Current chain name (user-friendly) */
  chainName: string | undefined
  /** The network we want to be on */
  targetNetwork: ActiveNetwork
  /** Connect to a wallet */
  connect: () => void
  /** Disconnect */
  disconnect: () => void
  /** Switch to the target network */
  switchToTargetNetwork: () => void
  /** Whether a network switch is in progress */
  isSwitchingNetwork: boolean
}

/**
 * Hook that wraps wallet connection, network detection, and switching.
 *
 * Uses the wagmi v3 mutation-based API:
 * - `useConnection` instead of deprecated `useAccount`
 * - `mutate` instead of deprecated `connect` / `disconnect` / `switchChain`
 * - `useConnectors` instead of deprecated `connectors` from `useConnect`
 */
export function useWalletConnection(): WalletConnectionState {
  const { address, isConnected, chain } = useConnection()
  const { mutate: connect, isPending: isConnectingPending } = useConnect()
  const { mutate: disconnect } = useDisconnect()
  const { mutate: switchChain, isPending: isSwitchingNetwork } = useSwitchChain()
  const connectors = useConnectors()

  const target = getTargetNetwork()

  const isCorrectNetwork = isConnected
    ? chain?.id === target.chainId
    : true // no warning when disconnected

  const chainName: string | undefined = (() => {
    if (!chain) return undefined
    if (chain.id === HARDHAT_CHAIN_ID) return 'Hardhat Local'
    if (chain.id === SEPOLIA_CHAIN_ID) return 'Sepolia'
    return 'Unknown'
  })()

  const connectWallet = useCallback(() => {
    const connector = connectors[0]
    if (connector) {
      connect({ connector })
    }
  }, [connect, connectors])

  const switchToTargetNetwork = useCallback(() => {
    switchChain({ chainId: target.chainId })
  }, [switchChain, target.chainId])

  return {
    address,
    isConnected,
    isConnecting: isConnectingPending,
    isCorrectNetwork,
    chainName,
    targetNetwork: target.name,
    connect: connectWallet,
    disconnect,
    switchToTargetNetwork,
    isSwitchingNetwork,
  }
}
