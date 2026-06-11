'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Channel, Message, Session, Classroom } from '@/types'
import MessageList from '@/components/channel/MessageList'
import MessageInput from '@/components/channel/MessageInput'
import NotificationBell from '@/components/NotificationBell'
import { ArrowLeft, Video, Hash, CalendarDays, Settings, LogOut, Info } from 'lucide-react'

export default function StudentClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classroomId, setClassroomId] = useState('')
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    params.then(p => setClassroomId(p.id))
  }, [params])

  const fetchSessions = useCallback(async () => {
    if (!session?.apiToken || !classroomId) return
    api.sessions.list(session.apiToken, classroomId).then(setSessions).catch(() => {})
  }, [session?.apiToken, classroomId])

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken || !classroomId) return
    api.classrooms.get(session.apiToken, classroomId).then(c => {
      setClassroom(c)
      setChannels(c.channels ?? [])
      if (c.channels?.length) setActiveChannel(c.channels[0])
    })
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [session, status, classroomId, fetchSessions])

  useEffect(() => {
    if (!activeChannel || !session?.apiToken) return
    api.channels.getMessages(session.apiToken, activeChannel.id).then(setMessages)
  }, [activeChannel, session])

  const sendMessage = async (content: string) => {
    if (!activeChannel || !session?.apiToken) return
    const msg = await api.channels.sendMessage(session.apiToken, activeChannel.id, content)
    setMessages(p => [...p, msg])
  }

  const liveSessions = sessions.filter(s => s.status === 'live')

  const handleLeave = async () => {
    if (!session?.apiToken || !classroomId || leaving) return
    setLeaving(true)
    try {
      await api.classrooms.leave(session.apiToken, classroomId)
      router.replace('/student/dashboard')
    } catch {
      setLeaving(false)
      setShowLeaveConfirm(false)
    }
  }

  const userInitials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'ST'

  return (
    // The entire app wrapper is Dark Slate to form the background
    <div className="flex flex-col h-screen font-sans text-zinc-800 bg-[#18181B] overflow-hidden">

      {/* App Header - Dark Slate */}
      <header className="h-16 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">Kattral Academy</span>
        </div>
        
        <div className="flex items-center gap-4 text-white">
          {session?.apiToken && <NotificationBell token={session.apiToken} />}
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 border border-white/10 text-white text-xs font-semibold shrink-0 cursor-pointer hover:bg-zinc-700 transition-colors">
            {userInitials}
          </div>
        </div>
      </header>

      {/* Body Area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar - Remains transparent to show the Dark Slate background */}
        <aside className="w-64 shrink-0 flex flex-col px-4 pb-6 pt-2 gap-6 overflow-hidden">
          
          {/* Classroom info */}
          <div className="flex flex-col gap-2">
            <Link href="/student/dashboard" className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-medium transition-colors w-fit mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
            </Link>
            <h2 className="font-bold text-lg text-white truncate leading-snug tracking-tight">{classroom?.name}</h2>
            {classroom?.joinCode && (
              <span className="font-mono text-[10px] text-zinc-400 tracking-widest uppercase bg-white/5 px-2.5 py-1 rounded-md w-fit border border-white/10">
                Code: {classroom.joinCode}
              </span>
            )}
          </div>

          {/* Channels list */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pr-2 custom-scrollbar">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-3">Channels</p>
            {channels.map(ch => {
              const isActive = activeChannel?.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch)}
                  className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm font-medium transition-all group relative ${
                    isActive ? 'text-white bg-white/10' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  {/* Active Indicator Line */}
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-r-full" />}
                  
                  <Hash className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} /> 
                  <span className="truncate">{ch.name}</span>
                </button>
              )
            })}
          </div>

          {/* Bottom nav */}
          <div className="pt-4 border-t border-white/10 flex flex-col gap-1 pr-2">
            {[
              { icon: <CalendarDays className="w-4 h-4" />, label: 'Schedule', href: '/student/schedule' },
              { icon: <Settings className="w-4 h-4" />, label: 'Settings', href: '/student/settings' },
            ].map(item => (
              <Link key={item.label} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors">
                {item.icon} {item.label}
              </Link>
            ))}
            <button onClick={() => setShowLeaveConfirm(true)} className="w-full flex items-center gap-3 px-3 py-2 mt-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
              <LogOut className="w-4 h-4" /> Leave Classroom
            </button>
          </div>
        </aside>

        {/* Main Content Area - App Shell Pattern */}
        {/* Notice the rounded-tl-2xl giving it a distinct UI card feel without wasting space */}
        <main className="flex-1 flex flex-col min-w-0 bg-white rounded-tl-2xl shadow-2xl border-t border-l border-white/10 overflow-hidden relative">
          
          {/* Live sessions banner - Anchored to the top of the white canvas */}
          {liveSessions.length > 0 && (
            <div className="shrink-0 px-6 py-3 flex items-center justify-between bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-sm" />
                <span className="text-sm font-bold text-white tracking-wide">LIVE SESSION IN PROGRESS</span>
              </div>
              <Link href={`/student/session/${liveSessions[0].id}`} className="flex items-center gap-2 font-semibold text-emerald-700 bg-white hover:bg-emerald-50 px-4 py-1.5 rounded-lg text-sm transition-colors shadow-sm">
                <Video className="w-4 h-4" /> Join Now
              </Link>
            </div>
          )}
              
          {/* Channel header */}
          <div className="bg-white border-b border-zinc-100 h-16 px-6 flex items-center justify-between shrink-0 z-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center">
                <Hash className="w-4 h-4 text-zinc-400" />
              </div>
              <h3 className="font-bold text-lg text-zinc-900 tracking-tight">{activeChannel?.name}</h3>
              {activeChannel?.type === 'announcement' && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider px-2.5 py-1 rounded-md ml-2">
                  Read-only
                </span>
              )}
            </div>
            
            <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors">
              <Info className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-hidden flex flex-col bg-[#F4F4F5]">
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <MessageList messages={messages} />
            </div>
            
            {/* Chat Input Container */}
            <div className="px-6 py-5 bg-white border-t border-zinc-200">
              <div className="max-w-5xl mx-auto">
                <MessageInput onSend={sendMessage} disabled={activeChannel?.type === 'announcement'} />
                {activeChannel?.type === 'announcement' ? (
                  <p className="text-xs text-center text-zinc-400 mt-2 font-medium">Only teachers can post in announcement channels.</p>
                ) : (
                  <p className="text-[11px] text-zinc-400 mt-2 font-medium ml-1"><strong>Return</strong> to send, <strong>Shift + Return</strong> for new line.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Leave Classroom Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4">
          <div className="rounded-2xl bg-white border border-zinc-200 shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mb-5 shadow-inner">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-2">Leave classroom?</h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              You&apos;ll be removed from <strong className="text-zinc-800">{classroom?.name}</strong>. You can rejoin later using the original join code.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
                className="flex-1 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-sm font-semibold text-zinc-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                {leaving ? 'Leaving…' : 'Leave Classroom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}