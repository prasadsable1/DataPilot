import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, FileSpreadsheet, FileUp, LoaderCircle, ShieldCheck, UploadCloud } from 'lucide-react'
import api, { errorMessage } from '../services/api'
import { useDatasets } from '../hooks/useDatasets'
import { ErrorBanner, PageTitle } from '../components/UI'
import { formatBytes } from '../utils/format'

const MAX_FILE_BYTES = 50 * 1024 * 1024

export default function Upload() {
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { refresh, selectDataset } = useDatasets()
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function choose(candidate) {
    setError(''); setSuccess('')
    if (!candidate) return
    if (!/\.(csv|xlsx)$/i.test(candidate.name)) { setFile(null); setError('Choose a CSV or XLSX file.'); return }
    if (candidate.size > MAX_FILE_BYTES) { setFile(null); setError('The file is larger than the 50 MB upload limit.'); return }
    setFile(candidate)
    setName(candidate.name.replace(/\.(csv|xlsx)$/i, ''))
  }

  async function submit(event) {
    event.preventDefault()
    if (!file) { setError('Choose a dataset file to continue.'); return }
    setBusy(true); setError(''); setProgress(0)
    const form = new FormData()
    form.append('file', file)
    form.append('name', name.trim() || file.name)
    try {
      const { data } = await api.post('/datasets', form, { onUploadProgress: (event) => setProgress(event.total ? Math.round((event.loaded * 100) / event.total) : 0) })
      await refresh()
      selectDataset(data.dataset.id)
      setSuccess(`Dataset ready — ${data.dataset.row_count.toLocaleString()} rows and ${data.dataset.column_count} columns analyzed.`)
      setTimeout(() => navigate('/explorer'), 700)
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setBusy(false) }
  }

  return <div className="page-enter">
    <PageTitle eyebrow="Add data" title="Bring your data aboard." description="Upload a CSV or Excel workbook. DataPilot validates and analyzes the dataset as soon as it arrives." />
    <ErrorBanner message={error} />
    {success && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[.07] px-4 py-3 text-sm text-emerald-200"><CheckCircle2 size={16} />{success}</div>}
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <form className="card p-5 md:p-7" onSubmit={submit}>
        <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]) }} className={`flex min-h-[250px] w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 text-center transition ${dragging ? 'border-blue-300 bg-blue-400/10' : 'border-[#35415b] bg-[#0c111d] hover:border-blue-400/60 hover:bg-[#111a2b]'}`}>
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300"><UploadCloud size={25} /></span>
          <span className="mt-4 font-display text-sm font-bold">{file ? file.name : 'Drop your dataset here'}</span>
          <span className="mt-2 text-xs text-slate-500">{file ? `${formatBytes(file.size)} · ${file.name.toLowerCase().endsWith('.xlsx') ? 'Excel workbook' : 'CSV file'}` : 'or click to browse your files'}</span>
          <span className="mt-4 rounded-lg border border-[#303a50] bg-[#151c2d] px-3 py-2 text-xs font-semibold text-slate-300">{file ? 'Choose a different file' : 'Browse files'}</span>
          <input ref={inputRef} className="sr-only" type="file" accept=".csv,.xlsx" onChange={(event) => choose(event.target.files[0])} />
        </button>
        <div className="mt-5">
          <label htmlFor="dataset-name" className="mb-2 block text-xs font-semibold text-slate-300">Dataset name</label>
          <input id="dataset-name" className="field" placeholder="e.g. Q3 sales report" value={name} onChange={(event) => setName(event.target.value)} maxLength={255} />
        </div>
        {busy && <div className="mt-5"><div className="mb-2 flex justify-between text-xs text-slate-400"><span>Uploading and analyzing…</span><span>{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#242e43]"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} /></div></div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#232c40] pt-5">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck size={14} className="text-emerald-400" /> Up to 50 MB · files stored locally</span>
          <button type="submit" className="btn-primary" disabled={busy || !file}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <FileUp size={15} />}{busy ? 'Processing…' : 'Upload and analyze'}</button>
        </div>
      </form>
      <div className="space-y-4">
        <section className="card p-5"><div className="flex items-center gap-2"><FileSpreadsheet size={16} className="text-blue-300" /><h2 className="text-sm font-bold">Supported file types</h2></div><div className="mt-4 space-y-3">
          {[['.csv', 'Comma-separated values', 'UTF-8 recommended'], ['.xlsx', 'Excel workbook', 'First worksheet is analyzed']].map(([ext, title, note]) => <div key={ext} className="flex items-center gap-3 rounded-lg border border-[#232c40] bg-[#0c111d] p-3"><span className="rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-bold text-blue-300">{ext}</span><div><p className="text-xs font-medium">{title}</p><p className="mt-1 text-[10px] text-slate-500">{note}</p></div></div>)}
        </div></section>
        <section className="card p-5"><p className="eyebrow">What happens next</p><div className="mt-4 space-y-4">
          {['File type and size are validated', 'Dataset structure is analyzed', 'Original data is preserved', 'Explore, clean, chart and export'].map((step, index) => <div key={step} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1a2540] text-[10px] font-bold text-blue-300">{index + 1}</span><p className="pt-1 text-xs text-slate-400">{step}</p></div>)}
        </div></section>
      </div>
    </div>
  </div>
}
