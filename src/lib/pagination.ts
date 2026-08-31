export const DEFAULT_PAGE_SIZE = 10

export type PaginationParams = {
  page?: number
  pageSize?: number
}

export type PaginationMeta = {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type PaginatedResult<T> = PaginationMeta & {
  data: T[]
}

/** Keeps database ranges predictable even when a future caller supplies a URL value. */
export function resolvePagination({ page = 1, pageSize = DEFAULT_PAGE_SIZE }: PaginationParams = {}) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1
  const safePageSize = Number.isFinite(pageSize) ? Math.min(100, Math.max(1, Math.floor(pageSize))) : DEFAULT_PAGE_SIZE

  return {
    page: safePage,
    pageSize: safePageSize,
    from: (safePage - 1) * safePageSize,
    to: safePage * safePageSize - 1,
  }
}

export function paginatedResult<T>(data: T[], totalCount: number | null, params: PaginationParams = {}): PaginatedResult<T> {
  const { page, pageSize } = resolvePagination(params)
  const safeTotalCount = Math.max(0, totalCount ?? 0)

  return {
    data,
    page,
    pageSize,
    totalCount: safeTotalCount,
    totalPages: Math.ceil(safeTotalCount / pageSize),
  }
}

/** Frontend-only paging for already loaded, bounded collections. */
export function paginateItems<T>(items: readonly T[], params: PaginationParams = {}): PaginatedResult<T> {
  const { page: requestedPage, pageSize } = resolvePagination(params)
  const totalCount = items.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const page = Math.min(requestedPage, Math.max(1, totalPages))
  const from = (page - 1) * pageSize

  return {
    data: items.slice(from, from + pageSize),
    page,
    pageSize,
    totalCount,
    totalPages,
  }
}
