import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// After a new deploy, an old open tab can ask for a file that no longer exists.
// Reload once to pick up the new version instead of showing a broken page.
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('jo-reloaded')) return
    sessionStorage.setItem('jo-reloaded', '1')
  } catch { /* storage blocked: still reload below */ }
  e.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
