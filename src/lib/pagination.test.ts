import { describe, expect, it } from 'vitest'
import { paginateItems, paginatedResult, resolvePagination } from './pagination'

describe('resolvePagination', () => {
  it('normalizes invalid values and caps a page size', () => {
    expect(resolvePagination({ page: Number.NaN, pageSize: 999 })).toEqual({
      page: 1,
      pageSize: 100,
      from: 0,
      to: 99,
    })
  })

  it('computes an inclusive database range', () => {
    expect(resolvePagination({ page: 3, pageSize: 10 })).toEqual({
      page: 3,
      pageSize: 10,
      from: 20,
      to: 29,
    })
  })

  it('keeps adjacent database pages non-overlapping', () => {
    const first = resolvePagination({ page: 1, pageSize: 10 })
    const second = resolvePagination({ page: 2, pageSize: 10 })

    expect(first.to + 1).toBe(second.from)
  })
})

describe('paginatedResult', () => {
  it('keeps an empty result safe and predictable', () => {
    expect(paginatedResult([], null, { page: 2, pageSize: 10 })).toEqual({
      data: [],
      page: 2,
      pageSize: 10,
      totalCount: 0,
      totalPages: 0,
    })
  })
})

describe('paginateItems', () => {
  const items = Array.from({ length: 13 }, (_, index) => index + 1)

  it('returns stable pages without duplicate boundary items', () => {
    expect(paginateItems(items, { page: 1, pageSize: 6 }).data).toEqual([1, 2, 3, 4, 5, 6])
    expect(paginateItems(items, { page: 2, pageSize: 6 }).data).toEqual([7, 8, 9, 10, 11, 12])
    expect(paginateItems(items, { page: 3, pageSize: 6 }).data).toEqual([13])
  })

  it('clamps a stale page after the collection shrinks', () => {
    expect(paginateItems(items.slice(0, 4), { page: 3, pageSize: 6 })).toEqual({
      data: [1, 2, 3, 4],
      page: 1,
      pageSize: 6,
      totalCount: 4,
      totalPages: 1,
    })
  })
})
