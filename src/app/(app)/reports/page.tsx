'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase, type Company, type Project, type WorkLog } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { Printer, Download, FileText, Filter, X, LayoutList, Calendar, Briefcase, Globe, GitBranch, Cpu } from 'lucide-react'

type ViewMode = 'project' | 'date' | 'company'

// ── Shown ONCE at the top of the report — all projects involved ─────────────
function ProjectsSummaryCard({ projectIds, projects }: { projectIds: string[]; projects: Project[] }) {
  const involved = projectIds.map(id => projects.find(p => p.id === id)).filter(Boolean) as Project[]
  const withDetails = involved.filter(p => p.tech_stack || p.live_url || p.repo_url || p.notes)
  if (withDetails.length === 0) return null

  return (
    <div className="mb-8 p-4 border border-slate-200 rounded-xl bg-slate-50 print:bg-white print:border-slate-300">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Projects Overview</p>
      <div className="space-y-3">
        {withDetails.map(proj => (
          <div key={proj.id} className="flex flex-wrap gap-x-5 gap-y-1 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
            <span className="text-sm font-semibold text-slate-800 w-full">{proj.name}</span>
            {proj.tech_stack && (
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <Cpu size={11} className="text-brand-500" />
                <strong className="text-slate-500 font-medium">Stack:</strong> {proj.tech_stack}
              </span>
            )}
            {proj.live_url && (
              <span className="flex items-center gap-1 text-xs">
                <Globe size={11} className="text-emerald-500" />
                <a href={proj.live_url} target="_blank" rel="noreferrer"
                  className="text-brand-600 hover:underline print:text-slate-700">{proj.live_url}</a>
              </span>
            )}
            {proj.repo_url && (
              <span className="flex items-center gap-1 text-xs">
                <GitBranch size={11} className="text-slate-400" />
                <a href={proj.repo_url} target="_blank" rel="noreferrer"
                  className="text-brand-600 hover:underline print:text-slate-700">{proj.repo_url}</a>
              </span>
            )}
            {proj.notes && (
              <span className="text-xs text-slate-500 w-full italic">{proj.notes}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Project section header with details shown once ──────────────────────────
function ProjectSectionHeader({ proj }: { proj: Project | undefined }) {
  if (!proj) return null
  const hasDetails = proj.tech_stack || proj.live_url || proj.repo_url || proj.notes
  return (
    <>
      <h3 className="text-sm font-bold text-white bg-brand-600 px-3 py-2 rounded-t flex items-center gap-2">
        <LayoutList size={14} /> {proj.name}
        {proj.status && proj.status !== 'active' && (
          <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded capitalize">{proj.status}</span>
        )}
      </h3>
      {hasDetails && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 px-3 py-2 bg-brand-50 border-x border-brand-100 text-xs mb-0">
          {proj.tech_stack && (
            <span className="flex items-center gap-1 text-slate-600">
              <Cpu size={10} className="text-brand-500" />
              <strong className="font-medium text-slate-500">Stack:</strong> {proj.tech_stack}
            </span>
          )}
          {proj.live_url && (
            <span className="flex items-center gap-1">
              <Globe size={10} className="text-emerald-500" />
              <a href={proj.live_url} target="_blank" rel="noreferrer"
                className="text-brand-600 hover:underline print:text-slate-700">{proj.live_url}</a>
            </span>
          )}
          {proj.repo_url && (
            <span className="flex items-center gap-1">
              <GitBranch size={10} className="text-slate-400" />
              <a href={proj.repo_url} target="_blank" rel="noreferrer"
                className="text-brand-600 hover:underline print:text-slate-700">{proj.repo_url}</a>
            </span>
          )}
          {proj.notes && (
            <span className="text-slate-400 italic w-full">{proj.notes}</span>
          )}
        </div>
      )}
    </>
  )
}

export default function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('date')
  const [companyId, setCompanyId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    async function fetchAllLogs() {
      let all: WorkLog[] = []
      let from = 0
      while (true) {
        const { data } = await supabase
          .from('work_logs')
          .select('*, companies(name), projects(name, tech_stack, live_url, repo_url, notes, status), sub_projects(name)')
          .order('date', { ascending: true })
          .range(from, from + 999)
        if (!data || data.length === 0) break
        all = [...all, ...data]
        if (data.length < 1000) break
        from += 1000
      }
      return all
    }
    async function init() {
      const [c, p, allLogs] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('projects').select('*').order('name'),
        fetchAllLogs(),
      ])
      if (c.data) setCompanies(c.data)
      if (p.data) setProjects(p.data)
      setLogs(allLogs)
      setLoading(false)
    }
    init()
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (companyId && l.company_id !== companyId) return false
      if (projectId && l.project_id !== projectId) return false
      if (dateFrom && l.date < dateFrom) return false
      if (dateTo && l.date > dateTo) return false
      return true
    }).sort((a, b) => a.date.localeCompare(b.date))
  }, [logs, companyId, projectId, dateFrom, dateTo])

  // Unique project IDs in filtered logs
  const involvedProjectIds = useMemo(() =>
    [...new Set(filteredLogs.map(l => l.project_id))], [filteredLogs])

  const filteredProjects = projects.filter(p => !companyId || p.company_id === companyId)
  const selectedCompany = companies.find(c => c.id === companyId)

  const byProject = useMemo(() => {
    const map = new Map<string, WorkLog[]>()
    for (const log of filteredLogs) {
      if (!map.has(log.project_id)) map.set(log.project_id, [])
      map.get(log.project_id)!.push(log)
    }
    return map
  }, [filteredLogs])

  const byDate = useMemo(() => {
    const map = new Map<string, WorkLog[]>()
    for (const log of filteredLogs) {
      if (!map.has(log.date)) map.set(log.date, [])
      map.get(log.date)!.push(log)
    }
    return map
  }, [filteredLogs])

  const byCompany = useMemo(() => {
    const map = new Map<string, WorkLog[]>()
    for (const log of filteredLogs) {
      if (!map.has(log.company_id)) map.set(log.company_id, [])
      map.get(log.company_id)!.push(log)
    }
    return map
  }, [filteredLogs])

  async function handleDownloadPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()

    // Header banner
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, pageW, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20); doc.setFont('helvetica', 'bold')
    doc.text('Work Update Report', 15, 13)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`${selectedCompany?.name || 'All Clients'}  ·  ${format(new Date(), 'dd MMM yyyy')}  ·  ${viewMode}-wise  ·  ${filteredLogs.length} entries`, 15, 22)
    if (dateFrom || dateTo) doc.text(`${dateFrom || 'Start'} → ${dateTo || 'Present'}`, pageW - 15, 22, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    let y = 36

    // Projects overview section (only if any have details)
    const projectsWithDetails = involvedProjectIds
      .map(id => projects.find(p => p.id === id))
      .filter(p => p && (p.tech_stack || p.live_url || p.repo_url || p.notes)) as Project[]

    if (projectsWithDetails.length > 0) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 120)
      doc.text('PROJECTS OVERVIEW', 15, y); y += 4
      doc.setTextColor(0, 0, 0)
      for (const proj of projectsWithDetails) {
        if (y > 185) { doc.addPage(); y = 15 }
        doc.setFontSize(9); doc.setFont('helvetica', 'bold')
        doc.text(proj.name, 15, y); y += 4
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 100)
        const parts = []
        if (proj.tech_stack) parts.push(`Stack: ${proj.tech_stack}`)
        if (proj.live_url) parts.push(`Live: ${proj.live_url}`)
        if (proj.repo_url) parts.push(`Repo: ${proj.repo_url}`)
        if (proj.notes) parts.push(proj.notes)
        doc.text(parts.join('   ·   '), 18, y, { maxWidth: pageW - 33 }); y += 6
        doc.setTextColor(0, 0, 0)
      }
      y += 4
      doc.setDrawColor(200, 200, 200); doc.line(15, y, pageW - 15, y); y += 6
    }

    const ensurePage = () => { if (y > 185) { doc.addPage(); y = 15 } }

    if (viewMode === 'project') {
      for (const [projId, pLogs] of byProject.entries()) {
        const proj = projects.find(p => p.id === projId)
        ensurePage()
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(79, 70, 229)
        doc.text(`▸ ${proj?.name || 'Unknown'}`, 15, y); y += 6
        doc.setTextColor(0, 0, 0)
        autoTable(doc, {
          startY: y,
          head: [['Date', 'Company', 'Sub-project', 'Manager', 'Work Done']],
          body: pLogs.map(l => [format(parseISO(l.date), 'dd MMM yy'), (l as any).companies?.name || '—', (l as any).sub_projects?.name || '—', l.manager || '—', l.description]),
          styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [79, 70, 229], textColor: 255 },
          alternateRowStyles: { fillColor: [248, 248, 255] },
          columnStyles: { 0:{cellWidth:22}, 1:{cellWidth:25}, 2:{cellWidth:28}, 3:{cellWidth:25}, 4:{cellWidth:'auto'} },
          margin: { left: 15, right: 15 },
        })
        y = (doc as any).lastAutoTable.finalY + 12
      }
    } else if (viewMode === 'date') {
      for (const [date, dLogs] of byDate.entries()) {
        ensurePage()
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(5, 150, 105)
        doc.text(format(parseISO(date), 'EEEE, dd MMMM yyyy'), 15, y); y += 6
        doc.setTextColor(0, 0, 0)
        autoTable(doc, {
          startY: y,
          head: [['Company', 'Project', 'Sub-project', 'Manager', 'Work Done']],
          body: dLogs.map(l => [(l as any).companies?.name || '—', (l as any).projects?.name || '—', (l as any).sub_projects?.name || '—', l.manager || '—', l.description]),
          styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [5, 150, 105], textColor: 255 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          columnStyles: { 0:{cellWidth:25}, 1:{cellWidth:28}, 2:{cellWidth:28}, 3:{cellWidth:25}, 4:{cellWidth:'auto'} },
          margin: { left: 15, right: 15 },
        })
        y = (doc as any).lastAutoTable.finalY + 12
      }
    } else {
      for (const [cId, cLogs] of byCompany.entries()) {
        const comp = companies.find(c => c.id === cId)
        ensurePage()
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 83, 9)
        doc.text(`▸ ${comp?.name || 'Unknown'}`, 15, y); y += 6
        doc.setTextColor(0, 0, 0)
        autoTable(doc, {
          startY: y,
          head: [['Date', 'Project', 'Sub-project', 'Manager', 'Work Done']],
          body: cLogs.map(l => [format(parseISO(l.date), 'dd MMM yy'), (l as any).projects?.name || '—', (l as any).sub_projects?.name || '—', l.manager || '—', l.description]),
          styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [217, 119, 6], textColor: 255 },
          alternateRowStyles: { fillColor: [255, 251, 235] },
          columnStyles: { 0:{cellWidth:22}, 1:{cellWidth:28}, 2:{cellWidth:28}, 3:{cellWidth:25}, 4:{cellWidth:'auto'} },
          margin: { left: 15, right: 15 },
        })
        y = (doc as any).lastAutoTable.finalY + 12
      }
    }

    // Page footers
    const total = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      doc.setPage(i)
      doc.setFontSize(7); doc.setTextColor(150, 150, 150)
      doc.text(`WorkLog  ·  ${selectedCompany?.name || 'All Clients'}  ·  ${format(new Date(), 'dd MMM yyyy')}`, 15, 205)
      doc.text(`Page ${i} of ${total}`, pageW - 15, 205, { align: 'right' })
    }

    doc.save(`${selectedCompany?.name || 'WorkLog'}-${viewMode}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  function handleDownloadCSV() {
    const rows = filteredLogs.map(l => [
      l.date, (l as any).companies?.name || '', (l as any).projects?.name || '',
      (l as any).projects?.tech_stack || '', (l as any).sub_projects?.name || '',
      l.manager || '', `"${l.description.replace(/"/g, '""')}"`,
    ])
    const csv = [['Date','Company','Project','Tech Stack','Sub-project','Manager','Description'].join(','), ...rows.map(r => r.join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `WorkLog-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">Loading all logs…</p>
    </div>
  )

  // Shared table components
  const TH = ({ children, w }: { children: React.ReactNode; w?: string }) => (
    <th className={`pb-2 pt-2 px-2 font-semibold text-slate-500 text-xs uppercase tracking-wide ${w || ''}`}>{children}</th>
  )
  const TD = ({ children, mono }: { children: React.ReactNode; mono?: boolean }) => (
    <td className={`py-2.5 px-2 align-top ${mono ? 'text-xs text-slate-600 whitespace-nowrap' : 'text-sm text-slate-800 whitespace-pre-wrap leading-relaxed'}`}>{children}</td>
  )

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Controls */}
      <div className="no-print">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Client Reports</h2>
            <p className="text-slate-500 text-sm mt-0.5">{logs.length} total logs loaded</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadCSV} disabled={filteredLogs.length === 0} className="btn-secondary disabled:opacity-40">
              <Download size={15} /> CSV
            </button>
            <button onClick={handleDownloadPDF} disabled={filteredLogs.length === 0} className="btn-secondary disabled:opacity-40">
              <FileText size={15} /> PDF
            </button>
            <button onClick={() => window.print()} disabled={filteredLogs.length === 0} className="btn-primary disabled:opacity-40">
              <Printer size={15} /> Print
            </button>
          </div>
        </div>

        <div className="card p-4 mb-3">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <Filter size={12} /> Filters
            {(companyId || projectId || dateFrom || dateTo) && (
              <button onClick={() => { setCompanyId(''); setProjectId(''); setDateFrom(''); setDateTo('') }}
                className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 normal-case font-normal">
                <X size={12} /> Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Company</label>
              <select className="input text-xs py-2" value={companyId} onChange={e => { setCompanyId(e.target.value); setProjectId('') }}>
                <option value="">All companies</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Project</label>
              <select className="input text-xs py-2" value={projectId} onChange={e => setProjectId(e.target.value)} disabled={!companyId}>
                <option value="">All projects</option>
                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">From date</label>
              <input type="date" className="input text-xs py-2" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">To date</label>
              <input type="date" className="input text-xs py-2" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">Group by:</span>
          {([
            { id: 'project', icon: LayoutList, label: 'Project' },
            { id: 'date',    icon: Calendar,   label: 'Date' },
            { id: 'company', icon: Briefcase,  label: 'Company' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setViewMode(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                viewMode === id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
              }`}>
              <Icon size={13} /> {label}-wise
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">
            Showing <strong className="text-slate-700">{filteredLogs.length}</strong> of {logs.length}
          </span>
        </div>
      </div>

      {/* Report body */}
      {filteredLogs.length === 0 ? (
        <div className="card p-12 text-center no-print">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No updates match your filters</p>
        </div>
      ) : (
        <div className="card p-8 print:shadow-none print:border-none print:p-0">
          {/* Report header */}
          <div className="mb-6 pb-5 border-b-2 border-slate-900">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Work Update Report</h1>
            <div className="flex justify-between items-end flex-wrap gap-2">
              <div className="space-y-0.5">
                {selectedCompany && <p className="text-base font-semibold text-slate-700">Client: {selectedCompany.name}</p>}
                <p className="text-sm text-slate-500">Generated on {format(new Date(), 'dd MMMM yyyy')}</p>
                {(dateFrom || dateTo) && (
                  <p className="text-sm text-slate-500">
                    Period: {dateFrom ? format(parseISO(dateFrom), 'dd MMM yyyy') : 'Beginning'} — {dateTo ? format(parseISO(dateTo), 'dd MMM yyyy') : 'Present'}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-900">{filteredLogs.length}</p>
                <p className="text-xs text-slate-500">total updates</p>
              </div>
            </div>
          </div>

          {/* ── PROJECTS OVERVIEW — shown ONCE at top for ALL view modes ── */}
          <ProjectsSummaryCard projectIds={involvedProjectIds} projects={projects} />

          {/* PROJECT-WISE */}
          {viewMode === 'project' && (
            <div className="space-y-10">
              {Array.from(byProject.entries()).map(([projId, pLogs]) => {
                const proj = projects.find(p => p.id === projId)
                return (
                  <div key={projId} className="break-inside-avoid">
                    <ProjectSectionHeader proj={proj} />
                    <div className="overflow-x-auto border border-t-0 border-slate-100 rounded-b">
                      <table className="w-full text-left border-collapse">
                        <thead><tr className="border-b-2 border-slate-200 bg-slate-50">
                          <TH w="w-20">Date</TH><TH w="w-24">Company</TH>
                          <TH w="w-24">Sub-project</TH><TH w="w-24">Manager</TH><TH>Work Done</TH>
                        </tr></thead>
                        <tbody>
                          {pLogs.map((log, i) => (
                            <tr key={log.id} className={`border-b border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50/50' : ''}`}>
                              <TD mono>{format(parseISO(log.date), 'dd MMM yy')}</TD>
                              <td className="py-2.5 px-2 align-top text-xs"><span className="tag-company">{(log as any).companies?.name || '—'}</span></td>
                              <TD mono>{(log as any).sub_projects?.name || '—'}</TD>
                              <TD mono>{log.manager || '—'}</TD>
                              <TD>{log.description}</TD>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* DATE-WISE — clean, no tech stack clutter per row */}
          {viewMode === 'date' && (
            <div className="space-y-8">
              {Array.from(byDate.entries()).map(([date, dLogs]) => (
                <div key={date} className="break-inside-avoid">
                  <h3 className="text-sm font-bold text-white bg-emerald-600 px-3 py-2 rounded-t flex items-center gap-2">
                    <Calendar size={14} />
                    {format(parseISO(date), 'EEEE, dd MMMM yyyy')}
                    <span className="text-xs font-normal opacity-75 ml-auto">{dLogs.length} entr{dLogs.length !== 1 ? 'ies' : 'y'}</span>
                  </h3>
                  <div className="overflow-x-auto border border-t-0 border-slate-100 rounded-b">
                    <table className="w-full text-left border-collapse">
                      <thead><tr className="border-b-2 border-slate-200 bg-slate-50">
                        <TH w="w-24">Company</TH><TH w="w-28">Project</TH>
                        <TH w="w-24">Sub-project</TH><TH w="w-24">Manager</TH><TH>Work Done</TH>
                      </tr></thead>
                      <tbody>
                        {dLogs.map((log, i) => (
                          <tr key={log.id} className={`border-b border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50/50' : ''}`}>
                            <td className="py-2.5 px-2 align-top text-xs"><span className="tag-company">{(log as any).companies?.name || '—'}</span></td>
                            <td className="py-2.5 px-2 align-top text-xs"><span className="tag-project">{(log as any).projects?.name || '—'}</span></td>
                            <TD mono>{(log as any).sub_projects?.name || '—'}</TD>
                            <TD mono>{log.manager || '—'}</TD>
                            <TD>{log.description}</TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COMPANY-WISE */}
          {viewMode === 'company' && (
            <div className="space-y-10">
              {Array.from(byCompany.entries()).map(([cId, cLogs]) => {
                const comp = companies.find(c => c.id === cId)
                const byProjInComp = new Map<string, WorkLog[]>()
                for (const log of cLogs) {
                  if (!byProjInComp.has(log.project_id)) byProjInComp.set(log.project_id, [])
                  byProjInComp.get(log.project_id)!.push(log)
                }
                return (
                  <div key={cId} className="break-inside-avoid">
                    <h3 className="text-sm font-bold text-white bg-amber-600 px-3 py-2 rounded-t flex items-center gap-2">
                      <Briefcase size={14} /> {comp?.name || 'Unknown'}
                      <span className="text-xs font-normal opacity-75 ml-auto">{cLogs.length} updates</span>
                    </h3>
                    <div className="border border-t-0 border-slate-100 rounded-b p-3 space-y-5">
                      {Array.from(byProjInComp.entries()).map(([projId, pLogs]) => {
                        const proj = projects.find(p => p.id === projId)
                        return (
                          <div key={projId}>
                            <p className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                              <LayoutList size={11} className="text-brand-400" /> {proj?.name}
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead><tr className="border-b-2 border-slate-200 bg-slate-50">
                                  <TH w="w-20">Date</TH><TH w="w-24">Sub-project</TH>
                                  <TH w="w-24">Manager</TH><TH>Work Done</TH>
                                </tr></thead>
                                <tbody>
                                  {pLogs.map((log, i) => (
                                    <tr key={log.id} className={`border-b border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50/50' : ''}`}>
                                      <TD mono>{format(parseISO(log.date), 'dd MMM yy')}</TD>
                                      <TD mono>{(log as any).sub_projects?.name || '—'}</TD>
                                      <TD mono>{log.manager || '—'}</TD>
                                      <TD>{log.description}</TD>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="hidden print:block mt-16 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            End of Report — WorkLog · {format(new Date(), 'dd MMM yyyy')}
          </div>
        </div>
      )}
    </div>
  )
}