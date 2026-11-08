import { createRoot } from 'react-dom/client'
import './index.css'
import './game/dialogue.js' // register voice manager bridge early
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)
