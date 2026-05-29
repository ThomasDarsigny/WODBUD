import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#f0ebe4', padding: '2rem' }}>
      <section style={{ width: '100%', maxWidth: 560, border: '1px solid #252525', background: '#111111', padding: '2rem' }}>
        <h1 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Connexion</h1>
        <p style={{ marginTop: 0, color: '#7a7570' }}>Page temporaire. Le formulaire de connexion sera ajoute a la prochaine etape.</p>
        <div style={{ marginTop: '1.25rem' }}>
          <Link to="/" style={{ color: '#ff4d00', textDecoration: 'none' }}>Retour a l'accueil</Link>
        </div>
      </section>
    </main>
  )
}
