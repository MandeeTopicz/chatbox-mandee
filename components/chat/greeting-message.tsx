'use client'

import { Crown, LineChart, Layers, CloudSun, Bot } from 'lucide-react'

interface GreetingMessageProps {
  displayName: string
  isFirstLogin: boolean
  onStarterPrompt: (prompt: string) => void
}

const TOOL_CARDS = [
  {
    label: 'Chess',
    icon: Crown,
    description: 'Play a game and get move-by-move coaching',
    prompt: "Let's play a game of chess! I'll be white.",
    bg: 'bg-green-50',
    border: 'border-green-200 hover:border-green-400',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    descColor: 'text-green-600/75',
  },
  {
    label: 'Graphing Calculator',
    icon: LineChart,
    description: 'Visualize and explore any equation',
    prompt: 'Can you graph the equation y = x^2 - 4?',
    bg: 'bg-blue-50',
    border: 'border-blue-200 hover:border-blue-400',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    descColor: 'text-blue-600/75',
  },
  {
    label: 'Flashcard Quiz',
    icon: Layers,
    description: 'Practice any topic your teacher assigned',
    prompt: 'Start a flashcard quiz for me!',
    bg: 'bg-amber-50',
    border: 'border-amber-200 hover:border-amber-400',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-800',
    descColor: 'text-amber-600/75',
  },
  {
    label: 'Weather',
    icon: CloudSun,
    description: 'Check the weather anywhere in the world',
    prompt: "What's the weather in New York?",
    bg: 'bg-sky-50',
    border: 'border-sky-200 hover:border-sky-400',
    iconColor: 'text-sky-600',
    titleColor: 'text-sky-800',
    descColor: 'text-sky-600/75',
  },
]

export function GreetingMessage({ displayName, isFirstLogin, onStarterPrompt }: GreetingMessageProps) {
  const firstName = displayName.split(' ')[0]

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
        <Bot className="h-4 w-4" />
      </div>
      <div className="max-w-[85%] space-y-4 rounded-2xl border-l-2 border-indigo-300 bg-indigo-50 p-4 text-sm leading-relaxed text-slate-700">
        <p className="font-medium text-indigo-900">
          Hey {firstName}! Ready to learn something? Here is what we can do
          together:
        </p>

        {isFirstLogin && (
          <p className="text-xs leading-relaxed text-slate-500">
            This is your AI tutor. You can have real conversations, play chess,
            graph equations, and take quizzes, all right here.
          </p>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4">
          {TOOL_CARDS.map((card) => (
            <button
              key={card.label}
              onClick={() => onStarterPrompt(card.prompt)}
              className={`group flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${card.bg} ${card.border}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.iconColor}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-xs font-bold ${card.titleColor}`}>{card.label}</p>
                <p className={`mt-0.5 text-[11px] leading-snug ${card.descColor}`}>{card.description}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-slate-500">
          Or just type anything you want to explore.
        </p>
      </div>
    </div>
  )
}
