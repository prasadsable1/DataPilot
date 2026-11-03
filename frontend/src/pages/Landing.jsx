import { ArrowRight, BarChart3, Database, FileSpreadsheet, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const capabilities = [
  { icon: Database, title: 'Explore every row', text: 'Search, sort and page through your data without pulling the entire dataset into the browser.' },
  { icon: WandSparkles, title: 'Clean with confidence', text: 'Preview practical cleaning steps first. Your uploaded original stays intact.' },
  { icon: BarChart3, title: 'Find the signal', text: 'Calculate real summary statistics and build charts directly from selected columns.' },
  { icon: Sparkles, title: 'Surface useful clues', text: 'See transparent, rule-based observations for data quality, ranges and correlations.' },
]

export default function Landing() {
  return <div className="min-h-screen overflow-hidden bg-[#080b14] text-slate-100">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <a href="/" className="flex items-center gap-2.5 font-display text-lg font-extrabold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500"><BarChart3 size={18} /></span>Data<span className="-ml-2 text-blue-400">Pilot</span></a>
      <div className="flex items-center gap-5 text-sm"><Link to="/settings" className="hidden text-slate-400 hover:text-white sm:block">About</Link><Link to="/dashboard" className="btn-primary">Open workspace <ArrowRight size={15} /></Link></div>
    </nav>
    <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 md:pt-24">
      <div className="pointer-events-none absolute -right-36 -top-20 h-[560px] w-[560px] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/[.06] px-3 py-1.5 text-xs text-blue-200"><Sparkles size={13} /> Your data, ready for takeoff</div>
          <h1 className="font-display max-w-2xl text-5xl font-extrabold leading-[1.1] tracking-[-.045em] md:text-[64px]">Make better calls with <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">clearer data.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">A calm, focused workspace to explore, clean and understand your datasets — from first upload to chart-ready insights.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/upload" className="btn-primary px-5 py-3">Upload a dataset <ArrowRight size={16} /></Link><Link to="/dashboard" className="btn-secondary px-5 py-3">Go to dashboard</Link></div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-500"><span className="flex items-center gap-2"><FileSpreadsheet size={14} className="text-emerald-400" /> CSV and XLSX</span><span className="flex items-center gap-2"><ShieldCheck size={14} className="text-blue-400" /> Private browser session</span><span>Rule-based insights, no paid AI</span></div>
        </div>
        <div className="card relative overflow-hidden p-4 shadow-2xl shadow-blue-950/30 md:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[#222c40] pb-4"><div><p className="eyebrow">Preview workspace</p><p className="mt-1 text-sm font-semibold">Your data. Your next move.</p></div><div className="flex gap-1"><span className="h-2 w-2 rounded-full bg-rose-400/70" /><span className="h-2 w-2 rounded-full bg-amber-300/70" /><span className="h-2 w-2 rounded-full bg-emerald-400/70" /></div></div>
          <div className="grid grid-cols-3 gap-3">{['Upload', 'Explore', 'Understand'].map((step, index) => <div key={step} className="rounded-xl border border-[#26314a] bg-[#0c1220] p-3"><div className="mb-5 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-xs font-bold text-blue-300">0{index + 1}</div><p className="text-xs font-semibold">{step}</p></div>)}</div>
          <div className="mt-4 rounded-xl border border-[#26314a] bg-[#0c1220] p-4">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold">A clearer view of your data</p><p className="mt-1 text-[10px] text-slate-500">Build charts from your actual columns</p></div><BarChart3 size={16} className="text-violet-300" /></div>
            <div className="flex h-32 items-end gap-2 border-b border-l border-[#29344a] px-3 pb-0">
              {[36, 57, 43, 76, 62, 91, 73, 100, 79, 88, 70, 96].map((height, index) => <div key={index} style={{ height: `${height}%` }} className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-600/60 to-violet-400/80" />)}
            </div>
            <p className="mt-3 text-center text-[10px] text-slate-600">Decorative preview · your charts use uploaded data</p>
          </div>
        </div>
      </div>
    </section>
    <section className="border-t border-[#1b2434] bg-[#0b0f18] py-16">
      <div className="mx-auto max-w-7xl px-6"><p className="eyebrow">Built for the whole workflow</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {capabilities.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-[#202a3d] bg-[#101522] p-5"><Icon size={19} className="text-blue-300" /><h2 className="mt-4 text-sm font-semibold">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></article>)}
      </div></div>
    </section>
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-slate-600"><span>DataPilot · A local-first analytics workspace</span><Link to="/settings" className="hover:text-slate-400">Architecture & privacy</Link></footer>
  </div>
}
