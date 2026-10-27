import { createRoot } from 'react-dom/client'
import IcePaperWake from './IcePaperWake.jsx'
import '../style.css'

const root = createRoot(document.getElementById('root'))
root.render(<IcePaperWake imageUrl="./assets/paper-study.svg" />)
addEventListener('pagehide', () => root.unmount(), { once: true })
