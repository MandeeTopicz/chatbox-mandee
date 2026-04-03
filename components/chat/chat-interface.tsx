'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageList } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'
import { PluginFrame, type PluginInvocation } from '@/components/chat/plugin-frame'
import { ErrorBoundary } from '@/components/error-boundary'
import { GreetingMessage } from '@/components/chat/greeting-message'

/**
 * Try to extract a chess move (from/to squares) from the AI's natural language text.
 * Looks for patterns like "e7 to e5", "move from e7 to e5", "I'll play Ne4" (algebraic),
 * or explicit square references like "e7e5".
 */
function parseChessMove(text: string): { from: string; to: string } | null {
  if (!text) return null
  // Pattern 1: "from e7 to e5" or "e7 to e5"
  const fromTo = text.match(/\b([a-h][1-8])\s*(?:to|-|→)\s*([a-h][1-8])\b/i)
  if (fromTo) return { from: fromTo[1].toLowerCase(), to: fromTo[2].toLowerCase() }
  // Pattern 2: "e7e5" (compact notation sometimes used)
  const compact = text.match(/\b([a-h][1-8])([a-h][1-8])\b/)
  if (compact) return { from: compact[1], to: compact[2] }
  return null
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  created_at: string
  toolCalls?: Array<{
    id: string
    name: string
    input: Record<string, unknown>
  }>
}

export interface ChatUserProfile {
  displayName: string
  role: string
  isFirstLogin: boolean
}

export function ChatInterface({
  conversationId: initialConversationId,
  userProfile,
}: {
  conversationId: string | null
  userProfile?: ChatUserProfile
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId
  )
  const [activePlugin, setActivePlugin] = useState<PluginInvocation | null>(null)
  const activePluginIdRef = useRef<string | null>(null)
  const syntheticToolIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (initialConversationId) {
      setConversationId(initialConversationId)
      loadMessages(initialConversationId)
    } else {
      setMessages([])
      setConversationId(null)
      setActivePlugin(null)
      activePluginIdRef.current = null
    }
  }, [initialConversationId])

  // Listen for reset-chat events (e.g. "New" button clicked while already on /chat)
  useEffect(() => {
    function handleReset() {
      setMessages([])
      setConversationId(null)
      setActivePlugin(null)
      activePluginIdRef.current = null
    }
    window.addEventListener('reset-chat', handleReset)
    return () => window.removeEventListener('reset-chat', handleReset)
  }, [])

  // Listen for starter-prompt events from sidebar tool shortcut buttons
  const sendMessageRef = useRef(sendMessage)
  sendMessageRef.current = sendMessage
  useEffect(() => {
    function handleStarterPrompt(e: Event) {
      const prompt = (e as CustomEvent).detail
      if (prompt && typeof prompt === 'string') {
        sendMessageRef.current(prompt)
      }
    }
    window.addEventListener('starter-prompt', handleStarterPrompt)
    return () => window.removeEventListener('starter-prompt', handleStarterPrompt)
  }, [])

  async function loadMessages(convId: string) {
    const res = await fetch(`/api/conversations/${convId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages || [])
    }
  }

  async function processStream(
    res: Response,
    assistantId: string
  ): Promise<{ toolInvocations: PluginInvocation[]; text: string }> {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulatedText = ''
    const toolInvocations: PluginInvocation[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        try {
          const event = JSON.parse(line.slice(6))

          switch (event.type) {
            case 'conversation_id':
              if (!conversationId) {
                setConversationId(event.id)
              }
              break

            case 'text_delta':
              accumulatedText += event.text
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + event.text }
                    : msg
                )
              )
              break

            case 'tool_invoke':
              toolInvocations.push({
                toolUseId: event.toolUseId,
                toolName: event.toolName,
                params: event.params,
                pluginId: event.pluginId,
                pluginName: event.pluginName,
                pluginUrl: event.pluginUrl,
              })
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        toolCalls: [
                          ...(msg.toolCalls || []),
                          {
                            id: event.toolUseId,
                            name: event.toolName,
                            input: event.params,
                          },
                        ],
                      }
                    : msg
                )
              )
              break

            case 'error':
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: `Error: ${event.error}` }
                    : msg
                )
              )
              break
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    return { toolInvocations, text: accumulatedText }
  }

  /**
   * Activate a plugin for a tool invocation.
   * If the same plugin is already loaded, update the invocation (new TOOL_INVOKE sent via useEffect).
   * If a different plugin, replace it.
   */
  function activatePlugin(inv: PluginInvocation) {
    if (activePluginIdRef.current === inv.pluginId) {
      // Same plugin already loaded — just update the invocation to send a new TOOL_INVOKE
      setActivePlugin({ ...inv })
    } else {
      // Different plugin or first load
      activePluginIdRef.current = inv.pluginId
      setActivePlugin(inv)
    }
  }

  async function sendMessage(content: string) {
    if (isStreaming) return
    setIsStreaming(true)

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', created_at: new Date().toISOString() },
    ])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, conversationId }),
      })

      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || 'Too many requests. Please wait a moment.')
        }
        throw new Error(await res.text())
      }

      const { toolInvocations } = await processStream(res, assistantId)

      if (toolInvocations.length > 0) {
        activatePlugin(toolInvocations[0])
      }

      // Notify sidebar to refresh conversation list
      window.dispatchEvent(new CustomEvent('conversation-updated'))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, content: `Error: ${errorMessage}` } : msg
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }

  const handleToolResult = useCallback(
    async (toolUseId: string, result: unknown) => {
      if (!conversationId) return
      // Synthetic tool calls (parsed from AI text) have no matching tool_use in
      // the DB history. Sending their results back would cause an orphaned
      // tool_result error. The iframe already applied the move visually.
      if (syntheticToolIdsRef.current.has(toolUseId)) {
        syntheticToolIdsRef.current.delete(toolUseId)
        return
      }
      setIsStreaming(true)

      const followUpId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        { id: followUpId, role: 'assistant', content: '', created_at: new Date().toISOString() },
      ])

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            toolResult: { toolUseId, result, toolName: activePlugin?.toolName },
          }),
        })

        if (!res.ok) {
          if (res.status === 429) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.message || 'Too many requests. Please wait.')
          }
          throw new Error(await res.text())
        }

        const { toolInvocations } = await processStream(res, followUpId)

        if (toolInvocations.length > 0) {
          activatePlugin(toolInvocations[0])
        }

        // Remove empty follow-up messages (when Claude only called tools with no text)
        setMessages((prev) =>
          prev.filter((msg) => !(msg.id === followUpId && !msg.content && !msg.toolCalls?.length))
        )
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process tool result'
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === followUpId ? { ...msg, content: `Error: ${errorMessage}` } : msg
          )
        )
      } finally {
        setIsStreaming(false)
        // No router.refresh() here — it would remount the plugin iframe
      }
    },
    [conversationId]
  )

  const handleStateUpdate = useCallback(
    async (pluginId: string, state: unknown) => {
      if (!conversationId) return

      // Parse state update payload
      const payload = state as { state?: unknown; turn?: string; playerMove?: string }
      const actualState = payload?.state ?? state

      // Persist state to app_sessions
      await fetch('/api/app-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, pluginId, state: actualState }),
      }).catch(() => {})

      // If it's the AI's turn (black) after a player move, auto-trigger Claude
      if (payload?.turn === 'b' && payload?.playerMove && !isStreaming) {
        console.log('[chess-orchestrator] Player moved:', payload.playerMove, '— triggering AI response')
        const isRetry = payload.playerMove === 'retry'
        const moveMsg = isRetry
          ? `It's your turn as black. You MUST call make_move now with {from, to} squares. Do NOT describe your move in words.`
          : `I played ${payload.playerMove}. Your turn. You MUST call make_move now.`
        setIsStreaming(true)

        const assistantId = crypto.randomUUID()
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', content: '', created_at: new Date().toISOString() },
        ])

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: moveMsg, conversationId }),
          })

          if (!res.ok) throw new Error(await res.text())

          const { toolInvocations, text: aiText } = await processStream(res, assistantId)

          if (toolInvocations.length > 0) {
            console.log('[chess-orchestrator] AI called tool:', toolInvocations[0].toolName, toolInvocations[0].params)
            activatePlugin(toolInvocations[0])
          } else {
            console.warn('[chess-orchestrator] AI responded with text only (no tool call):', aiText.slice(0, 100))
            // AI narrated a move without calling the tool. Try to parse
            // square notation from the text and inject a synthetic tool call.
            const parsed = parseChessMove(aiText)
            if (parsed && activePlugin) {
              console.log('[chess-orchestrator] Parsed move from text:', parsed, '— injecting synthetic tool call')
              const syntheticId = crypto.randomUUID()
              syntheticToolIdsRef.current.add(syntheticId)
              activatePlugin({
                ...activePlugin,
                toolUseId: syntheticId,
                toolName: 'make_move',
                params: { from: parsed.from, to: parsed.to },
              })
            } else {
              console.error('[chess-orchestrator] Could not parse any move from AI text. Game may be stuck.')
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to get AI move'
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: `Error: ${errorMessage}` } : msg
            )
          )
        } finally {
          setIsStreaming(false)
        }
      }
    },
    [conversationId, isStreaming]
  )

  const handlePluginComplete = useCallback(
    (_pluginId: string, _summary: string, payload?: Record<string, unknown>) => {
      // Keep the plugin panel open so the student can reference the visual.
      // Post chess game results to the API (moved from iframe due to sandbox restriction).
      if (payload?.outcome && typeof payload.outcome === 'string') {
        fetch('/api/chess/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outcome: payload.outcome }),
        }).catch(() => {
          // Non-fatal — anonymous users won't have stats saved
        })
      }
    },
    []
  )

  return (
    <div className="flex h-full flex-col">
      {messages.length === 0 ? (
        userProfile?.role === 'student' ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-6">
              <GreetingMessage
                displayName={userProfile.displayName}
                isFirstLogin={userProfile.isFirstLogin}
                onStarterPrompt={(prompt) => {
                  sendMessage(prompt)
                  // Mark first login as done
                  if (userProfile.isFirstLogin) {
                    fetch('/api/users/first-login', { method: 'POST' }).catch(() => {})
                    userProfile.isFirstLogin = false
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                <span className="text-2xl font-bold text-indigo-600">CB</span>
              </div>
              <h2 className="text-2xl font-semibold text-slate-800">ChatBridge</h2>
              <p className="text-sm text-slate-500">
                Start a conversation with your AI tutor
              </p>
            </div>
          </div>
        )
      ) : (
        <ErrorBoundary fallbackMessage="Failed to render messages">
          <MessageList messages={messages} />
        </ErrorBoundary>
      )}

      {activePlugin && conversationId && (
        <ErrorBoundary fallbackMessage="Plugin encountered an error">
          <PluginFrame
            invocation={activePlugin}
            conversationId={conversationId}
            onToolResult={handleToolResult}
            onStateUpdate={handleStateUpdate}
            onComplete={handlePluginComplete}
            onClose={() => {
              setActivePlugin(null)
              activePluginIdRef.current = null
            }}
          />
        </ErrorBoundary>
      )}

      <ChatInput onSend={sendMessage} isStreaming={isStreaming} />
    </div>
  )
}
