import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Pipeline } from '@/pages/Pipeline'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pipeline" element={<Pipeline />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
