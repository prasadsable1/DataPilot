import { useEffect, useState } from 'react'
import { ArrowDownToLine, BarChart3, Hash, Sigma } from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../services/api'
import { useDatasets } from '../hooks/useDatasets'
import { EmptyState, ErrorBanner, Loading, PageTitle } from '../components/UI'
import { formatNumber, useDownload } from '../utils/format'

export default function Analytics() {
  const { selectedId } = useDatasets()
  const [response, setResponse] = useState(null)
  const [downloadError, setDownloadError] = useState('')
  const download = useDownload(api, `/datasets/${selectedId}/summary/export`, 'datapilot-analytics-summary.json')

  useEffect(() => {
    if (!selectedId) return
    let active = true
    api.get(`/datasets/${selectedId}/statistics`)
      .then(({ data }) => { if (active) setResponse({ datasetId: selectedId, data }) })
      .catch((e) => { if (active) setResponse({ datasetId: selectedId, error: errorMessage(e) }) })
    return () => { active = false }
  }, [selectedId])

  const currentResponse = response?.datasetId === selectedId ? response : null
  const data = currentResponse?.data || null
  const error = currentResponse?.error || downloadError
  const loading = Boolean(selectedId && !currentResponse)

  async function exportSummary() {
    setDownloadError('')
    try { await download() }
    catch (requestError) { setDownloadError(errorMessage(requestError)) }
  }

  return <div className="page-enter">
    <PageTitle eyebrow="Measure what matters" title="Analytics & statistics" description="Full-column statistics calculated with Pandas from your selected dataset." actions={selectedId && <button className="btn-secondary" onClick={exportSummary}><ArrowDownToLine size={14} /> Export JSON</button>} />
    {!selectedId ? <EmptyState action={<Link className="btn-primary" to="/upload">Upload a dataset</Link>} /> : <ErrorBanner message={error} />}
    {loading && <Loading label="Calculating actual dataset statistics…" />}
    {data && <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[['Records analyzed', formatNumber(data.row_count), Hash], ['Columns analyzed', formatNumber(data.column_count), BarChart3], ['Numeric columns', formatNumber(data.columns.filter((item) => item.kind === 'numeric').length), Sigma]].map(([label, value, Icon]) => <div key={label} className="card flex items-center justify-between p-4"><div><p className="text-xs text-slate-400">{label}</p><p className="mt-2 font-display text-xl font-bold">{value}</p></div><Icon size={18} className="text-blue-300" /></div>)}
      </div>
      <div className="space-y-4">{data.columns.map((column) => <section key={column.name} className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222c40] px-5 py-4"><div><h2 className="text-sm font-bold">{column.name}</h2><p className="mt-1 text-[10px] text-slate-500">{column.dtype} · {formatNumber(column.unique)} unique · {formatNumber(column.missing)} missing</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${column.kind === 'numeric' ? 'bg-blue-500/10 text-blue-300' : 'bg-violet-500/10 text-violet-300'}`}>{column.kind}</span></div>
        {column.kind === 'numeric' ? <div className="grid grid-cols-2 gap-px bg-[#222c40] sm:grid-cols-4 lg:grid-cols-8">
          {[['Mean', column.mean], ['Median', column.median], ['Mode', column.mode], ['Minimum', column.min], ['Maximum', column.max], ['Range', column.range], ['Std. dev.', column.std], ['Variance', column.variance]].map(([label, value]) => <div key={label} className="bg-[#101522] px-4 py-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-200" title={value == null ? 'No data' : String(value)}>{value == null ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p></div>)}
        </div> : <div className="p-4"><p className="mb-2 text-[10px] text-slate-500">Most frequent: <span className="font-semibold text-slate-300">{column.mode ?? '—'}</span></p><div className="flex flex-wrap gap-2">{column.frequencies.map(({ value, count }) => <span key={String(value)} className="rounded-lg border border-[#29344a] bg-[#0c111d] px-3 py-2 text-xs"><span className="text-slate-300">{String(value)}</span><span className="ml-2 text-slate-500">{formatNumber(count)}</span></span>)}{!column.frequencies.length && <span className="text-xs text-slate-500">No non-missing categories.</span>}</div></div>}
      </section>)}</div>
      <p className="mt-4 text-[11px] text-slate-600">Mode and frequency lists are capped to the 20 most common categories for readability.</p>
    </>}
  </div>
}
