'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, CalendarDays, Settings, LogOut, RefreshCw, AlertTriangle,
  User, Palette, Bell, Shield, ChevronRight, Sun, Moon, Monitor,
  Eye, EyeOff,
} from 'lucide-react'
import { api } from '@/lib/api'
import NotificationBell from '@/components/NotificationBell'

type Section = 'general' | 'appearance' | 'notifications' | 'privacy'

const ACCENT = '#3B82F6'
const ACCENT_TEXT = '#ffffff'

const SUB_NAV: { id: Section; label: string; icon: typeof User }[] = [
  { id: 'general',       label: 'General',           icon: User    },
  { id: 'appearance',    label: 'Appearance',         icon: Palette },
  { id: 'notifications', label: 'Notifications',      icon: Bell    },
  { id: 'privacy',       label: 'Privacy & Security', icon: Shield  },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium mb-1.5 text-zinc-700">{children}</p>
}

function Input({ type = 'text', value, onChange, readOnly }: {
  type?: string; value?: string; onChange?: (v: string) => void; readOnly?: boolean
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="relative">
      <input
        type={isPassword && show ? 'text' : type}
        value={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all border ${
          readOnly 
            ? 'bg-zinc-50 border-zinc-200 text-zinc-500 cursor-not-allowed' 
            : 'bg-white border-zinc-200 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        }`}
      />
      {isPassword && (
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}

function PrimaryBtn({ children, onClick, disabled, danger }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
        ${danger 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
    >
      {children}
    </button>
  )
}

function OutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm">
      {children}
    </button>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-7 border border-zinc-200 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight mb-1 text-zinc-900">{title}</h2>
      {subtitle && <p className="text-sm text-zinc-500 mb-6">{subtitle}</p>}
      {children}
    </div>
  )
}

function Divider() {
  return <div className="my-7 h-px bg-zinc-100" />
}

// ── General ───────────────────────────────────────────────────────────────────

function GeneralSection({
  name: initialName, email, token,
  onNameUpdated,
  showSwitch, setShowSwitch, switching, switchError, onSwitch, onCancelSwitch,
}: {
  name: string; email: string; token: string
  onNameUpdated: (newName: string) => void
  showSwitch: boolean; setShowSwitch: (v: boolean) => void
  switching: boolean; switchError: string
  onSwitch: () => void; onCancelSwitch: () => void
}) {
  const [editName, setEditName]   = useState(initialName)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwMsg, setPwMsg]         = useState('')
  const [pwErr, setPwErr]         = useState('')

  const saveProfile = async () => {
    if (!editName.trim()) return
    setSavingProfile(true); setProfileMsg(''); setProfileErr('')
    try {
      const res = await api.auth.updateProfile(token, editName.trim())
      onNameUpdated(res.user.name)
      setProfileMsg('Profile saved')
      setTimeout(() => setProfileMsg(''), 3000)
    } catch (e: any) {
      setProfileErr(e.message ?? 'Failed to save')
    } finally { setSavingProfile(false) }
  }

  const changePassword = async () => {
    if (!currentPw || !newPw) return
    setPwSaving(true); setPwMsg(''); setPwErr('')
    try {
      await api.auth.changePassword(token, currentPw, newPw)
      setPwMsg('Password updated successfully')
      setCurrentPw(''); setNewPw('')
      setTimeout(() => setPwMsg(''), 4000)
    } catch (e: any) {
      setPwErr(e.message ?? 'Failed to change password')
    } finally { setPwSaving(false) }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="General Settings" subtitle="Manage your basic account information">
        <p className="text-sm font-semibold mb-5 text-zinc-900">Profile</p>
        <div className="space-y-4 mb-6">
          <div>
            <FieldLabel>Full Name</FieldLabel>
            <Input value={editName} onChange={setEditName} />
          </div>
          <div>
            <FieldLabel>Email Address</FieldLabel>
            <Input value={email} readOnly type="email" />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <div className="w-full rounded-xl px-4 py-3 text-sm flex items-center justify-between bg-zinc-50 border border-zinc-200 text-zinc-900">
              <span>Student</span>
              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-500 text-white uppercase tracking-wider">Student</span>
            </div>
          </div>
        </div>
        {profileMsg && <p className="text-sm text-emerald-600 mb-3">{profileMsg}</p>}
        {profileErr && <p className="text-sm text-red-500 mb-3">{profileErr}</p>}
        <PrimaryBtn onClick={saveProfile} disabled={savingProfile || !editName.trim()}>
          {savingProfile ? 'Saving…' : 'Save Changes'}
        </PrimaryBtn>

        <Divider />

        <p className="text-sm font-semibold mb-5 text-zinc-900">Password</p>
        <div className="space-y-4 mb-6">
          <div>
            <FieldLabel>Current Password</FieldLabel>
            <Input type="password" value={currentPw} onChange={setCurrentPw} />
          </div>
          <div>
            <FieldLabel>New Password</FieldLabel>
            <Input type="password" value={newPw} onChange={setNewPw} />
          </div>
        </div>
        {pwMsg && <p className="text-sm text-emerald-600 mb-3">{pwMsg}</p>}
        {pwErr && <p className="text-sm text-red-500 mb-3">{pwErr}</p>}
        <PrimaryBtn onClick={changePassword} disabled={pwSaving || !currentPw || !newPw}>
          {pwSaving ? 'Updating…' : 'Update Password'}
        </PrimaryBtn>
      </SectionCard>

      <SectionCard title="Switch Role" subtitle="Change your account role">
        <div className="flex items-start gap-3 rounded-xl p-4 mb-5 bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-1">Before switching to Teacher</p>
            <p className="text-xs text-amber-700 leading-relaxed">You must <strong>leave all enrolled classrooms</strong> first. Once you switch, you will be able to create your own classrooms.</p>
          </div>
        </div>
        {switchError && (
          <p className="text-sm text-red-600 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">{switchError}</p>
        )}
        {!showSwitch ? (
          <OutlineBtn onClick={() => setShowSwitch(true)}>
            <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Switch to Teacher</span>
          </OutlineBtn>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">Are you sure? You will be switched to a teacher account immediately.</p>
            <div className="flex gap-3">
              <PrimaryBtn danger onClick={onSwitch} disabled={switching}>
                {switching ? 'Switching…' : 'Yes, switch to Teacher'}
              </PrimaryBtn>
              <OutlineBtn onClick={onCancelSwitch}>Cancel</OutlineBtn>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Account">
        <button onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-2.5 font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm bg-zinc-900 text-white hover:bg-zinc-800">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </SectionCard>
    </div>
  )
}

// ── Appearance ────────────────────────────────────────────────────────────────

function applyTheme(t: string) {
  const resolved = t === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t
  document.documentElement.setAttribute('data-theme', resolved)
  localStorage.setItem('kattral-theme', t)
}
function applyFont(f: string) {
  document.documentElement.setAttribute('data-fontsize', f)
  localStorage.setItem('kattral-fontsize', f)
}

function AppearanceSection() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem('kattral-theme') as any) ?? 'light'
  })
  const [fontSize, setFont] = useState<'small' | 'medium' | 'large'>(() => {
    if (typeof window === 'undefined') return 'medium'
    return (localStorage.getItem('kattral-fontsize') as any) ?? 'medium'
  })
  const [saved, setSaved] = useState(false)

  const THEMES = [
    { id: 'light',  label: 'Light Mode',        icon: Sun     },
    { id: 'dark',   label: 'Dark Mode',          icon: Moon    },
    { id: 'system', label: 'System Preferences', icon: Monitor },
  ] as const

  const save = () => {
    applyTheme(theme); applyFont(fontSize)
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  return (
    <SectionCard title="Appearance" subtitle="Customize how the app looks">
      <p className="text-sm font-semibold mb-4 text-zinc-900">Theme</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {THEMES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTheme(id)}
            className={`flex flex-col items-center gap-3 py-5 px-3 rounded-xl transition-all border ${
              theme === id 
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                : 'border-zinc-200 bg-white hover:bg-zinc-50'
            }`}>
            <Icon className={`w-5 h-5 ${theme === id ? 'text-blue-500' : 'text-zinc-400'}`} />
            <span className={`text-xs font-semibold ${theme === id ? 'text-blue-900' : 'text-zinc-500'}`}>{label}</span>
          </button>
        ))}
      </div>
      <Divider />
      <p className="text-sm font-semibold mb-4 text-zinc-900">Font Size</p>
      <div className="flex gap-3 mb-8">
        {(['small', 'medium', 'large'] as const).map(s => (
          <button key={s} onClick={() => setFont(s)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium capitalize transition-all border ${
              fontSize === s
                ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                : 'border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50'
            }`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <PrimaryBtn onClick={save}>Save Appearance</PrimaryBtn>
        {saved && <p className="text-sm text-emerald-600">Appearance saved and applied</p>}
      </div>
    </SectionCard>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

const NOTIF_KEY = 'kattral-notif-student'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-500' : 'bg-zinc-200'}`}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  )
}

function NotifRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-zinc-100 last:border-0">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        <p className="text-xs text-zinc-500 mt-1">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

const DEFAULT_NOTIF_S = { live: true, session: true, classroom: false, remind: true, email: false }

function NotificationsSection() {
  const [n, setN] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_NOTIF_S
    try { return { ...DEFAULT_NOTIF_S, ...JSON.parse(localStorage.getItem(NOTIF_KEY) ?? '{}') } }
    catch { return DEFAULT_NOTIF_S }
  })
  const [saved, setSaved] = useState(false)
  const toggle = (k: keyof typeof DEFAULT_NOTIF_S) => setN((prev: typeof DEFAULT_NOTIF_S) => ({ ...prev, [k]: !prev[k] }))

  const save = () => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(n))
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  return (
    <SectionCard title="Notifications" subtitle="Control what you hear about">
      <div className="flex flex-col">
        <NotifRow label="Live Session Alerts" desc="Get notified when your teacher starts a live session" checked={n.live} onChange={() => toggle('live')} />
        <NotifRow label="Session Reminders" desc="15-minute reminder before your next session" checked={n.remind} onChange={() => toggle('remind')} />
        <NotifRow label="Session Updates" desc="Notify when a session is rescheduled or cancelled" checked={n.session} onChange={() => toggle('session')} />
        <NotifRow label="Classroom Updates" desc="Changes in classrooms you've joined" checked={n.classroom} onChange={() => toggle('classroom')} />
        <NotifRow label="Email Notifications" desc="Receive a weekly summary of your sessions" checked={n.email} onChange={() => toggle('email')} />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <PrimaryBtn onClick={save}>Save Preferences</PrimaryBtn>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </SectionCard>
  )
}

// ── Privacy & Security ────────────────────────────────────────────────────────

function TwoFactorCard({ token }: { token: string }) {
  const [step, setStep]       = useState<'idle' | 'setup' | 'enabled'>('idle')
  const [secret, setSecret]   = useState('')
  const [uri, setUri]         = useState('')
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const [msg, setMsg]         = useState('')

  const startSetup = async () => {
    setLoading(true); setErr('')
    try {
      const res = await api.auth.twoFaSetup(token)
      setSecret(res.secret); setUri(res.uri); setStep('setup')
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const verify = async () => {
    if (code.length !== 6) return
    setLoading(true); setErr('')
    try {
      await api.auth.twoFaVerify(token, code)
      setMsg('2FA enabled successfully'); setStep('enabled'); setCode('')
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="rounded-2xl p-6 border border-zinc-200 bg-white">
      <p className="text-sm font-semibold mb-1 text-zinc-900">Two-Factor Authentication</p>
      <p className="text-xs text-zinc-500 mb-5">Add an extra layer of security to your account</p>

      {step === 'idle' && (
        <OutlineBtn onClick={startSetup}>{loading ? 'Setting up…' : 'Enable 2FA'}</OutlineBtn>
      )}

      {step === 'setup' && (
        <div className="space-y-4">
          <div className="rounded-xl p-5 bg-zinc-50 border border-zinc-100">
            <p className="text-xs font-semibold text-zinc-800 mb-1">1. Open your authenticator app</p>
            <p className="text-xs text-zinc-500 mb-4">Google Authenticator, Authy, or any TOTP app works.</p>
            <p className="text-xs font-semibold text-zinc-800 mb-2">2. Add this secret manually</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono px-3 py-2.5 rounded-lg break-all bg-zinc-900 text-blue-400">
                {secret}
              </code>
              <button onClick={() => navigator.clipboard.writeText(secret)}
                className="text-xs font-semibold px-4 py-2.5 rounded-lg shrink-0 border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors shadow-sm text-zinc-700">
                Copy
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-800 mb-2">3. Enter the 6-digit code from your app</p>
            <div className="flex gap-3">
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6}
                className="w-32 rounded-xl px-4 py-2.5 text-sm text-center font-mono tracking-widest outline-none border border-zinc-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && verify()} />
              <PrimaryBtn onClick={verify} disabled={code.length !== 6 || loading}>
                {loading ? 'Verifying…' : 'Verify & Enable'}
              </PrimaryBtn>
            </div>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button onClick={() => { setStep('idle'); setCode(''); setErr('') }}
            className="text-xs text-zinc-500 hover:text-zinc-700 font-medium transition-colors">Cancel</button>
        </div>
      )}

      {step === 'enabled' && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <p className="text-sm text-emerald-700 font-medium">{msg || '2FA is enabled'}</p>
        </div>
      )}
    </div>
  )
}

function PrivacySection({ token, onDeleteAccount }: { token: string; onDeleteAccount: () => void }) {
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [deletePw, setDeletePw]     = useState('')
  const [deleteErr, setDeleteErr]   = useState('')

  const doDelete = async () => {
    setDeleteStep('deleting'); setDeleteErr('')
    try {
      await api.auth.deleteAccount(token, deletePw || undefined)
      onDeleteAccount()
    } catch (e: any) {
      setDeleteErr(e.message ?? 'Failed to delete account')
      setDeleteStep('confirm')
    }
  }

  return (
    <SectionCard title="Privacy & Security" subtitle="Manage your security and privacy settings">
      <div className="space-y-4">
        <TwoFactorCard token={token} />

        <div className="rounded-2xl p-6 border border-zinc-200 bg-white">
          <p className="text-sm font-semibold mb-1 text-zinc-900">Active Sessions</p>
          <p className="text-xs text-zinc-500 mb-4">Your active login sessions</p>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100">
            <div>
              <p className="text-sm font-medium text-zinc-900">Current browser</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Active now</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-blue-500 text-white uppercase tracking-wider">Current</span>
          </div>
        </div>

        <div className="rounded-2xl p-6 bg-red-50 border border-red-200">
          <p className="text-sm font-semibold mb-1 text-red-700">Delete Account</p>
          <p className="text-xs text-red-600/80 mb-5">Permanently delete your account and all associated data. This cannot be undone.</p>
          {deleteStep === 'idle' && (
            <button onClick={() => setDeleteStep('confirm')}
              className="font-semibold text-sm px-5 py-2.5 rounded-xl text-white transition-all shadow-sm bg-red-500 hover:bg-red-600">
              Delete Account
            </button>
          )}
          {deleteStep === 'confirm' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-red-800">Enter your password to confirm:</p>
              <Input type="password" value={deletePw} onChange={setDeletePw} />
              {deleteErr && <p className="text-sm text-red-600">{deleteErr}</p>}
              <div className="flex gap-3">
                <button onClick={doDelete}
                  className="font-semibold text-sm px-5 py-2.5 rounded-xl text-white shadow-sm bg-red-600 hover:bg-red-700">
                  Yes, delete permanently
                </button>
                <OutlineBtn onClick={() => { setDeleteStep('idle'); setDeletePw(''); setDeleteErr('') }}>Cancel</OutlineBtn>
              </div>
            </div>
          )}
          {deleteStep === 'deleting' && (
            <p className="text-sm text-red-600 font-medium animate-pulse">Deleting account…</p>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentSettings() {
  const { data: session, status, update } = useSession()
  const router   = useRouter()
  const pathname = usePathname()
  const [section, setSection]       = useState<Section>('general')
  const [menuOpen, setMenuOpen]     = useState(false)
  const [showSwitch, setShowSwitch]   = useState(false)
  const [switching, setSwitching]     = useState(false)
  const [switchError, setSwitchError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.apiToken) { router.replace('/'); return }
  }, [session, status, router])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSwitchRole = async () => {
    if (!session?.apiToken || switching) return
    setSwitching(true); setSwitchError('')
    try {
      const data = await api.auth.switchRole(session.apiToken)
      await update({ role: data.role, apiToken: data.token })
      router.replace('/teacher/dashboard')
    } catch (e: any) {
      setSwitchError(e.message ?? 'Could not switch role.')
      setSwitching(false)
    }
  }

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
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase tracking-wider bg-blue-500">Student</span>
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
            <p className="text-xs font-medium text-zinc-300">{session?.user?.name?.split(' ')[0] ?? 'Student'}</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 relative min-h-[calc(100vh-4rem)]">
          {/* Absolute Background to create the top Overlap visual layer */}
          <div className="absolute top-0 inset-x-0 h-[250px] bg-[#18181B] z-0" />
          
          <div className="relative z-10 px-8 py-8 max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
              <p className="text-sm text-zinc-400 mt-1">Manage your account and preferences</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Settings sub-nav - Floating Card */}
              <div className="w-full md:w-56 shrink-0 rounded-2xl bg-white shadow-sm border border-zinc-200 overflow-hidden">
                {SUB_NAV.map(({ id, label, icon: Icon }) => {
                  const active = section === id
                  return (
                    <button key={id} onClick={() => setSection(id)}
                      className={`w-full flex items-center justify-between px-4 py-4 text-sm font-medium transition-colors text-left border-b border-zinc-100 last:border-0 ${
                        active ? 'bg-blue-50 text-blue-700' : 'text-zinc-600 hover:bg-zinc-50'
                      }`}>
                      <span className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-500' : 'text-zinc-400'}`} />
                        {label}
                      </span>
                      {active && <ChevronRight className="w-4 h-4 shrink-0 text-blue-500" />}
                    </button>
                  )
                })}
              </div>

              {/* Content Panel */}
              <div className="flex-1 min-w-0 w-full">
                {section === 'general' && (
                  <GeneralSection
                    name={session?.user?.name ?? ''}
                    email={session?.user?.email ?? ''}
                    token={session?.apiToken ?? ''}
                    onNameUpdated={async (newName) => { await update({ name: newName }) }}
                    showSwitch={showSwitch}
                    setShowSwitch={setShowSwitch}
                    switching={switching}
                    switchError={switchError}
                    onSwitch={handleSwitchRole}
                    onCancelSwitch={() => { setShowSwitch(false); setSwitchError('') }}
                  />
                )}
                {section === 'appearance'    && <AppearanceSection />}
                {section === 'notifications' && <NotificationsSection />}
                {section === 'privacy'       && (
                  <PrivacySection
                    token={session?.apiToken ?? ''}
                    onDeleteAccount={() => signOut({ callbackUrl: '/' })}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}