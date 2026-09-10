import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AnalyzePage from './pages/AnalyzePage'
import ScrollWritingPage from './pages/ScrollWritingPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/scroll-writing" element={<ScrollWritingPage />} />
      </Routes>
    </BrowserRouter>
  )
}
