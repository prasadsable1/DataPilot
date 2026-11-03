import { useState } from 'react'
import { Activity, ArrowDownToLine, BarChart3, LineChart as LineIcon, PieChart as PieIcon, ScatterChart, WandSparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart as ScatterGraph, Tooltip, XAxis, YAxis,
} from 'recharts'
import { LoaderCircle } from 'lucide-react'
import api, { errorMessage } from '../services/api'
import { useDatasets } from '../hooks/useDatasets'
import { EmptyState, ErrorBanner, Loading, PageTitle } from '../components/UI'

const colors = ['#688bff', '#a379ff', '#36c9ad', '#f4a261', '#ed7fa1', '#77b9ee', '#b6d376', '#d2a4ff']
const chartTypes = [
  { value: 'bar', label: 'Bar chart', icon: BarChart3 },
  { value: 'line', label: 'Line chart', icon: LineIcon },
  { value: 'pie', label: 'Pie chart', icon: PieIcon },
  { value: 'scatter', label: 'Scatter plot', icon: ScatterChart },
  { value: 'histogram', label: 'Histogram', icon: Activity },
]

export default function Visualization() {
  const { selectedId, selectedDataset } = useDatasets()
  const names = selectedDataset?.columns?.map((column) => column.name) || []
  const [axes, setAxes] = useState(null)
  const [type, setType] = useState('bar')
  const [chartState, setChartState] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const defaultY = names.find((name) => selectedDataset?.columns.find((column) => column.name === name)?.dtype.match(/int|float/)) || names[1] || ''
  const sameDataset = axes?.datasetId === selectedId
  const x = sameDataset && names.includes(axes.x) ? axes.x : names[0] || ''
  const y = sameDataset && (axes.y === '' || names.includes(axes.y)) ? axes.y : defaultY
  const result = chartState?.datasetId === selectedId && chartState.type === type
    && chartState.requestedX === x && chartState.requestedY === y ? chartState.data : null

  async function generate(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const { data } = await api.post(`/datasets/${selectedId}/chart`, { x, y: type === 'scatter' ? y : y || null, chart_type: type, limit: 500 })
      setChartState({ datasetId: selectedId, type, requestedX: x, requestedY: y, data })
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setBusy(false) }
  }

  function downloadChartCsv() {
    if (!result?.data?.length) return
    const rows = result.data
    const headers = [result.x, result.y].filter(Boolean)
    const csv = [headers.join(',')]
      .concat(rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedDataset?.name || 'chart'}-${type}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const axisX = result?.x
  const axisY = result?.y
  const common = { data: result?.data || [], margin: { top: 10, right: 20, left: 0, bottom: 10 } }

  return <div className="page-enter">
    <PageTitle eyebrow="See the shape of your data" title="Visualization studio" description="Build charts from actual dataset values. Categorical X-axis charts show category frequency or the mean of a selected numeric measure." actions={selectedId && <button className="btn-secondary" onClick={downloadChartCsv}><ArrowDownToLine size={14} /> Export chart data</button>} />
    {!selectedId ? <EmptyState action={<Link className="btn-primary" to="/upload">Upload a dataset</Link>} /> : <>
      <ErrorBanner message={error} />
      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <form className="card h-fit p-5" onSubmit={generate}>
          <p className="eyebrow">Chart builder</p>
          <label htmlFor="chart-type" className="mb-2 mt-4 block text-xs font-semibold text-slate-300">Chart type</label>
          <select id="chart-type" className="field" value={type} onChange={(event) => { setType(event.target.value); setError('') }}>{chartTypes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select>
          <label htmlFor="axis-x" className="mb-2 mt-4 block text-xs font-semibold text-slate-300">{type === 'histogram' ? 'Numeric column' : 'X-axis'}</label>
          <select id="axis-x" className="field" value={x} onChange={(event) => { setAxes({ datasetId: selectedId, x: event.target.value, y }); setError('') }}>{names.map((name) => <option key={name}>{name}</option>)}</select>
          {type !== 'histogram' && <><label htmlFor="axis-y" className="mb-2 mt-4 block text-xs font-semibold text-slate-300">{type === 'scatter' ? 'Numeric Y-axis' : 'Measure (optional)'}</label><select id="axis-y" className="field" value={y} onChange={(event) => { setAxes({ datasetId: selectedId, x, y: event.target.value }); setError('') }}><option value="">Category frequency</option>{names.map((name) => <option key={name}>{name}</option>)}</select></>}
          <button type="submit" className="btn-primary mt-5 w-full" disabled={busy || !x || (type === 'scatter' && (!y || y === x))}>{busy ? <><LoaderCircle size={14} className="animate-spin" /> Generating…</> : <><WandSparkles size={14} /> Generate chart</>}</button>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Charts use up to 500 points; category charts show the top categories.</p>
        </form>
        <section className="card min-h-[440px] p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">{selectedDataset?.name}</p><h2 className="mt-2 font-display text-base font-bold">{result ? `${chartTypes.find((item) => item.value === type)?.label}: ${axisX}${axisY ? ` by ${axisY}` : ''}` : 'Your chart will appear here'}</h2></div>{result && <span className="rounded-full border border-[#29344a] px-2.5 py-1 text-[10px] text-slate-400">{result.data.length} data points</span>}</div>
          {busy ? <Loading label="Calculating chart data…" /> : result?.data?.length ? <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {type === 'pie' ? <PieChart><Tooltip contentStyle={{ background: '#101827', border: '1px solid #29344a', borderRadius: 9 }} /><Legend /><Pie data={result.data} dataKey={axisY} nameKey={axisX} outerRadius={110} innerRadius={55} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{result.data.map((entry, index) => <Cell key={entry[axisX]} fill={colors[index % colors.length]} />)}</Pie></PieChart>
                : type === 'scatter' ? <ScatterGraph {...common}><CartesianGrid stroke="#253047" /><XAxis dataKey={axisX} name={axisX} type="number" tick={{ fill: '#8b96ab', fontSize: 11 }} /><YAxis dataKey={axisY} name={axisY} type="number" tick={{ fill: '#8b96ab', fontSize: 11 }} /><Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#101827', border: '1px solid #29344a', borderRadius: 9 }} /><Legend /><Scatter name={`${axisY} vs ${axisX}`} data={result.data} fill="#8b78ff" /></ScatterGraph>
                  : type === 'line' ? <LineChart {...common}><CartesianGrid stroke="#253047" strokeDasharray="3 3" /><XAxis dataKey={axisX} tick={{ fill: '#8b96ab', fontSize: 10 }} /><YAxis tick={{ fill: '#8b96ab', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#101827', border: '1px solid #29344a', borderRadius: 9 }} /><Legend /><Line type="monotone" dataKey={axisY} name={axisY} stroke="#8c79ff" strokeWidth={2} dot={{ r: 3, fill: '#78a0ff' }} /></LineChart>
                    : <BarChart {...common}><CartesianGrid stroke="#253047" strokeDasharray="3 3" /><XAxis dataKey={axisX} tick={{ fill: '#8b96ab', fontSize: 10 }} /><YAxis tick={{ fill: '#8b96ab', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#101827', border: '1px solid #29344a', borderRadius: 9 }} /><Legend /><Bar dataKey={axisY} name={axisY} fill="#7083ff" radius={[4, 4, 0, 0]} /></BarChart>}
            </ResponsiveContainer>
          </div> : <div className="flex min-h-[320px] flex-col items-center justify-center text-center"><div className="grid h-12 w-12 place-items-center rounded-xl bg-[#1a2235] text-slate-500"><BarChart3 size={21} /></div><p className="mt-3 text-sm text-slate-400">Choose columns and generate a chart</p><p className="mt-1 text-xs text-slate-600">The chart renders actual values returned by the analytics API.</p></div>}
        </section>
      </div>
    </>}
  </div>
}
