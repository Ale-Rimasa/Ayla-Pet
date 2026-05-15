import { vi } from 'vitest'

type MockResponse<T = unknown> = { data: T; error: null; count?: number } | { data: null; error: { message: string }; count?: number }

export function createMockChain<T = unknown>(response: MockResponse<T>) {
  const chain: Record<string, unknown> = {}

  // Fluent chainable methods (return this)
  const chainMethods = [
    'from', 'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'is', 'in', 'gte', 'lte', 'gt', 'lt',
    'order', 'range', 'limit', 'filter', 'or',
  ]
  chainMethods.forEach((method) => {
    chain[method] = vi.fn().mockReturnValue(chain)
  })

  // Terminal methods (return response)
  chain['single'] = vi.fn().mockResolvedValue(response)
  chain['maybeSingle'] = vi.fn().mockResolvedValue(response)

  // Make the chain itself awaitable — resolves to the default response.
  // This supports patterns like: const { error } = await supabase.from(...).update(...).eq(...)
  chain['then'] = (resolve: (value: MockResponse<T>) => void) => {
    Promise.resolve(response).then(resolve)
  }

  Object.defineProperty(chain, Symbol.toStringTag, { value: 'MockChain' })

  return chain as MockChain<T>
}

export type MockChain<T = unknown> = {
  from: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  is: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  range: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
}

export function createSupabaseMock(defaultResponse: MockResponse = { data: null, error: null }) {
  const chain = createMockChain(defaultResponse)
  const rpc = vi.fn().mockResolvedValue(defaultResponse)

  const client = {
    from: vi.fn().mockReturnValue(chain),
    rpc,
  }

  return { client, chain, rpc }
}

export function mockAdminClient(client: ReturnType<typeof createSupabaseMock>['client']) {
  vi.doMock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn().mockReturnValue(client),
  }))
}
