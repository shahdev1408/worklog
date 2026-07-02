'use client'
import { useEffect, useState } from 'react'
import { supabase, type Company, type Project, type SubProject } from '@/lib/supabase'
import { Plus, Pencil, Trash2, Check, X, Briefcase, FolderOpen, Layers, ChevronDown, ChevronUp, Globe, GitBranch, Cpu, FileText, Circle } from 'lucide-react'

type ProjectWithDetails = Project & {
  tech_stack?: string
  live_url?: string
  repo_url?: string
  notes?: string
  status?: string
}

export default function ManagePage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [subProjects, setSubProjects] = useState<SubProject[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    const [c, p, sp] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase.from('projects').select('*').order('name'),
      supabase.from('sub_projects').select('*').order('name'),
    ])
    if (c.data) setCompanies(c.data)
    if (p.data) setProjects(p.data)
    if (sp.data) setSubProjects(sp.data)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Manage</h2>
        <p className="text-slate-500 text-sm mt-0.5">Add and edit companies, projects, and sub-projects.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Companies */}
        <SimpleList
          title="Companies" icon={Briefcase} items={companies} placeholder="New company name…"
          onAdd={async (name) => {
            const { data } = await supabase.from('companies').insert({ name }).select().single()
            if (data) setCompanies(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)))
          }}
          onEdit={async (id, name) => {
            await supabase.from('companies').update({ name }).eq('id', id)
            setCompanies(prev => prev.map(c => c.id === id ? { ...c, name } : c))
          }}
          onDelete={async (id) => {
            if (!confirm('Delete company and ALL its projects/logs?')) return
            await supabase.from('companies').delete().eq('id', id)
            setCompanies(prev => prev.filter(c => c.id !== id))
          }}
        />

        {/* Projects — with expandable details */}
        <ProjectList
          projects={projects} companies={companies}
          onAdd={async (name, companyId) => {
            const { data } = await supabase.from('projects').insert({ name, company_id: companyId }).select().single()
            if (data) setProjects(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)))
          }}
          onEdit={async (id, name) => {
            await supabase.from('projects').update({ name }).eq('id', id)
            setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p))
          }}
          onDelete={async (id) => {
            if (!confirm('Delete project and all its logs?')) return
            await supabase.from('projects').delete().eq('id', id)
            setProjects(prev => prev.filter(p => p.id !== id))
          }}
          onUpdateDetails={async (id, details) => {
            await supabase.from('projects').update(details).eq('id', id)
            setProjects(prev => prev.map(p => p.id === id ? { ...p, ...details } : p))
          }}
        />

        {/* Sub-projects */}
        <SimpleList
          title="Sub-projects" icon={Layers} items={subProjects} placeholder="New sub-project name…"
          parentLabel="Project" parentItems={projects} parentIdKey="project_id"
          onAdd={async (name, parentId) => {
            const { data } = await supabase.from('sub_projects').insert({ name, project_id: parentId }).select().single()
            if (data) setSubProjects(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)))
          }}
          onEdit={async (id, name) => {
            await supabase.from('sub_projects').update({ name }).eq('id', id)
            setSubProjects(prev => prev.map(sp => sp.id === id ? { ...sp, name } : sp))
          }}
          onDelete={async (id) => {
            await supabase.from('sub_projects').delete().eq('id', id)
            setSubProjects(prev => prev.filter(sp => sp.id !== id))
          }}
        />
      </div>
    </div>
  )
}

// ── Simple list (companies & sub-projects) ──────────────────────────────────
function SimpleList({ title, icon: Icon, items, placeholder, parentLabel, parentItems, parentIdKey, onAdd, onEdit, onDelete }: any) {
  const [newName, setNewName] = useState('')
  const [parentId, setParentId] = useState('')
  const [editId, setEditId] = useState<string|null>(null)
  const [editVal, setEditVal] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    if (parentLabel && !parentId) { alert(`Select a ${parentLabel} first`); return }
    setAdding(true)
    await onAdd(newName.trim(), parentId)
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Icon size={16} className="text-slate-400" />
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{items.length}</span>
      </div>
      <div className="space-y-2">
        {parentLabel && parentItems && (
          <select className="input text-xs py-2" value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">Select {parentLabel}…</option>
            {parentItems.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <div className="flex gap-2">
          <input type="text" className="input text-xs py-2 flex-1" placeholder={placeholder}
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <button onClick={handleAdd} disabled={adding}
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-3 flex-shrink-0 transition-colors">
            {adding ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Plus size={16} />}
          </button>
        </div>
      </div>
      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {items.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Nothing yet.</p>}
        {items.map((item: any) => (
          <div key={item.id} className="group flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-50">
            {editId === item.id ? (
              <div className="flex-1 flex gap-1.5 items-center">
                <input autoFocus type="text" value={editVal} onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { onEdit(item.id, editVal); setEditId(null) } if (e.key === 'Escape') setEditId(null) }}
                  className="input text-xs py-1.5 flex-1" />
                <button onClick={() => { onEdit(item.id, editVal); setEditId(null) }} className="text-emerald-600 p-1"><Check size={14} /></button>
                <button onClick={() => setEditId(null)} className="text-slate-400 p-1"><X size={14} /></button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{item.name}</p>
                  {parentIdKey && parentItems && (
                    <p className="text-[10px] text-slate-400 truncate">in {parentItems.find((p: any) => p.id === item[parentIdKey])?.name || '—'}</p>
                  )}
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditId(item.id); setEditVal(item.name) }} className="btn-ghost p-1 hover:text-brand-600"><Pencil size={13} /></button>
                  <button onClick={() => onDelete(item.id)} className="btn-ghost p-1 hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Project list with expandable details ────────────────────────────────────
function ProjectList({ projects, companies, onAdd, onEdit, onDelete, onUpdateDetails }: {
  projects: ProjectWithDetails[]; companies: Company[]
  onAdd: (name: string, companyId: string) => void
  onEdit: (id: string, name: string) => void
  onDelete: (id: string) => void
  onUpdateDetails: (id: string, details: Partial<ProjectWithDetails>) => void
}) {
  const [newName, setNewName] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [editVal, setEditVal] = useState('')
  const [expandedId, setExpandedId] = useState<string|null>(null)

  async function handleAdd() {
    if (!newName.trim() || !companyId) { alert('Select a company first'); return }
    setAdding(true)
    await onAdd(newName.trim(), companyId)
    setNewName(''); setAdding(false)
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <FolderOpen size={16} className="text-slate-400" />
        <h3 className="font-semibold text-slate-800 text-sm">Projects</h3>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{projects.length}</span>
      </div>

      <div className="space-y-2">
        <select className="input text-xs py-2" value={companyId} onChange={e => setCompanyId(e.target.value)}>
          <option value="">Select Company…</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="text" className="input text-xs py-2 flex-1" placeholder="New project name…"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <button onClick={handleAdd} disabled={adding} className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-3 flex-shrink-0">
            {adding ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
        {projects.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Nothing yet.</p>}
        {projects.map(project => (
          <div key={project.id} className="border border-slate-100 rounded-lg overflow-hidden">
            {/* Project row */}
            <div className="group flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 transition-colors">
              {editId === project.id ? (
                <div className="flex-1 flex gap-1.5 items-center">
                  <input autoFocus type="text" value={editVal} onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { onEdit(project.id, editVal); setEditId(null) } if (e.key === 'Escape') setEditId(null) }}
                    className="input text-xs py-1.5 flex-1" />
                  <button onClick={() => { onEdit(project.id, editVal); setEditId(null) }} className="text-emerald-600 p-1"><Check size={14} /></button>
                  <button onClick={() => setEditId(null)} className="text-slate-400 p-1"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}>
                    <p className="text-xs font-medium text-slate-700 truncate">{project.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {companies.find(c => c.id === project.company_id)?.name || '—'}
                      {project.tech_stack && <span className="ml-1 text-brand-500">· {project.tech_stack.split(',')[0].trim()}{project.tech_stack.split(',').length > 1 ? '…' : ''}</span>}
                    </p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(project.id); setEditVal(project.name) }} className="btn-ghost p-1 hover:text-brand-600"><Pencil size={13} /></button>
                    <button onClick={() => onDelete(project.id)} className="btn-ghost p-1 hover:text-red-500"><Trash2 size={13} /></button>
                    <button onClick={() => setExpandedId(expandedId === project.id ? null : project.id)} className="btn-ghost p-1 hover:text-brand-600">
                      {expandedId === project.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Expandable details */}
            {expandedId === project.id && (
              <ProjectDetailsForm project={project} onSave={(details) => { onUpdateDetails(project.id, details); setExpandedId(null) }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Project details inline form ─────────────────────────────────────────────
function ProjectDetailsForm({ project, onSave }: { project: ProjectWithDetails; onSave: (d: Partial<ProjectWithDetails>) => void }) {
  const [form, setForm] = useState({
    tech_stack: project.tech_stack || '',
    live_url: project.live_url || '',
    repo_url: project.repo_url || '',
    notes: project.notes || '',
    status: project.status || 'active',
  })

  return (
    <div className="bg-slate-50 border-t border-slate-100 p-3 space-y-2.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Project Details</p>

      <div>
        <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase mb-1"><Cpu size={10} /> Tech Stack</label>
        <input type="text" className="input text-xs py-1.5" placeholder="React, Node.js, PostgreSQL…"
          value={form.tech_stack} onChange={e => setForm(f => ({...f, tech_stack: e.target.value}))} />
        <p className="text-[10px] text-slate-400 mt-0.5">Comma separated</p>
      </div>

      <div>
        <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase mb-1"><Globe size={10} /> Live URL</label>
        <input type="url" className="input text-xs py-1.5" placeholder="https://example.com"
          value={form.live_url} onChange={e => setForm(f => ({...f, live_url: e.target.value}))} />
      </div>

      <div>
        <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase mb-1"><GitBranch size={10} /> Repository URL</label>
        <input type="url" className="input text-xs py-1.5" placeholder="https://github.com/…"
          value={form.repo_url} onChange={e => setForm(f => ({...f, repo_url: e.target.value}))} />
      </div>

      <div>
        <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase mb-1"><Circle size={10} /> Status</label>
        <select className="input text-xs py-1.5" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
          <option value="active">Active</option>
          <option value="on-hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div>
        <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase mb-1"><FileText size={10} /> Notes</label>
        <textarea className="input text-xs py-1.5 resize-none" rows={2} placeholder="Any extra notes…"
          value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
      </div>

      <button onClick={() => onSave(form)}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
        <Check size={13} /> Save Details
      </button>
    </div>
  )
}