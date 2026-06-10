import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import MapArea from './components/MapArea'

function App() {
  const [theme, setTheme] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);

  return (
    <div className={`w-full h-screen flex overflow-hidden ${theme ? 'dark' : ''}`} style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
      <Sidebar theme={theme} toggleTheme={() => setTheme(!theme)} />
      <div className="flex-1 relative bg-slate-200">
        <MapArea theme={theme} />
      </div>
    </div>
  )
}

export default App
