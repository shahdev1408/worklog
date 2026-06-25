'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase, type Company, type Project, type SubProject, type WorkLog } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { Printer, Download, FileText, Filter, X } from 'lucide-react'

export default function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [subProjects, setSubProjects] = useState<SubProject[]>([])
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  // Filters
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
          .order('date', { ascending: false }),
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

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map<string, WorkLog[]>()
    for (const log of filteredLogs) {
      const key = log.project_id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(log)
    }
    return map
  }, [filteredLogs])

  const selectedCompany = companies.find(c => c.id === companyId)

  function handlePrint() {
    window.print()
  }

  async function handleDownloadPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Work Update Report', 15, 20)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Client: ${selectedCompany?.name || 'All Clients'}`, 15, 30)
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}`, 15, 37)
    if (dateFrom || dateTo) {
      doc.text(`Period: ${dateFrom || 'Start'} to ${dateTo || 'Present'}`, 15, 44)
    }

    let y = 55

    grouped.forEach((pLogs, projId) => {
      const proj = projects.find(p => p.id === projId)
      if (!proj) return

      // Project heading
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(proj.name, 15, y)
      y += 2

      const rows = pLogs.map(l => [
        l.date,
        (l as any).sub_projects?.name || '—',
        l.manager || '—',
        l.description,
      ])

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Sub-project', 'Manager', 'Description']],
        body: rows,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 'auto' },
        },
        margin: { left: 15, right: 15 },
      })

      y = (doc as any).lastAutoTable.finalY + 10
    })

    doc.save(`WorkLog-${selectedCompany?.name || 'Report'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `WorkLog-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Controls */}
      <div className="no-print">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Client Reports</h2>
            <p className="text-slate-500 text-sm mt-0.5">Filter your logs and export a clean report.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadCSV} disabled={filteredLogs.length === 0}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed">
              <Download size={16} /> CSV
            </button>
            <button onClick={handleDownloadPDF} disabled={filteredLogs.length === 0}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed">
              <FileText size={16} /> PDF
            </button>
            <button onClick={handlePrint} disabled={filteredLogs.length === 0}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <Filter size={12} /> Filters
            {(companyId || projectId || dateFrom || dateTo) && (
              <button onClick={() => { setCompanyId(''); setProjectId(''); setDateFrom(''); setDateTo('') }}
                className="ml-auto text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 normal-case font-normal">
                <X size={12} /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Company</label>
              <select className="input text-xs py-2" value={companyId}
                onChange={e => { setCompanyId(e.target.value); setProjectId('') }}>
                <option value="">All companies</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Project</label>
              <select className="input text-xs py-2" value={projectId}
                onChange={e => setProjectId(e.target.value)} disabled={!companyId}>
                <option value="">All projects</option>
                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">From date</label>
              <input type="date" className="input text-xs py-2" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">To date</label>
              <input type="date" className="input text-xs py-2" value={dateTo}
                onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Showing <strong className="text-slate-600">{filteredLogs.length}</strong> updates
        </p>
      </div>

      {/* Report — also printed */}
      {filteredLogs.length === 0 ? (
        <div className="card p-12 text-center no-print">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm font-medium">No updates match your filters</p>
          <p className="text-slate-400 text-xs mt-1">Try adjusting the date range or company selection</p>
        </div>
      ) : (
        <div ref={printRef} className="card p-8 print:shadow-none print:border-none print:p-0">
          {/* Print header */}
          <div className="mb-8 pb-5 border-b-2 border-slate-900">
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Work Update Report</h1>
            <div className="flex justify-between items-end">
              <div className="space-y-0.5">
                {selectedCompany && (
                  <p className="text-base font-semibold text-slate-700">Client: {selectedCompany.name}</p>
                )}
                <p className="text-sm text-slate-500">Generated on {format(new Date(), 'dd MMMM yyyy')}</p>
                {(dateFrom || dateTo) && (
                  <p className="text-sm text-slate-500">Period: {dateFrom ? format(parseISO(dateFrom), 'dd MMM yyyy') : 'Beginning'} — {dateTo ? format(parseISO(dateTo), 'dd MMM yyyy') : 'Present'}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{filteredLogs.length}</p>
                <p className="text-xs text-slate-500">total updates</p>
              </div>
            </div>
          </div>

          {/* Grouped by project */}
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([projId, pLogs]) => {
              const proj = projects.find(p => p.id === projId)
              return (
                <div key={projId} className="break-inside-avoid">
                  <h3 className="text-base font-bold text-slate-800 bg-slate-100 print:bg-slate-100 px-3 py-2 rounded mb-3">
                    {proj?.name || 'Unknown Project'}
                    <span className="ml-2 text-xs font-normal text-slate-500">({pLogs.length} update{pLogs.length !== 1 ? 's' : ''})</span>
                  </h3>
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="pb-2 pr-4 font-semibold text-slate-600 text-xs uppercase tracking-wide w-24">Date</th>
                        <th className="pb-2 pr-4 font-semibold text-slate-600 text-xs uppercase tracking-wide w-32">Sub-project</th>
                        <th className="pb-2 pr-4 font-semibold text-slate-600 text-xs uppercase tracking-wide w-28">Manager</th>
                        <th className="pb-2 font-semibold text-slate-600 text-xs uppercase tracking-wide">Work done</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pLogs.map(log => (
                        <tr key={log.id} className="border-b border-slate-100 align-top">
                          <td className="py-3 pr-4 text-slate-700 font-medium whitespace-nowrap">
                            {format(parseISO(log.date), 'dd MMM yy')}
                          </td>
                          <td className="py-3 pr-4 text-slate-600 text-xs">
                            {(log as any).sub_projects?.name || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-3 pr-4 text-slate-600 text-xs">
                            {log.manager || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-3 text-slate-800 whitespace-pre-wrap leading-relaxed">{log.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>

          <div className="hidden print:block mt-16 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            End of Report — Generated by WorkLog
          </div>
        </div>
      )}
    </div>
  )
}
