"use client";

import { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_URL = RAW_API_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
const TOKEN_KEY = 'litepos_platform_token';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) router.replace('/super-admin');
  }, [router]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/platform-admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.token) throw new Error(payload.message || 'Login gagal.');
      localStorage.setItem(TOKEN_KEY, payload.token);
      localStorage.setItem('litepos_platform_admin', JSON.stringify(payload.admin));
      router.replace('/super-admin');
    } catch (loginError) {
      setError(loginError.message === 'Failed to fetch'
        ? 'Tidak dapat terhubung ke server. Periksa internet dan status backend.'
        : loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-2xl shadow-blue-900/50">
            <ShieldCheck size={34} />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-blue-400">LitePOS Platform</p>
          <h1 className="text-3xl font-black">Super Admin</h1>
          <p className="mt-2 text-sm text-slate-400">Kelola usaha dan lisensi dari satu dashboard.</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
          {error && <div role="alert" className="mb-5 rounded-xl border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-200">{error}</div>}
          <label className="mb-2 block text-sm font-semibold text-slate-300" htmlFor="platform-email">Email Super Admin</label>
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 focus-within:border-blue-500">
            <Mail size={19} className="text-slate-500" />
            <input id="platform-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent py-3.5 outline-none placeholder:text-slate-600" placeholder="admin@domain.com" />
          </div>
          <label className="mb-2 block text-sm font-semibold text-slate-300" htmlFor="platform-password">Password</label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 focus-within:border-blue-500">
            <LockKeyhole size={19} className="text-slate-500" />
            <input id="platform-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent py-3.5 outline-none placeholder:text-slate-600" placeholder="Password Super Admin" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} className="text-slate-500 hover:text-white">
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          <button disabled={loading} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold transition hover:bg-blue-500 disabled:opacity-60">
            {loading ? <><Loader2 className="animate-spin" size={20} /> Menghubungkan...</> : <>Masuk ke Dashboard <ArrowRight size={20} /></>}
          </button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">Halaman ini khusus pengelola platform, bukan Owner atau pegawai usaha.</p>
      </div>
    </main>
  );
}
