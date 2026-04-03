'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import {
  BookOpen,
  Users,
  Plus,
  LogOut,
  Clock,
  FileText,
  MessageSquare,
  Share2,
  Loader2,
  X,
  Check,
  ExternalLink,
} from 'lucide-react'

interface Quiz {
  id: string
  title: string
  topic: string
  cards: unknown[]
  created_at: string
}

interface Student {
  id: string
  display_name: string | null
  email: string
}

interface Attempt {
  id: string
  student_id: string
  quiz_id: string
  score: number
  total: number
  completed_at: string
}

type Tab = 'quizzes' | 'students' | 'activity'

export function TeacherDashboard() {
  const [schoolName, setSchoolName] = useState<string | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('quizzes')
  const [classroomQuizId, setClassroomQuizId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/teacher/dashboard')
      if (res.ok) {
        const data = await res.json()
        setSchoolName(data.school_name)
        setQuizzes(data.quizzes)
        setStudents(data.students)
        setAttempts(data.recent_attempts)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-transparent" />
      </div>
    )
  }

  const studentMap = new Map(students.map((s) => [s.id, s]))

  const tabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
    { key: 'quizzes', label: 'Quizzes', icon: BookOpen },
    { key: 'students', label: 'Students', icon: Users },
    { key: 'activity', label: 'Activity', icon: Clock },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Teacher Dashboard</h1>
            {schoolName && (
              <p className="text-sm text-slate-500">{schoolName}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/teacher/quizzes/new"
              className="hidden items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700 md:flex"
            >
              <Plus className="h-4 w-4" />
              New Quiz
            </Link>
            <Link
              href="/chat"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 transition-colors duration-150 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{quizzes.length}</p>
                <p className="text-xs text-slate-500">Quizzes</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{students.length}</p>
                <p className="text-xs text-slate-500">Students</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{attempts.length}</p>
                <p className="text-xs text-slate-500">Quiz Attempts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile new quiz button */}
        <Link
          href="/teacher/quizzes/new"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700 md:hidden"
        >
          <Plus className="h-4 w-4" />
          New Quiz
        </Link>

        {/* Tab navigation */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-medium transition-colors duration-150 ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-slate-800'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {activeTab === 'quizzes' && (
            <div>
              {quizzes.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <BookOpen className="h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">No quizzes yet</p>
                  <Link
                    href="/teacher/quizzes/new"
                    className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create your first quiz
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {quizzes.map((q) => (
                    <div key={q.id} className="flex items-center justify-between px-5 py-4 transition-colors duration-150 hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{q.title}</p>
                        <p className="text-xs text-slate-500">{q.topic}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setClassroomQuizId(q.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-800"
                          title="Post to Google Classroom"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Classroom
                        </button>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {Array.isArray(q.cards) ? q.cards.length : 0} cards
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'students' && (
            <div>
              {students.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <Users className="h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">No students at your school yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <div key={s.id} className="px-5 py-4 transition-colors duration-150 hover:bg-slate-50">
                      <p className="text-sm font-semibold text-slate-800">
                        {s.display_name || s.email.split('@')[0]}
                      </p>
                      <p className="truncate text-xs text-slate-500">{s.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              {attempts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <Clock className="h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">No quiz attempts yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Score</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.slice(0, 15).map((a) => {
                      const student = studentMap.get(a.student_id)
                      return (
                        <tr key={a.id} className="border-b border-slate-50 transition-colors duration-150 hover:bg-slate-50">
                          <td className="px-5 py-3 text-sm font-medium text-slate-800">
                            {student?.display_name || student?.email.split('@')[0] || 'Unknown'}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {a.score}/{a.total}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500">
                            {new Date(a.completed_at).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post to Google Classroom modal */}
      {classroomQuizId && (
        <PostToClassroomModal
          quizId={classroomQuizId}
          onClose={() => setClassroomQuizId(null)}
        />
      )}
    </div>
  )
}

// ─── Post to Google Classroom Modal ──────────────────────

interface Course {
  id: string
  name: string
  section: string | null
}

function PostToClassroomModal({ quizId, onClose }: { quizId: string; onClose: () => void }) {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false)

  useEffect(() => {
    async function loadCourses() {
      const res = await fetch('/api/classroom/courses')
      if (res.ok) {
        const data = await res.json()
        setCourses(data)
        if (data.length > 0) setSelectedCourse(data[0].id)
      } else {
        const data = await res.json().catch(() => ({}))
        if (data.needsAuth) {
          setNeedsAuth(true)
        } else {
          setError(data.error || 'Failed to load courses')
        }
      }
      setLoadingCourses(false)
    }
    loadCourses()
  }, [])

  async function handlePost() {
    if (!selectedCourse) return
    setPosting(true)
    setError(null)

    const res = await fetch('/api/classroom/post-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId, courseId: selectedCourse }),
    })

    if (res.ok) {
      setSuccess(true)
    } else {
      const data = await res.json().catch(() => ({}))
      if (data.needsAuth) {
        setNeedsAuth(true)
      } else {
        setError(data.error || 'Failed to post assignment')
      }
    }
    setPosting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        style={{ animation: 'modal-in 150ms ease-out' }}
      >
        <style>{`@keyframes modal-in { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <Share2 className="h-4 w-4 text-blue-600" />
            Post to Google Classroom
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          {needsAuth ? (
            <div className="space-y-4 text-center">
              <ExternalLink className="mx-auto h-10 w-10 text-blue-500" />
              <p className="text-sm text-slate-600">Connect your Google account to post quizzes to Google Classroom.</p>
              <a
                href="/api/auth/google"
                className="flex h-10 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
              >
                Connect Google Classroom
              </a>
            </div>
          ) : loadingCourses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : success ? (
            <div className="space-y-3 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-slate-800">Assignment posted!</p>
              <p className="text-xs text-slate-500">Students will see it in Google Classroom.</p>
              <button
                onClick={onClose}
                className="mt-2 flex h-9 w-full items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">No active courses found in your Google Classroom.</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Select a course</label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.section ? ` — ${c.section}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {error && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
                  )}
                  <button
                    onClick={handlePost}
                    disabled={posting || !selectedCourse}
                    className="flex h-10 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post Assignment'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
