"use client";

import { useEffect, useState } from 'react';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { showAlert } from '@/utils/swal';
import { useStore } from '@/store/useStore';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const login = useStore(state => state.login);

  useEffect(() => {
    const notice = sessionStorage.getItem('auth_notice');
    if (notice) {
      sessionStorage.removeItem('auth_notice');
      showAlert.info('Sesi Berakhir', notice);
    }
  }, []);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await login(identifier.trim(), password);
      if (result.success) {
        router.push(result.mustChangePassword ? '/change-password' : '/');
      } else {
        showAlert.error('Gagal', result.message || 'Login gagal.');
      }
    } catch (error) {
      console.error(error);
      showAlert.error('Tidak Terhubung', 'Gagal terhubung ke server. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="iwear-login">
      <h1>Sistem Kasir</h1>
      <form onSubmit={handleLoginSubmit} aria-busy={isLoading}>
        <div className="iwear-login-field">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" value={identifier} onChange={event => setIdentifier(event.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="username" spellCheck={false} required />
        </div>
        <div className="iwear-login-field">
          <label htmlFor="password">Password</label>
          <div className="iwear-password">
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
            <button type="button" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={showPassword} aria-controls="password">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button className="iwear-login-submit" type="submit" disabled={isLoading}>
          {isLoading ? <><Loader2 size={17} className="animate-spin" /> Memproses...</> : <>Masuk Sekarang <ArrowRight size={16} /></>}
        </button>
      </form>
    </div>
  );
}
