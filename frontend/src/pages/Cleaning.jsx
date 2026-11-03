import { useMemo, useState } from 'react'
import { ArrowDownToLine, Check, Eye, LoaderCircle, RotateCcw, WandSparkles } from 'lucide-react'
import api, { errorMessage } from '../services/api'
import { useDatasets } from '../hooks/useDatasets'
import { EmptyState, ErrorBanner, PageTitle } from '../components/UI'
import { formatNumber, useDownload } from '../utils/format'

const descriptions = {
  remove_duplicates: 'Remove repeated rows that match across all columns.',
  fill_mean: 'Replace missing numeric values with the column mean.',
  fill_median: 'Replace missing numeric values with the column median.',
  fill_mode: 'Replace missing values with the most frequent value.',
  drop_missing: 'Remove every row that contains at least one missing value.',
  drop_columns: 'Remove one or more columns from the working copy.',
  rename_column: 'Rename a column without changing its values.',
  convert_dtype: 'Convert a column to a supported data type.',
}

export default function Cleaning() {
  const { selectedId, selectedDataset, refresh } = useDatasets()
  const [operation, setOperation] = useState('remove_duplicates')
  const [column, setColumn] = useState('')
  const [columns, setColumns] = useState([])
  const [newName, setNewName] = useState('')
  const [dtype, setDtype] = useState('float')
  const [staged, setStaged] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const download = useDownload(api, `/datasets/${selectedId}/export`, `${selectedDataset?.name || 'dataset'}_cleaned.csv`)
  const columnNames = useMemo(() => selectedDataset?.columns?.map((item) => item.name) || [], [selectedDataset])

  function buildRequest() {
    const item = { operation }
    if (['fill_mean', 'fill_median', 'fill_mode', 'rename_column', 'convert_dtype'].includes(operation)) item.column = column
    if (operation === 'drop_columns') item.columns = columns
    if (operation === 'rename_column') item.new_name = newName
    if (operation === 'convert_dtype') item.dtype = dtype
    return { operations: [item], apply: false }
  }

  async function preview() {
    setBusy(true); setError(''); setStaged(null)
    try {
      const request = buildRequest()
      const { data } = await api.post(`/datasets/${selectedId}/clean`, request)
      setResult(data); setStaged(request)
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setBusy(false) }
  }

  async function apply() {
    if (!staged) return
    setBusy(true); setError('')
    try {
      const { data } = await api.post(`/datasets/${selectedId}/clean`, { ...staged, apply: true })
      setResult(data); setStaged(null); await refresh()
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setBusy(false) }
  }

  async function exportCleaned() {
    setError('')
    try { await download() }
    catch (requestError) { setError(errorMessage(requestError)) }
  }

  async function resetWorkingCopy() {
    if (!selectedId) return
    setBusy(true); setError('')
    try {
      await api.post(`/datasets/${selectedId}/reset`)
      setResult(null); setStaged(null)
      await refresh()
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setBusy(false) }
  }

  const singleColumn = ['fill_mean', 'fill_median', 'fill_mode', 'rename_column', 'convert_dtype'].includes(operation)
  const numericColumnRequired = ['fill_mean', 'fill_median'].includes(operation)
  const choices = numericColumnRequired ? selectedDataset?.columns?.filter((item) => item.dtype.includes('int') || item.dtype.includes('float')).map((item) => item.name) || [] : columnNames

  return <div className="page-enter">
    <PageTitle eyebrow="Prepare your data" title="Data cleaning studio" description="Every change starts as a preview. The source upload is kept untouched; applied edits update its separate working copy." actions={selectedId && <div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={resetWorkingCopy} disabled={busy}><RotateCcw size={14} /> Reset working copy</button><button className="btn-secondary" onClick={exportCleaned}><ArrowDownToLine size={14} /> Export cleaned CSV</button></div>} />
    {!selectedId ? <EmptyState /> : <>
      <ErrorBanner message={error} />
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <section className="card p-5 md:p-6">
          <p className="eyebrow">Choose an operation</p>
          <label className="mt-4 block text-xs font-semibold text-slate-300" htmlFor="operation">Cleaning action</label>
          <select id="operation" className="field mt-2" value={operation} onChange={(event) => { setOperation(event.target.value); setStaged(null); setResult(null) }}>
            {Object.entries({ remove_duplicates: 'Remove duplicate rows', fill_mean: 'Fill missing · mean', fill_median: 'Fill missing · median', fill_mode: 'Fill missing · mode', drop_missing: 'Remove rows with missing values', drop_columns: 'Remove selected columns', rename_column: 'Rename column', convert_dtype: 'Change column type' }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">{descriptions[operation]}</p>
          {singleColumn && <><label className="mb-2 mt-5 block text-xs font-semibold text-slate-300" htmlFor="clean-column">Column</label><select id="clean-column" className="field" value={column} onChange={(event) => { setColumn(event.target.value); setStaged(null) }}><option value="">Select a column</option>{choices.map((item) => <option key={item} value={item}>{item}</option>)}</select></>}
          {operation === 'drop_columns' && <><label className="mb-2 mt-5 block text-xs font-semibold text-slate-300" htmlFor="drop-columns">Columns to remove</label><select id="drop-columns" className="field min-h-28" multiple value={columns} onChange={(event) => { setColumns(Array.from(event.target.selectedOptions, (option) => option.value)); setStaged(null) }}>{columnNames.map((item) => <option key={item} value={item}>{item}</option>)}</select><p className="mt-1 text-[10px] text-slate-600">Use Ctrl / Cmd to select multiple columns.</p></>}
          {operation === 'rename_column' && <><label className="mb-2 mt-4 block text-xs font-semibold text-slate-300" htmlFor="new-name">New column name</label><input id="new-name" className="field" maxLength={255} value={newName} onChange={(event) => { setNewName(event.target.value); setStaged(null) }} placeholder="Enter a clear name" /></>}
          {operation === 'convert_dtype' && <><label className="mb-2 mt-4 block text-xs font-semibold text-slate-300" htmlFor="dtype">New data type</label><select id="dtype" className="field" value={dtype} onChange={(event) => { setDtype(event.target.value); setStaged(null) }}>{['string', 'integer', 'float', 'boolean', 'datetime'].map((value) => <option key={value} value={value}>{value}</option>)}</select></>}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-[#232c40] pt-5">
            <button className="btn-primary" disabled={busy || (singleColumn && !column) || (operation === 'drop_columns' && columns.length === 0)} onClick={preview}>{busy ? <LoaderCircle className="animate-spin" size={14} /> : <Eye size={14} />} Preview change</button>
            {staged && <button className="btn-secondary" disabled={busy} onClick={apply}><Check size={14} /> Apply to working copy</button>}
          </div>
          {staged && <p className="mt-3 text-[11px] text-emerald-300">Review the preview, then apply to update your cleaned working copy.</p>}
        </section>
        <section className="card p-5 md:p-6">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Change preview</p><h2 className="mt-2 font-display text-base font-bold">{result ? 'Review the result' : 'Nothing changed yet'}</h2></div><WandSparkles size={18} className="text-violet-300" /></div>
          {!result ? <div className="flex min-h-[220px] flex-col items-center justify-center text-center"><div className="grid h-12 w-12 place-items-center rounded-xl bg-[#1a2235] text-slate-500"><Eye size={20} /></div><p className="mt-3 text-xs text-slate-500">Select a cleaning action and preview it first.</p></div> : <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Rows before', result.operations[0]?.rows_before], ['Rows after', result.summary.row_count], ['Columns after', result.summary.column_count], ['Changed', result.operations[0]?.changed]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#242e43] bg-[#0c111d] p-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-2 text-base font-bold">{formatNumber(value)}</p></div>)}</div>
            <p className="mb-2 mt-5 text-xs font-semibold text-slate-300">Result sample · first {result.preview.rows.length} rows</p>
            <div className="table-wrap max-h-[300px] rounded-lg border border-[#242e43]"><table><thead className="sticky top-0 bg-[#101522]"><tr>{result.preview.columns.map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{result.preview.rows.slice(0, 10).map((row, index) => <tr key={index}>{result.preview.columns.map((item) => <td key={item}>{row[item] == null ? <span className="text-amber-400/70">∅</span> : String(row[item])}</td>)}</tr>)}</tbody></table></div>
          </>}
        </section>
      </div>
    </>}
  </div>
}
