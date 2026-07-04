import { createConfig, http } from 'wagmi'
import { sepolia, hardhat } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? ''

const connectors = [
  injected({ target: 'metaMask' }),
  ...(walletConnectProjectId
    ? [walletConnect({ projectId: walletConnectProjectId })]
    : []),
  coinbaseWallet({ appName: import.meta.env.VITE_APP_NAME ?? 'NFT57B' }),
]

export const config = createConfig({
  chains: [hardhat, sepolia],
  connectors,
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(),
  },
})
