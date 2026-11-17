import { describe, it, expect } from 'vitest'
import { buildMetadata, buildTokenURI } from '../metadata'

// Tests for metadata.ts — RED phase (code doesn't exist yet, these will fail)
// Spec scenarios S4.1–S4.4

describe('buildMetadata', () => {
  it('S4.1: returns OpenSea JSON with all params and imageCid', () => {
    const result = buildMetadata({
      name: 'Employee of the Month',
      description: 'Awarded for outstanding performance',
      value: '1000',
      date: '2024-01-15',
      employeeName: 'John Doe',
      imageCid: 'QmZ4tDucesT23M1T3LqF2SsKcGjiCioqBYnCKRwVFmebvC',
    })

    expect(result).toHaveProperty('name', 'Employee of the Month')
    expect(result).toHaveProperty(
      'description',
      'Awarded for outstanding performance',
    )
    expect(result).toHaveProperty(
      'image',
      'ipfs://QmZ4tDucesT23M1T3LqF2SsKcGjiCioqBYnCKRwVFmebvC',
    )

    // Assert attributes match MetadataBuilder.sol schema
    expect(result).toHaveProperty('attributes')
    expect(result.attributes).toHaveLength(3)

    const valueAttr = result.attributes.find(
      (a: { trait_type: string }) => a.trait_type === 'Value',
    )
    expect(valueAttr).toBeDefined()
    expect(valueAttr!.value).toBe('1000')

    const dateAttr = result.attributes.find(
      (a: { trait_type: string }) => a.trait_type === 'Date',
    )
    expect(dateAttr).toBeDefined()
    expect(dateAttr!.value).toBe('2024-01-15')

    const employeeAttr = result.attributes.find(
      (a: { trait_type: string }) => a.trait_type === 'Employee',
    )
    expect(employeeAttr).toBeDefined()
    expect(employeeAttr!.value).toBe('John Doe')
  })

  it('S4.2: sets image to empty string when imageCid is absent', () => {
    const result = buildMetadata({
      name: 'Test',
      description: 'No image',
      value: '500',
      date: '2024-06-01',
      employeeName: 'Jane',
    })

    expect(result).toHaveProperty('image', '')
  })

  it('S4.4: throws TypeError when name is empty', () => {
    expect(() =>
      buildMetadata({
        name: '',
        description: 'Missing name',
        value: '100',
        date: '2024-06-01',
        employeeName: 'Jane',
      }),
    ).toThrow(TypeError)
  })
})

describe('buildTokenURI', () => {
  it('S4.3: returns ipfs:// URI for a given CID', () => {
    const result = buildTokenURI(
      'QmZ4tDucesT23M1T3LqF2SsKcGjiCioqBYnCKRwVFmebvC',
    )

    expect(result).toBe(
      'ipfs://QmZ4tDucesT23M1T3LqF2SsKcGjiCioqBYnCKRwVFmebvC',
    )
  })
})
