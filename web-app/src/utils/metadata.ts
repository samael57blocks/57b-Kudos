/**
 * Build OpenSea-compatible metadata for NFT recognition tokens.
 * Schema matches MetadataBuilder.sol exactly (attributes: Value, Date, Employee).
 */

export interface MetadataParams {
  name: string
  description: string
  value: string
  date: string
  employeeName: string
  imageCid?: string
}

export interface MetadataAttribute {
  trait_type: string
  value: string
}

export interface MetadataResult {
  name: string
  description: string
  image: string
  attributes: MetadataAttribute[]
}

/**
 * Build an OpenSea-compatible metadata JSON object.
 * @throws TypeError if name is empty
 */
export function buildMetadata(p: MetadataParams): MetadataResult {
  if (!p.name) {
    throw new TypeError('name is required')
  }

  return {
    name: p.name,
    description: p.description,
    image: p.imageCid ? `ipfs://${p.imageCid}` : '',
    attributes: [
      { trait_type: 'Value', value: p.value },
      { trait_type: 'Date', value: p.date },
      { trait_type: 'Employee', value: p.employeeName },
    ],
  }
}

/**
 * Build an ipfs:// URI from a CID string.
 */
export function buildTokenURI(cid: string): string {
  return `ipfs://${cid}`
}
