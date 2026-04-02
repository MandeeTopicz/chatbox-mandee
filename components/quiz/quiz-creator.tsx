'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Card {
  question: string
  answer: string
}

export function QuizCreator() {
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [cards, setCards] = useState<Card[]>([{ question: '', answer: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedQuiz, setSavedQuiz] = useState<{ id: string; title: string } | null>(null)

  function addCard() {
    setCards((prev) => [...prev, { question: '', answer: '' }])
  }

  function removeCard(index: number) {
    if (cards.length <= 1) return
    setCards((prev) => prev.filter((_, i) => i !== index))
  }

  function updateCard(index: number, field: 'question' | 'answer', value: string) {
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, [field]: value } : card))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    // Validate
    const validCards = cards.filter((c) => c.question.trim() && c.answer.trim())
    if (validCards.length === 0) {
      setError('Add at least one card with both question and answer.')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          topic: topic.trim(),
          cards: validCards.map((c) => ({
            question: c.question.trim(),
            answer: c.answer.trim(),
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save quiz')
      }

      const data = await res.json()
      setSavedQuiz(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz')
    } finally {
      setSaving(false)
    }
  }

  if (savedQuiz) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold">Quiz Created!</h2>
        <p className="text-sm text-muted-foreground">
          &quot;{savedQuiz.title}&quot; has been saved. Students can start it by asking the AI tutor:
        </p>
        <div className="rounded-md bg-muted px-4 py-3 font-mono text-sm">
          &quot;Quiz me on {topic}&quot;
        </div>
        <p className="text-xs text-muted-foreground">
          Quiz ID: <code className="rounded bg-muted px-1.5 py-0.5">{savedQuiz.id}</code>
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setSavedQuiz(null)
              setTitle('')
              setTopic('')
              setCards([{ question: '', answer: '' }])
            }}
            className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            Create Another
          </button>
          <Link
            href="/chat"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Go to Chat
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title & Topic */}
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Quiz Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Civil War Key Events"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="topic" className="text-sm font-medium">
            Topic
          </label>
          <input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            placeholder="e.g., Civil War"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            Flashcards ({cards.length})
          </h3>
          <button
            type="button"
            onClick={addCard}
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" /> Add Card
          </button>
        </div>

        {cards.map((card, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Card {i + 1}
              </span>
              {cards.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCard(i)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-3">
              <input
                value={card.question}
                onChange={(e) => updateCard(i, 'question', e.target.value)}
                placeholder="Question"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <input
                value={card.answer}
                onChange={(e) => updateCard(i, 'answer', e.target.value)}
                placeholder="Answer"
                className={cn(
                  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm',
                  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Quiz'}
      </button>
    </form>
  )
}
