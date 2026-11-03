import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal, ArrowDown, ArrowUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../services/api'
import { useDatasets } from '../hooks/useDatasets'
import { EmptyState, ErrorBanner, Loading, PageTitle } from '../components/UI'
import { formatNumber } from '../utils/format'

const PAGE_SIZE = 25

export default function Explorer() {
  const { selectedId, selectedDataset } = useDatasets()
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [sortBy, setSortBy] = useState('')
  const [descending, setDescending] = useState(false)
  const [response, setResponse] = useState(null)

  useEffect(() => { const timer = setTimeout(() => { setSearch(query); setOffset(0) }, 250); return () => clearTimeout(timer) }, [query])
  const requestKey = JSON.stringify([selectedId, offset, search, sortBy, descending])
  useEffect(() => {
    if (!selectedId) return
    let active = true
    Promise.all([
      api.get(`/datasets/${selectedId}/preview`, { params: { offset, limit: PAGE_SIZE, search, sort_by: sortBy || undefined, descending } }),
      api.get(`/datasets/${selectedId}`),
    ]).then(([table, details]) => {
      if (!active) return
      setResponse({ key: requestKey, preview: table.data, summary: details.data.summary })
    }).catch((requestError) => { if (active) setResponse({ key: requestKey, error: errorMessage(requestError) }) })
    return () => { active = false }
  }, [selectedId, offset, search, sortBy, descending, requestKey])

  const currentResponse = response?.key === requestKey ? response : null
  const preview = currentResponse?.preview || null
  const summary = currentResponse?.summary || null
  const error = currentResponse?.error || ''
  const loading = Boolean(selectedId && !currentResponse)
  function sort(column) {
    if (sortBy === column) setDescending(!descending)
    else { setSortBy(column); setDescending(false) }
    setOffset(0)
  }
  const totalPages = preview ? Math.max(1, Math.ceil(preview.total / PAGE_SIZE)) : 1

  return <div className="page-enter">
    <PageTitle eyebrow="Explore your data" title="Data explorer" description="Search and sort real dataset values with bounded server-side pagination." actions={selectedId && <Link to="/cleaning" className="btn-secondary"><SlidersHorizontal size={14} /> Clean data</Link>} />
    {!selectedId ? <EmptyState action={<Link className="btn-primary" to="/upload">Upload a dataset</Link>} /> : <>
      <ErrorBanner message={error} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[['Rows', summary ? formatNumber(summary.row_count) : '—'], ['Columns', summary ? formatNumber(summary.column_count) : '—'], ['Missing values', summary ? formatNumber(summary.missing_cells) : '—']].map(([label, value]) => <div key={label} className="card flex items-center justify-between px-4 py-3"><span className="text-xs text-slate-400">{label}</span><span className="font-display text-sm font-bold">{value}</span></div>)}
      </div>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222c40] p-4">
          <div className="flex items-center gap-2"><h2 className="text-sm font-bold">{selectedDataset?.name}</h2><span className="rounded-full border border-[#2a3448] px-2 py-1 text-[10px] text-slate-400">{preview ? formatNumber(preview.total) : '—'} matching rows</span></div>
          <label className="relative w-full sm:max-w-[260px]"><Search size={14} className="absolute left-3 top-3 text-slate-500" /><input className="field py-2 pl-9 text-xs" placeholder="Search values…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search data rows" /></label>
        </div>
        {loading && !preview ? <Loading label="Loading data preview…" /> : !preview ? <div className="p-8 text-center text-xs text-slate-500">The preview could not be loaded.</div> : <div className="table-wrap max-h-[60vh]">
          <table><thead className="sticky top-0 z-[1] bg-[#101522]"><tr>{preview?.columns.map((column) => {
            const details = summary?.columns.find((item) => item.name === column)
            return <th key={column}><button className="flex items-center gap-1.5 text-left hover:text-slate-200" onClick={() => sort(column)} title={`Sort by ${column}`}>{column}{sortBy === column ? descending ? <ArrowDown size={12} /> : <ArrowUp size={12} /> : <ChevronDown size={11} className="opacity-40" />}</button><span className="mt-1 block text-[9px] font-normal normal-case tracking-normal text-slate-600">{details?.dtype || 'column'} {details?.missing ? `· ${formatNumber(details.missing)} missing` : ''}</span></th>
          })}</tr></thead><tbody>
            {preview?.rows.map((row, index) => <tr key={`${offset + index}-${index}`} className="hover:bg-white/[.02]">{preview.columns.map((column) => <td key={column} title={row[column] == null ? 'Missing value' : String(row[column])}><span className={row[column] == null ? 'text-amber-400/70' : ''}>{row[column] == null ? '∅ Missing' : String(row[column])}</span></td>)}</tr>)}
            {preview && preview.rows.length === 0 && <tr><td colSpan={preview.columns.length || 1} className="py-12 text-center text-slate-500">{search ? 'No values match your search.' : 'This dataset has no rows.'}</td></tr>}
          </tbody></table>
          {loading && preview && <div className="border-t border-[#222c40] px-4 py-2 text-center text-[11px] text-slate-500">Updating results…</div>}
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#222c40] px-4 py-3">
          <span className="text-[11px] text-slate-500">Showing {preview?.rows.length ? formatNumber(offset + 1) : '0'}–{formatNumber(offset + (preview?.rows.length || 0))} of {formatNumber(preview?.total)}</span>
          <div className="flex items-center gap-2"><button aria-label="Previous page" className="btn-secondary !p-2 disabled:opacity-40" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}><ChevronLeft size={14} /></button><span className="text-[11px] text-slate-400">Page {Math.floor(offset / PAGE_SIZE) + 1} of {totalPages}</span><button aria-label="Next page" className="btn-secondary !p-2 disabled:opacity-40" disabled={!preview || offset + PAGE_SIZE >= preview.total || loading} onClick={() => setOffset(offset + PAGE_SIZE)}><ChevronRight size={14} /></button></div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-600">Up to {PAGE_SIZE} rows are requested at a time. Sorting and searching are computed by the API.</p>
    </>}
  </div>
}
