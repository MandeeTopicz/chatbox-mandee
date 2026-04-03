import { vi } from 'vitest'

/**
 * Creates a mock Supabase client with configurable auth user and query results.
 */
export function createMockSupabase(options: {
  user?: { id: string; email: string } | null
  profile?: { role: string; school_id?: string | null } | null
  queryResults?: Record<string, { data?: unknown; error?: { message: string } | null; count?: number }>
} = {}) {
  const { user = null, profile = null, queryResults = {} } = options

  const chainable = (tableName: string) => {
    const result = queryResults[tableName] ?? { data: [], error: null }
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(
        tableName === 'users' && profile
          ? { data: profile, error: null }
          : result
      ),
      then: undefined, // make it thenable
    }
    // Default resolution for non-single queries
    Object.defineProperty(chain, 'then', {
      value: (resolve: (v: unknown) => void) => resolve(result),
      configurable: true,
    })
    return chain
  }

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'Not authenticated' },
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: user ? { user } : null,
        error: user ? null : { message: 'Invalid login credentials' },
      }),
      signUp: vi.fn().mockResolvedValue({
        data: user ? { user } : null,
        error: null,
      }),
    },
    from: vi.fn((table: string) => chainable(table)),
  }

  return mockClient
}

/**
 * Setup vi.mock for @/lib/supabase/server to return the given mock client.
 */
export function mockSupabaseModule(mockClient: ReturnType<typeof createMockSupabase>) {
  vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn().mockResolvedValue(mockClient),
    createServiceClient: vi.fn().mockResolvedValue(mockClient),
  }))
}
