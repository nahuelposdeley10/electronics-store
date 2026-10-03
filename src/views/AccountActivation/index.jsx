import { useState } from 'react'
import { apiPost } from '@/lib/api'
import './styles.css'

export default function AccountActivation({ token }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [state, setState] = useState({ loading: false, error: '', done: false })

  const submit = async (event) => {
    event.preventDefault()
    if (!token) return setState({ loading: false, error: 'El link de activación no es válido.', done: false })
    if (password.length < 6) return setState({ loading: false, error: 'La contraseña debe tener al menos 6 caracteres.', done: false })
    if (password !== confirmation) return setState({ loading: false, error: 'Las contraseñas no coinciden.', done: false })
    setState({ loading: true, error: '', done: false })
    try {
      await apiPost('/api/commercial/subscriptions/activate', { token, password })
      setState({ loading: false, error: '', done: true })
    } catch (error) {
      setState({ loading: false, error: error.message, done: false })
    }
  }

  return <main className="activation-page">
    <section className="activation-card" aria-labelledby="activation-title">
      <a className="activation-brand" href="/home">tienda<span>bnp.</span></a>
      {state.done ? <>
        <span className="activation-kicker">Cuenta activada</span>
        <h1 id="activation-title">Ya podés entrar a tu panel.</h1>
        <p>Tu negocio y tu plan quedaron configurados. Ingresá para completar el onboarding y cargar tu catálogo.</p>
        <a className="activation-button" href="/admin">Ir al panel</a>
      </> : <>
        <span className="activation-kicker">Último paso</span>
        <h1 id="activation-title">Creá la contraseña de tu cuenta.</h1>
        <p>Elegí una contraseña segura para acceder al panel de Tienda BNP. El link es de un solo uso.</p>
        <form onSubmit={submit}>
          <label><span>Contraseña</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} autoComplete="new-password" required /></label>
          <label><span>Repetir contraseña</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={6} autoComplete="new-password" required /></label>
          {state.error && <p className="activation-error" role="alert">{state.error}</p>}
          <button className="activation-button" type="submit" disabled={state.loading}>{state.loading ? 'Activando…' : 'Activar mi cuenta'}</button>
        </form>
      </>}
    </section>
  </main>
}
