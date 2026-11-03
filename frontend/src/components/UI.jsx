import { AlertCircle, ArrowRight, Database, LoaderCircle } from 'lucide-react'

export function PageTitle({ eyebrow, title, description, actions }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div><p className="eyebrow mb-2">{eyebrow}</p><h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 md:text-[28px]">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>}
    </div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
}

export function EmptyState({ title = 'No dataset selected', detail = 'Upload a CSV or Excel file to start exploring your data.', action }) {
  return <div className="card flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
    <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[#354264] bg-[#19223a] text-blue-300"><Database size={24} /></div>
    <h3 className="font-display text-base font-bold text-slate-100">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{detail}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-rose-500/[.07] px-4 py-3 text-sm text-rose-200">
    <span className="flex items-center gap-2"><AlertCircle size={16} />{message}</span>
    {onRetry && <button className="text-xs font-semibold underline underline-offset-2" onClick={onRetry}>Retry</button>}
  </div>
}

export function Loading({ label = 'Loading data…' }) {
  return <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-slate-400"><LoaderCircle size={18} className="animate-spin text-blue-400" />{label}</div>
}

export function EmptyInline({ label }) {
  return <div className="py-12 text-center text-sm text-slate-500">{label}<ArrowRight size={14} className="ml-1 inline" /></div>
}
