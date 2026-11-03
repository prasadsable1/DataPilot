import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DatasetProvider } from './hooks/DatasetContext'
import Layout from './components/Layout'
import { Loading } from './components/UI'

const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Upload = lazy(() => import('./pages/Upload'))
const Explorer = lazy(() => import('./pages/Explorer'))
const Cleaning = lazy(() => import('./pages/Cleaning'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Visualization = lazy(() => import('./pages/Visualization'))
const Insights = lazy(() => import('./pages/Insights'))
const History = lazy(() => import('./pages/History'))
const Settings = lazy(() => import('./pages/Settings'))

export default function App() {
  return (
    <BrowserRouter>
      <DatasetProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/explorer" element={<Explorer />} />
              <Route path="/cleaning" element={<Cleaning />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/visualizations" element={<Visualization />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </DatasetProvider>
    </BrowserRouter>
  )
}
