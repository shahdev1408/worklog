'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type WorkLog, type Company } from '@/lib/supabase'
import { format, isToday, parseISO } from 'date-fns'
import { Activity, Briefcase, FileText, PlusCircle, Edit2, Trash2, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [logsRes, companiesRes] = await Promise.all([
      supabase
        .from('work_logs')
        .select('*, companies(name), projects(name), sub_projects(name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('companies').select('*').order('name')
    ])
    if (logsRes.data) setLogs(logsRes.data)
    if (companiesRes.data) setCompanies(companiesRes.data)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this update?')) return
    await supabase.from('work_logs').delete().eq('id', id)
    setLogs(logs.filter(l => l.id !== id))
  }

  const todayCount = logs.filter(l => isToday(parseISO(l.date))).length
  const activeClients = new Set(logs.map(l => l.company_id)).size
  const weekLogs = logs.filter(l => {
    const d = parseISO(l.date)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return d >= weekAgo
  }).length

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Good {getGreeting()}</h2>
          <p className="text-slate-500 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link href="/log" className="btn-primary no-print">
          <PlusCircle size={17} />
          Log update
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Activity} label="Updates today" value={todayCount} color="blue" />
        <StatCard icon={TrendingUp} label="This week" value={weekLogs} color="violet" />
        <StatCard icon={Briefcase} label="Active clients" value={activeClients} color="emerald" />
      </div>

      {/* Feed */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">Recent updates</h3>
          <Link href="/log" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
            <PlusCircle size={13} /> New
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">No updates yet</p>
            <p className="text-slate-400 text-xs mt-1">Log your first update to get started</p>
            <Link href="/log" className="btn-primary mt-4 inline-flex">
              <PlusCircle size={16} /> Log first update
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {logs.map(log => (
              <LogRow key={log.id} log={log} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LogRow({ log, onDelete }: { log: WorkLog; onDelete: (id: string) => void }) {
  return (
    <div className="group px-5 py-4 hover:bg-slate-50/70 transition-colors flex gap-4 items-start">
      {/* Date bubble */}
      <div className="flex-shrink-0 text-center bg-slate-100 rounded-lg px-2.5 py-2 min-w-[52px]">
        <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
          {format(parseISO(log.date), 'MMM')}
        </div>
        <div className="text-lg font-bold text-slate-800 leading-none">
          {format(parseISO(log.date), 'd')}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          <span className="tag-company">{(log as any).companies?.name}</span>
          <span className="text-slate-300 text-xs self-center">/</span>
          <span className="tag-project">{(log as any).projects?.name}</span>
          {(log as any).sub_projects?.name && (
            <>
              <span className="text-slate-300 text-xs self-center">/</span>
              <span className="tag-sub">{(log as any).sub_projects.name}</span>
            </>
          )}
          {log.manager && (
            <span className="badge bg-amber-100 text-amber-700">👤 {log.manager}</span>
          )}
        </div>
        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{log.description}</p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/log?edit=${log.id}`} className="btn-ghost hover:text-brand-600">
          <Edit2 size={15} />
        </Link>
        <button onClick={() => onDelete(log.id)} className="btn-ghost hover:text-red-500">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: number; color: 'blue' | 'violet' | 'emerald'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-l-blue-500',
    violet: 'bg-violet-50 text-violet-600 border-l-violet-500',
    emerald: 'bg-emerald-50 text-emerald-600 border-l-emerald-500',
  }
  return (
    <div className={`card flex items-center gap-4 p-5 border-l-4 ${colors[color]}`}>
      <div className={`p-3 rounded-xl ${colors[color].split(' ').slice(0,2).join(' ')}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning 👋'
  if (h < 17) return 'afternoon 👋'
  return 'evening 👋'
}
