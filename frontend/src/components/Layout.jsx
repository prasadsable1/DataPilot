import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity, ArrowUpRight, BarChart3, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Database, FileSpreadsheet, FlaskConical, Gauge, Lightbulb,
  Menu, Settings, Sparkles, Upload, X,
} from 'lucide-react'
import { useDatasets } from '../hooks/useDatasets'
import api from '../services/api'

const sections = [
  { title: 'Workspace', links: [
    { to: '/dashboard', label: 'Overview', icon: Gauge },
    { to: '/explorer', label: 'Data explorer', icon: Database },
    { to: '/cleaning', label: 'Data cleaning', icon: FlaskConical },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/visualizations', label: 'Visualization', icon: Activity },
    { to: '/insights', label: 'Automated insights', icon: Lightbulb },
  ] },
  { title: 'Manage', links: [
    { to: '/history', label: 'Dataset history', icon: FileSpreadsheet },
    { to: '/settings', label: 'Settings & about', icon: Settings },
  ] },
]
const labels = {
  '/dashboard': ['Your workspace', 'Overview'],
  '/upload': ['Get started', 'Upload dataset'],
  '/explorer': ['Workspace', 'Data explorer'],
  '/cleaning': ['Workspace', 'Data cleaning'],
  '/analytics': ['Workspace', 'Analytics'],
  '/visualizations': ['Workspace', 'Visualization studio'],
  '/insights': ['Workspace', 'Automated insights'],
  '/history': ['Manage', 'Dataset history'],
  '/settings': ['Manage', 'Settings & about'],
}

export default function Layout() {
  const { datasets, selectedId, selectDataset } = useDatasets()
  const [menuOpen, setMenuOpen] = useState(false)
  const [apiOnline, setApiOnline] = useState(false)
  const location = useLocation()
  const [group, title] = labels[location.pathname] || ['Workspace', 'DataPilot']

  useEffect(() => {
    let active = true
    api.get('/health').then(() => { if (active) setApiOnline(true) }).catch(() => { if (active) setApiOnline(false) })
    return () => { active = false }
  }, [])

  return (
    <div className="min-h-screen bg-[#080b14] text-[#e7eaf3]">
      {menuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-[#20283a] bg-[#0b0f19] px-4 transition-transform md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-[#1c2434] px-2">
          <NavLink to="/dashboard" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-900/30"><Activity size={19} /></div>
            <span className="font-display text-[17px] font-extrabold tracking-tight">Data<span className="text-blue-400">Pilot</span></span>
          </NavLink>
          <button className="text-slate-400 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <NavLink to="/upload" onClick={() => setMenuOpen(false)} className="btn-primary mt-5 w-full"><Upload size={15} /> Upload dataset</NavLink>
        <div className="mt-6 px-2">
          <label className="eyebrow" htmlFor="dataset-switcher">Current dataset</label>
          <div className="relative mt-2">
            <select id="dataset-switcher" className="field appearance-none pr-8 text-[12px]" value={selectedId} onChange={(event) => selectDataset(event.target.value)}>
              <option value="">No dataset selected</option>
              {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-500" size={14} />
          </div>
        </div>
        <nav className="mt-7 flex-1 space-y-7 overflow-y-auto">
          {sections.map((section) => <div key={section.title}>
            <p className="eyebrow mb-2 px-3">{section.title}</p>
            <div className="space-y-1">
              {section.links.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${isActive ? 'bg-[#18213a] font-semibold text-blue-300' : 'text-slate-400 hover:bg-[#141b2a] hover:text-slate-200'}`}>
                  <Icon size={16} className="opacity-85" />{label}
                  {label === 'Automated insights' && datasets.length > 0 && <span className="ml-auto rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-300"><Sparkles size={11} /></span>}
                </NavLink>
              ))}
            </div>
          </div>)}
        </nav>
        <div className="mb-4 rounded-xl border border-[#222c40] bg-[#111827] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><CircleHelp size={15} className="text-blue-300" /> Your data stays yours</div>
          <p className="text-[11px] leading-relaxed text-slate-500">Private datasets are scoped to this browser session. Keep this browser profile secure.</p>
          <NavLink to="/settings" className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-300">Learn more <ArrowUpRight size={11} /></NavLink>
        </div>
        <div className="flex items-center gap-2 border-t border-[#1c2434] py-4 text-[11px] text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Local workspace <span className="ml-auto">v1.0</span></div>
      </aside>
      <main className="min-h-screen md:ml-[248px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#1b2434] bg-[#080b14]/90 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="text-slate-300 md:hidden" aria-label="Open menu"><Menu size={20} /></button>
            <div className="text-[11px] text-slate-500">{group}<span className="px-2 text-slate-700">/</span><span className="text-slate-300">{title}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${apiOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} /> Data API {apiOnline ? 'online' : 'offline'}</span>
            <div className="grid h-8 w-8 place-items-center rounded-full border border-blue-400/20 bg-blue-500/10 text-xs font-bold text-blue-300">DP</div>
          </div>
        </header>
        <div className="mx-auto max-w-[1480px] px-5 py-7 md:px-8 md:py-9">
          <Outlet />
        </div>
        <div className="fixed bottom-5 right-5 z-10 hidden gap-1 sm:flex">
          <button aria-label="Previous page" onClick={() => window.history.back()} className="rounded-full border border-[#273149] bg-[#111827]/90 p-2 text-slate-400 hover:text-white"><ChevronLeft size={15} /></button>
          <button aria-label="Next page" onClick={() => window.history.forward()} className="rounded-full border border-[#273149] bg-[#111827]/90 p-2 text-slate-400 hover:text-white"><ChevronRight size={15} /></button>
        </div>
      </main>
    </div>
  )
}
