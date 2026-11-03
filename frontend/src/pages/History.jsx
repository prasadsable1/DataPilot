import { useState } from 'react'
import { CalendarDays, Database, Download, FileSpreadsheet, HardDrive, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDatasets } from '../hooks/useDatasets'
import { EmptyState, ErrorBanner, PageTitle } from '../components/UI'
import { formatBytes, formatNumber } from '../utils/format'

export default function History() {
  const { datasets, selectedId, selectDataset, removeDataset, refresh } = useDatasets()
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState('')

  async function handleDelete(dataset) {
    if (!window.confirm(`Permanently delete "${dataset.name}" and its stored files? This cannot be undone.`)) return
    setDeleting(dataset.id); setError('')
    try { await removeDataset(dataset.id) }
    catch (requestError) { setError(requestError.response?.data?.detail || requestError.message || 'Could not delete dataset.') }
    finally { setDeleting('') }
  }

  return <div className="page-enter">
    <PageTitle eyebrow="Manage your uploads" title="Dataset history" description="Review uploads saved for this browser session, switch the active dataset, or permanently remove a dataset and its local files." actions={<button className="btn-secondary" onClick={refresh}><Download size={14} /> Refresh list</button>} />
    <ErrorBanner message={error} />
    {datasets.length === 0 ? <EmptyState title="No upload history yet" detail="Uploaded datasets will appear here after you add your first file." action={<Link className="btn-primary" to="/upload">Upload a dataset</Link>} /> :
      <div className="card overflow-hidden">
        <div className="table-wrap"><table><thead><tr><th>Dataset</th><th>Rows × columns</th><th>File</th><th>Uploaded</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {datasets.map((dataset) => <tr key={dataset.id} className={dataset.id === selectedId ? 'bg-blue-500/[.035]' : ''}>
            <td><button className="flex items-center gap-3 text-left" onClick={() => selectDataset(dataset.id)}><span className="grid h-9 w-9 place-items-center rounded-lg border border-[#2b3650] bg-[#182139] text-blue-300"><Database size={16} /></span><span><span className="block max-w-[180px] truncate text-xs font-semibold text-slate-200">{dataset.name}</span><span className="mt-1 block max-w-[180px] truncate text-[10px] text-slate-500">{dataset.original_filename}</span></span></button></td>
            <td>{formatNumber(dataset.row_count)} × {formatNumber(dataset.column_count)}</td>
            <td><span className="inline-flex items-center gap-1.5"><FileSpreadsheet size={13} className="text-emerald-300" />{dataset.file_type} · {formatBytes(dataset.file_size)}</span></td>
            <td><span className="inline-flex items-center gap-1.5"><CalendarDays size={12} className="text-slate-500" />{dataset.created_at ? new Date(dataset.created_at).toLocaleString() : '—'}</span></td>
            <td><span className="inline-flex items-center gap-1.5 text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{dataset.status}</span></td>
            <td><div className="flex items-center gap-2"><button className="btn-secondary !px-2.5 !py-1.5 text-[10px]" onClick={() => selectDataset(dataset.id)}>{dataset.id === selectedId ? 'Selected' : 'Select'}</button><button aria-label={`Delete ${dataset.name}`} disabled={deleting === dataset.id} className="rounded-lg border border-rose-500/20 p-2 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40" onClick={() => handleDelete(dataset)}><Trash2 size={13} /></button></div></td>
          </tr>)}
        </tbody></table></div>
        <div className="flex items-center gap-2 border-t border-[#222c40] px-4 py-3 text-[11px] text-slate-500"><HardDrive size={13} /> {datasets.length} datasets · {formatBytes(datasets.reduce((sum, item) => sum + item.file_size, 0))} source files</div>
      </div>}
  </div>
}
