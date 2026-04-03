/**
 * Chess Tool Call Eval
 *
 * Sends 10 chess-related prompts to Claude with the chess tools registered,
 * and checks whether Claude calls the correct tool for each prompt.
 *
 * A passing eval: Claude calls the right tool on at least 8 of 10 prompts.
 *
 * Run: pnpm eval:chess
 */
import { describe, it, expect } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'

const CHESS_TOOLS: Anthropic.Tool[] = [
  {
    name: 'start_chess_game',
    description: 'Start a new chess game. The student plays as white.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'make_move',
    description: 'Make a chess move on the board.',
    input_schema: {
      type: 'object' as const,
      properties: {
        from: { type: 'string', description: 'Source square (e.g., e2)' },
        to: { type: 'string', description: 'Destination square (e.g., e4)' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'get_board_state',
    description: 'Get the current board state, legal moves, and analysis.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'resign_game',
    description: 'Resign the current chess game.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
]

const SYSTEM_PROMPT = `You are a chess AI tutor. You have chess tools available.
- "let's play chess" → call start_chess_game
- When asked to make a specific move → call make_move with from/to
- "what should I do?" → call get_board_state for analysis
- "I want to castle" → call make_move with the king move (e.g., e1 to g1)
- "resign" → call resign_game
Always use tools rather than just describing actions.`

interface EvalCase {
  prompt: string
  expectedTool: string | null // null means prose is acceptable
}

const EVAL_CASES: EvalCase[] = [
  { prompt: "let's play chess", expectedTool: 'start_chess_game' },
  { prompt: 'I want to play a game of chess!', expectedTool: 'start_chess_game' },
  { prompt: 'move my pawn to e4', expectedTool: 'make_move' },
  { prompt: 'play e2 to e4', expectedTool: 'make_move' },
  { prompt: 'what should I do here?', expectedTool: 'get_board_state' },
  { prompt: 'analyze the position', expectedTool: 'get_board_state' },
  { prompt: 'I want to castle kingside', expectedTool: 'make_move' },
  { prompt: 'resign', expectedTool: 'resign_game' },
  { prompt: 'I give up, you win', expectedTool: 'resign_game' },
  { prompt: 'move my knight to f3', expectedTool: 'make_move' },
]

interface EvalResult {
  prompt: string
  expectedTool: string | null
  actualTool: string | null
  paramsValid: boolean
  passed: boolean
}

async function runEval(): Promise<EvalResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set — cannot run chess eval')
  }

  const anthropic = new Anthropic({ apiKey })
  const results: EvalResult[] = []

  for (const evalCase of EVAL_CASES) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        tools: CHESS_TOOLS,
        messages: [{ role: 'user', content: evalCase.prompt }],
      })

      // Find tool use block if any
      const toolBlock = response.content.find((b) => b.type === 'tool_use') as
        | { type: 'tool_use'; name: string; input: Record<string, unknown> }
        | undefined

      const actualTool = toolBlock?.name ?? null

      // Validate params
      let paramsValid = true
      if (actualTool === 'make_move' && toolBlock) {
        const input = toolBlock.input
        paramsValid = typeof input.from === 'string' && typeof input.to === 'string'
          && /^[a-h][1-8]$/.test(input.from) && /^[a-h][1-8]$/.test(input.to)
      }

      const passed = evalCase.expectedTool === null
        ? true // prose acceptable
        : actualTool === evalCase.expectedTool

      results.push({
        prompt: evalCase.prompt,
        expectedTool: evalCase.expectedTool,
        actualTool,
        paramsValid,
        passed,
      })
    } catch (err) {
      results.push({
        prompt: evalCase.prompt,
        expectedTool: evalCase.expectedTool,
        actualTool: null,
        paramsValid: false,
        passed: false,
      })
    }
  }

  return results
}

describe('Chess Tool Call Eval', () => {
  it('Claude calls the correct tool on at least 8 of 10 prompts', async () => {
    const results = await runEval()

    // Print report
    console.log('\n═══ Chess Tool Call Eval Report ═══\n')
    console.log(JSON.stringify(results, null, 2))

    const passCount = results.filter((r) => r.passed).length
    const total = results.length

    console.log(`\n${passCount}/${total} passed`)
    for (const r of results) {
      const icon = r.passed ? 'PASS' : 'FAIL'
      console.log(`  [${icon}] "${r.prompt}" → expected: ${r.expectedTool}, got: ${r.actualTool}`)
    }
    console.log('')

    expect(passCount).toBeGreaterThanOrEqual(8)
  }, 120_000) // 2 minute timeout for API calls
})
