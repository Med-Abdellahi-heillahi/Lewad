import { describe, expect, it } from 'vitest'
import { paginatedResult, resolvePagination } from './pagination'

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
