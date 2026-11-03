import { useEffect, useState } from 'react'
import { ArrowRight, BarChart3, Database, FileUp, Rows3, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../services/api'
import { useDatasets } from '../hooks/useDatasets'
import { EmptyState, ErrorBanner, Loading, PageTitle } from '../components/UI'
import { formatBytes, formatNumber } from '../utils/format'

export default function Dashboard() {
  const { datasets, selectedDataset, loading, error } = useDatasets()
  const [response, setResponse] = useState(null)
  useEffect(() => {
    if (!selectedDataset) return
    let active = true
    api.get(`/datasets/${selectedDataset.id}`)
      .then(({ data }) => { if (active) setResponse({ datasetId: selectedDataset.id, summary: data.summary }) })
      .catch((e) => { if (active) setResponse({ datasetId: selectedDataset.id, error: errorMessage(e) }) })
    return () => { active = false }
  }, [selectedDataset])

  const currentResponse = response?.datasetId === selectedDataset?.id ? response : null
  const summary = currentResponse?.summary || null
  const requestError = currentResponse?.error || ''
  const totalRows = datasets.reduce((total, item) => total + item.row_count, 0)
  const totalSize = datasets.reduce((total, item) => total + item.file_size, 0)
  if (loading) return <Loading label="Loading your workspace…" />
  return <div className="page-enter">
    <PageTitle eyebrow="Workspace overview" title="Good data, better decisions." description="A clear snapshot of your data workspace, grounded in your uploaded datasets." actions={<Link to="/upload" className="btn-primary"><FileUp size={15} /> Add dataset</Link>} />
    <ErrorBanner message={error || requestError} />
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Uploaded datasets', formatNumber(datasets.length), Database, 'Across this browser session'],
        ['Rows in workspace', formatNumber(totalRows), Rows3, 'Original upload row counts'],
        ['Stored file size', formatBytes(totalSize), BarChart3, 'Combined source file size'],
        ['Selected dataset', selectedDataset?.name || 'None selected', Sparkles, selectedDataset ? 'Ready to explore' : 'Upload to get started'],
      ].map(([label, value, Icon, note]) => <div key={label} className="card p-5"><div className="flex items-center justify-between"><span className="text-xs text-slate-400">{label}</span><Icon size={16} className="text-blue-300" /></div><p className="mt-4 truncate font-display text-2xl font-bold text-slate-100">{value}</p><p className="mt-1 text-[11px] text-slate-500">{note}</p></div>)}
    </div>
    {datasets.length === 0 ? <EmptyState title="Your workspace is ready" detail="Start with a CSV or Excel dataset. Your analysis will be built from your uploaded values, not placeholders." action={<Link to="/upload" className="btn-primary">Upload your first dataset <ArrowRight size={15} /></Link>} /> :
      <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <section className="card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Selected dataset</p><h2 className="mt-2 font-display text-lg font-bold">{selectedDataset?.name || 'Choose a dataset'}</h2></div><Link to="/explorer" className="btn-secondary text-xs">Explore data <ArrowRight size={14} /></Link></div>
          {summary ? <><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Rows', formatNumber(summary.row_count)], ['Columns', formatNumber(summary.column_count)], ['Missing cells', formatNumber(summary.missing_cells)], ['Duplicates', formatNumber(summary.duplicate_rows)]].map(([label, value]) => <div className="rounded-lg border border-[#242e43] bg-[#0c111d] p-3" key={label}><p className="text-[11px] text-slate-500">{label}</p><p className="mt-2 font-display text-lg font-bold">{value}</p></div>)}
          </div><div className="mt-5"><p className="eyebrow mb-3">Column profile</p><div className="space-y-2">
            {summary.columns.slice(0, 6).map((column) => <div key={column.name} className="flex items-center gap-3 rounded-lg bg-[#0c111d] px-3 py-2.5"><span className="min-w-0 flex-1 truncate text-xs font-medium">{column.name}</span><span className="rounded-md border border-[#2a3448] px-2 py-1 text-[10px] text-slate-400">{column.dtype}</span><span className={`text-[10px] ${column.missing ? 'text-amber-300' : 'text-slate-600'}`}>{formatNumber(column.missing)} missing</span></div>)}
          </div></div></> : currentResponse?.error ? <div className="mt-6 rounded-lg border border-rose-500/20 bg-rose-500/[.05] p-4 text-xs text-rose-200">Could not load this dataset summary.</div> : <Loading label="Analyzing selected dataset…" />}
        </section>
        <section className="card p-5 md:p-6"><p className="eyebrow">Recent uploads</p><h2 className="mt-2 font-display text-lg font-bold">Your dataset history</h2><div className="mt-5 space-y-3">
          {datasets.slice(0, 5).map((dataset) => <div className="flex items-center gap-3 rounded-lg border border-[#222c40] bg-[#0c111d] p-3" key={dataset.id}><span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300"><Database size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{dataset.name}</p><p className="mt-1 text-[10px] text-slate-500">{formatNumber(dataset.row_count)} rows · {formatBytes(dataset.file_size)}</p></div><span className="h-2 w-2 rounded-full bg-emerald-400" /></div>)}
        </div><Link to="/history" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-300">View all datasets <ArrowRight size={13} /></Link></section>
      </div>}
  </div>
}
