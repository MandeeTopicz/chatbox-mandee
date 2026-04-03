import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuizCreator } from '@/components/quiz/quiz-creator'

export const metadata: Metadata = { title: 'Create Quiz — ChatBridge' }

export default async function NewQuizPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only teachers can access this page
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    redirect('/chat')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create a Quiz</h1>
          <p className="text-sm text-muted-foreground">
            Create flashcard quiz sets for your students. They can start quizzes by asking the AI tutor.
          </p>
        </div>
        <QuizCreator />
      </div>
    </div>
  )
}
