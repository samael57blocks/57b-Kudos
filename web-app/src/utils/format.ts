/**
 * Display formatting utilities shared across components.
 */

/** Shorten an Ethereum address for display: 0x1234...abcd */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/** Build a block explorer transaction URL. Falls back to etherscan.io. */
export function buildExplorerTxUrl(
  txHash: string | undefined,
  baseUrl?: string,
): string | undefined {
  if (!txHash) return undefined
  return `${baseUrl ?? 'https://etherscan.io'}/tx/${txHash}`
}
