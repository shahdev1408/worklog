'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PlusCircle, Settings, FileText, Menu, Zap, LogOut, Lock } from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/log',       icon: PlusCircle,      label: 'Log Update' },
  { href: '/manage',    icon: Settings,         label: 'Manage' },
  { href: '/reports',   icon: FileText,         label: 'Reports' },
]

const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'worklog2024'
const SESSION_KEY = 'wl_auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored === APP_PASSWORD) setAuthed(true)
    setChecking(false)
  }, [])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === APP_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, password)
      setAuthed(true)
      setError('')
    } else {
      setError('Wrong password. Try again.')
      setPassword('')
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthed(false)
    setPassword('')
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!authed) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap size={26} className="text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">WorkLog</h1>
          <p className="text-slate-500 text-sm mt-1">Your personal work tracker</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={16} className="text-slate-400" />
            <h2 className="font-semibold text-slate-800">Enter password to continue</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                autoFocus
                className="input"
                placeholder="Password…"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
              />
              {error && <p className="text-xs text-red-500 mt-1.5">⚠ {error}</p>}
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-3">
              Unlock
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Set password via <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_APP_PASSWORD</code> in .env.local
        </p>
      </div>
    </div>
  )

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">WorkLog</h1>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wide uppercase">Daily Tracker</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`sidebar-link ${pathname.startsWith(href) ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={17} />
          <span>Lock app</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex w-56 flex-shrink-0 flex-col h-screen sticky top-0">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-56 h-full flex flex-col">
            <Sidebar />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-40">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center">
              <Zap size={11} className="text-white" fill="white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">WorkLog</span>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="max-w-5xl mx-auto animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}