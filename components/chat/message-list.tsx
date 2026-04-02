'use client'

import { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Bot, User, Wrench, Info } from 'lucide-react'
import type { Message } from './chat-interface'

export function MessageList({ messages }: { messages: Message[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)

  // Detect if user has scrolled up from the bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    // Consider "at bottom" if within 80px
    userScrolledUpRef.current = distanceFromBottom > 80
  }, [])

  // Auto-scroll to bottom when messages change, unless user scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Filter out messages that shouldn't be displayed
  const visibleMessages = messages.filter((msg) => {
    if (msg.role === 'tool') return false
    // Hide auto-generated "I played X. Your turn." messages
    if (msg.role === 'user' && /^I played .+\. Your turn\.$/.test(msg.content)) return false
    // Hide empty assistant messages (leftover from tool-only responses saved to DB)
    if (msg.role === 'assistant' && !msg.content && !msg.toolCalls?.length) return false
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto" ref={scrollRef} onScroll={handleScroll}>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {visibleMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <Info className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{message.content}</span>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[80%] space-y-2 rounded-lg px-4 py-3 text-sm leading-relaxed',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {message.content ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : !message.toolCalls?.length ? (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-current" />
          </div>
        ) : null}

        {/* Tool call indicators */}
        {message.toolCalls?.map((call) => (
          <div
            key={call.id}
            className="flex items-center gap-2 rounded border bg-background/50 px-3 py-2 text-xs"
          >
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{call.name}</span>
            <span className="text-muted-foreground">
              {JSON.stringify(call.input).slice(0, 80)}
              {JSON.stringify(call.input).length > 80 ? '...' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
