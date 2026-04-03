import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must use vi.hoisted to create mock functions that can be referenced in vi.mock
const mockSignIn = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: mockSignIn,
    },
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from '@/app/api/auth/demo-login/route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/demo-login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for unknown role', async () => {
    const res = await POST(makeRequest({ role: 'superadmin' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid role')
  })

  it('returns 400 for missing role', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('redirects admin to /admin on success', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const res = await POST(makeRequest({ role: 'admin' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.redirect).toBe('/admin')
  })

  it('redirects teacher to /teacher on success', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const res = await POST(makeRequest({ role: 'teacher' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.redirect).toBe('/teacher')
  })

  it('redirects student to /chat on success', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const res = await POST(makeRequest({ role: 'student' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.redirect).toBe('/chat')
  })

  it('returns 401 when sign-in fails', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const res = await POST(makeRequest({ role: 'student' }))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toContain('Invalid login credentials')
  })
})
