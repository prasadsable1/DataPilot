import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, ArrowDownToLine, BarChart3, CircleDot, Lightbulb, ShieldAlert, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../services/api'
import { useDatasets } from '../hooks/useDatasets'
import { EmptyState, ErrorBanner, Loading, PageTitle } from '../components/UI'
import { useDownload } from '../utils/format'

const icons = { overview: BarChart3, quality: ShieldAlert, range: Activity, outlier: AlertTriangle, category: CircleDot, correlation: Sparkles }
const accents = { overview: 'text-blue-300 bg-blue-500/10', quality: 'text-amber-300 bg-amber-500/10', range: 'text-cyan-300 bg-cyan-500/10', outlier: 'text-rose-300 bg-rose-500/10', category: 'text-violet-300 bg-violet-500/10', correlation: 'text-emerald-300 bg-emerald-500/10' }

export default function Insights() {
  const { selectedId, selectedDataset } = useDatasets()
  const [response, setResponse] = useState(null)
  const [downloadError, setDownloadError] = useState('')
  const download = useDownload(api, `/datasets/${selectedId}/summary/export`, `${selectedDataset?.name || 'dataset'}-analytics.json`)
  useEffect(() => {
    if (!selectedId) return
    let active = true
    api.get(`/datasets/${selectedId}/insights`)
      .then(({ data }) => { if (active) setResponse({ datasetId: selectedId, items: data.insights }) })
      .catch((e) => { if (active) setResponse({ datasetId: selectedId, error: errorMessage(e) }) })
    return () => { active = false }
  }, [selectedId])

  const currentResponse = response?.datasetId === selectedId ? response : null
  const items = currentResponse?.items || null
  const error = currentResponse?.error || downloadError
  const loading = Boolean(selectedId && !currentResponse)

  async function exportReport() {
    setDownloadError('')
    try { await download() }
    catch (requestError) { setDownloadError(errorMessage(requestError)) }
  }

  return <div className="page-enter">
    <PageTitle eyebrow="Automated, transparent analysis" title="Insights from your data" description="Every observation includes the actual value or rule that produced it. These are deterministic analyses, not AI-generated claims." actions={selectedId && <button className="btn-secondary" onClick={exportReport}><ArrowDownToLine size={14} /> Export report</button>} />
    {!selectedId ? <EmptyState action={<Link className="btn-primary" to="/upload">Upload a dataset</Link>} /> : <ErrorBanner message={error} />}
    {!selectedId ? null : loading ? <Loading label="Checking your data for patterns…" /> : items ? <>
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-violet-400/15 bg-violet-400/[.05] px-4 py-3 text-xs text-violet-200"><Lightbulb size={15} /> {items.length} observations computed from the current working dataset</div>
      {items.length === 0 ? <EmptyState title="No notable patterns found" detail="The current dataset did not meet any of the built-in insight rules." /> :
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((item, index) => {
          const Icon = icons[item.type] || Sparkles
          return <article className="card p-5 transition hover:-translate-y-0.5 hover:border-[#394665]" key={`${item.type}-${item.title}-${index}`}>
            <div className="flex items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accents[item.type] || 'text-blue-300 bg-blue-500/10'}`}><Icon size={17} /></span><div className="min-w-0 flex-1"><span className="eyebrow">{item.type}</span><h2 className="mt-1 text-sm font-bold leading-snug">{item.title}</h2></div></div>
            <p className="mt-4 text-xs leading-5 text-slate-400">{item.detail}</p>
            {item.metric && <div className="mt-4 inline-flex rounded-lg border border-[#29344a] bg-[#0c111d] px-3 py-2 font-display text-xs font-bold text-slate-200">{item.metric}</div>}
          </article>
        })}</div>}
      <p className="mt-5 text-[11px] text-slate-600">Outliers use the 1.5×IQR rule. Correlations use pairwise Pearson coefficients and indicate association, not causation.</p>
    </> : null}
  </div>
}
