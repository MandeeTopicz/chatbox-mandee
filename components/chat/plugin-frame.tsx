'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  validateInboundMessage,
  getPluginOrigin,
  type InboundPluginMessage,
  type ToolInvokeMessage,
} from '@/lib/plugin-protocol'
import { Loader2, X, AlertTriangle } from 'lucide-react'

export interface PluginInvocation {
  toolUseId: string
  toolName: string
  params: Record<string, unknown>
  pluginId: string
  pluginName: string
  pluginUrl: string
}

interface PluginFrameProps {
  invocation: PluginInvocation
  conversationId: string
  onToolResult: (toolUseId: string, result: unknown) => void
  onStateUpdate: (pluginId: string, state: unknown) => void
  onComplete: (pluginId: string, summary: string, payload?: Record<string, unknown>) => void
  onClose: () => void
}

function buildPluginUrl(baseUrl: string, pluginId: string, conversationId: string): string {
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('pluginId', pluginId)
    url.searchParams.set('conversationId', conversationId)
    return url.toString()
  } catch {
    return baseUrl
  }
}

export function PluginFrame({
  invocation,
  conversationId,
  onToolResult,
  onStateUpdate,
  onComplete,
  onClose,
}: PluginFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failureCount, setFailureCount] = useState(0)
  const expectedOrigin = getPluginOrigin(invocation.pluginUrl)

  // Track the current invocation to send when ready, and handle subsequent invocations
  const pendingInvokeRef = useRef<ToolInvokeMessage | null>(null)
  const readyRef = useRef(false)

  // Build a TOOL_INVOKE message from the current invocation
  function buildInvokeMessage(inv: PluginInvocation): ToolInvokeMessage {
    return {
      type: 'TOOL_INVOKE',
      conversationId,
      pluginId: inv.pluginId,
      payload: {
        toolName: inv.toolName,
        params: inv.params,
        invocationId: inv.toolUseId,
      },
    }
  }

  // When invocation changes, send TOOL_INVOKE to the iframe if it's ready
  // Also set a 10-second timeout for the TOOL_RESULT response
  const toolResultReceivedRef = useRef(false)

  useEffect(() => {
    toolResultReceivedRef.current = false
    const msg = buildInvokeMessage(invocation)
    if (readyRef.current && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, '*')
    } else {
      pendingInvokeRef.current = msg
    }

    // Timeout: if no TOOL_RESULT within 10 seconds of TOOL_INVOKE
    const timeout = setTimeout(() => {
      if (!toolResultReceivedRef.current) {
        setError('Plugin did not respond within 10 seconds')
        setFailureCount((prev) => prev + 1)
        // Send a synthetic error result so Claude can recover
        onToolResult(invocation.toolUseId, { error: 'Plugin timed out — no response received.' })
      }
    }, 10_000)

    return () => clearTimeout(timeout)
  }, [invocation.toolUseId]) // Key off toolUseId — changes when a new invocation arrives

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Origin validation for sandboxed iframes:
      // sandbox='allow-scripts' without allow-same-origin reports event.origin === "null" (string).
      // We accept: (1) our iframe's contentWindow, (2) matching origin, or (3) "null" origin
      // from a sandboxed iframe. In all cases we also verify pluginId + conversationId below.
      const fromOurIframe = event.source === iframeRef.current?.contentWindow
      const originMatches = event.origin === expectedOrigin
      const fromSandboxedIframe = event.origin === 'null'
      if (!fromOurIframe && !originMatches && !fromSandboxedIframe) return

      const msg = validateInboundMessage(event.data)
      if (!msg) return

      if (msg.pluginId !== invocation.pluginId) return
      if (msg.conversationId !== conversationId) return

      switch (msg.type) {
        case 'PLUGIN_READY':
          setReady(true)
          readyRef.current = true
          // Send pending TOOL_INVOKE
          if (pendingInvokeRef.current && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(pendingInvokeRef.current, '*')
            pendingInvokeRef.current = null
          }
          break

        case 'TOOL_RESULT':
          toolResultReceivedRef.current = true // Cancel the timeout
          if (msg.payload.error) {
            setError(msg.payload.error)
            setFailureCount((prev) => prev + 1)
          } else {
            setFailureCount(0)
            setError(null)
          }
          onToolResult(msg.payload.invocationId, msg.payload.error ? { error: msg.payload.error } : msg.payload.result)
          break

        case 'STATE_UPDATE':
          // Pass full payload so ChatInterface can detect turn/playerMove
          onStateUpdate(msg.pluginId, msg.payload)
          break

        case 'PLUGIN_COMPLETE':
          onComplete(msg.pluginId, msg.payload.summary, msg.payload)
          break

        case 'PLUGIN_ERROR':
          setFailureCount((prev) => prev + 1)
          setError(msg.payload.message)
          if (failureCount + 1 >= 3) {
            setError('Plugin disabled: too many consecutive errors')
          }
          break
      }
    },
    [expectedOrigin, invocation.pluginId, conversationId, onToolResult, onStateUpdate, onComplete, failureCount]
  )

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  // Timeout for PLUGIN_READY
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!readyRef.current) {
        setError('Plugin failed to load within 10 seconds')
      }
    }, 10_000)
    return () => clearTimeout(timeout)
  }, [])

  if (failureCount >= 3) {
    return (
      <div className="border-t bg-destructive/5 p-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Plugin disabled for this session</p>
            <p className="text-xs text-muted-foreground">{invocation.pluginName} encountered too many errors.</p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t bg-muted/30">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            {!ready && <Loader2 className="h-4 w-4 animate-spin" />}
            <span className="text-sm font-medium">{invocation.pluginName}</span>
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent" title="Close plugin">
            <X className="h-4 w-4" />
          </button>
        </div>
        <iframe
          ref={iframeRef}
          src={buildPluginUrl(invocation.pluginUrl, invocation.pluginId, conversationId)}
          sandbox="allow-scripts"
          className="h-96 w-full border-0"
          title={`${invocation.pluginName} plugin`}
        />
      </div>
    </div>
  )
}
