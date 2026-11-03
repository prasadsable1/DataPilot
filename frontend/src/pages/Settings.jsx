import { useEffect, useState } from 'react'
import { Activity, Database, ExternalLink, FileLock2, Info, Server, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../services/api'
import { ErrorBanner, PageTitle } from '../components/UI'

export default function Settings() {
  const [apiStatus, setApiStatus] = useState('checking')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api.get('/health').then(() => { if (active) setApiStatus('online') })
      .catch((requestError) => { if (active) { setApiStatus('offline'); setError(errorMessage(requestError)) } })
    return () => { active = false }
  }, [])
  const sessionId = localStorage.getItem('datapilot-session-id') || 'No browser session initialized'
  const apiRoot = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/api\/?$/, '')

  return <div className="page-enter">
    <PageTitle eyebrow="Workspace information" title="Settings & about" description="Understand how this first version stores and scopes your data, and check its API connection." />
    <ErrorBanner message={error} />
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-5 md:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-300"><Server size={18} /></span><div><p className="eyebrow">Service status</p><h2 className="mt-1 text-sm font-bold">Backend API</h2></div></div>
        <div className="mt-5 flex items-center justify-between rounded-lg border border-[#263148] bg-[#0c111d] p-3"><span className="text-xs text-slate-400">Health check</span><span className={`flex items-center gap-2 text-xs ${apiStatus === 'online' ? 'text-emerald-300' : apiStatus === 'offline' ? 'text-rose-300' : 'text-slate-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${apiStatus === 'online' ? 'bg-emerald-400' : apiStatus === 'offline' ? 'bg-rose-400' : 'animate-pulse bg-slate-500'}`} />{apiStatus}</span></div>
        <a href={`${apiRoot}/docs`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200">Open FastAPI documentation <ExternalLink size={12} /></a>
      </section>
      <section className="card p-5 md:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><FileLock2 size={18} /></span><div><p className="eyebrow">Privacy model</p><h2 className="mt-1 text-sm font-bold">Browser-scoped dataset access</h2></div></div>
        <p className="mt-4 text-xs leading-5 text-slate-400">DataPilot associates datasets with a random browser-session identifier stored in local storage. This is a lightweight first-version boundary, not user authentication. Anyone with access to this browser profile can access its datasets.</p>
        <div className="mt-4 overflow-hidden rounded-lg border border-[#263148] bg-[#0c111d]"><p className="border-b border-[#263148] px-3 py-2 text-[10px] text-slate-500">Current session identifier</p><p className="break-all px-3 py-2 font-mono text-[10px] text-slate-400">{sessionId}</p></div>
      </section>
      <section className="card p-5 md:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300"><Database size={18} /></span><div><p className="eyebrow">Storage design</p><h2 className="mt-1 text-sm font-bold">MySQL metadata, local data files</h2></div></div>
        <ul className="mt-4 space-y-3 text-xs leading-5 text-slate-400"><li className="flex gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-300" />MySQL stores dataset metadata and session ownership.</li><li className="flex gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-300" />The backend stores source uploads and a separate CSV working copy in its configured storage directory.</li><li className="flex gap-2"><Info size={14} className="mt-0.5 shrink-0 text-amber-300" />Back up the database and storage folder together. Local storage is not durable across ephemeral cloud deployments.</li></ul>
      </section>
      <section className="card p-5 md:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300"><Activity size={18} /></span><div><p className="eyebrow">Built with</p><h2 className="mt-1 text-sm font-bold">A straightforward analytics stack</h2></div></div>
        <div className="mt-4 flex flex-wrap gap-2">{['React', 'Vite', 'Tailwind CSS v4', 'Recharts', 'FastAPI', 'Pandas', 'NumPy', 'SQLAlchemy', 'MySQL'].map((technology) => <span key={technology} className="rounded-full border border-[#29344a] bg-[#0c111d] px-2.5 py-1.5 text-[10px] text-slate-400">{technology}</span>)}</div>
        <Link to="/dashboard" className="mt-5 inline-flex items-center gap-2 text-xs text-blue-300">Return to dashboard <ExternalLink size={12} /></Link>
      </section>
    </div>
  </div>
}
