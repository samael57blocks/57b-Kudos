import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  IpfsError,
  resolveMetadata,
  uploadImage,
  uploadMetadata,
} from '../ipfs'

// Tests for ipfs.ts — RED phase (code doesn't exist yet, these will fail)
// Spec scenarios S3.1–S3.5

const MOCK_GATEWAY = 'https://gateway.pinata.cloud'

beforeEach(() => {
  vi.stubEnv('VITE_PINATA_API_KEY', 'test-api-key')
  vi.stubEnv('VITE_PINATA_SECRET_KEY', 'test-secret-key')
  vi.stubEnv('VITE_PINATA_GATEWAY', MOCK_GATEWAY)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('IpfsError', () => {
  it('creates an error with code NETWORK', () => {
    const err = new IpfsError('Network failed', 'NETWORK')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(IpfsError)
    expect(err.message).toBe('Network failed')
    expect(err.code).toBe('NETWORK')
  })

  it('creates an error with code INVALID_URI', () => {
    const err = new IpfsError('Bad URI', 'INVALID_URI')
    expect(err.code).toBe('INVALID_URI')
  })

  it('creates an error with code PARSE', () => {
    const err = new IpfsError('Parse failed', 'PARSE')
    expect(err.code).toBe('PARSE')
  })
})

describe('resolveMetadata', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('S3.1: fetches and returns parsed JSON for ipfs:// URI', async () => {
    const cid = 'QmS31HappyPath'
    const mockJson = {
      name: 'S3.1',
      description: 'Happy path',
      image: '',
      attributes: [],
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockJson),
    } as Response)

    const result = await resolveMetadata(`ipfs://${cid}`)

    expect(result).toEqual(mockJson)
    expect(fetch).toHaveBeenCalledWith(`${MOCK_GATEWAY}/ipfs/${cid}`)
  })

  it('S3.2: returns cached result on second call for same CID', async () => {
    const cid = 'QmS32CacheTest'
    const mockJson = {
      name: 'S3.2',
      description: 'Cache test',
      image: '',
      attributes: [],
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockJson),
    } as Response)

    // First call — should fetch (unique CID, not yet cached)
    const first = await resolveMetadata(`ipfs://${cid}`)
    expect(first).toEqual(mockJson)
    expect(fetch).toHaveBeenCalledTimes(1)

    // Second call — should use cache
    const second = await resolveMetadata(`ipfs://${cid}`)
    expect(second).toEqual(mockJson)
    // fetch should still have been called only once
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('S3.3: throws IpfsError for non-ipfs:// URI', async () => {
    await expect(resolveMetadata('https://example.com/test')).rejects.toThrow(
      IpfsError,
    )
    await expect(resolveMetadata('https://example.com/test')).rejects.toThrow(
      'Invalid IPFS URI',
    )
  })

  it('S3.4: throws IpfsError on gateway timeout or network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network timeout'))

    await expect(
      resolveMetadata('ipfs://QmS34NetworkError'),
    ).rejects.toThrow(IpfsError)
  })

  it('LRU cache evicts oldest entry when over 50 entries', async () => {
    const mockJson = (i: number) => ({
      name: `NFT ${i}`,
      description: 'Test',
      image: '',
      attributes: [] as Array<{ trait_type: string; value: string }>,
    })

    vi.mocked(fetch).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        const parts = url.split('/')
        const cid = parts[parts.length - 1]
        return {
          ok: true,
          json: () => Promise.resolve(mockJson(Number.parseInt(cid, 10))),
        } as Response
      },
    )

    // Insert 51 entries (exceeds CACHE_MAX=50)
    for (let i = 0; i < 51; i++) {
      await resolveMetadata(`ipfs://lru-cid-${i}`)
    }

    // fetch should have been called 51 times (no cache hits after eviction)
    expect(fetch).toHaveBeenCalledTimes(51)
  })

  it('throws IpfsError on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 502,
    } as Response)

    await expect(
      resolveMetadata('ipfs://QmNonOkResponse'),
    ).rejects.toThrow(IpfsError)
  })

  it('throws IpfsError on bad JSON response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('Unexpected token')),
    } as Response)

    await expect(
      resolveMetadata('ipfs://QmBadJson'),
    ).rejects.toThrow(IpfsError)
  })
})

describe('uploadImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('uploads file to Pinata and returns ipfs:// CID', async () => {
    const cid = 'QmUploadImageTest'

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ IpfsHash: cid }),
    } as Response)

    const file = new File(['fake-image-content'], 'test.png', {
      type: 'image/png',
    })

    const result = await uploadImage(file)

    expect(result).toBe(`ipfs://${cid}`)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          pinata_api_key: 'test-api-key',
          pinata_secret_api_key: 'test-secret-key',
        }),
        body: expect.any(FormData),
      }),
    )
  })

  it('throws IpfsError on Pinata non-200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response)

    const file = new File(['test'], 'test.png', { type: 'image/png' })

    await expect(uploadImage(file)).rejects.toThrow(IpfsError)
  })

  it('throws IpfsError on network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const file = new File(['test'], 'test.png', { type: 'image/png' })

    await expect(uploadImage(file)).rejects.toThrow(IpfsError)
  })
})

describe('uploadMetadata', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('uploads JSON metadata to Pinata and returns ipfs:// CID', async () => {
    const cid = 'QmUploadMetaTest'
    const metadata = {
      name: 'Upload Test',
      description: 'Testing metadata upload',
      image: '',
      attributes: [],
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ IpfsHash: cid }),
    } as Response)

    const result = await uploadMetadata(metadata)

    expect(result).toBe(`ipfs://${cid}`)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          pinata_api_key: 'test-api-key',
          pinata_secret_api_key: 'test-secret-key',
        }),
        body: JSON.stringify(metadata),
      }),
    )
  })

  it('throws IpfsError on Pinata non-200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    await expect(uploadMetadata({ name: 'x', description: 'y', image: '', attributes: [] })).rejects.toThrow(IpfsError)
  })

  it('throws IpfsError on network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    await expect(uploadMetadata({ name: 'x', description: 'y', image: '', attributes: [] })).rejects.toThrow(IpfsError)
  })
})
