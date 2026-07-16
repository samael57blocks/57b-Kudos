/**
 * IPFS client utilities for the web application.
 * Handles uploading to Pinata and resolving metadata with LRU caching.
 */

const PINATA_API = 'https://api.pinata.cloud/pinning'
const CACHE_MAX = 50

// ── IpfsError ────────────────────────────────────────────────────────────────

export type IpfsErrorCode = 'NETWORK' | 'INVALID_URI' | 'PARSE'

export class IpfsError extends Error {
  public readonly code: IpfsErrorCode

  constructor(message: string, code: IpfsErrorCode) {
    super(message)
    this.name = 'IpfsError'
    this.code = code
  }
}

// ── LRU Cache ────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: unknown
  ts: number
}

const cache = new Map<string, CacheEntry>()

function cacheGet(cid: string): unknown | undefined {
  if (!cache.has(cid)) return undefined
  const entry = cache.get(cid)!
  // LRU bump: delete and re-insert to move to end
  cache.delete(cid)
  cache.set(cid, entry)
  return entry.data
}

function cacheSet(cid: string, data: unknown): void {
  if (cache.size >= CACHE_MAX) {
    // Evict oldest (first inserted) entry
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(cid, { data, ts: Date.now() })
}

// ── URI helpers ───────────────────────────────────────────────────────────────

/**
 * Extract CID from an ipfs:// URI.
 * Handles both `ipfs://<CID>` and `ipfs://ipfs://<CID>` (double prefix).
 * Returns undefined if the URI is not a valid ipfs:// URI.
 */
export function parseCID(uri: string): string | undefined {
  if (!uri.startsWith('ipfs://')) return undefined
  const rest = uri.slice(7) // strip first ipfs://
  // Handle double prefix: ipfs://ipfs://<CID>
  return rest.startsWith('ipfs://') ? rest.slice(7) : rest
}

/**
 * Build a gateway URL for a CID.
 */
export function gatewayURL(cid: string): string {
  const gateway =
    import.meta.env.VITE_PINATA_GATEWAY ?? 'https://gateway.pinata.cloud'
  return `${gateway}/ipfs/${cid}`
}

// ── Pinata Headers ────────────────────────────────────────────────────────────

function pinataHeaders(): Record<string, string> {
  const apiKey = import.meta.env.VITE_PINATA_API_KEY
  const secretKey = import.meta.env.VITE_PINATA_SECRET_KEY

  if (!apiKey || !secretKey) {
    throw new IpfsError('Missing VITE_PINATA_API_KEY or VITE_PINATA_SECRET_KEY', 'NETWORK')
  }

  return {
    pinata_api_key: apiKey,
    pinata_secret_api_key: secretKey,
  }
}

// ── resolveMetadata ───────────────────────────────────────────────────────────

/**
 * Resolve an ipfs:// URI by fetching metadata from the configured IPFS gateway.
 * Results are cached in an LRU Map (max 50 entries).
 *
 * @throws IpfsError on invalid URI, network failure, or bad response
 */
export async function resolveMetadata(uri: string): Promise<Record<string, unknown>> {
  const cid = parseCID(uri)
  if (!cid) {
    throw new IpfsError(`Invalid IPFS URI: ${uri}`, 'INVALID_URI')
  }

  // Check cache first
  const cached = cacheGet(cid)
  if (cached !== undefined) return cached as Record<string, unknown>

  // Fetch from gateway
  let response: Response
  try {
    response = await fetch(gatewayURL(cid))
  } catch (err) {
    throw new IpfsError(
      `Failed to fetch IPFS metadata: ${(err as Error).message}`,
      'NETWORK',
    )
  }

  if (!response.ok) {
    throw new IpfsError(
      `IPFS gateway returned ${response.status}`,
      'NETWORK',
    )
  }

  let data: Record<string, unknown>
  try {
    data = (await response.json()) as Record<string, unknown>
  } catch (err) {
    throw new IpfsError(
      `Failed to parse IPFS metadata JSON: ${(err as Error).message}`,
      'PARSE',
    )
  }

  cacheSet(cid, data)
  return data
}

// ── uploadImage ───────────────────────────────────────────────────────────────

/**
 * Upload a File to Pinata (pinFileToIPFS) and return the ipfs:// CID.
 *
 * @throws IpfsError on network failure or Pinata non-200
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  let response: Response
  try {
    response = await fetch(`${PINATA_API}/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        ...pinataHeaders(),
        // Do NOT set Content-Type — browser sets multipart boundary automatically
      },
      body: formData,
    })
  } catch (err) {
    throw new IpfsError(
      `Failed to upload image: ${(err as Error).message}`,
      'NETWORK',
    )
  }

  if (!response.ok) {
    throw new IpfsError(
      `Pinata upload failed: ${response.status} ${response.statusText}`,
      'NETWORK',
    )
  }

  const result = (await response.json()) as { IpfsHash: string }
  return `ipfs://${result.IpfsHash}`
}

// ── uploadMetadata ────────────────────────────────────────────────────────────

/**
 * Upload a JSON metadata object to Pinata (pinJSONToIPFS) and return the ipfs:// CID.
 *
 * @throws IpfsError on network failure or Pinata non-200
 */
export async function uploadMetadata(
  metadata: Record<string, unknown>,
): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${PINATA_API}/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...pinataHeaders(),
      },
      body: JSON.stringify(metadata),
    })
  } catch (err) {
    throw new IpfsError(
      `Failed to upload metadata: ${(err as Error).message}`,
      'NETWORK',
    )
  }

  if (!response.ok) {
    throw new IpfsError(
      `Pinata metadata upload failed: ${response.status} ${response.statusText}`,
      'NETWORK',
    )
  }

  const result = (await response.json()) as { IpfsHash: string }
  return `ipfs://${result.IpfsHash}`
}
