import { Navigate, Route, Routes } from 'react-router-dom'
import CropWorkspace from './components/crop/CropWorkspace'
import AppShell from './components/layout/AppShell'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />} />
      <Route path="/soru-bankasi" element={<AppShell />} />
      <Route path="/crop-tool" element={<CropWorkspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
