import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Shared mock setup ──────────────────────────────────
const mockGetUser = vi.hoisted(() => vi.fn())
const mockFrom = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
  createServiceClient: vi.fn().mockResolvedValue({
    from: mockFrom,
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 59, resetInMs: 0 }),
  CHAT_LIMIT: { maxRequests: 60, windowMs: 60000 },
  TOOL_LIMIT: { maxRequests: 30, windowMs: 60000 },
}))

vi.mock('@/lib/tool-result-validator', () => ({
  validateToolResult: vi.fn().mockReturnValue({ valid: true, sanitized: {}, warnings: [] }),
}))

vi.mock('@/lib/google-classroom', () => ({
  classroomGet: vi.fn(),
  classroomPost: vi.fn().mockRejectedValue(new Error('No valid Google access token')),
  hasGoogleConnection: vi.fn().mockResolvedValue(false),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}))

// Helper to build a chainable Supabase query mock
function chainResult(result: { data?: unknown; error?: unknown }) {
  const methods: Record<string, unknown> = {}
  const handler = {
    get(_: unknown, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(result)
      }
      if (prop === 'single') {
        return vi.fn().mockResolvedValue(result)
      }
      // All other chainable methods return the proxy itself
      if (!methods[prop]) {
        methods[prop] = vi.fn().mockReturnValue(proxy)
      }
      return methods[prop]
    },
  }
  const proxy = new Proxy({}, handler)
  return proxy
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── /api/quizzes POST — 403 for students ────────────────

describe('POST /api/quizzes', () => {
  it('returns 403 when role is student', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'student@test.com' } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return chainResult({ data: { role: 'student', school_id: null }, error: null })
      }
      return chainResult({ data: null, error: null })
    })

    const { POST } = await import('@/app/api/quizzes/route')

    const res = await POST(new Request('http://localhost:3000/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', topic: 'test', cards: [{ question: 'Q', answer: 'A' }] }),
    }))

    expect(res.status).toBe(403)
  })
})

// ─── /api/admin/stats — 403 for teachers ──────────────────

describe('GET /api/admin/stats', () => {
  it('returns 403 when role is teacher', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-2', email: 'teacher@test.com' } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return chainResult({ data: { role: 'teacher', school_id: null }, error: null })
      }
      return chainResult({ data: [], error: null })
    })

    const { GET } = await import('@/app/api/admin/stats/route')
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

// ─── /api/chat — 401 with no session ──────────────────────

describe('POST /api/chat', () => {
  it('returns 401 when no session', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { POST } = await import('@/app/api/chat/route')

    const res = await POST(new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    }))

    expect(res.status).toBe(401)
  })
})

// ─── /api/classroom/post-quiz — 401 with no google tokens ─

describe('POST /api/classroom/post-quiz', () => {
  it('returns 401 when teacher has no google_tokens', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'teacher-1', email: 'teacher@test.com' } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return chainResult({ data: { role: 'teacher', school_id: null }, error: null })
      }
      if (table === 'quizzes') {
        return chainResult({ data: { title: 'Test', topic: 'test', cards: [] }, error: null })
      }
      return chainResult({ data: null, error: null })
    })

    const { POST } = await import('@/app/api/classroom/post-quiz/route')

    const res = await POST(new Request('http://localhost:3000/api/classroom/post-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: 'quiz-1', courseId: 'course-1' }),
    }))

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.needsAuth).toBe(true)
  })
})
