import { createRoot } from 'react-dom/client'
import { BookshelfScene } from './BookshelfScene.tsx'
import '../style.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="site-shell shelf-only" aria-label="Material Library"><BookshelfScene /></main>)
addEventListener('pagehide', () => root.unmount(), { once: true })
