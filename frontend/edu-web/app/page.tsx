'use client'
import { signIn } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, Variants } from 'framer-motion'
import { Video, Edit3, Hash, Users, ArrowRight, Play, CheckCircle2, Sparkles, Command, GraduationCap } from 'lucide-react'

// --- PREMIUM PALETTE ---
const LIME  = '#C5D000'
const CORAL = '#E04828'
const INK   = '#0a0a0a'
const CREAM = '#FAF9F6'

// --- REUSABLE COMPONENTS ---
const AuthInput = ({ label, type, placeholder, value, onChange, required = true }: any) => (
  <div className="space-y-2 relative z-10 group">
    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-1 group-focus-within:text-[#C5D000] transition-colors">{label}</label>
    <div className="relative">
      <input 
        type={type} placeholder={placeholder} value={value} onChange={onChange} required={required}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm font-medium text-white focus:outline-none focus:bg-white/10 focus:border-[#C5D000]/50 transition-all placeholder:text-white/20 backdrop-blur-md"
      />
      <div className="absolute inset-x-4 -bottom-px h-px bg-gradient-to-r from-transparent via-[#C5D000] to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
    </div>
  </div>
)

// --- ABSTRACT ART COMPONENTS ---
const HeroArt = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-30 mix-blend-difference">
    <motion.svg width="800" height="800" viewBox="0 0 800 800" fill="none" className="absolute" animate={{ rotate: 360 }} transition={{ duration: 100, repeat: Infinity, ease: "linear" }}>
      <circle cx="400" cy="400" r="300" stroke="#0a0a0a" strokeWidth="2" strokeDasharray="10 20" />
      <circle cx="400" cy="400" r="380" stroke="#0a0a0a" strokeWidth="1" strokeDasharray="4 40" />
    </motion.svg>
    <motion.svg width="600" height="600" viewBox="0 0 600 600" fill="none" className="absolute" animate={{ rotate: -360 }} transition={{ duration: 80, repeat: Infinity, ease: "linear" }}>
      <rect x="100" y="100" width="400" height="400" stroke="#E04828" strokeWidth="2" strokeDasharray="20 40" rx="40" />
    </motion.svg>
    <motion.div 
      className="absolute w-96 h-96 border-[1px] border-[#C5D000] rounded-full"
      animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
)

// --- ANIMATION VARIANTS ---
const revealWrapper: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
}
const revealItem: Variants = {
  hidden: { y: "150%", rotate: 5, opacity: 0 },
  visible: { y: "0%", rotate: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 100 } }
}

export default function LandingPage() {
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT')
  const [formData, setFormData] = useState({ email: '', password: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress: videoScroll } = useScroll({ target: videoRef, offset: ["start end", "center center"] })
  const videoScale = useTransform(videoScroll, [0, 1], [0.8, 1])
  const videoOpacity = useTransform(videoScroll, [0, 1], [0.3, 1])
  const videoY = useTransform(videoScroll, [0, 1], [100, 0])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, [e.target.type === 'email' ? 'email' : e.target.type === 'password' ? 'password' : 'name']: e.target.value }))

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setError('')
    setFormData({ email: '', password: '', name: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    const { email, password, name } = formData
    
    if (mode === 'register') {
      try {
        // Now passing the selected role directly to the registration API
        const res = await fetch('/api/register', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email, name, password, role }) 
        })
        if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Registration failed'); setLoading(false); return }
        
        // Auto sign-in after successful registration
        const result = await signIn('credentials', { email, password, redirect: false })
        if (result?.error || !result?.ok) { setError('Failed to sign in after registration'); setLoading(false); return }
        window.location.href = role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard'
        return
      } catch { setError('Network error'); setLoading(false); return }
    }
    
    // Login flow
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error || !result?.ok) { setError('Invalid email or password'); setLoading(false); return }
      // The session callback will handle routing based on their database role if they log in normally
      window.location.href = '/student/dashboard' // Fallback, middleware will catch and route properly
    } catch { setError('Network error'); setLoading(false) }
  }

  const scrollToAuth = () => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] selection:bg-[#0a0a0a] selection:text-[#C5D000] overflow-hidden">
      
      {/* --- FLOATING NAV --- */}
      <motion.nav 
        initial={{ y: -100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.5 }}
        className="fixed top-6 inset-x-6 md:inset-x-12 z-50 flex items-center justify-between px-6 h-16 bg-white/70 backdrop-blur-2xl border border-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0a0a0a]">
            <Command className="w-4 h-4 text-[#C5D000]" />
          </div>
          <span className="font-black text-lg tracking-tighter">KATTRAL.</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { switchMode('login'); scrollToAuth() }} className="text-sm font-bold px-4 py-2 hover:bg-black/5 rounded-lg transition-colors hidden sm:block">
            Log in
          </button>
          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { switchMode('register'); scrollToAuth() }} 
            className="text-sm font-bold px-5 py-2.5 rounded-xl bg-[#C5D000] text-[#0a0a0a] shadow-lg shadow-[#C5D000]/20"
          >
            Get Started
          </motion.button>
        </div>
      </motion.nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-48 pb-32 px-6 md:px-12 max-w-[1600px] mx-auto min-h-[90vh] flex flex-col items-center">
        
        <HeroArt />

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2, type: "spring" }}
          className="relative z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 bg-white/50 backdrop-blur-md mb-8"
        >
          <Sparkles className="w-4 h-4 text-[#E04828]" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">The Modern Academy</span>
        </motion.div>

        {/* Masked Text Reveal */}
        <motion.h1 
          variants={revealWrapper} initial="hidden" animate="visible"
          className="relative z-10 text-center font-black leading-[0.85] tracking-tighter uppercase"
          style={{ fontSize: 'clamp(64px, 12vw, 180px)' }}
        >
          <div className="overflow-hidden pb-4"><motion.div variants={revealItem}>Teaching,</motion.div></div>
          <div className="overflow-hidden pb-4 flex justify-center gap-4 md:gap-8">
            <motion.div variants={revealItem} className="text-[#E04828] italic pr-2">Mastered.</motion.div>
          </div>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }}
          className="relative z-10 mt-8 text-lg md:text-2xl text-center max-w-2xl font-medium text-black/50 leading-relaxed"
        >
          A single platform for live video, infinite whiteboards, and seamless classroom management. Built for the next generation of educators.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8 }}
          className="relative z-10 mt-12 flex flex-col sm:flex-row gap-4"
        >
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { switchMode('register'); scrollToAuth() }} className="px-8 py-4 rounded-2xl bg-[#0a0a0a] text-white font-bold flex items-center justify-center gap-2 shadow-2xl shadow-black/20">
            Start your academy <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </section>

      {/* --- PARALLAX DASHBOARD SHOWCASE --- */}
      <section className="relative pb-40 px-6 md:px-12 max-w-[1400px] mx-auto z-10">
        <motion.div 
          ref={videoRef} style={{ scale: videoScale, opacity: videoOpacity, y: videoY }}
          className="w-full aspect-video bg-[#0a0a0a] rounded-[2rem] md:rounded-[3rem] p-2 md:p-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border border-black/5 relative overflow-hidden group"
        >
          <div className="absolute top-0 inset-x-0 h-16 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center px-6 gap-4 z-20">
            <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
            <div className="h-8 flex-1 bg-white/5 rounded-md flex items-center px-4"><span className="text-white/30 text-xs font-mono">kattral.app/live/physics-101</span></div>
          </div>
          
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black rounded-2xl md:rounded-[2.5rem] overflow-hidden relative flex items-center justify-center">
            <motion.div whileHover={{ scale: 1.1 }} className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center cursor-pointer z-30 transition-colors hover:bg-white/20">
              <Play className="w-8 h-8 text-white ml-1" />
            </motion.div>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1616469829581-73993eb86b02?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </div>
        </motion.div>
      </section>

      {/* --- ARCHITECTURAL BENTO GRID --- */}
      <section className="py-32 px-6 md:px-12 bg-white relative">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <h2 className="text-[clamp(40px,6vw,80px)] font-black leading-[0.85] tracking-tighter uppercase max-w-2xl">
              Engineered for <br/><span className="text-[#E04828]">Brilliance.</span>
            </h2>
            <p className="text-xl font-medium text-black/40 max-w-sm">Every tool designed with obsessive attention to detail, so you can focus on teaching.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:h-[600px]">
            <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }} className="md:col-span-2 md:row-span-2 bg-[#F3F2EC] rounded-[2rem] p-8 md:p-12 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#E04828]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-6"><Video className="w-6 h-6 text-[#E04828]" /></div>
                  <h3 className="font-black text-4xl tracking-tight mb-4">Cinematic Video</h3>
                  <p className="text-lg font-medium text-black/50 max-w-md">Ultra-low latency streaming, crystal clear screen sharing, and automatic cloud recording. Your classroom, broadcast globally.</p>
                </div>
                <div className="mt-12 h-48 w-full bg-white rounded-xl shadow-xl shadow-black/5 border border-black/5 overflow-hidden relative translate-y-8 group-hover:translate-y-0 transition-transform duration-700">
                   <div className="absolute bottom-4 inset-x-4 h-12 bg-black/5 rounded-lg flex items-center justify-center gap-4">
                     <div className="w-8 h-8 rounded-full bg-white shadow-sm" />
                     <div className="w-8 h-8 rounded-full bg-red-500/20 shadow-sm" />
                     <div className="w-16 h-8 rounded-full bg-white shadow-sm" />
                   </div>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }} className="md:col-span-2 bg-[#0a0a0a] rounded-[2rem] p-8 relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#C5D000]/20 blur-[60px] rounded-full group-hover:bg-[#C5D000]/40 transition-colors duration-700" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md mb-6"><Edit3 className="w-6 h-6 text-[#C5D000]" /></div>
                  <h3 className="font-black text-3xl text-white tracking-tight mb-2">Infinite Canvas</h3>
                  <p className="font-medium text-white/50">Multiplayer whiteboarding that feels like magic.</p>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }} className="bg-[#C5D000] rounded-[2rem] p-8 relative overflow-hidden group">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center mb-6"><Users className="w-6 h-6 text-[#0a0a0a]" /></div>
                  <h3 className="font-black text-2xl tracking-tight mb-2">Smart Rosters</h3>
                  <p className="font-medium text-black/60 text-sm">One-click invites and attendance tracking.</p>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }} className="bg-[#F3F2EC] rounded-[2rem] p-8 relative overflow-hidden group">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-6"><Hash className="w-6 h-6 text-[#0284C7]" /></div>
                  <h3 className="font-black text-2xl tracking-tight mb-2">Class Channels</h3>
                  <p className="font-medium text-black/50 text-sm">Persistent chat for Q&A and announcements.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- THE DEEP CANVAS AUTH ENTRANCE (WITH ROLE SELECTION) --- */}
      <section id="auth-section" className="relative py-40 px-6 bg-[#0a0a0a] min-h-screen flex items-center justify-center overflow-hidden">
        
        {/* Animated Aurora Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,_rgba(197,208,0,0.15)_0%,_transparent_60%)] blur-[100px] animate-[spin_40s_linear_infinite]" />
          <div className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,_rgba(224,72,40,0.15)_0%,_transparent_60%)] blur-[100px] animate-[spin_50s_reverse_linear_infinite]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          
          {/* Abstract SVG shapes in auth background */}
          <svg className="absolute right-10 top-20 w-32 h-32 opacity-20" viewBox="0 0 100 100">
             <path d="M50 0 L100 50 L50 100 L0 50 Z" stroke="#E04828" strokeWidth="2" fill="none" />
             <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="#C5D000" strokeWidth="1" fill="none" />
          </svg>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, type: "spring", bounce: 0.3 }}
          className="relative z-10 w-full max-w-[480px]"
        >
          
          <div className="text-center mb-8">
            <h2 className="font-black text-white text-[clamp(40px,5vw,56px)] tracking-tighter leading-none mb-4 uppercase">
              Enter the <br/><span className="text-[#C5D000]">Academy.</span>
            </h2>
          </div>

          {/* Premium Glass Card */}
          <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-6 md:p-10 shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            
            {/* Mode Selection Tabs (Bug-free toggle) */}
            <div className="flex bg-white/5 p-1 rounded-xl mb-8 border border-white/10">
              <button onClick={() => switchMode('login')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-white/50 hover:text-white'}`}>
                Sign In
              </button>
              <button onClick={() => switchMode('register')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-[#C5D000] text-[#0a0a0a] shadow-sm' : 'text-white/50 hover:text-white'}`}>
                Create Account
              </button>
            </div>

            <button onClick={() => signIn('google', { callbackUrl: '/auth/role' })} className="w-full flex items-center justify-center gap-3 bg-white text-[#0a0a0a] font-bold py-4 rounded-xl text-sm transition-transform hover:scale-[1.02] active:scale-[0.98] mb-6 shadow-xl shadow-white/5">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg> Continue with Google
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">or email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <AnimatePresence mode="popLayout">
                {mode === 'register' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }} 
                    className="overflow-hidden space-y-4"
                  >
                    {/* Explicit Role Selection separated for Registration */}
                    <div className="space-y-2 relative z-10">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-1">I am a...</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setRole('STUDENT')} className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition-all ${role === 'STUDENT' ? 'bg-[#16A34A]/20 border-[#16A34A] text-white' : 'bg-transparent border-white/10 text-white/50 hover:bg-white/5'}`}>
                          <CheckCircle2 className="w-4 h-4" /> Student
                        </button>
                        <button type="button" onClick={() => setRole('TEACHER')} className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition-all ${role === 'TEACHER' ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white' : 'bg-transparent border-white/10 text-white/50 hover:bg-white/5'}`}>
                          <GraduationCap className="w-4 h-4" /> Teacher
                        </button>
                      </div>
                    </div>

                    <AuthInput label="Full Name" type="text" placeholder="John Doe" value={formData.name} onChange={handleInput} />
                  </motion.div>
                )}
              </AnimatePresence>

              <AuthInput label="Email Address" type="email" placeholder="hello@example.com" value={formData.email} onChange={handleInput} />
              <AuthInput label="Password" type="password" placeholder="••••••••" value={formData.password} onChange={handleInput} />

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-2">
                    <p className="text-sm font-bold text-center py-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="submit" disabled={loading} 
                className="w-full disabled:opacity-50 font-bold py-4 rounded-xl text-base transition-all mt-6 flex justify-center items-center bg-[#C5D000] text-[#0a0a0a] shadow-[0_0_40px_rgba(197,208,0,0.2)]"
              >
                {loading 
                  ? <svg className="w-5 h-5 animate-spin text-[#0a0a0a]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> 
                  : mode === 'login' ? 'Sign In Securely' : 'Create Account'
                }
              </motion.button>
            </form>
          </div>
        </motion.div>
      </section>

      {/* --- MINIMAL FOOTER --- */}
      <footer className="py-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0a0a0a] border-t border-white/5">
        <div className="flex items-center gap-2">
          <Command className="w-4 h-4 text-[#C5D000]" />
          <span className="text-sm font-black tracking-tighter text-white">KATTRAL.</span>
        </div>
        <p className="text-xs font-medium text-white/30">&copy; 2026 Kattral Academy. All rights reserved.</p>
      </footer>
    </div>
  )
}