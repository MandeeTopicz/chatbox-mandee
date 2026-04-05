'use client'

import { useEffect, useState } from 'react'
import { logout } from '@/app/auth/actions'
import {
  School,
  GraduationCap,
  Users,
  BookOpen,
  LogOut,
  UserPlus,
  Trophy,
  Plus,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  Puzzle,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  Package,
} from 'lucide-react'

interface Stats {
  total_schools: number
  total_teachers: number
  total_students: number
  total_quizzes: number
}

interface Teacher {
  id: string
  display_name: string | null
  email: string
  school_id: string | null
  quiz_count: number
  created_at: string
}

interface Student {
  id: string
  display_name: string | null
  email: string
  school_id: string | null
  chess_wins: number
  chess_losses: number
  chess_draws: number
  quizzes_taken: number
  created_at: string
}

interface SchoolItem {
  id: string
  name: string
}

interface PluginRow {
  id: string
  name: string
  url: string
  allowed: boolean
  created_at: string
}

type AdminTab = 'users' | 'plugins'
type ModalType = 'add-user' | 'add-school' | null

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users')
  const [stats, setStats] = useState<Stats | null>(null)
  const [schools, setSchools] = useState<SchoolItem[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalType>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function loadData() {
    const res = await fetch('/api/admin/stats')
    if (res.ok) {
      const data = await res.json()
      setStats(data.stats)
      setSchools(data.schools || [])
      setTeachers(data.teachers)
      setStudents(data.students)
    }
  }

  useEffect(() => {
    loadData().then(() => setLoading(false))
  }, [])

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return
    setActionLoading(id)
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await loadData()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to delete user')
    }
    setActionLoading(null)
  }

  async function changeRole(id: string, newRole: string) {
    setActionLoading(id)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      await loadData()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to update role')
    }
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">School management overview</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal('add-school')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-50"
            >
              <School className="h-4 w-4" />
              Add School
            </button>
            <button
              onClick={() => setModal('add-user')}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={School} label="Schools" value={stats?.total_schools ?? 0} borderColor="border-l-violet-500" iconBg="bg-violet-50" iconColor="text-violet-600" />
          <StatCard icon={GraduationCap} label="Teachers" value={stats?.total_teachers ?? 0} borderColor="border-l-blue-500" iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatCard icon={Users} label="Students" value={stats?.total_students ?? 0} borderColor="border-l-green-500" iconBg="bg-green-50" iconColor="text-green-600" />
          <StatCard icon={BookOpen} label="Quizzes" value={stats?.total_quizzes ?? 0} borderColor="border-l-amber-500" iconBg="bg-amber-50" iconColor="text-amber-600" />
        </div>

        {/* Tab bar */}
        <div className="flex gap-4 border-b border-slate-200">
          {([
            { key: 'users' as AdminTab, label: 'Teachers & Students', icon: Users },
            { key: 'plugins' as AdminTab, label: 'Plugins', icon: Puzzle },
          ]).map((tab) => (
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
        </div>

        {activeTab === 'users' && (
          <>
            {/* Schools panel */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <h2 className="flex items-center gap-2 font-semibold text-slate-800">
                  <School className="h-4 w-4 text-violet-600" />
                  Schools
                </h2>
                <button
                  onClick={() => setModal('add-school')}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              {schools.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <School className="h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">No schools yet</p>
                  <button
                    onClick={() => setModal('add-school')}
                    className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4" /> Add your first school
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 px-5 py-4">
                  {schools.map((s) => {
                    const teacherCount = teachers.filter((t) => t.school_id === s.id).length
                    const studentCount = students.filter((st) => st.school_id === s.id).length
                    return (
                      <div key={s.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                        <School className="h-4 w-4 text-violet-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{s.name}</p>
                          <p className="text-[11px] text-slate-500">{teacherCount} teachers &middot; {studentCount} students</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Two-panel layout */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Teacher list */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                  <h2 className="flex items-center gap-2 font-semibold text-slate-800">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    Teachers
                  </h2>
                  <button
                    onClick={() => setModal('add-user')}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
                <div>
                  {teachers.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <UserPlus className="h-10 w-10 text-slate-300" />
                      <p className="text-sm text-slate-500">No teachers yet</p>
                      <button
                        onClick={() => setModal('add-user')}
                        className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700"
                      >
                        <Plus className="h-4 w-4" /> Add your first teacher
                      </button>
                    </div>
                  ) : (
                    teachers.map((t, i) => (
                      <div
                        key={t.id}
                        className={`group flex items-center justify-between px-5 py-3.5 transition-colors duration-150 hover:bg-slate-50 ${
                          i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        } ${i < teachers.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {t.display_name || t.email.split('@')[0]}
                            </p>
                            <RoleBadge role="teacher" />
                          </div>
                          <p className="truncate text-xs text-slate-500">{t.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {t.quiz_count} quizzes
                          </span>
                          <RoleDropdown
                            currentRole="teacher"
                            userId={t.id}
                            loading={actionLoading === t.id}
                            onChangeRole={changeRole}
                          />
                          <button
                            onClick={() => deleteUser(t.id, t.display_name || t.email)}
                            disabled={actionLoading === t.id}
                            className="hidden rounded-lg p-1.5 text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-500 group-hover:block disabled:opacity-50"
                            title="Remove user"
                          >
                            {actionLoading === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Student list */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                  <h2 className="flex items-center gap-2 font-semibold text-slate-800">
                    <Users className="h-4 w-4 text-green-600" />
                    Students
                  </h2>
                  <button
                    onClick={() => setModal('add-user')}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
                <div>
                  {students.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <UserPlus className="h-10 w-10 text-slate-300" />
                      <p className="text-sm text-slate-500">No students enrolled yet</p>
                      <button
                        onClick={() => setModal('add-user')}
                        className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700"
                      >
                        <Plus className="h-4 w-4" /> Add a student
                      </button>
                    </div>
                  ) : (
                    students.map((s, i) => (
                      <div
                        key={s.id}
                        className={`group flex items-center justify-between px-5 py-3.5 transition-colors duration-150 hover:bg-slate-50 ${
                          i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        } ${i < students.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {s.display_name || s.email.split('@')[0]}
                            </p>
                            <RoleBadge role="student" />
                          </div>
                          <p className="truncate text-xs text-slate-500">{s.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {s.quizzes_taken} quizzes
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Trophy className="h-3 w-3 text-amber-500" />
                            {s.chess_wins}W {s.chess_losses}L {s.chess_draws}D
                          </span>
                          <RoleDropdown
                            currentRole="student"
                            userId={s.id}
                            loading={actionLoading === s.id}
                            onChangeRole={changeRole}
                          />
                          <button
                            onClick={() => deleteUser(s.id, s.display_name || s.email)}
                            disabled={actionLoading === s.id}
                            className="hidden rounded-lg p-1.5 text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-500 group-hover:block disabled:opacity-50"
                            title="Remove user"
                          >
                            {actionLoading === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'plugins' && <PluginsTab />}
      </div>

      {/* Modals */}
      {modal === 'add-user' && (
        <AddUserModal schools={schools} onClose={() => setModal(null)} onSuccess={() => { setModal(null); loadData() }} />
      )}
      {modal === 'add-school' && (
        <AddSchoolModal onClose={() => setModal(null)} onSuccess={() => { setModal(null); loadData() }} />
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function StatCard({ icon: Icon, label, value, borderColor, iconBg, iconColor }: {
  icon: React.ComponentType<{ className?: string }>
  label: string; value: number; borderColor: string; iconBg: string; iconColor: string
}) {
  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 ${borderColor} bg-white p-4 shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    teacher: 'bg-blue-50 text-blue-700',
    student: 'bg-green-50 text-green-700',
    admin: 'bg-violet-50 text-violet-700',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[role] ?? 'bg-slate-100 text-slate-600'}`}>
      {role}
    </span>
  )
}

function RoleDropdown({ currentRole, userId, loading, onChangeRole }: {
  currentRole: string; userId: string; loading: boolean
  onChangeRole: (id: string, role: string) => void
}) {
  const [open, setOpen] = useState(false)
  const roles = ['student', 'teacher', 'admin'].filter((r) => r !== currentRole)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="hidden rounded-lg p-1.5 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 group-hover:block disabled:opacity-50"
        title="Change role"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Change role</p>
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => { onChangeRole(userId, r); setOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 transition-colors duration-150 hover:bg-slate-50"
              >
                <RoleBadge role={r} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AddUserModal({ schools, onClose, onSuccess }: { schools: SchoolItem[]; onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('student')
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        display_name: displayName.trim() || undefined,
        role,
        school_id: schoolId || undefined,
        password: password || undefined,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create user')
      setSaving(false)
      return
    }

    onSuccess()
  }

  return (
    <ModalShell title="Add User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@school.edu"
            className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jane Doe"
            className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {schools.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">School</label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <option value="">No school</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Password</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank for Welcome123!"
            className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex h-10 w-full items-center justify-center rounded-xl bg-slate-800 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create User'}
        </button>
      </form>
    </ModalShell>
  )
}

function AddSchoolModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [district, setDistrict] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch('/api/admin/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), district: district.trim() || undefined }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create school')
      setSaving(false)
      return
    }

    onSuccess()
  }

  return (
    <ModalShell title="Add School" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">School Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Gauntlet Academy"
            className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">District (optional)</label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="Gauntlet District"
            className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex h-10 w-full items-center justify-center rounded-xl bg-slate-800 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create School'}
        </button>
      </form>
    </ModalShell>
  )
}

function PluginsTab() {
  const [plugins, setPlugins] = useState<PluginRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  async function loadPlugins() {
    const res = await fetch('/api/admin/stats')
    if (!res.ok) return
    // Stats endpoint doesn't include plugins — fetch directly via service-level endpoint
    // Use a dedicated fetch to get all plugins (pending + active) for admin
    const pluginRes = await fetch('/api/admin/plugins')
    if (pluginRes.ok) {
      setPlugins(await pluginRes.json())
    }
  }

  useEffect(() => {
    loadPlugins().then(() => setLoading(false))
  }, [])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleApprove(id: string) {
    setActionLoading(id)
    // Optimistic update
    setPlugins((prev) => prev.map((p) => (p.id === id ? { ...p, allowed: true } : p)))

    const res = await fetch(`/api/admin/plugins/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed: true }),
    })

    if (res.ok) {
      showToast('Plugin approved', 'success')
    } else {
      // Revert optimistic update
      setPlugins((prev) => prev.map((p) => (p.id === id ? { ...p, allowed: false } : p)))
      showToast('Failed to approve plugin', 'error')
    }
    setActionLoading(null)
  }

  async function handleReject(id: string, action: 'reject' | 'disable') {
    setActionLoading(id)
    // Optimistic update — remove from list
    const previous = plugins
    setPlugins((prev) => prev.filter((p) => p.id !== id))

    const res = await fetch(`/api/admin/plugins/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed: false }),
    })

    if (res.ok || res.status === 204) {
      showToast(action === 'reject' ? 'Plugin rejected' : 'Plugin disabled', 'success')
    } else {
      // Revert optimistic update
      setPlugins(previous)
      showToast(`Failed to ${action} plugin`, 'error')
    }
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  const pending = plugins.filter((p) => !p.allowed)
  const active = plugins.filter((p) => p.allowed)

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Pending plugins */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5">
          <Clock className="h-4 w-4 text-amber-500" />
          <h2 className="font-semibold text-slate-800">Pending Approval</h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {pending.length}
            </span>
          )}
        </div>
        {pending.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No plugins awaiting approval</p>
          </div>
        ) : (
          pending.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-5 py-3.5 ${
                i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
              } ${i < pending.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                <p className="truncate text-xs text-slate-500">{p.url}</p>
                <p className="text-[11px] text-slate-400">
                  Registered {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove(p.id)}
                  disabled={actionLoading === p.id}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Approve
                </button>
                <button
                  onClick={() => handleReject(p.id, 'reject')}
                  disabled={actionLoading === p.id}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Active plugins */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5">
          <Puzzle className="h-4 w-4 text-green-600" />
          <h2 className="font-semibold text-slate-800">Active Plugins</h2>
          {active.length > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              {active.length}
            </span>
          )}
        </div>
        {active.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No plugins registered yet</p>
          </div>
        ) : (
          active.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-5 py-3.5 ${
                i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
              } ${i < active.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                <p className="truncate text-xs text-slate-500">{p.url}</p>
              </div>
              <button
                onClick={() => handleReject(p.id, 'disable')}
                disabled={actionLoading === p.id}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 disabled:opacity-50"
              >
                {actionLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                Disable
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        style={{ animation: 'modal-in 150ms ease-out' }}
      >
        <style>{`@keyframes modal-in { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
