/**
 * Validate and sanitize TOOL_RESULT payloads before injecting into Claude context.
 * Strips unexpected fields, logs warnings for malformed payloads.
 * Prevents prompt injection via crafted tool results.
 */

type ToolResultPayload = Record<string, unknown>

interface ValidationResult {
  valid: boolean
  sanitized: ToolResultPayload
  warnings: string[]
}

const TOOL_SCHEMAS: Record<string, string[]> = {
  // Chess tools
  start_chess_game: ['fen', 'status', 'message'],
  make_move: ['fen', 'lastMove', 'from', 'to', 'captured', 'status'],
  get_board_state: ['fen', 'turn', 'moveNumber', 'inCheck', 'status', 'lastMove', 'legalMoves', 'materialBalance'],
  resign_game: ['outcome', 'winner', 'fen', 'totalMoves', 'summary'],
  // Graphing calculator
  render_graph: ['equation', 'graphType', 'roots', 'yIntercept', 'domain', 'range', 'message'],
  // Quiz tools
  start_quiz: ['quizId', 'title', 'topic', 'totalCards', 'message'],
  submit_answer: ['correct', 'correctAnswer', 'cardIndex', 'remaining'],
  // Test stub
  test_echo: ['success', 'toolName', 'message', 'params_received', 'timestamp'],
}

// Maximum allowed string length in tool results to prevent context stuffing
const MAX_STRING_LENGTH = 5000

export function validateToolResult(
  toolName: string,
  result: unknown
): ValidationResult {
  const warnings: string[] = []

  if (!result || typeof result !== 'object') {
    return {
      valid: false,
      sanitized: { error: 'Invalid tool result: not an object' },
      warnings: [`Tool ${toolName}: result is not an object`],
    }
  }

  const raw = result as ToolResultPayload
  const allowedFields = TOOL_SCHEMAS[toolName]

  // If we don't have a schema for this tool, pass through with a warning
  if (!allowedFields) {
    warnings.push(`No schema defined for tool "${toolName}" — passing through unvalidated`)
    return { valid: true, sanitized: truncateStrings(raw), warnings }
  }

  // Strip unexpected fields
  const sanitized: ToolResultPayload = {}
  for (const key of allowedFields) {
    if (key in raw) {
      sanitized[key] = raw[key]
    }
  }

  // Check for unexpected fields (potential injection)
  const unexpectedFields = Object.keys(raw).filter((k) => !allowedFields.includes(k))
  if (unexpectedFields.length > 0) {
    warnings.push(
      `Tool ${toolName}: stripped unexpected fields: ${unexpectedFields.join(', ')}`
    )
  }

  return {
    valid: true,
    sanitized: truncateStrings(sanitized),
    warnings,
  }
}

/**
 * Truncate any string values that exceed MAX_STRING_LENGTH to prevent
 * context window stuffing attacks.
 */
function truncateStrings(obj: ToolResultPayload): ToolResultPayload {
  const result: ToolResultPayload = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      result[key] = value.slice(0, MAX_STRING_LENGTH) + '... [truncated]'
    } else if (Array.isArray(value)) {
      result[key] = value.slice(0, 100) // Cap array length
    } else {
      result[key] = value
    }
  }
  return result
}
