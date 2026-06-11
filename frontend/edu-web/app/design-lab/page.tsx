'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api, AuthError } from '@/lib/api'
import type { Classroom, Session } from '@/types'
import {
  UserPlus, LogOut, BookOpen, Settings, CalendarDays,
  MoreVertical, Video, Clock, Copy, Check, Bell,
  CalendarOff, School, Play,
} from 'lucide-react'
import JoinClassroomModal from '@/components/classroom/JoinClassroomModal'
import NotificationBell from '@/components/NotificationBell'

/* ─── Clean SaaS Overlap Palette ───────────────────────────────────────
   Dark header/hero · Light gray body · Pure white cards · Blue accents
──────────────────────────────────────────────────────────────────────── */
const DARK   = '#18181B'        // zinc-900 — header, sidebar, top hero
const BG     = '#F4F4F5'        // zinc-100 — main lower background
const CARD   = '#FFFFFF'        // pure white cards
const ACCENT = '#3B82F6'        // blue-500 — primary CTA and active states
const ACCENT_HOVER = '#2563EB'  // blue-600
const SUCCESS= '#10B981'        // emerald-500
const WARN   = '#F59E0B'        // amber-500
const DANGER = '#EF4444'        // red-500

// Text Colors (Light background)
const TXT    = '#27272A'        // zinc-800 — primary headers
const T2     = '#71717A'        // zinc-500 — secondary text
const BORDER = '#E4E4E7'        // zinc-200 — subtle card borders

// Text Colors (Dark background)
const TXT_DARK_BG = '#FFFFFF'
const T2_DARK_BG  = '#A1A1AA'   // zinc-400

const SHADOW = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
const SHADOW_OVERLAP = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'

/* ─── Helpers ───────────────────────────────────────────────────────── */
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function timeUntilShort(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Starting soon'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function fmtRelativeDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const dt = new Date(d); dt.setHours(0, 0, 0, 0)
  if (dt.getTime() === today.getTime()) return `Today at ${fmtTime(iso)}`
  if (dt.getTime() === tomorrow.getTime()) return `Tomorrow at ${fmtTime(iso)}`
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + fmtTime(iso)
}

/* ─── Donut ring ────────────────────────────────────────────────────── */
function DonutRing({ value, total, color, size = 80, thickness = 7, centerLabel, centerSub }: {
  value: number; total: number; color: string; size?: number
  thickness?: number; centerLabel: string; centerSub?: string
}) {
  const r    = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const pct  = total > 0 ? Math.min(value / total, 1) : 0
  const dash = circ * (1 - pct)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={BORDER} strokeWidth={thickness} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={dash}
          style={{ transition: 'stroke-dashoffset 0.9s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontSize: 18, fontWeight: 700, color: TXT, lineHeight: 1 }}>{centerLabel}</span>
        {centerSub && <span style={{ fontSize: 10, color: T2, fontWeight: 500, marginTop: 2 }}>{centerSub}</span>}
      </div>
    </div>
  )
}

type ClassroomWithSessions = Classroom & { sessions: Session[] }

/* ═══════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════════════════════════════════════ */
export default function StudentDashboard() {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()
  const [classrooms, setClassrooms]       = useState<ClassroomWithSessions[]>([])
  const [loading, setLoading]             = useState(true)
  const [sessionsReady, setSessionsReady] = useState(false)
  const [showJoin, setShowJoin]           = useState(false)
  const [hoveredDay, setHoveredDay]       = useState<number | null>(null)
  const [countdown, setCountdown]         = useState('')
  const [authExpired, setAuthExpired]     = useState(false)
  const [menuOpen, setMenuOpen]           = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const today   = new Date()

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.apiToken) { router.replace('/'); return }
    const token = session.apiToken
    api.classrooms.list(token)
      .then(async cls => {
        const withSessions = await Promise.all(
          cls.map(async c => ({
            ...c,
            sessions: await api.sessions.list(token, c.id).catch(() => [] as Session[]),
          }))
        )
        setClassrooms(withSessions)
        setLoading(false)
        setSessionsReady(true)
      })
      .catch(err => {
        if (err instanceof AuthError) setAuthExpired(true)
        setLoading(false)
        setSessionsReady(true)
      })
  }, [status, session])

  const allSessions = useMemo(() =>
    classrooms.flatMap(c => c.sessions.map(s => ({ ...s, classroom: c }))), [classrooms])

  const stats = useMemo(() => {
    const weekStart = new Date(today); weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)
    return {
      enrolled: classrooms.length,
      live:     allSessions.filter(s => s.status === 'live').length,
      upcoming: allSessions.filter(s => s.scheduledAt && new Date(s.scheduledAt) > today && s.status !== 'ended').length,
      thisWeek: allSessions.filter(s => s.scheduledAt && new Date(s.scheduledAt) >= weekStart && new Date(s.scheduledAt) < weekEnd).length,
      attended: allSessions.filter(s => s.status === 'ended').length,
    }
  }, [allSessions, classrooms])

  const nextSession = useMemo(() =>
    allSessions
      .filter(s => s.scheduledAt && new Date(s.scheduledAt) > today && s.status !== 'ended')
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0] ?? null,
    [allSessions])

  const liveSessions   = useMemo(() => allSessions.filter(s => s.status === 'live'), [allSessions])
  const upcomingSorted = useMemo(() =>
    allSessions
      .filter(s => s.scheduledAt && new Date(s.scheduledAt) > today && s.status !== 'ended')
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()),
    [allSessions])

  const featured = liveSessions[0] ?? nextSession

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const refreshClassrooms = async () => {
    if (!session?.apiToken) return
    const token = session.apiToken
    const cls = await api.classrooms.list(token).catch(() => [] as Classroom[])
    const withSessions = await Promise.all(
      cls.map(async c => ({ ...c, sessions: await api.sessions.list(token, c.id).catch(() => [] as Session[]) }))
    )
    setClassrooms(withSessions)
  }

  useEffect(() => {
    const tick = () => {
      const ns = allSessions
        .filter(s => s.scheduledAt && new Date(s.scheduledAt) > new Date() && s.status !== 'ended')
        .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0]
      if (!ns?.scheduledAt) { setCountdown(''); return }
      const diff = new Date(ns.scheduledAt).getTime() - Date.now()
      if (diff <= 0) { setCountdown('Starting now'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [allSessions])

  const firstName = session?.user?.name?.split(' ')[0] ?? 'Student'
  const initials  = (session?.user?.name ?? 'S').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const hour      = today.getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const weekLabels = ['M','T','W','T','F','S','S']
  const weekStart  = new Date(today); weekStart.setHours(0,0,0,0)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const daySessions = weekLabels.map((_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
    return allSessions.filter(s => s.scheduledAt && new Date(s.scheduledAt).toDateString() === d.toDateString())
  })
  const weekCounts  = daySessions.map(s => s.length)
  const maxCount    = Math.max(...weekCounts, 1)
  const todayIdx    = (today.getDay() + 6) % 7

  /* ── Inline style helper ── */
  const s = (obj: React.CSSProperties) => obj

  return (
    <div
      className="min-h-screen"
      style={s({ background: BG, color: TXT, fontFamily: "'Inter', system-ui, sans-serif", position: 'relative' })}
    >
      {/* ── Fonts + hover rules ──────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body, button, input, select, textarea, a {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        
        .kd-navlink:hover     { color: ${ACCENT}; background: rgba(255,255,255,0.05); }
        .kd-joinpill:hover    { background: ${ACCENT_HOVER}; }
        .kd-statcard:hover    { transform: translateY(-2px); box-shadow: ${SHADOW_OVERLAP}; border-color: ${ACCENT}; }
        .kd-clscard:hover     { transform: translateY(-2px); box-shadow: ${SHADOW_OVERLAP}; border-color: ${ACCENT}; }
        .kd-clsadd:hover      { border-color: ${ACCENT}; background: rgba(59,130,246,0.05); }
        .kd-codebox:hover     { background: ${BG}; }
        .kd-btnp:hover        { background: ${ACCENT_HOVER}; }
        .kd-btns:hover        { background: rgba(255,255,255,0.1); }
        .kd-upcta:hover       { background: ${BG}; }
        .kd-cdbtn:hover       { background: ${ACCENT_HOVER}; }
        .kd-bar:hover .kd-bartip   { display: block !important; }
        .kd-bar:hover .kd-barrect  { transform: scaleY(1.05); transform-origin: bottom; background: ${ACCENT} !important; }
        .kd-phlink:hover      { opacity: 0.75; }
        .kd-clsmenu:hover     { background: ${BG}; }
        @keyframes kd-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        .kd-blink { animation: kd-blink 1.4s ease-in-out infinite; }
      `}</style>

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-[60]"
        style={s({
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', background: DARK, borderBottom: '1px solid rgba(255,255,255,0.08)',
        })}
      >
        {/* Logo */}
        <div style={s({ display: 'flex', alignItems: 'center', gap: 12 })}>
          <div style={s({
            width: 32, height: 32, background: ACCENT, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          })}>
            <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <span style={s({ fontSize: 16, fontWeight: 600, color: TXT_DARK_BG })}>
            Kattral Academy
          </span>
        </div>

        {/* Center tab switcher - Clean SaaS style */}
        <div style={s({ display: 'flex', gap: 24 })}>
          {[
            { label: 'Classrooms', href: '/student/dashboard' },
            { label: 'Schedule',   href: '/student/schedule'  },
            { label: 'Settings',   href: '/student/settings'  },
          ].map(({ label, href }) => {
            const active = pathname === href
            return (
              <Link key={label} href={href} style={s({
                fontSize: 14, fontWeight: active ? 500 : 400, padding: '20px 0',
                cursor: 'pointer', transition: 'color 0.2s',
                color: active ? ACCENT : T2_DARK_BG,
                textDecoration: 'none',
                borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
              })}>
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right */}
        <div style={s({ display: 'flex', alignItems: 'center', gap: 16 })}>
          <button onClick={() => setShowJoin(true)} className="kd-joinpill" style={s({
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            background: ACCENT, border: 'none', borderRadius: 6,
            fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer',
            transition: 'all 0.2s',
          })}>
            <UserPlus className="w-4 h-4" /> Join Classroom
          </button>
          <div style={s({ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' })} />
          {session?.apiToken && <NotificationBell token={session.apiToken} />}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)} style={s({
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: TXT_DARK_BG, cursor: 'pointer',
            })}>
              {initials}
            </button>
            {menuOpen && (
              <div style={s({
                position: 'absolute', right: 0, top: 44, width: 220,
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '4px 0', zIndex: 50,
                boxShadow: SHADOW_OVERLAP,
              })}>
                <div style={s({ padding: '12px 16px', borderBottom: `1px solid ${BORDER}` })}>
                  <p style={s({ fontSize: 14, fontWeight: 600, color: TXT })}>{session?.user?.name}</p>
                  <p style={s({ fontSize: 12, color: T2, marginTop: 2 })}>{session?.user?.email}</p>
                </div>
                <button onClick={() => signOut({ callbackUrl: '/' })} style={s({
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 16px', fontSize: 13, color: DANGER, background: 'transparent',
                  border: 'none', cursor: 'pointer',
                })}>
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={s({ display: 'flex', minHeight: 'calc(100vh - 64px)' })}>
        
        {/* ══ SIDEBAR ═════════════════════════════════════════════════ */}
        <aside
          className="sticky"
          style={s({
            width: 240, flexShrink: 0, background: DARK,
            top: 64, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column',
            padding: '24px 16px', borderRight: '1px solid rgba(255,255,255,0.05)'
          })}
        >
          {[
            { icon: <BookOpen className="w-4 h-4" />,     label: 'Dashboard',  href: '/student/dashboard' },
            { icon: <CalendarDays className="w-4 h-4" />, label: 'Schedule',   href: '/student/schedule'  },
            { icon: <Settings className="w-4 h-4" />,     label: 'Settings',   href: '/student/settings'  },
          ].map(({ icon, label, href }) => {
            const active = pathname === href
            return (
              <Link key={label} href={href} className="kd-navlink" style={s({
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none',
                transition: 'all 0.2s', marginBottom: 4,
                background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: active ? ACCENT : T2_DARK_BG,
              })}>
                {icon} {label}
              </Link>
            )
          })}

          <div style={{ flex: 1 }} />

          {/* Bottom Identity Block */}
          <div style={s({ padding: '16px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' })}>
            <div style={s({ fontSize: 13, fontWeight: 600, color: TXT_DARK_BG })}>{firstName}</div>
            <div style={s({ fontSize: 12, color: T2_DARK_BG, marginTop: 2 })}>Student Member</div>
          </div>
        </aside>

        {/* ══ MAIN ════════════════════════════════════════════════════ */}
        <main style={s({ flex: 1, position: 'relative' })}>
          {/* THE OVERLAP SPLIT BACKGROUND */}
          <div style={s({ position: 'absolute', top: 0, left: 0, right: 0, height: 260, background: DARK, zIndex: 0 })} />

          <div style={s({ position: 'relative', zIndex: 10, padding: '40px 40px 60px' })}>

            {/* Auth expired banner */}
            {authExpired && (
              <div style={s({
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 24, padding: '14px 20px',
                background: WARN, borderRadius: 8, color: '#fff'
              })}>
                <p style={s({ fontSize: 14, fontWeight: 500 })}>Your session expired. Please sign in again.</p>
                <button onClick={() => signOut({ callbackUrl: '/' })} style={s({
                  fontSize: 13, fontWeight: 600, color: '#fff',
                  background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                })}>Sign out</button>
              </div>
            )}

            {/* ── Page header ── */}
            <div style={s({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 })}>
              <div>
                <h1 style={s({ fontSize: 32, fontWeight: 600, color: TXT_DARK_BG, letterSpacing: '-0.02em' })}>
                  {greeting}, {firstName}
                </h1>
                <p style={s({ fontSize: 14, color: T2_DARK_BG, marginTop: 6 })}>
                  Manage your course memberships and track your progress.
                </p>
              </div>
              <div style={s({ display: 'flex', gap: 12 })}>
                <button onClick={() => setShowJoin(true)} className="kd-btns" style={s({
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                  fontSize: 13, fontWeight: 500, color: TXT_DARK_BG, cursor: 'pointer', transition: 'all 0.2s',
                })}>
                  <UserPlus className="w-4 h-4" /> Add Course
                </button>
              </div>
            </div>

            {/* ── Stats bar (Overlapping the dark/light split) ── */}
            <div
              className="grid grid-cols-4 gap-6"
              style={s({ marginBottom: 32 })}
            >
              {[
                { label: 'Enrolled',  value: classrooms.length,                         sub: 'Total courses',      icon: <BookOpen className="w-5 h-5 text-blue-500" /> },
                { label: 'Sessions',  value: sessionsReady ? allSessions.length : null, sub: 'Total sessions',     icon: <Clock className="w-5 h-5 text-indigo-500" /> },
                { label: 'Live Now',  value: sessionsReady ? stats.live : null,         sub: 'Active right now',   icon: <Video className="w-5 h-5 text-emerald-500" /> },
                { label: 'Upcoming',  value: sessionsReady ? stats.upcoming : null,     sub: 'Scheduled classes',  icon: <CalendarDays className="w-5 h-5 text-amber-500" /> },
              ].map(({ label, value, sub, icon }) => (
                <div key={label} className="kd-statcard" style={s({
                  padding: 24, background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`,
                  boxShadow: SHADOW_OVERLAP, transition: 'all 0.2s', display: 'flex', flexDirection: 'column'
                })}>
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 })}>
                    <div style={s({ fontSize: 14, fontWeight: 500, color: T2 })}>{label}</div>
                    <div style={s({ padding: 8, background: BG, borderRadius: 8 })}>{icon}</div>
                  </div>
                  {value === null
                    ? <div style={s({ height: 32, width: 48, borderRadius: 4, background: BG })} />
                    : <div style={s({ fontSize: 32, fontWeight: 600, color: TXT, lineHeight: 1 })}>{value}</div>
                  }
                  <div style={s({ fontSize: 12, color: T2, marginTop: 8 })}>{sub}</div>
                </div>
              ))}
            </div>

            {/* ── Twin panel: Classrooms + Details ── */}
            <div
              className="grid gap-6"
              style={s({
                gridTemplateColumns: '1fr 340px',
                marginBottom: 32,
              })}
            >
              {/* Classrooms List */}
              <div style={s({ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, boxShadow: SHADOW, overflow: 'hidden', display: 'flex', flexDirection: 'column' })}>
                <div style={s({ padding: '24px 24px 20px', borderBottom: `1px solid ${BORDER}` })}>
                  <div style={s({ fontSize: 18, fontWeight: 600, color: TXT })}>Course Memberships</div>
                  <div style={s({ fontSize: 13, color: T2, marginTop: 4 })}>Your active enrolled classrooms</div>
                </div>
                
                <div style={s({ padding: 24, flex: 1 })}>
                  {loading ? (
                    <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 })}>
                      {[1,2,3,4].map(i => <div key={i} style={s({ height: 160, background: BG, borderRadius: 8 })} />)}
                    </div>
                  ) : classrooms.length === 0 ? (
                    <div style={s({ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' })}>
                      <School style={{ width: 48, height: 48, color: BORDER, marginBottom: 16 }} />
                      <p style={s({ fontSize: 15, fontWeight: 500, color: TXT })}>No courses found</p>
                      <p style={s({ fontSize: 13, color: T2, marginTop: 4, marginBottom: 16 })}>You haven't enrolled in any classrooms yet.</p>
                      <button onClick={() => setShowJoin(true)} className="kd-btnp" style={s({
                        padding: '10px 20px', background: ACCENT, borderRadius: 6,
                        fontSize: 13, fontWeight: 500, color: '#fff', border: 'none', cursor: 'pointer',
                      })}>Join a Course</button>
                    </div>
                  ) : (
                    <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 })}>
                      {classrooms.map((c) => (
                        <StudentClassroomCard
                          key={c.id} classroom={c} token={session?.apiToken ?? ''}
                          onLeft={id => setClassrooms(prev => prev.filter(x => x.id !== id))}
                        />
                      ))}
                      <button onClick={() => setShowJoin(true)} className="kd-clsadd" style={s({
                        minHeight: 180, border: `1px dashed ${BORDER}`, borderRadius: 12,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                        cursor: 'pointer', background: CARD, transition: 'all 0.2s',
                      })}>
                        <div style={s({ width: 40, height: 40, borderRadius: 8, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T2 })}>
                          <UserPlus style={{ width: 20, height: 20 }} />
                        </div>
                        <span style={s({ fontSize: 14, fontWeight: 500, color: T2 })}>Add New Course</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Panel: Next Class & Attendance */}
              <div style={s({ display: 'flex', flexDirection: 'column', gap: 24 })}>
                
                {/* Next Session Widget */}
                <div style={s({ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, boxShadow: SHADOW, padding: 24 })}>
                  <div style={s({ fontSize: 16, fontWeight: 600, color: TXT, marginBottom: 16 })}>Next Activity</div>
                  {!sessionsReady ? (
                    <div style={s({ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                       <div style={s({ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${BG}`, borderTopColor: ACCENT, animation: 'spin 1s linear infinite' })} />
                    </div>
                  ) : nextSession ? (
                    <div>
                      <div style={s({ padding: 16, background: BG, borderRadius: 8, marginBottom: 16, textAlign: 'center' })}>
                        <div style={s({ fontSize: 28, fontWeight: 700, color: TXT, marginBottom: 4 })}>
                          {countdown || '—'}
                        </div>
                        <div style={s({ fontSize: 12, color: T2, fontWeight: 500 })}>
                          {nextSession.status === 'live' ? <span style={{ color: SUCCESS }}>● LIVE NOW</span> : 'UNTIL START'}
                        </div>
                      </div>
                      <div style={s({ marginBottom: 16 })}>
                        <div style={s({ fontSize: 14, fontWeight: 600, color: TXT, marginBottom: 4 })}>{nextSession.title}</div>
                        <div style={s({ fontSize: 13, color: T2 })}>{(nextSession as any).classroom?.name}</div>
                        <div style={s({ fontSize: 12, color: T2, marginTop: 4 })}>{nextSession.scheduledAt ? fmtRelativeDate(nextSession.scheduledAt) : ''}</div>
                      </div>
                      <Link href={`/student/session/${nextSession.id}`} className="kd-cdbtn" style={s({
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        width: '100%', padding: '10px 0', background: nextSession.status === 'live' ? SUCCESS : ACCENT, border: 'none', borderRadius: 6,
                        fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s',
                      })}>
                        {nextSession.status === 'live' ? 'Join Live Class' : 'Enter Waiting Room'}
                      </Link>
                    </div>
                  ) : (
                     <div style={s({ padding: '24px 0', textAlign: 'center' })}>
                      <CalendarOff style={{ width: 32, height: 32, color: BORDER, margin: '0 auto 12px' }} />
                      <p style={s({ fontSize: 14, fontWeight: 500, color: TXT })}>No upcoming activities</p>
                      <p style={s({ fontSize: 13, color: T2, marginTop: 4 })}>You are all caught up.</p>
                    </div>
                  )}
                </div>

                {/* Attendance Widget */}
                <div style={s({ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, boxShadow: SHADOW, padding: 24, flex: 1 })}>
                  <div style={s({ fontSize: 16, fontWeight: 600, color: TXT, marginBottom: 24 })}>Attendance Rate</div>
                  {!sessionsReady ? (
                     <div style={s({ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                       <div style={s({ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${BG}`, borderTopColor: ACCENT, animation: 'spin 1s linear infinite' })} />
                     </div>
                  ) : (
                    <div style={s({ display: 'flex', alignItems: 'center', gap: 20 })}>
                      {(() => {
                        const total = allSessions.length
                        const attended = stats.attended
                        const pct = total > 0 ? Math.round((attended / total) * 100) : 0
                        return (
                          <>
                            <DonutRing value={attended} total={Math.max(total, 1)} color={ACCENT} size={80} thickness={8} centerLabel={`${pct}%`} />
                            <div>
                              <div style={s({ fontSize: 13, color: T2 })}>Sessions attended</div>
                              <div style={s({ fontSize: 20, fontWeight: 600, color: TXT, marginTop: 2 })}>{attended} / {total}</div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </main>
      </div>

      {showJoin && (
        <JoinClassroomModal
          token={session?.apiToken ?? ''}
          onClose={() => setShowJoin(false)}
          onJoined={() => { refreshClassrooms(); setShowJoin(false) }}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   CLASSROOM CARD COMPONENT (Clean Light Theme)
══════════════════════════════════════════════════════════════════════ */
function StudentClassroomCard({
  classroom, token, onLeft,
}: {
  classroom: {
    id: string; name: string; joinCode: string
    sessions: { id: string; title: string; status: string; scheduledAt: string | null; durationMinutes: number | null; createdAt: string; roomId: string | null }[]
  }
  token: string
  onLeft: (id: string) => void
}) {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [leaving, setLeaving]         = useState(false)
  const [leaveError, setLeaveError]   = useState('')
  const [copied, setCopied]           = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const today   = new Date()

  const liveSession   = classroom.sessions.find(s => s.status === 'live')
  const sessionCount  = classroom.sessions.length
  const upcomingCount = classroom.sessions.filter(
    s => s.scheduledAt && new Date(s.scheduledAt) > today && s.status !== 'ended'
  ).length

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const copyCode = (e: React.MouseEvent) => {
    e.preventDefault()
    navigator.clipboard.writeText(classroom.joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = async () => {
    if (!token || leaving) return
    setLeaving(true); setLeaveError('')
    try {
      await api.classrooms.leave(token, classroom.id)
      onLeft(classroom.id)
    } catch (err) {
      setLeaveError(err instanceof Error ? err.message : 'Failed to leave')
      setLeaving(false)
    }
  }

  const s = (obj: React.CSSProperties) => obj

  return (
    <>
      <div style={s({ position: 'relative', height: '100%' })}>
        <Link href={`/student/classroom/${classroom.id}`} className="kd-clscard" style={s({
          display: 'flex', flexDirection: 'column', height: '100%',
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
          textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer',
        })}>
          
          <div style={s({ padding: 20, flex: 1 })}>
            <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 })}>
              <div style={s({ width: 40, height: 40, borderRadius: 8, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                <BookOpen style={{ width: 20, height: 20, color: ACCENT }} />
              </div>
              <div ref={menuRef} style={s({ position: 'relative' })}>
                <button onClick={e => { e.preventDefault(); setMenuOpen(o => !o) }} className="kd-clsmenu" style={s({
                  width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: T2, transition: 'all 0.15s',
                })}>
                  <MoreVertical style={{ width: 16, height: 16 }} />
                </button>
                {menuOpen && (
                  <div style={s({
                    position: 'absolute', right: 0, top: 32, width: 140,
                    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '4px 0', zIndex: 20,
                    boxShadow: SHADOW_OVERLAP,
                  })}>
                    <button onClick={e => { e.preventDefault(); setMenuOpen(false); setShowConfirm(true) }} style={s({
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', fontSize: 13, color: DANGER,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                    })}>
                      <LogOut style={{ width: 14, height: 14 }} /> Leave Course
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={s({ fontSize: 16, fontWeight: 600, color: TXT, marginBottom: 16, lineHeight: 1.3 })}>{classroom.name}</div>
            
            <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 })}>
              <div>
                <div style={s({ fontSize: 12, color: T2, marginBottom: 4 })}>Sessions</div>
                <div style={s({ fontSize: 16, fontWeight: 600, color: TXT })}>{sessionCount}</div>
              </div>
              <div>
                <div style={s({ fontSize: 12, color: T2, marginBottom: 4 })}>Upcoming</div>
                <div style={s({ fontSize: 16, fontWeight: 600, color: TXT })}>{upcomingCount}</div>
              </div>
            </div>
          </div>

          <div style={s({ padding: '16px 20px', borderTop: `1px solid ${BORDER}`, background: '#FAFAFA', borderRadius: '0 0 12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
            {liveSession ? (
              <span style={s({ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: SUCCESS })}>
                <span className="kd-blink" style={s({ width: 6, height: 6, borderRadius: '50%', background: SUCCESS })} /> Live Now
              </span>
            ) : (
              <span style={s({ fontSize: 12, fontWeight: 500, color: T2 })}>Active Enrollment</span>
            )}
            <span style={s({ fontSize: 13, fontWeight: 500, color: ACCENT })}>View details →</span>
          </div>
        </Link>
      </div>

      {/* Leave confirm modal */}
      {showConfirm && (
        <div style={s({
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        })} onClick={() => !leaving && setShowConfirm(false)}>
          <div style={s({
            background: CARD, width: '100%', maxWidth: 400,
            margin: '0 20px', padding: 24, borderRadius: 12,
            boxShadow: SHADOW_OVERLAP,
          })} onClick={e => e.stopPropagation()}>
            <h2 style={s({ fontSize: 18, fontWeight: 600, color: TXT, marginBottom: 8 })}>Leave Course?</h2>
            <p style={s({ fontSize: 14, color: T2, marginBottom: 24, lineHeight: 1.5 })}>
              You'll be removed from <strong>{classroom.name}</strong>. You can rejoin later if you have the code.
            </p>
            {leaveError && <p style={s({ fontSize: 13, color: DANGER, marginBottom: 16 })}>{leaveError}</p>}
            <div style={s({ display: 'flex', gap: 12, justifyContent: 'flex-end' })}>
              <button onClick={() => { setShowConfirm(false); setLeaveError('') }} disabled={leaving} style={s({
                padding: '8px 16px', fontSize: 14, fontWeight: 500,
                color: TXT, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
                cursor: 'pointer', opacity: leaving ? 0.5 : 1,
              })}>Cancel</button>
              <button onClick={handleLeave} disabled={leaving} style={s({
                padding: '8px 16px', fontSize: 14, fontWeight: 500,
                color: '#fff', background: DANGER, border: 'none', borderRadius: 6,
                cursor: 'pointer', opacity: leaving ? 0.5 : 1,
              })}>
                {leaving ? 'Leaving...' : 'Leave Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}