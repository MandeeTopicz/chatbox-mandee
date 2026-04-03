import { describe, it, expect } from 'vitest'
import { validateToolResult } from '@/lib/tool-result-validator'

describe('Tool Result Validator — Chess make_move', () => {
  it('returns only allowed fields (fen, lastMove, from, to, captured, status)', () => {
    const result = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      lastMove: 'e4',
      from: 'e2',
      to: 'e4',
      captured: null,
      status: 'active',
      secret: 'should-be-stripped',
      extra: 123,
    }

    const v = validateToolResult('make_move', result)
    expect(v.valid).toBe(true)
    expect(v.sanitized).toHaveProperty('fen')
    expect(v.sanitized).toHaveProperty('lastMove')
    expect(v.sanitized).toHaveProperty('from')
    expect(v.sanitized).toHaveProperty('to')
    expect(v.sanitized).toHaveProperty('captured')
    expect(v.sanitized).toHaveProperty('status')
    expect(v.sanitized).not.toHaveProperty('secret')
    expect(v.sanitized).not.toHaveProperty('extra')
  })

  it('warns when extra fields are stripped', () => {
    const result = { fen: 'abc', status: 'active', injected: 'hack' }
    const v = validateToolResult('make_move', result)
    expect(v.warnings).toHaveLength(1)
    expect(v.warnings[0]).toContain('injected')
  })
})

describe('Tool Result Validator — Graph render_graph', () => {
  it('passes through allowed fields', () => {
    const result = {
      equation: 'x^2 - 4',
      graphType: 'function',
      roots: [-2, 2],
      yIntercept: -4,
      domain: [-10, 10],
      range: [-10, 10],
      message: 'Graph rendered',
    }

    const v = validateToolResult('render_graph', result)
    expect(v.valid).toBe(true)
    expect(v.sanitized.roots).toEqual([-2, 2])
  })

  it('returns empty sanitized roots when roots field is missing', () => {
    const result = {
      equation: 'x^2 + 1',
      graphType: 'function',
    }

    const v = validateToolResult('render_graph', result)
    expect(v.valid).toBe(true)
    // roots is not in the result, so it won't be in sanitized
    expect(v.sanitized.roots).toBeUndefined()
  })
})

describe('Tool Result Validator — Quiz submit_answer', () => {
  it('validates a correct submit_answer result', () => {
    const result = {
      correct: true,
      correctAnswer: 'Abraham Lincoln',
      cardIndex: 1,
      remaining: 3,
    }

    const v = validateToolResult('submit_answer', result)
    expect(v.valid).toBe(true)
    expect(v.sanitized.correct).toBe(true)
    expect(v.sanitized.correctAnswer).toBe('Abraham Lincoln')
  })

  it('passes through correct=null (validator does field stripping, not value validation)', () => {
    const result = {
      correct: null,
      correctAnswer: 'test',
      cardIndex: 0,
      remaining: 4,
    }

    const v = validateToolResult('submit_answer', result)
    // The validator strips unknown fields but passes through null values
    expect(v.valid).toBe(true)
    expect(v.sanitized.correct).toBeNull()
  })

  it('strips unexpected fields from submit_answer', () => {
    const result = {
      correct: true,
      correctAnswer: 'test',
      cardIndex: 0,
      remaining: 4,
      studentName: 'should be stripped',
    }

    const v = validateToolResult('submit_answer', result)
    expect(v.sanitized).not.toHaveProperty('studentName')
    expect(v.warnings[0]).toContain('studentName')
  })
})

describe('Tool Result Validator — edge cases', () => {
  it('returns invalid for non-object results', () => {
    const v = validateToolResult('make_move', 'not an object')
    expect(v.valid).toBe(false)
    expect(v.sanitized.error).toBeDefined()
  })

  it('returns invalid for null result', () => {
    const v = validateToolResult('make_move', null)
    expect(v.valid).toBe(false)
  })

  it('passes through unknown tool names with a warning', () => {
    const result = { anything: 'goes' }
    const v = validateToolResult('unknown_tool_xyz', result)
    expect(v.valid).toBe(true)
    expect(v.warnings[0]).toContain('No schema defined')
  })

  it('truncates long strings in results', () => {
    const result = {
      fen: 'A'.repeat(6000),
      status: 'ok',
    }
    const v = validateToolResult('make_move', result)
    expect((v.sanitized.fen as string).length).toBeLessThan(6000)
    expect((v.sanitized.fen as string)).toContain('[truncated]')
  })

  it('caps arrays at 100 elements', () => {
    const result = {
      legalMoves: Array.from({ length: 200 }, (_, i) => `move${i}`),
      fen: 'abc',
      turn: 'white',
      status: 'active',
    }
    const v = validateToolResult('get_board_state', result)
    expect((v.sanitized.legalMoves as unknown[]).length).toBe(100)
  })
})
