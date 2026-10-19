import '../auth.css';

export const metadata = {
  title: 'Sistem Kasir | Iwearing Hijab',
  description: 'Sistem kasir toko Iwearing Hijab',
};

export default function AuthLayout({ children }) {
  return (
    <main className="iwear-auth">
      <div className="iwear-auth-brand">
        <img src="/branding/iwearing-hijab.png" alt="Iwearing Hijab" width={2168} height={536} className="iwear-auth-logo" />
      </div>
      <section className="iwear-auth-panel" aria-label="Akses sistem kasir">
        <div className="iwear-auth-content">{children}</div>
      </section>
    </main>
  );
}
