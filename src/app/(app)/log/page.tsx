'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, type Company, type Project, type SubProject, type WorkLog } from '@/lib/supabase'
import { format } from 'date-fns'
import { Save, ArrowLeft, Pencil } from 'lucide-react'

function LogForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [subProjects, setSubProjects] = useState<SubProject[]>([])
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    company_id: '',
    project_id: '',
    sub_project_id: '',
    description: '',
    manager: '',
  })

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
          setForm({
            date: data.date,
            company_id: data.company_id,
            project_id: data.project_id,
            sub_project_id: data.sub_project_id || '',
            description: data.description,
            manager: data.manager || '',
          })
        }
      }
      setLoaded(true)
    }
    init()
  }, [editId])

  const filteredProjects = projects.filter(p => p.company_id === form.company_id)
  const filteredSubs = subProjects.filter(sp => sp.project_id === form.project_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_id || !form.project_id || !form.description.trim()) {
      alert('Please fill in company, project, and description.')
      return
    }
    setSaving(true)

    const payload = {
      date: form.date,
      company_id: form.company_id,
      project_id: form.project_id,
      sub_project_id: form.sub_project_id || null,
      description: form.description.trim(),
      manager: form.manager.trim() || null,
    }

    if (editId) {
      await supabase.from('work_logs').update(payload).eq('id', editId)
    } else {
      await supabase.from('work_logs').insert(payload)
    }

    setSaving(false)
    router.push('/dashboard')
  }

  function setField(key: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'company_id') { next.project_id = ''; next.sub_project_id = '' }
      if (key === 'project_id') { next.sub_project_id = '' }
      return next
    })
  }

  if (!loaded) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {editId ? <><Pencil size={20} /> Edit update</> : 'Log today\'s update'}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">What did you accomplish?</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Date + Manager row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Date</label>
            <input type="date" className="input" value={form.date}
              onChange={e => setField('date', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Manager (optional)</label>
            <input type="text" className="input" placeholder="e.g. Rahul, Client name…"
              value={form.manager} onChange={e => setField('manager', e.target.value)} />
          </div>
        </div>

        {/* Company */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Company *</label>
          <select className="input" value={form.company_id}
            onChange={e => setField('company_id', e.target.value)} required>
            <option value="">Select company…</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Project + Sub-project row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Project *</label>
            <select className="input" value={form.project_id} disabled={!form.company_id}
              onChange={e => setField('project_id', e.target.value)} required>
              <option value="">Select project…</option>
              {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {form.company_id && filteredProjects.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No projects for this company. <a href="/manage" className="underline">Add one →</a></p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Sub-project</label>
            <select className="input" value={form.sub_project_id} disabled={!form.project_id}
              onChange={e => setField('sub_project_id', e.target.value)}>
              <option value="">None</option>
              {filteredSubs.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">What did you do? *</label>
          <textarea className="input min-h-[140px] resize-y leading-relaxed" required
            placeholder={"- Completed the homepage design mockup\n- Had a call with the client about requirements\n- Fixed 3 bugs in the login flow"}
            value={form.description}
            onChange={e => setField('description', e.target.value)} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : <Save size={16} />}
            {editId ? 'Save changes' : 'Log update'}
          </button>
        </div>
      </form>
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
