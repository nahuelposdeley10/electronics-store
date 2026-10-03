import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { parseLocation } from '@/lib/router'
import { applyRobotsPolicy } from '@/lib/seo'
import './index.css'
import App from './App.jsx'

const root = document.getElementById('root')
const route = parseLocation()
// Protect lazy views immediately, before their own metadata effects run.
applyRobotsPolicy()
if (root.dataset.prerender === 'company' && ['company-home', 'plans'].includes(route.name)) {
  // Load the matching component before hydration; keep the initial HTML visible.
  import('@/views/CompanyHome').then(({ default: CompanyHome }) => {
    hydrateRoot(root, <StrictMode><App initialRoute={route} CompanyHomeComponent={CompanyHome} companyYear={Number(root.dataset.year)} /></StrictMode>)
  })
} else {
  createRoot(root).render(<StrictMode><App /></StrictMode>)
}
