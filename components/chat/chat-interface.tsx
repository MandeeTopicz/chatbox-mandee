'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageList } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'
import { PluginFrame, type PluginInvocation } from '@/components/chat/plugin-frame'
import { ErrorBoundary } from '@/components/error-boundary'

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

export function ChatInterface({
  conversationId: initialConversationId,
}: {
  conversationId: string | null
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId
  )
  const [activePlugin, setActivePlugin] = useState<PluginInvocation | null>(null)
  const activePluginIdRef = useRef<string | null>(null)

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
  ): Promise<{ toolInvocations: PluginInvocation[] }> {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
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
                window.history.replaceState(null, '', `/chat/${event.id}`)
              }
              break

            case 'text_delta':
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

    return { toolInvocations }
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
        const moveMsg = `I played ${payload.playerMove}. Your turn.`
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

          const { toolInvocations } = await processStream(res, assistantId)

          if (toolInvocations.length > 0) {
            activatePlugin(toolInvocations[0])
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
        <div className="flex flex-1 items-center justify-center">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold">ChatBridge</h2>
            <p className="text-muted-foreground">
              Start a conversation with your AI tutor
            </p>
          </div>
        </div>
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
