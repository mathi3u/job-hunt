import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Pipeline } from '@/pages/Pipeline'
import { CVBank } from '@/pages/CVBank'
import { ContactBank } from '@/pages/ContactBank'
import { Companies } from '@/pages/Companies'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="cv-bank" element={<CVBank />} />
          <Route path="contact-bank" element={<ContactBank />} />
          <Route path="companies" element={<Companies />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
