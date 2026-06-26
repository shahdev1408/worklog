'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, type Company, type Project, type SubProject, type WorkLog } from '@/lib/supabase'
import { format, isToday, parseISO, isThisWeek } from 'date-fns'
import { Save, ArrowLeft, Pencil, Plus, Trash2, CheckCircle, Edit2, X, ChevronDown, ChevronUp, ListFilter } from 'lucide-react'

type Entry = {
  id: string; dbId?: string
  company_id: string; project_id: string; sub_project_id: string
  description: string; manager: string
}

function emptyEntry(): Entry {
  return { id: crypto.randomUUID(), company_id: '', project_id: '', sub_project_id: '', description: '', manager: '' }
}

function EntryCard({ entry, index, total, companies, projects, subProjects, onChange, onRemove }: {
  entry: Entry; index: number; total: number
  companies: Company[]; projects: Project[]; subProjects: SubProject[]
  onChange: (id: string, key: string, value: string) => void
  onRemove: (id: string) => void
}) {
  const filteredProjects = projects.filter(p => p.company_id === entry.company_id)
  const filteredSubs = subProjects.filter(sp => sp.project_id === entry.project_id)
  const companyName = companies.find(c => c.id === entry.company_id)?.name
  const projectName = projects.find(p => p.id === entry.project_id)?.name

  function set(key: string, value: string) {
    onChange(entry.id, key, value)
    if (key === 'company_id') { onChange(entry.id, 'project_id', ''); onChange(entry.id, 'sub_project_id', '') }
    if (key === 'project_id') onChange(entry.id, 'sub_project_id', '')
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
          <span className="text-sm font-semibold text-slate-700 truncate">
            {companyName && projectName ? `${companyName} / ${projectName}` : companyName || 'New entry'}
          </span>
        </div>
        {total > 1 && <button type="button" onClick={() => onRemove(entry.id)} className="btn-ghost hover:text-red-500 p-1.5 ml-2"><Trash2 size={15} /></button>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Company *</label>
          <select className="input" value={entry.company_id} onChange={e => set('company_id', e.target.value)} required>
            <option value="">Select company…</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Project *</label>
          <select className="input" value={entry.project_id} disabled={!entry.company_id} onChange={e => set('project_id', e.target.value)} required>
            <option value="">Select project…</option>
            {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Sub-project</label>
          <select className="input" value={entry.sub_project_id} disabled={!entry.project_id} onChange={e => set('sub_project_id', e.target.value)}>
            <option value="">None</option>
            {filteredSubs.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Manager (optional)</label>
          <input type="text" className="input" placeholder="e.g. Rahul…" value={entry.manager} onChange={e => set('manager', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">What did you do? *</label>
        <textarea className="input min-h-[120px] resize-y leading-relaxed" required
          placeholder={"- Completed the homepage design\n- Fixed 3 bugs in the login flow"}
          value={entry.description} onChange={e => set('description', e.target.value)} />
      </div>
    </div>
  )
}

// All logs panel — toggleable
function AllLogsPanel({ companies, projects, onEdit }: { companies: Company[]; projects: Project[]; onEdit: (id: string) => void }) {
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCompany, setFilterCompany] = useState('')
  const [filterPeriod, setFilterPeriod] = useState<'all'|'today'|'week'>('all')

  useEffect(() => {
    supabase.from('work_logs')
      .select('*, companies(name), projects(name), sub_projects(name)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setLogs(data); setLoading(false) })
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete?')) return
    await supabase.from('work_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  const filtered = logs.filter(l => {
    if (filterCompany && l.company_id !== filterCompany) return false
    if (filterPeriod === 'today' && !isToday(parseISO(l.date))) return false
    if (filterPeriod === 'week' && !isThisWeek(parseISO(l.date), { weekStartsOn: 1 })) return false
    return true
  })

  return (
    <div className="card mt-6" id="all">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListFilter size={16} className="text-slate-400" />
          <h3 className="font-semibold text-slate-800 text-sm">All Logs</h3>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        {/* Filters inline */}
        <div className="flex items-center gap-2">
          <select className="input text-xs py-1.5 w-36" value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['all','today','week'] as const).map(p => (
              <button key={p} onClick={() => setFilterPeriod(p)}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${filterPeriod === p ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                {p === 'all' ? 'All' : p === 'today' ? 'Today' : 'Week'}
              </button>
            ))}
          </div>
          {(filterCompany || filterPeriod !== 'all') && (
            <button onClick={() => { setFilterCompany(''); setFilterPeriod('all') }} className="btn-ghost p-1"><X size={14} /></button>
          )}
        </div>
      </div>

      {/* Scrollable log list */}
      <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No logs found</p>
        ) : filtered.map(log => (
          <div key={log.id} className="group px-5 py-3.5 hover:bg-slate-50 transition-colors flex gap-3 items-start">
            <div className="flex-shrink-0 text-center bg-slate-100 rounded-lg px-2 py-1.5 min-w-[44px]">
              <div className="text-[9px] text-slate-500 font-medium uppercase">{format(parseISO(log.date), 'MMM')}</div>
              <div className="text-base font-bold text-slate-800 leading-none">{format(parseISO(log.date), 'd')}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1 mb-1">
                <span className="tag-company text-[10px]">{(log as any).companies?.name}</span>
                <span className="text-slate-300 text-xs">/</span>
                <span className="tag-project text-[10px]">{(log as any).projects?.name}</span>
                {(log as any).sub_projects?.name && <><span className="text-slate-300 text-xs">/</span><span className="tag-sub text-[10px]">{(log as any).sub_projects.name}</span></>}
                {log.manager && <span className="badge bg-amber-100 text-amber-700 text-[10px]">👤 {log.manager}</span>}
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-3">{log.description}</p>
            </div>
            <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(log.id)} className="btn-ghost hover:text-brand-600 p-1.5"><Edit2 size={13} /></button>
              <button onClick={() => handleDelete(log.id)} className="btn-ghost hover:text-red-500 p-1.5"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [subProjects, setSubProjects] = useState<SubProject[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [entries, setEntries] = useState<Entry[]>([emptyEntry()])

  useEffect(() => {
    // Check if URL has #all to auto-open
    if (window.location.hash === '#all') setShowAllLogs(true)
  }, [])

  useEffect(() => {
    async function init() {
      const [cRes, pRes, spRes] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('projects').select('*').order('name'),
        supabase.from('sub_projects').select('*').order('name'),
      ])
      if (cRes.data) setCompanies(cRes.data)
      if (pRes.data) setProjects(pRes.data)
      if (spRes.data) setSubProjects(spRes.data)

      if (editId) {
        const { data } = await supabase.from('work_logs').select('*').eq('id', editId).single()
        if (data) {
          setDate(data.date)
          const { data: siblings } = await supabase.from('work_logs').select('*').eq('date', data.date).order('created_at', { ascending: true })
          if (siblings?.length) {
            setEntries(siblings.map(s => ({ id: s.id, dbId: s.id, company_id: s.company_id, project_id: s.project_id, sub_project_id: s.sub_project_id || '', description: s.description, manager: s.manager || '' })))
          }
        }
      }
      setLoaded(true)
    }
    init()
  }, [editId])

  function handleChange(id: string, key: string, value: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [key]: value } : e))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    for (const entry of entries) {
      if (!entry.company_id || !entry.project_id || !entry.description.trim()) {
        alert('Please fill company, project, and description for all entries.'); return
      }
    }
    setSaving(true)
    if (editId) {
      for (const entry of entries) {
        const payload = { date, company_id: entry.company_id, project_id: entry.project_id, sub_project_id: entry.sub_project_id || null, description: entry.description.trim(), manager: entry.manager.trim() || null }
        if (entry.dbId) await supabase.from('work_logs').update(payload).eq('id', entry.dbId)
        else await supabase.from('work_logs').insert(payload)
      }
    } else {
      await supabase.from('work_logs').insert(entries.map(e => ({ date, company_id: e.company_id, project_id: e.project_id, sub_project_id: e.sub_project_id || null, description: e.description.trim(), manager: e.manager.trim() || null })))
    }
    setSaving(false); setSaved(true)
    setTimeout(() => router.push('/dashboard'), 800)
  }

  if (!loaded) return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="btn-ghost"><ArrowLeft size={18} /></button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {editId ? <><Pencil size={20} /> Edit updates</> : "Log today's updates"}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {editId ? 'All entries for this date shown below.' : 'Add one or more entries for the same date.'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card p-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Date (applies to all entries)</label>
          <input type="date" className="input max-w-xs" value={date} onChange={e => setDate(e.target.value)} required />
        </div>

        {entries.map((entry, i) => (
          <EntryCard key={entry.id} entry={entry} index={i} total={entries.length}
            companies={companies} projects={projects} subProjects={subProjects}
            onChange={handleChange} onRemove={id => setEntries(prev => prev.filter(e => e.id !== id))} />
        ))}

        <button type="button" onClick={() => setEntries(prev => [...prev, emptyEntry()])}
          className="w-full border-2 border-dashed border-slate-200 hover:border-brand-400 hover:bg-brand-50 text-slate-400 hover:text-brand-600 rounded-xl py-3.5 text-sm font-medium flex items-center justify-center gap-2 transition-all">
          <Plus size={18} /> Add another project / company for same date
        </button>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || saved} className="btn-primary min-w-[150px] justify-center">
            {saved ? <><CheckCircle size={16} /> Saved!</>
              : saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Save size={16} /> {editId ? 'Save all changes' : `Save ${entries.length > 1 ? `${entries.length} entries` : 'update'}`}</>}
          </button>
        </div>
      </form>

      {/* Toggle: View all logs */}
      <div className="border-t border-slate-200 pt-4">
        <button onClick={() => setShowAllLogs(!showAllLogs)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-sm font-medium text-slate-700">
          <span className="flex items-center gap-2">
            <ListFilter size={16} className="text-slate-400" />
            {showAllLogs ? 'Hide all logs' : 'View & manage all logs'}
          </span>
          {showAllLogs ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showAllLogs && (
          <AllLogsPanel
            companies={companies}
            projects={projects}
            onEdit={(id) => router.push(`/log?edit=${id}`)}
          />
        )}
      </div>
    </div>
  )
}

export default function LogPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
      <LogForm />
    </Suspense>
  )
}