'use client'

import { useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChatInput({
  onSend,
  isStreaming,
}: {
  onSend: (message: string) => void
  isStreaming: boolean
}) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    onSend(trimmed)
    setInput('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    // Auto-resize textarea
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  return (
    <div className="border-t bg-background p-4">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-3xl items-end gap-2"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Message ChatBridge..."
          rows={1}
          disabled={isStreaming}
          className={cn(
            'flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
