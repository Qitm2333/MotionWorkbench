import { createRoot } from 'react-dom/client'
import Carousel from './Carousel.jsx'

const root = createRoot(document.getElementById('root'))
root.render(<Carousel />)

addEventListener('pagehide', () => root.unmount(), { once: true })
