import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from '@/App'
import CompanyHome from '@/views/CompanyHome'
import '@/index.css'

// Build/development entry only. No effects, API calls or tenant data are run here.
export function renderCompanyPage() {
  const year = new Date().getFullYear()
  const body = renderToString(
    <StrictMode><App initialRoute={{ name: 'company-home' }} CompanyHomeComponent={CompanyHome} companyYear={year} /></StrictMode>,
  )
  return { body, year }
}
