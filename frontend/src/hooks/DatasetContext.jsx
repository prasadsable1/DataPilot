import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { errorMessage } from '../services/api'
import { DatasetContext } from './dataset-context'

export function DatasetProvider({ children }) {
  const [datasets, setDatasets] = useState([])
  const [selectedId, setSelectedId] = useState(localStorage.getItem('datapilot-selected-id') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const updateDatasets = useCallback((items) => {
    setDatasets(items)
    setError('')
    setSelectedId((current) => {
      const nextId = items.some((item) => item.id === current) ? current : items[0]?.id || ''
      if (nextId) localStorage.setItem('datapilot-selected-id', nextId)
      else localStorage.removeItem('datapilot-selected-id')
      return nextId
    })
  }, [])

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/datasets')
      updateDatasets(data.datasets)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [updateDatasets])

  useEffect(() => {
    let active = true
    api.get('/datasets').then(({ data }) => {
      if (!active) return
      updateDatasets(data.datasets)
    }).catch((requestError) => {
      if (active) setError(errorMessage(requestError))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [updateDatasets])

  const selectDataset = useCallback((id) => {
    setSelectedId(id)
    if (id) localStorage.setItem('datapilot-selected-id', id)
    else localStorage.removeItem('datapilot-selected-id')
  }, [])

  const removeDataset = useCallback(async (id) => {
    await api.delete(`/datasets/${id}`)
    await refresh()
  }, [refresh])

  const value = useMemo(() => ({
    datasets, selectedId, selectedDataset: datasets.find((item) => item.id === selectedId),
    selectDataset, refresh, removeDataset, loading, error,
  }), [datasets, selectedId, selectDataset, refresh, removeDataset, loading, error])

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
}

export function useDatasets() {
  const context = useContext(DatasetContext)
  if (!context) {
    throw new Error('useDatasets must be used within a DatasetProvider.')
  }
  return context
}
