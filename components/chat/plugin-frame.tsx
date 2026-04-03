'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  validateInboundMessage,
  getPluginOrigin,
  type InboundPluginMessage,
  type ToolInvokeMessage,
} from '@/lib/plugin-protocol'
import { Loader2, X, AlertTriangle, Crown, LineChart, Layers, CloudSun, Music } from 'lucide-react'

// Log events to console — Sentry capture is server-only to avoid bundling OpenTelemetry
function captureEvent(event: { message: string; level: string; tags?: Record<string, unknown>; extra?: Record<string, unknown> }) {
  console.warn(`[sentry-event] ${event.message}`, event.tags, event.extra)
}

const PLUGIN_THEMES: Record<string, { headerBg: string; bodyBg: string; text: string; closeHover: string; icon: typeof Crown; height: string }> = {
  chess: {
    headerBg: 'bg-green-700',
    bodyBg: 'bg-green-50/50',
    text: 'text-white',
    closeHover: 'hover:bg-green-600',
    icon: Crown,
    height: 'h-96',
  },
  'graphing-calculator': {
    headerBg: 'bg-blue-700',
    bodyBg: 'bg-blue-50/50',
    text: 'text-white',
    closeHover: 'hover:bg-blue-600',
    icon: LineChart,
    height: 'h-[440px]',
  },
  'flashcard-quiz': {
    headerBg: 'bg-amber-600',
    bodyBg: 'bg-amber-50/50',
    text: 'text-white',
    closeHover: 'hover:bg-amber-500',
    icon: Layers,
    height: 'h-96',
  },
  weather: {
    headerBg: 'bg-sky-600',
    bodyBg: 'bg-sky-50/50',
    text: 'text-white',
    closeHover: 'hover:bg-sky-500',
    icon: CloudSun,
    height: 'h-[420px]',
  },
  spotify: {
    headerBg: 'bg-[#1DB954]',
    bodyBg: 'bg-neutral-950',
    text: 'text-white',
    closeHover: 'hover:bg-[#1aa34a]',
    icon: Music,
    height: 'h-96',
  },
}

function getPluginTheme(pluginName: string) {
  const key = pluginName.toLowerCase().replace(/\s+/g, '-')
  return PLUGIN_THEMES[key] ?? null
}

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

    // Timeout: if no TOOL_RESULT within 30 seconds of TOOL_INVOKE
    const timeout = setTimeout(() => {
      if (!toolResultReceivedRef.current) {
        setError('Plugin did not respond within 30 seconds')
        setFailureCount((prev) => prev + 1)
        onToolResult(invocation.toolUseId, { error: 'Plugin timed out — no response received.' })
      }
    }, 30_000)

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
      if (!fromOurIframe && !originMatches && !fromSandboxedIframe) {
        captureEvent({
          message: 'postmessage.origin_rejected',
          level: 'warning',
          tags: { pluginName: invocation.pluginName },
          extra: { rejectedOrigin: event.origin, expectedOrigin },
        })
        return
      }

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
          // Tool result errors (e.g. illegal chess moves) are game logic errors,
          // NOT plugin failures. Don't increment failureCount — the plugin is
          // working correctly by reporting the error. Only timeouts and
          // PLUGIN_ERROR count toward disabling.
          if (msg.payload.error) {
            setError(msg.payload.error)
          } else {
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
          if (failureCount + 1 >= 6) {
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
        setError('Plugin failed to load within 30 seconds')
      }
    }, 30_000)
    return () => clearTimeout(timeout)
  }, [])

  if (failureCount >= 6) {
    captureEvent({
      message: 'circuit_breaker.triggered',
      level: 'warning',
      tags: { pluginName: invocation.pluginName, pluginId: invocation.pluginId },
      extra: { failureCount },
    })
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

  const theme = getPluginTheme(invocation.pluginName)
  const ThemeIcon = theme?.icon ?? null

  return (
    <div
      className="border-t"
      style={{ animation: 'plugin-slide-in 200ms ease-out both' }}
    >
      <style>{`
        @keyframes plugin-slide-in {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="mx-auto max-w-3xl">
        <div className={`flex items-center justify-between px-4 py-2.5 ${theme ? theme.headerBg : 'bg-muted'}`}>
          <div className="flex items-center gap-2">
            {!ready && <Loader2 className={`h-4 w-4 animate-spin ${theme?.text ?? ''}`} />}
            {ThemeIcon && <ThemeIcon className={`h-4 w-4 ${theme?.text ?? ''}`} />}
            <span className={`text-sm font-semibold ${theme?.text ?? ''}`}>{invocation.pluginName}</span>
            {error && <span className="text-xs text-red-200">{error}</span>}
          </div>
          <button
            onClick={onClose}
            className={`rounded p-1 transition-colors duration-150 ${theme?.text ?? ''} ${theme?.closeHover ?? 'hover:bg-accent'}`}
            title="Close plugin"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={theme?.bodyBg ?? 'bg-muted/30'}>
          <iframe
            ref={iframeRef}
            src={buildPluginUrl(invocation.pluginUrl, invocation.pluginId, conversationId)}
            sandbox="allow-scripts"
            className={`${theme?.height ?? 'h-96'} w-full border-0`}
            title={`${invocation.pluginName} plugin`}
          />
        </div>
      </div>
    </div>
  )
}
