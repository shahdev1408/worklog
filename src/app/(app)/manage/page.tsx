'use client'
import { useEffect, useState } from 'react'
import { supabase, type Company, type Project, type SubProject } from '@/lib/supabase'
import { Plus, Pencil, Trash2, Check, X, Briefcase, FolderOpen, Layers } from 'lucide-react'

export default function ManagePage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
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
        <p className="text-slate-500 text-sm mt-0.5">Add and edit your companies, projects, and sub-projects.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <EntityList
          title="Companies" icon={Briefcase}
          items={companies}
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
            setProjects(prev => prev.filter(p => p.company_id !== id))
          }}
          placeholder="New company name…"
        />

        <EntityList
          title="Projects" icon={FolderOpen}
          items={projects}
          parentLabel="Company"
          parentItems={companies}
          parentIdKey="company_id"
          onAdd={async (name, parentId) => {
            const { data } = await supabase.from('projects').insert({ name, company_id: parentId }).select().single()
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
          placeholder="New project name…"
        />

        <EntityList
          title="Sub-projects" icon={Layers}
          items={subProjects}
          parentLabel="Project"
          parentItems={projects}
          parentIdKey="project_id"
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
          placeholder="New sub-project name…"
        />
      </div>
    </div>
  )
}

function EntityList({
  title, icon: Icon, items, parentLabel, parentItems, parentIdKey,
  onAdd, onEdit, onDelete, placeholder
}: {
  title: string
  icon: any
  items: any[]
  parentLabel?: string
  parentItems?: any[]
  parentIdKey?: string
  onAdd: (name: string, parentId?: string) => void
  onEdit: (id: string, name: string) => void
  onDelete: (id: string) => void
  placeholder: string
}) {
  const [newName, setNewName] = useState('')
  const [parentId, setParentId] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
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
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Icon size={16} className="text-slate-400" />
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{items.length}</span>
      </div>

      {/* Add row */}
      <div className="space-y-2">
        {parentLabel && parentItems && (
          <select className="input text-xs py-2"
            value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">Select {parentLabel}…</option>
            {parentItems.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <div className="flex gap-2">
          <input
            type="text" className="input text-xs py-2 flex-1"
            placeholder={placeholder}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} disabled={adding}
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-3 flex-shrink-0 transition-colors disabled:opacity-60">
            {adding ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {items.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Nothing yet. Add one above.</p>
        )}
        {items.map(item => (
          <div key={item.id}
            className="group flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            {editId === item.id ? (
              <div className="flex-1 flex gap-1.5 items-center">
                <input autoFocus type="text" value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { onEdit(item.id, editVal); setEditId(null) }
                    if (e.key === 'Escape') setEditId(null)
                  }}
                  className="input text-xs py-1.5 flex-1" />
                <button onClick={() => { onEdit(item.id, editVal); setEditId(null) }}
                  className="text-emerald-600 hover:text-emerald-700 p-1"><Check size={14} /></button>
                <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={14} /></button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{item.name}</p>
                  {parentIdKey && parentItems && (
                    <p className="text-[10px] text-slate-400 truncate">
                      in {parentItems.find((p: any) => p.id === item[parentIdKey])?.name || '—'}
                    </p>
                  )}
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditId(item.id); setEditVal(item.name) }}
                    className="btn-ghost p-1 hover:text-brand-600"><Pencil size={13} /></button>
                  <button onClick={() => onDelete(item.id)}
                    className="btn-ghost p-1 hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
