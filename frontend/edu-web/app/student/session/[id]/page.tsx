'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, Video, Users, MessageSquare, 
  Mic, MicOff, Camera, MonitorUp, PhoneOff, 
  Settings, Maximize, Hand, Send
} from 'lucide-react'

export default function StudentSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession()
  const [sessionId, setSessionId] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'people'>('chat')
  
  // Mock controls state for UI demo
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)

  useEffect(() => {
    params.then(p => setSessionId(p.id))
  }, [params])

  return (
    <div className="min-h-screen font-sans text-zinc-800 bg-[#F4F4F5] flex flex-col overflow-hidden">
      
      {/* App Header - Dark Slate */}
      <header className="sticky top-0 z-40 h-16 bg-[#18181B] border-b border-white/10 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link 
            href={`/student/classroom/${sessionId}`} // Ideally routes back to the specific classroom
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center border border-white/10"
            title="Back to Classroom"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-300" />
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-sm tracking-tight text-white uppercase">Live Class</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-white/5">
            00:45:12
          </span>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="flex-1 relative flex flex-col min-h-0">
        
        {/* Absolute Background Overlap Layer */}
        <div className="absolute top-0 inset-x-0 h-[300px] bg-[#18181B] z-0" />

        <div className="relative z-10 flex flex-col lg:flex-row gap-6 p-6 max-w-[1600px] mx-auto w-full h-full">
          
          {/* Main Video Area - Floating White Card wrapper */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden p-2 min-h-[500px]">
            
            {/* Dark Video Canvas */}
            <div className="flex-1 relative bg-[#09090B] rounded-xl overflow-hidden flex items-center justify-center ring-1 ring-black/5">
              
              {/* Main Speaker Placeholder */}
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-zinc-400">TR</span>
                </div>
                <h2 className="text-white font-semibold text-xl drop-shadow-md">Teacher&apos;s Screen</h2>
                <p className="text-zinc-400 text-sm mt-1">Waiting for video feed...</p>
              </div>
              
              {/* Overlays (Name tag) */}
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-white text-xs font-medium tracking-wide">Mr. Teacher (Host)</span>
              </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="h-[72px] mt-2 bg-white rounded-xl flex items-center justify-between px-4">
              
              {/* Left Controls */}
              <div className="flex items-center gap-2 w-1/3">
                <span className="text-sm font-bold text-zinc-800 truncate">Introduction to React Hooks</span>
              </div>

              {/* Center Controls (Main Actions) */}
              <div className="flex items-center justify-center gap-3 w-1/3">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                    isMuted ? 'bg-red-50 border-red-200 text-red-600' : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                
                <button 
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                    isVideoOff ? 'bg-red-50 border-red-200 text-red-600' : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {isVideoOff ? <Video className="w-5 h-5 relative before:absolute before:w-6 before:h-0.5 before:bg-current before:-rotate-45" /> : <Video className="w-5 h-5" />}
                </button>

                <button 
                  onClick={() => setIsHandRaised(!isHandRaised)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                    isHandRaised ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <Hand className="w-5 h-5" />
                </button>

                <button className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-700 flex items-center justify-center hover:bg-zinc-100 transition-all shadow-sm">
                  <MonitorUp className="w-5 h-5" />
                </button>

                <button className="px-6 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-sm ml-2">
                  <PhoneOff className="w-4 h-4" />
                  Leave
                </button>
              </div>

              {/* Right Controls */}
              <div className="flex items-center justify-end gap-2 w-1/3">
                <button className="w-10 h-10 rounded-lg text-zinc-500 hover:bg-zinc-100 flex items-center justify-center transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 rounded-lg text-zinc-500 hover:bg-zinc-100 flex items-center justify-center transition-colors">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>

            </div>
          </div>

          {/* Sidebar Panel - Floating Card */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 bg-white rounded-2xl shadow-xl border border-zinc-200 flex flex-col h-[500px] lg:h-full overflow-hidden">
            
            {/* Tabs */}
            <div className="flex p-1.5 bg-zinc-50 border-b border-zinc-100 shrink-0">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  activeTab === 'chat' 
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-zinc-200/50' 
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/50'
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Chat
              </button>
              <button 
                onClick={() => setActiveTab('people')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  activeTab === 'people' 
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-zinc-200/50' 
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/50'
                }`}
              >
                <Users className="w-4 h-4" /> People <span className="bg-zinc-200 text-zinc-600 text-[10px] px-1.5 py-0.5 rounded-md ml-1">12</span>
              </button>
            </div>

            {/* Panel Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              {activeTab === 'chat' ? (
                <>
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    <div className="flex flex-col justify-center items-center text-center h-full text-zinc-500">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-sm font-bold text-zinc-900 mb-1">Session Chat</p>
                      <p className="text-xs">Messages will appear here.<br/>They are only saved during the live session.</p>
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t border-zinc-100 bg-zinc-50 shrink-0">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Send a message to everyone..." 
                        className="w-full pl-4 pr-12 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder:text-zinc-400"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors shadow-sm">
                        <Send className="w-4 h-4 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* People Tab Content */
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {/* Host */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 text-white text-xs font-bold flex items-center justify-center">TR</div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">Mr. Teacher <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">Host</span></p>
                        </div>
                      </div>
                      <Mic className="w-4 h-4 text-zinc-400" />
                    </div>
                    
                    {/* You */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                          {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">You</p>
                        </div>
                      </div>
                      {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-500" />}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}