'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Classroom, Session } from '@/types'
import {
  BookOpen, CalendarDays, Settings, LogOut,
  ChevronLeft, ChevronRight, LayoutList, CalendarRange,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import WeekCalendar from '@/components/schedule/WeekCalendar'
import type { CalSession } from '@/components/schedule/WeekCalendar'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
// Updated to modern SaaS colors based on your palette
const CLASS_DOTS = ['#3B82F6','#10B981','#8B5CF6','#06B6D4','#F59E0B','#EF4444']

function toDateKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(mins: number | null) {
  if (!mins) return ''
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins/60)}h${mins%60 ? ` ${mins%60}m` : ''}`
}
function weekSunday(date: Date): Date {
  const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d
}
function fmtWeekRange(sun: Date): string {
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6)
  if (sun.getMonth() === sat.getMonth())
    return `${MONTHS[sun.getMonth()]} ${sun.getDate()} – ${sat.getDate()}, ${sun.getFullYear()}`
  return `${MONTHS[sun.getMonth()]} ${sun.getDate()} – ${MONTHS[sat.getMonth()]} ${sat.getDate()}, ${sat.getFullYear()}`
}

type ClassroomWithSessions = Classroom & { sessions: Session[] }

export default function StudentSchedule() {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()

  const [data, setData]             = useState<ClassroomWithSessions[]>([])
  const [loading, setLoading]       = useState(true)
  const [viewYear, setViewYear]     = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth]   = useState(() => new Date().getMonth())
  const [weekStart, setWeekStart]   = useState<Date>(() => weekSunday(new Date()))
  const [selectedDate, setSelected] = useState<string | null>(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [view, setView]             = useState<'week' | 'month' | 'list'>('week')
  const menuRef = useRef<HTMLDivElement>(null)

  const today    = new Date()
  const todayKey = toDateKey(today.toISOString())

  const fetchAll = async (token: string) => {
    const classrooms = await api.classrooms.list(token)
    const results = await Promise.all(
      classrooms.map(async c => ({
        ...c,
        sessions: await api.sessions.list(token, c.id).catch(() => [] as Session[]),
      }))
    )
    setData(results)
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.apiToken) { router.replace('/'); return }
    fetchAll(session.apiToken).catch(() => {}).finally(() => setLoading(false))
    const id = setInterval(() => { if (session?.apiToken) fetchAll(session.apiToken).catch(() => {}) }, 30_000)
    return () => clearInterval(id)
  }, [session, status, router])

  const colorMap = useMemo(() => {
    const map: Record<string, number> = {}
    data.forEach((c, i) => { map[c.id] = i % CLASS_DOTS.length })
    return map
  }, [data])

  const allSessions = useMemo(() =>
    data.flatMap(c => c.sessions.filter(s => s.scheduledAt).map(s => ({ ...s, classroom: c }))),
    [data])

  const calSessions: CalSession[] = useMemo(() => allSessions.map(s => ({
    id: s.id, title: s.title, status: s.status,
    scheduledAt: s.scheduledAt ?? null,
    durationMinutes: s.durationMinutes ?? null,
    classroom: { id: s.classroom.id, name: s.classroom.name },
  })), [allSessions])

  const sessionsByDate = useMemo(() => {
    const map: Record<string, typeof allSessions> = {}
    allSessions.forEach(s => { const k = toDateKey(s.scheduledAt!); (map[k] ??= []).push(s) })
    return map
  }, [allSessions])

  const liveSessions = useMemo(() =>
    data.flatMap(c => c.sessions.filter(s => s.status === 'live').map(s => ({ ...s, classroom: c }))),
    [data])

  const groupedSessions = useMemo(() => {
    const upcoming = allSessions
      .filter(s => new Date(s.scheduledAt!) >= today || s.status === 'live')
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    const groups: Array<{ dateKey: string; label: string; sessions: typeof allSessions }> = []
    upcoming.forEach(s => {
      const key = toDateKey(s.scheduledAt!)
      let g = groups.find(g => g.dateKey === key)
      if (!g) {
        const d = new Date(key + 'T00:00:00')
        g = { dateKey: key, label: d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}), sessions: [] }
        groups.push(g)
      }
      g.sessions.push(s)
    })
    return groups
  }, [allSessions])

  // month calendar cells
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i+1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => viewMonth === 0 ? (setViewYear(y => y-1), setViewMonth(11)) : setViewMonth(m => m-1)
  const nextMonth = () => viewMonth === 11 ? (setViewYear(y => y+1), setViewMonth(0)) : setViewMonth(m => m+1)
  const prevWeek  = () => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate()-7); return d })
  const nextWeek  = () => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate()+7); return d })
  const goToday   = () => { const t = new Date(); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); setWeekStart(weekSunday(t)) }

  const selectedSessions = selectedDate ? (sessionsByDate[selectedDate] ?? []) : []
  const upcomingSessions = allSessions
    .filter(s => new Date(s.scheduledAt!) > today && s.status !== 'ended')
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 5)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const initials = (session?.user?.name ?? 'S').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()

  const nav = [
    { icon: <BookOpen className="w-4 h-4" />,     label: 'Classrooms', href: '/student/dashboard' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Schedule',   href: '/student/schedule'  },
    { icon: <Settings className="w-4 h-4" />,     label: 'Settings',   href: '/student/settings'  },
  ]

  return (
    <div className="min-h-screen font-sans text-zinc-800 bg-[#F4F4F5] flex flex-col">
      {/* Header - Dark Slate */}
      <header className="sticky top-0 z-40 bg-[#18181B] border-b border-white/10 flex items-center justify-between px-6 h-16 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">Kattral Academy</span>
        </div>
        <div className="flex items-center gap-3 text-white">
          {session?.apiToken && <NotificationBell token={session.apiToken} />}
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen(o => !o)}
              className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 text-white text-xs font-semibold flex items-center justify-center transition-colors hover:bg-zinc-700">
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-60 bg-white rounded-xl py-1 z-50 border border-zinc-200 shadow-lg">
                <div className="px-4 py-3 border-b border-zinc-100">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 break-all">{session?.user?.email}</p>
                </div>
                <button onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                  <LogOut className="w-4 h-4 text-zinc-400" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar - Dark Slate */}
        <aside className="w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] px-4 py-6 flex flex-col gap-2.5 bg-[#18181B] border-r border-white/10 z-20">
          <div className="flex flex-col gap-1">
            {nav.map(({ icon, label, href }) => (
              <Link key={label} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  pathname === href ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                }`}>
                {icon} {label}
              </Link>
            ))}
          </div>
          <div className="mt-auto rounded-xl px-4 py-3 bg-zinc-800/50 border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Student Portal</p>
            <p className="text-xs font-medium text-zinc-300">{(session?.user?.name ?? '').split(' ')[0] || 'Student'}</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 relative min-h-[calc(100vh-4rem)]">
          {/* Absolute Background to create the top Overlap visual layer */}
          <div className="absolute top-0 inset-x-0 h-[250px] bg-[#18181B] z-0" />
          
          <div className="relative z-10 px-8 py-8 max-w-7xl mx-auto">
            {/* Live now banner - Floating Card */}
            {liveSessions.length > 0 && (
              <div className="mb-6 rounded-2xl px-5 py-4 flex items-center justify-between bg-white border border-emerald-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <div className="flex items-center gap-3 pl-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
                  <p className="text-sm font-semibold text-emerald-900">
                    {liveSessions.length} session{liveSessions.length > 1 ? 's' : ''} live right now
                  </p>
                </div>
                <div className="flex gap-2">
                  {liveSessions.slice(0, 2).map(s => (
                    <Link key={s.id} href={`/student/session/${s.id}`}
                      className="text-xs font-semibold text-white px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-sm">
                      Join {s.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Toolbar - Floating over Dark overlap */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <button onClick={goToday}
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all">
                  Today
                </button>
                <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-0.5">
                  <button onClick={view === 'week' ? prevWeek : prevMonth}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={view === 'week' ? nextWeek : nextMonth}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xl font-semibold text-white ml-2 tracking-tight">
                  {view === 'week' ? fmtWeekRange(weekStart) : `${MONTHS[viewMonth]} ${viewYear}`}
                </span>
              </div>

              {/* View Toggles */}
              <div className="flex items-center p-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                {(['week','month','list'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      view === v ? 'bg-blue-500 text-white shadow-sm' : 'text-zinc-300 hover:text-white hover:bg-white/5'
                    }`}>
                    {v === 'week' && <CalendarRange className="w-4 h-4" />}
                    {v === 'month' && <CalendarDays className="w-4 h-4" />}
                    {v === 'list' && <LayoutList className="w-4 h-4" />}
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="h-[520px] rounded-2xl bg-white border border-zinc-200 shadow-sm animate-pulse" />
            ) : view === 'week' ? (
              // Ensure WeekCalendar has a wrapper mimicking the white card style or is styled internally
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden p-2">
                <WeekCalendar
                  weekStart={weekStart}
                  sessions={calSessions}
                  colorMap={colorMap}
                  sessionHref={id => `/student/session/${id}`}
                  accentColor="#3B82F6" 
                  canCreate={false}
                />
              </div>

            ) : view === 'month' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Grid Card */}
                <div className="col-span-2 rounded-2xl bg-white shadow-sm border border-zinc-200 overflow-hidden">
                  <div className="grid grid-cols-7 px-4 pt-4 border-b border-zinc-100">
                    {DAYS.map(d => <div key={d} className="text-center text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pb-3">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 p-3 gap-1">
                    {cells.map((day, i) => {
                      if (!day) return <div key={i} className="min-h-[100px]" />
                      const key = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                      const isToday = key === todayKey, isSelected = key === selectedDate
                      const sess = sessionsByDate[key] ?? [], visible = sess.slice(0,2), overflow = sess.length - 2
                      return (
                        <button key={i} onClick={() => setSelected(isSelected ? null : key)}
                          className={`relative flex flex-col items-start p-2 min-h-[100px] rounded-xl transition-all text-left w-full hover:bg-zinc-50
                            ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : isToday ? 'bg-zinc-50/50 ring-1 ring-inset ring-zinc-200' : ''}`}
                        >
                          <span className={`text-xs font-semibold mb-2 w-6 h-6 flex items-center justify-center rounded-full shrink-0 
                            ${isSelected ? 'bg-blue-500 text-white' : isToday ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>
                            {day}
                          </span>
                          {visible.map(s => (
                            <div key={s.id} className="w-full flex items-center gap-1.5 mb-1 px-1">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: s.status === 'live' ? '#10B981' : CLASS_DOTS[colorMap[s.classroom.id]??0] }} />
                              <span className={`text-[10px] font-medium truncate ${isSelected ? 'text-blue-900' : 'text-zinc-600'}`}>{s.title}</span>
                            </div>
                          ))}
                          {overflow > 0 && <span className={`text-[10px] pl-1 font-medium ${isSelected ? 'text-blue-500' : 'text-zinc-400'}`}>+{overflow} more</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Right Side Panel */}
                <div className="flex flex-col gap-6">
                  <div className="rounded-2xl bg-white shadow-sm border border-zinc-200 overflow-hidden flex flex-col h-full max-h-[400px]">
                    <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                      <p className="text-sm font-semibold text-zinc-900">
                        {selectedDate ? new Date(selectedDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}) : 'Select a day'}
                      </p>
                    </div>
                    <div className="p-2 overflow-y-auto flex-1">
                      {!selectedDate ? <p className="text-sm text-zinc-400 p-4 text-center">Click a day to see sessions</p>
                        : selectedSessions.length === 0 ? <p className="text-sm text-zinc-400 p-4 text-center">No sessions scheduled</p>
                        : selectedSessions.map(s => (
                          <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors">
                            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                              style={{ background: s.status === 'live' ? '#10B981' : CLASS_DOTS[colorMap[s.classroom.id]??0] }} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-zinc-900 truncate">{s.title}</p>
                              <p className="text-xs text-zinc-500 mt-1">{fmtTime(s.scheduledAt!)}{fmtDuration(s.durationMinutes) ? ` · ${fmtDuration(s.durationMinutes)}` : ''}</p>
                              <p className="text-xs text-zinc-400 truncate mt-0.5">{s.classroom.name}</p>
                            </div>
                            {s.status === 'live' && (
                              <Link href={`/student/session/${s.id}`} className="shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-colors">
                                Join
                              </Link>
                            )}
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white shadow-sm border border-zinc-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                      <p className="text-sm font-semibold text-zinc-900">Upcoming Quick View</p>
                    </div>
                    <div className="p-2">
                      {upcomingSessions.length === 0
                        ? <p className="px-4 py-4 text-sm text-zinc-400 text-center">No upcoming sessions</p>
                        : upcomingSessions.map(s => (
                          <div key={s.id} className="px-3 py-2.5 rounded-xl flex items-start gap-3 hover:bg-zinc-50 cursor-pointer transition-colors"
                            onClick={() => { const k=toDateKey(s.scheduledAt!); setSelected(k); setViewYear(new Date(s.scheduledAt!).getFullYear()); setViewMonth(new Date(s.scheduledAt!).getMonth()) }}>
                            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: CLASS_DOTS[colorMap[s.classroom.id]??0] }} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-900 truncate">{s.title}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">{new Date(s.scheduledAt!).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · {fmtTime(s.scheduledAt!)}</p>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </div>

            ) : (
              <div className="max-w-3xl mx-auto pt-4">
                {groupedSessions.length === 0 ? (
                  <div className="rounded-2xl bg-white shadow-sm border border-zinc-200 px-8 py-16 text-center">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-zinc-50 border border-zinc-100">
                      <CalendarDays className="w-6 h-6 text-zinc-400" />
                    </div>
                    <p className="text-base font-semibold text-zinc-900 mb-1">No upcoming sessions</p>
                    <p className="text-sm text-zinc-500">Your teacher hasn't scheduled any sessions yet</p>
                  </div>
                ) : groupedSessions.map(group => (
                  <div key={group.dateKey} className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{group.label}</span>
                      <div className="flex-1 h-px bg-zinc-200" />
                    </div>
                    <div className="space-y-3">
                      {group.sessions.map(s => {
                        const dotColor = s.status === 'live' ? '#10B981' : CLASS_DOTS[colorMap[s.classroom.id]??0]
                        return (
                          <div key={s.id} className="rounded-2xl bg-white p-5 flex items-start justify-between gap-4 border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                              <div className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
                              <div>
                                <div className="flex items-center gap-3 flex-wrap mb-1">
                                  <p className="text-base font-semibold text-zinc-900">{s.title}</p>
                                  {s.status === 'live' && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md animate-pulse">LIVE</span>}
                                  {s.status === 'waiting' && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">SOON</span>}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                  <span>{fmtTime(s.scheduledAt!)}{fmtDuration(s.durationMinutes) ? ` · ${fmtDuration(s.durationMinutes)}` : ''}</span>
                                  <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                  <span>{s.classroom.name}</span>
                                </div>
                              </div>
                            </div>
                            {s.status === 'live' ? (
                              <Link href={`/student/session/${s.id}`} className="shrink-0 text-sm font-semibold text-white px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-colors">
                                Join
                              </Link>
                            ) : (
                                <div className="shrink-0 text-sm font-medium text-zinc-400 px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                                  Scheduled
                                </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}