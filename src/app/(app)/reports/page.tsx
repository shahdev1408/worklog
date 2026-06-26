'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase, type Company, type Project, type SubProject, type WorkLog } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { Printer, Download, FileText, Filter, X, LayoutList, Calendar, Briefcase } from 'lucide-react'

type ViewMode = 'project' | 'date' | 'company'

export default function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [subProjects, setSubProjects] = useState<SubProject[]>([])
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('project')

  const [companyId, setCompanyId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    async function init() {
      const [c, p, sp, l] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('projects').select('*').order('name'),
        supabase.from('sub_projects').select('*').order('name'),
        supabase.from('work_logs')
          .select('*, companies(name), projects(name), sub_projects(name)')
          .order('date', { ascending: true }),
      ])
      if (c.data) setCompanies(c.data)
      if (p.data) setProjects(p.data)
      if (sp.data) setSubProjects(sp.data)
      if (l.data) setLogs(l.data)
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

  const filteredProjects = projects.filter(p => !companyId || p.company_id === companyId)
  const selectedCompany = companies.find(c => c.id === companyId)

  // Group by project
  const byProject = useMemo(() => {
    const map = new Map<string, WorkLog[]>()
    for (const log of filteredLogs) {
      if (!map.has(log.project_id)) map.set(log.project_id, [])
      map.get(log.project_id)!.push(log)
    }
    return map
  }, [filteredLogs])

  // Group by date
  const byDate = useMemo(() => {
    const map = new Map<string, WorkLog[]>()
    for (const log of filteredLogs) {
      if (!map.has(log.date)) map.set(log.date, [])
      map.get(log.date)!.push(log)
    }
    return map
  }, [filteredLogs])

  // Group by company
  const byCompany = useMemo(() => {
    const map = new Map<string, WorkLog[]>()
    for (const log of filteredLogs) {
      if (!map.has(log.company_id)) map.set(log.company_id, [])
      map.get(log.company_id)!.push(log)
    }
    return map
  }, [filteredLogs])

  // Table columns shared
  const LogRow = ({ log }: { log: WorkLog }) => (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-2.5 pr-3 text-slate-700 font-medium whitespace-nowrap text-xs">
        {format(parseISO(log.date), 'dd MMM yy')}
      </td>
      <td className="py-2.5 pr-3 text-xs">
        <span className="tag-company">{(log as any).companies?.name || '—'}</span>
      </td>
      <td className="py-2.5 pr-3 text-xs">
        <span className="tag-project">{(log as any).projects?.name || '—'}</span>
      </td>
      <td className="py-2.5 pr-3 text-slate-500 text-xs">
        {(log as any).sub_projects?.name || <span className="text-slate-300">—</span>}
      </td>
      <td className="py-2.5 pr-3 text-slate-500 text-xs">
        {log.manager || <span className="text-slate-300">—</span>}
      </td>
      <td className="py-2.5 text-slate-800 whitespace-pre-wrap leading-relaxed text-sm">{log.description}</td>
    </tr>
  )

  const TableHead = ({ hideCompany, hideProject }: { hideCompany?: boolean; hideProject?: boolean }) => (
    <thead>
      <tr className="border-b-2 border-slate-200">
        <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-20">Date</th>
        {!hideCompany && <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-24">Company</th>}
        {!hideProject && <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-28">Project</th>}
        <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-24">Sub-project</th>
        <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-24">Manager</th>
        <th className="pb-2 font-semibold text-slate-500 text-xs uppercase tracking-wide">Work Done</th>
      </tr>
    </thead>
  )

  async function handleDownloadPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('Work Update Report', 15, 18)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Client: ${selectedCompany?.name || 'All Clients'}`, 15, 26)
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}  |  View: ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}-wise`, 15, 32)
    if (dateFrom || dateTo) doc.text(`Period: ${dateFrom || 'Start'} to ${dateTo || 'Present'}`, 15, 38)

    let y = 48

    if (viewMode === 'project') {
      byProject.forEach((pLogs, projId) => {
        const proj = projects.find(p => p.id === projId)
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text(proj?.name || 'Unknown', 15, y); y += 3
        autoTable(doc, {
          startY: y,
          head: [['Date', 'Company', 'Sub-project', 'Manager', 'Work Done']],
          body: pLogs.map(l => [
            format(parseISO(l.date), 'dd MMM yy'),
            (l as any).companies?.name || '—',
            (l as any).sub_projects?.name || '—',
            l.manager || '—',
            l.description,
          ]),
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255 },
          columnStyles: { 0:{cellWidth:22}, 1:{cellWidth:25}, 2:{cellWidth:28}, 3:{cellWidth:25}, 4:{cellWidth:'auto'} },
          margin: { left: 15, right: 15 },
        })
        y = (doc as any).lastAutoTable.finalY + 10
      })
    } else if (viewMode === 'date') {
      byDate.forEach((dLogs, date) => {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text(format(parseISO(date), 'dd MMMM yyyy'), 15, y); y += 3
        autoTable(doc, {
          startY: y,
          head: [['Company', 'Project', 'Sub-project', 'Manager', 'Work Done']],
          body: dLogs.map(l => [
            (l as any).companies?.name || '—',
            (l as any).projects?.name || '—',
            (l as any).sub_projects?.name || '—',
            l.manager || '—',
            l.description,
          ]),
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [5, 150, 105], textColor: 255 },
          columnStyles: { 0:{cellWidth:25}, 1:{cellWidth:28}, 2:{cellWidth:28}, 3:{cellWidth:25}, 4:{cellWidth:'auto'} },
          margin: { left: 15, right: 15 },
        })
        y = (doc as any).lastAutoTable.finalY + 10
      })
    } else {
      byCompany.forEach((cLogs, cId) => {
        const comp = companies.find(c => c.id === cId)
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text(comp?.name || 'Unknown', 15, y); y += 3
        autoTable(doc, {
          startY: y,
          head: [['Date', 'Project', 'Sub-project', 'Manager', 'Work Done']],
          body: cLogs.map(l => [
            format(parseISO(l.date), 'dd MMM yy'),
            (l as any).projects?.name || '—',
            (l as any).sub_projects?.name || '—',
            l.manager || '—',
            l.description,
          ]),
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [217, 119, 6], textColor: 255 },
          columnStyles: { 0:{cellWidth:22}, 1:{cellWidth:28}, 2:{cellWidth:28}, 3:{cellWidth:25}, 4:{cellWidth:'auto'} },
          margin: { left: 15, right: 15 },
        })
        y = (doc as any).lastAutoTable.finalY + 10
      })
    }

    doc.save(`WorkLog-${selectedCompany?.name || 'Report'}-${viewMode}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  function handleDownloadCSV() {
    const headers = ['Date', 'Company', 'Project', 'Sub-project', 'Manager', 'Description']
    const rows = filteredLogs.map(l => [
      l.date,
      (l as any).companies?.name || '',
      (l as any).projects?.name || '',
      (l as any).sub_projects?.name || '',
      l.manager || '',
      `"${l.description.replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `WorkLog-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Top controls */}
      <div className="no-print">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Client Reports</h2>
            <p className="text-slate-500 text-sm mt-0.5">Filter, switch view, and export.</p>
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

        {/* Filters */}
        <div className="card p-4 mb-3">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <Filter size={12} /> Filters
            {(companyId || projectId || dateFrom || dateTo) && (
              <button onClick={() => { setCompanyId(''); setProjectId(''); setDateFrom(''); setDateTo('') }}
                className="ml-auto text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 normal-case font-normal">
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

        {/* View mode toggle */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-500 font-medium">Group by:</span>
          {([
            { id: 'project', icon: LayoutList, label: 'Project' },
            { id: 'date',    icon: Calendar,   label: 'Date' },
            { id: 'company', icon: Briefcase,  label: 'Company' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setViewMode(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                viewMode === id
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600'
              }`}>
              <Icon size={13} /> {label}-wise
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">
            <strong className="text-slate-600">{filteredLogs.length}</strong> updates
          </span>
        </div>
      </div>

      {/* Report */}
      {filteredLogs.length === 0 ? (
        <div className="card p-12 text-center no-print">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm font-medium">No updates match your filters</p>
        </div>
      ) : (
        <div className="card p-8 print:shadow-none print:border-none print:p-0">
          {/* Report header */}
          <div className="mb-8 pb-5 border-b-2 border-slate-900">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Work Update Report</h1>
            <div className="flex justify-between items-end">
              <div className="space-y-0.5">
                {selectedCompany && <p className="text-base font-semibold text-slate-700">Client: {selectedCompany.name}</p>}
                <p className="text-sm text-slate-500">Generated on {format(new Date(), 'dd MMMM yyyy')}</p>
                <p className="text-xs text-slate-400 capitalize">View: {viewMode}-wise</p>
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

          {/* ---- PROJECT-WISE ---- */}
          {viewMode === 'project' && (
            <div className="space-y-8">
              {Array.from(byProject.entries()).map(([projId, pLogs]) => {
                const proj = projects.find(p => p.id === projId)
                return (
                  <div key={projId} className="break-inside-avoid">
                    <h3 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-2 rounded mb-3 flex items-center gap-2">
                      <LayoutList size={14} className="text-brand-500" />
                      {proj?.name || 'Unknown'}
                      <span className="text-xs font-normal text-slate-500 ml-1">({pLogs.length} update{pLogs.length !== 1 ? 's' : ''})</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <TableHead />
                        <tbody>
                          {pLogs.map(log => <LogRow key={log.id} log={log} />)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ---- DATE-WISE ---- */}
          {viewMode === 'date' && (
            <div className="space-y-8">
              {Array.from(byDate.entries()).map(([date, dLogs]) => (
                <div key={date} className="break-inside-avoid">
                  <h3 className="text-sm font-bold text-slate-800 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded mb-3 flex items-center gap-2">
                    <Calendar size={14} className="text-emerald-600" />
                    {format(parseISO(date), 'EEEE, dd MMMM yyyy')}
                    <span className="text-xs font-normal text-slate-500 ml-1">({dLogs.length} entr{dLogs.length !== 1 ? 'ies' : 'y'})</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-24">Company</th>
                          <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-28">Project</th>
                          <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-24">Sub-project</th>
                          <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-24">Manager</th>
                          <th className="pb-2 font-semibold text-slate-500 text-xs uppercase tracking-wide">Work Done</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dLogs.map(log => (
                          <tr key={log.id} className="border-b border-slate-100 align-top">
                            <td className="py-2.5 pr-3 text-xs">
                              <span className="tag-company">{(log as any).companies?.name || '—'}</span>
                            </td>
                            <td className="py-2.5 pr-3 text-xs">
                              <span className="tag-project">{(log as any).projects?.name || '—'}</span>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-500 text-xs">{(log as any).sub_projects?.name || <span className="text-slate-300">—</span>}</td>
                            <td className="py-2.5 pr-3 text-slate-500 text-xs">{log.manager || <span className="text-slate-300">—</span>}</td>
                            <td className="py-2.5 text-slate-800 whitespace-pre-wrap leading-relaxed text-sm">{log.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ---- COMPANY-WISE ---- */}
          {viewMode === 'company' && (
            <div className="space-y-8">
              {Array.from(byCompany.entries()).map(([cId, cLogs]) => {
                const comp = companies.find(c => c.id === cId)
                return (
                  <div key={cId} className="break-inside-avoid">
                    <h3 className="text-sm font-bold text-white bg-amber-600 px-3 py-2 rounded mb-3 flex items-center gap-2">
                      <Briefcase size={14} />
                      {comp?.name || 'Unknown'}
                      <span className="text-xs font-normal opacity-80 ml-1">({cLogs.length} update{cLogs.length !== 1 ? 's' : ''})</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-200">
                            <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-20">Date</th>
                            <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-28">Project</th>
                            <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-24">Sub-project</th>
                            <th className="pb-2 pr-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-24">Manager</th>
                            <th className="pb-2 font-semibold text-slate-500 text-xs uppercase tracking-wide">Work Done</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cLogs.map(log => (
                            <tr key={log.id} className="border-b border-slate-100 align-top">
                              <td className="py-2.5 pr-3 text-slate-700 font-medium whitespace-nowrap text-xs">{format(parseISO(log.date), 'dd MMM yy')}</td>
                              <td className="py-2.5 pr-3 text-xs"><span className="tag-project">{(log as any).projects?.name || '—'}</span></td>
                              <td className="py-2.5 pr-3 text-slate-500 text-xs">{(log as any).sub_projects?.name || <span className="text-slate-300">—</span>}</td>
                              <td className="py-2.5 pr-3 text-slate-500 text-xs">{log.manager || <span className="text-slate-300">—</span>}</td>
                              <td className="py-2.5 text-slate-800 whitespace-pre-wrap leading-relaxed text-sm">{log.description}</td>
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

          <div className="hidden print:block mt-16 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            End of Report — Generated by WorkLog
          </div>
        </div>
      )}
    </div>
  )
}