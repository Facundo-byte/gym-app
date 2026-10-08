import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LanguageProvider from './i18n/LanguageProvider.jsx'
import PwaProvider from './pwa/PwaProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider><PwaProvider><App /></PwaProvider></LanguageProvider>
  </StrictMode>,
)
