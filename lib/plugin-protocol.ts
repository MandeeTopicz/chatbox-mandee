/**
 * ChatBridge Plugin postMessage Protocol
 *
 * All messages include: { type, conversationId, pluginId, payload }
 * Origin validated against registered plugin URL on every received message.
 */

// ============================================================
// Message types sent FROM plugin iframe TO platform
// ============================================================

export interface PluginReadyMessage {
  type: 'PLUGIN_READY'
  conversationId: string
  pluginId: string
  payload: Record<string, never>
}

export interface ToolResultMessage {
  type: 'TOOL_RESULT'
  conversationId: string
  pluginId: string
  payload: {
    invocationId: string
    result: unknown
    error?: string
  }
}

export interface StateUpdateMessage {
  type: 'STATE_UPDATE'
  conversationId: string
  pluginId: string
  payload: {
    state: unknown
  }
}

export interface PluginCompleteMessage {
  type: 'PLUGIN_COMPLETE'
  conversationId: string
  pluginId: string
  payload: {
    summary: string
  }
}

export interface PluginErrorMessage {
  type: 'PLUGIN_ERROR'
  conversationId: string
  pluginId: string
  payload: {
    code: string
    message: string
  }
}

// Messages the platform receives from plugins
export type InboundPluginMessage =
  | PluginReadyMessage
  | ToolResultMessage
  | StateUpdateMessage
  | PluginCompleteMessage
  | PluginErrorMessage

// ============================================================
// Message types sent FROM platform TO plugin iframe
// ============================================================

export interface ToolInvokeMessage {
  type: 'TOOL_INVOKE'
  conversationId: string
  pluginId: string
  payload: {
    toolName: string
    params: Record<string, unknown>
    invocationId: string
  }
}

// Messages the platform sends to plugins
export type OutboundPluginMessage = ToolInvokeMessage

// ============================================================
// Validation
// ============================================================

const VALID_INBOUND_TYPES = new Set([
  'PLUGIN_READY',
  'TOOL_RESULT',
  'STATE_UPDATE',
  'PLUGIN_COMPLETE',
  'PLUGIN_ERROR',
])

/**
 * Validate that a postMessage event is a well-formed plugin message.
 * Returns the parsed message or null if invalid.
 */
export function validateInboundMessage(
  data: unknown
): InboundPluginMessage | null {
  if (!data || typeof data !== 'object') return null

  const msg = data as Record<string, unknown>

  if (typeof msg.type !== 'string' || !VALID_INBOUND_TYPES.has(msg.type)) {
    return null
  }

  if (typeof msg.conversationId !== 'string') return null
  if (typeof msg.pluginId !== 'string') return null
  if (!msg.payload || typeof msg.payload !== 'object') return null

  return data as InboundPluginMessage
}

/**
 * Extract the origin from a plugin URL for postMessage validation.
 */
export function getPluginOrigin(pluginUrl: string): string {
  try {
    const url = new URL(pluginUrl)
    return url.origin
  } catch {
    return ''
  }
}
