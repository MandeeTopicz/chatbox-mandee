'use client'

import { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Bot, User, Info } from 'lucide-react'
import type { Message } from './chat-interface'

export function MessageList({ messages }: { messages: Message[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUpRef.current = distanceFromBottom > 80
  }, [])

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const visibleMessages = messages.filter((msg) => {
    if (msg.role === 'tool') return false
    if (msg.role === 'user' && /^I played .+\. Your turn\.$/.test(msg.content)) return false
    if (msg.role === 'assistant' && !msg.content) return false
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
          isUser ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[80%] space-y-2 rounded-2xl p-4 text-sm leading-relaxed',
          isUser
            ? 'bg-indigo-600 text-white'
            : 'border-l-2 border-indigo-300 bg-indigo-50 text-slate-700'
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

        {/* Tool calls hidden from message thread */}
      </div>
    </div>
  )
}
