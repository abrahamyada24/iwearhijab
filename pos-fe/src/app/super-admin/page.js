"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Building2, Check, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock3, Copy, KeyRound, Loader2, LogOut, RefreshCw, Search,
  ShieldCheck, Store, Ticket, UserRound, UsersRound, X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_URL = RAW_API_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
const TOKEN_KEY = 'iwear_platform_token';
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

const safeDate = (value) => value ? dateTime.format(new Date(value)) : '-';
const businessLabel = (type) => type === 'LAUNDRY' ? 'Laundry' : 'Retail / F&B';
const licenseTone = (status) => ({
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
}[status] || 'bg-slate-100 text-slate-700');

function Metric({ icon: Icon, label, value, note, tone = 'blue' }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600' };
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className={`mb-4 inline-flex rounded-xl p-2.5 ${tones[tone]}`}><Icon size={21} /></div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    {note && <p className="mt-2 text-xs text-slate-400">{note}</p>}
  </article>;
}

function Notice({ notice, clear }) {
  if (!notice) return null;
  return <div className={`fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
    {notice.type === 'error' ? <AlertTriangle size={20} /> : <Check size={20} />}
    <p className="flex-1 text-sm font-medium">{notice.message}</p>
    <button onClick={clear}><X size={17} /></button>
  </div>;
}

export default function PlatformDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [overview, setOverview] = useState(null);
  const [stores, setStores] = useState([]);
  const [codes, setCodes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedStore, setSelectedStore] = useState(null);
  const [licenseDays, setLicenseDays] = useState(30);
  const [reason, setReason] = useState('');
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [codeDays, setCodeDays] = useState(30);
  const [codeValidUntil, setCodeValidUntil] = useState('');
  const [codeNote, setCodeNote] = useState('');
  const [newCode, setNewCode] = useState('');
  const mutationKeys = useRef({});

  const idempotencyKey = (scope) => {
    if (!mutationKeys.current[scope]) {
      mutationKeys.current[scope] = globalThis.crypto?.randomUUID?.()
        || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return mutationKeys.current[scope];
  };

  const token = () => typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : '';
  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}/api/platform-admin${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(options.headers || {}) },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('iwear_platform_admin');
      router.replace('/super-admin/login');
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }
    if (!response.ok) throw new Error(payload.message || 'Permintaan gagal diproses.');
    return payload;
  }, [router]);

  const loadAll = useCallback(async ({ quiet = false } = {}) => {
    if (!token()) { router.replace('/super-admin/login'); return; }
    if (!quiet) setLoading(true);
    try {
      const [me, overviewPayload, storesPayload, codePayload, logPayload] = await Promise.all([
        request('/auth/me'),
        request('/overview'),
        request(`/stores?page=${page}&limit=20&q=${encodeURIComponent(query)}&status=${status}`),
        request('/activation-codes'),
        request('/audit-logs?limit=50'),
      ]);
      setAdmin(me.admin);
      setOverview(overviewPayload.data);
      setStores(storesPayload.data);
      setPagination(storesPayload.pagination);
      setCodes(codePayload.data);
      setLogs(logPayload.data);
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }, [page, query, request, router, status]);

  useEffect(() => { const timer = setTimeout(() => loadAll(), 250); return () => clearTimeout(timer); }, [loadAll]);

  const logout = async () => {
    try { await request('/auth/logout', { method: 'POST' }); } catch { /* token tetap dibersihkan */ }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('iwear_platform_admin');
    router.replace('/super-admin/login');
  };

  const updateLicense = async (action) => {
    if (!selectedStore) return;
    const scope = `license:${selectedStore.id}:${action}`;
    setBusy(`license-${action}`);
    try {
      const payload = await request(`/stores/${selectedStore.id}/license`, {
        method: 'PATCH',
        headers: { 'Idempotency-Key': idempotencyKey(scope) },
        body: JSON.stringify({ action, durationDays: Number(licenseDays), reason }),
      });
      delete mutationKeys.current[scope];
      setNotice({ type: 'success', message: payload.message });
      setSelectedStore(null);
      setReason('');
      await loadAll({ quiet: true });
    } catch (error) { setNotice({ type: 'error', message: error.message }); }
    finally { setBusy(''); }
  };

  const updateStoreStatus = async () => {
    if (!selectedStore) return;
    const scope = `store:${selectedStore.id}:${!selectedStore.isActive}`;
    setBusy('store-status');
    try {
      const payload = await request(`/stores/${selectedStore.id}/status`, {
        method: 'PATCH',
        headers: { 'Idempotency-Key': idempotencyKey(scope) },
        body: JSON.stringify({ isActive: !selectedStore.isActive, reason }),
      });
      delete mutationKeys.current[scope];
      setNotice({ type: 'success', message: payload.message });
      setSelectedStore(null);
      setReason('');
      await loadAll({ quiet: true });
    } catch (error) { setNotice({ type: 'error', message: error.message }); }
    finally { setBusy(''); }
  };

  const makeCode = async (event) => {
    event.preventDefault();
    const scope = 'activation-code:create';
    setBusy('code');
    try {
      const payload = await request('/activation-codes', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey(scope) },
        body: JSON.stringify({ durationDays: Number(codeDays), validUntil: codeValidUntil || null, note: codeNote }),
      });
      delete mutationKeys.current[scope];
      setNewCode(payload.data.code);
      setShowCodeForm(false);
      setCodeNote('');
      await loadAll({ quiet: true });
    } catch (error) { setNotice({ type: 'error', message: error.message }); }
    finally { setBusy(''); }
  };

  const chart = useMemo(() => {
    const registrations = overview?.registrations || [];
    const max = Math.max(1, ...registrations.map((item) => item.count));
    return { values: registrations.slice(-14), max };
  }, [overview]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-100"><div className="text-center"><Loader2 className="mx-auto animate-spin text-blue-600" size={36} /><p className="mt-3 font-semibold text-slate-600">Memuat dashboard platform...</p></div></main>;

  const metrics = overview?.metrics || {};
  const tabs = [{ id: 'overview', label: 'Ringkasan', icon: BarChart3 }, { id: 'stores', label: 'Usaha', icon: Building2 }, { id: 'codes', label: 'Token Lisensi', icon: Ticket }, { id: 'audit', label: 'Audit', icon: Activity }];

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <Notice notice={notice} clear={() => setNotice(null)} />
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-600 p-2"><ShieldCheck size={22} /></div><div><p className="font-black">Iwearing Hijab Platform</p><p className="text-xs text-slate-400">Super Admin</p></div></div>
        <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{admin?.name}</p><p className="text-xs text-slate-400">{admin?.email}</p></div><button onClick={logout} className="rounded-xl border border-slate-700 p-2.5 hover:bg-slate-800" title="Keluar"><LogOut size={19} /></button></div>
      </div>
    </header>
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab === id ? 'bg-slate-900 text-white shadow-lg' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Icon size={17} />{label}</button>)}</nav>

      {tab === 'overview' && <section>
        <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-black">Ringkasan Platform</h1><p className="text-sm text-slate-500">Kondisi seluruh usaha tanpa membuka data operasional tenant.</p></div><button onClick={() => loadAll()} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" title="Muat ulang"><RefreshCw size={19} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Store} label="Total usaha" value={metrics.totalStores || 0} note={`${metrics.registrationsToday || 0} daftar hari ini`} />
          <Metric icon={ShieldCheck} label="Premium aktif" value={metrics.premiumActive || 0} note={`${metrics.trialActive || 0} masih trial`} tone="green" />
          <Metric icon={UsersRound} label="Pengguna aktif" value={metrics.activeUsers || 0} note={`${metrics.activeStores || 0} usaha aktif`} tone="violet" />
          <Metric icon={CircleDollarSign} label="Omzet 30 hari" value={rupiah.format(metrics.revenue30Days || 0)} note={`${metrics.transactionCount30Days || 0} transaksi selesai`} tone="amber" />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="font-black">Pendaftaran 14 hari terakhir</h2><p className="text-sm text-slate-500">{metrics.registrations30Days || 0} usaha baru dalam 30 hari</p></div><div className="flex h-52 items-end gap-2">{chart.values.map((item) => <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-slate-500 opacity-0 group-hover:opacity-100">{item.count}</span><div className="w-full rounded-t-md bg-blue-500 transition hover:bg-blue-600" style={{ height: `${Math.max(5, (item.count / chart.max) * 150)}px` }} title={`${item.date}: ${item.count}`} /><span className="hidden text-[10px] text-slate-400 sm:block">{item.date.slice(8)}</span></div>)}</div></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Perlu perhatian</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-amber-50 p-4"><p className="text-2xl font-black text-amber-700">{metrics.expiredLicenses || 0}</p><p className="text-xs font-semibold text-amber-700">Lisensi berakhir</p></div><div className="rounded-xl bg-red-50 p-4"><p className="text-2xl font-black text-red-700">{metrics.suspendedLicenses || 0}</p><p className="text-xs font-semibold text-red-700">Ditangguhkan</p></div></div><h3 className="mt-5 text-sm font-bold">Berakhir dalam 14 hari</h3><div className="mt-2 space-y-2">{overview?.expiringLicenses?.length ? overview.expiringLicenses.map((item) => <button key={item.store.id} onClick={() => { setTab('stores'); setQuery(item.store.name); }} className="flex w-full justify-between rounded-xl border border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"><span className="font-semibold">{item.store.name}</span><span className="text-slate-500">{safeDate(item.expiresAt)}</span></button>) : <p className="py-5 text-center text-sm text-slate-400">Tidak ada lisensi mendekati batas.</p>}</div></article>
        </div>
      </section>}

      {tab === 'stores' && <section>
        <div className="mb-5"><h1 className="text-2xl font-black">Usaha Terdaftar</h1><p className="text-sm text-slate-500">Kelola status usaha dan lisensinya. Data transaksi tenant tidak dapat diedit dari sini.</p></div>
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row"><div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={18} className="text-slate-400" /><input value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} className="w-full py-2.5 outline-none" placeholder="Cari nama usaha atau alamat web..." /></div><select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="ALL">Semua status</option><option value="ACTIVE">Usaha aktif</option><option value="INACTIVE">Usaha nonaktif</option><option value="TRIAL">Trial aktif</option><option value="PREMIUM">Premium aktif</option><option value="EXPIRED">Lisensi berakhir</option><option value="SUSPENDED">Ditangguhkan</option></select></div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Usaha</th><th className="px-5 py-4">Owner</th><th className="px-5 py-4">Aktivitas</th><th className="px-5 py-4">Lisensi</th><th className="px-5 py-4">Terdaftar</th><th className="px-5 py-4"></th></tr></thead><tbody className="divide-y divide-slate-100">{stores.map((store) => <tr key={store.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`h-2.5 w-2.5 rounded-full ${store.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} /><div><p className="font-bold">{store.name}</p><p className="text-xs text-slate-400">{businessLabel(store.type)} · {store.slug}</p></div></div></td><td className="px-5 py-4"><p className="font-medium">{store.owner?.name || '-'}</p><p className="text-xs text-slate-400">{store.owner?.email || '-'}</p></td><td className="px-5 py-4"><p>{store.transactionCount} transaksi</p><p className="text-xs text-slate-400">{store.memberCount} user · {store.productCount} produk</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${licenseTone(store.license?.status)}`}>{store.license?.plan || 'BELUM ADA'} · {store.license?.status || '-'}</span><p className="mt-1 text-xs text-slate-400">s/d {safeDate(store.license?.expiresAt)}</p></td><td className="px-5 py-4 text-slate-500">{safeDate(store.createdAt)}</td><td className="px-5 py-4"><button onClick={() => setSelectedStore(store)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">Kelola</button></td></tr>)}</tbody></table></div>{!stores.length && <p className="py-12 text-center text-slate-400">Usaha tidak ditemukan.</p>}<div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm"><span className="text-slate-500">{pagination.total || 0} usaha</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronLeft size={17} /></button><span>{pagination.page} / {pagination.totalPages}</span><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronRight size={17} /></button></div></div></div>
      </section>}

      {tab === 'codes' && <section><div className="mb-5 flex items-start justify-between gap-4"><div><h1 className="text-2xl font-black">Token Aktivasi</h1><p className="text-sm text-slate-500">Owner memasukkan token pada menu Lisensi. Token hanya dapat digunakan satu kali.</p></div><button onClick={() => setShowCodeForm(true)} className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500"><KeyRound size={18} /> Buat Token</button></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Dibuat</th><th className="px-5 py-4">Durasi</th><th className="px-5 py-4">Batas pakai</th><th className="px-5 py-4">Catatan</th><th className="px-5 py-4">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{codes.map((code) => <tr key={code.id}><td className="px-5 py-4">{safeDate(code.createdAt)}</td><td className="px-5 py-4 font-bold">{code.durationDays} hari</td><td className="px-5 py-4">{safeDate(code.validUntil)}</td><td className="px-5 py-4 text-slate-500">{code.note || '-'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${code.redeemedAt ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>{code.redeemedAt ? `Dipakai ${code.redeemedByEmail || ''}` : 'Belum dipakai'}</span></td></tr>)}</tbody></table></div>{!codes.length && <p className="py-12 text-center text-slate-400">Belum ada token.</p>}</div></section>}

      {tab === 'audit' && <section><div className="mb-5"><h1 className="text-2xl font-black">Riwayat Tindakan</h1><p className="text-sm text-slate-500">Jejak perubahan penting oleh Super Admin.</p></div><div className="space-y-3">{logs.map((log) => <article key={log.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><div className="rounded-xl bg-slate-100 p-2 text-slate-500"><Activity size={18} /></div><div><p className="font-bold">{log.action.replaceAll('_', ' ')}</p><p className="text-xs text-slate-500">{log.targetType} {log.targetId ? `#${log.targetId}` : ''} · {log.admin?.name || 'Sistem'}</p></div></div><time className="text-xs text-slate-400">{safeDate(log.createdAt)}</time></article>)}{!logs.length && <p className="py-12 text-center text-slate-400">Belum ada riwayat.</p>}</div></section>}
    </div>

    {selectedStore && <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-5"><div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Kelola Usaha</p><h2 className="mt-1 text-xl font-black">{selectedStore.name}</h2><p className="text-sm text-slate-500">{selectedStore.slug} · {businessLabel(selectedStore.type)}</p></div><button onClick={() => setSelectedStore(null)} className="rounded-lg bg-slate-100 p-2"><X size={19} /></button></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Paket saat ini</p><p className="font-black">{selectedStore.license?.plan || '-'}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Berlaku sampai</p><p className="font-black">{safeDate(selectedStore.license?.expiresAt)}</p></div></div><label className="mt-5 block text-sm font-bold">Perpanjang lisensi</label><div className="mt-2 flex gap-2"><select value={licenseDays} onChange={(e) => setLicenseDays(e.target.value)} className="flex-1 rounded-xl border border-slate-200 px-3 py-3"><option value="30">30 hari</option><option value="90">90 hari</option><option value="180">180 hari</option><option value="365">365 hari</option></select><button disabled={busy} onClick={() => updateLicense('EXTEND')} className="rounded-xl bg-blue-600 px-5 font-bold text-white disabled:opacity-50">Perpanjang</button></div><label className="mt-5 block text-sm font-bold">Catatan/alasan <span className="font-normal text-slate-400">(opsional)</span></label><textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500" rows="2" placeholder="Contoh: pembayaran bulan Oktober" /><div className="mt-5 grid grid-cols-2 gap-2"><button disabled={busy} onClick={() => updateLicense(selectedStore.license?.status === 'SUSPENDED' ? 'ACTIVATE' : 'SUSPEND')} className="rounded-xl border border-amber-300 px-3 py-3 text-sm font-bold text-amber-700 disabled:opacity-50">{selectedStore.license?.status === 'SUSPENDED' ? 'Aktifkan Lisensi' : 'Tangguhkan Lisensi'}</button><button disabled={busy} onClick={updateStoreStatus} className={`rounded-xl border px-3 py-3 text-sm font-bold disabled:opacity-50 ${selectedStore.isActive ? 'border-red-300 text-red-700' : 'border-emerald-300 text-emerald-700'}`}>{selectedStore.isActive ? 'Nonaktifkan Usaha' : 'Aktifkan Usaha'}</button></div>{busy && <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={17} /> Menyimpan perubahan...</div>}</div></div>}

    {showCodeForm && <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-5"><form onSubmit={makeCode} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Lisensi</p><h2 className="text-xl font-black">Buat Token Aktivasi</h2></div><button type="button" onClick={() => setShowCodeForm(false)}><X /></button></div><label className="mt-5 block text-sm font-bold">Durasi lisensi</label><select value={codeDays} onChange={(e) => setCodeDays(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"><option value="30">30 hari</option><option value="90">90 hari</option><option value="180">180 hari</option><option value="365">365 hari</option></select><label className="mt-4 block text-sm font-bold">Token boleh dipakai sampai <span className="font-normal text-slate-400">(opsional)</span></label><input type="datetime-local" value={codeValidUntil} onChange={(e) => setCodeValidUntil(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /><label className="mt-4 block text-sm font-bold">Catatan <span className="font-normal text-slate-400">(opsional)</span></label><input value={codeNote} onChange={(e) => setCodeNote(e.target.value)} maxLength={255} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Contoh: Pelanggan A - Oktober" /><button disabled={busy === 'code'} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50">{busy === 'code' && <Loader2 className="animate-spin" size={18} />} Buat Token</button></form></div>}

    {newCode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-5"><div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><KeyRound /></div><h2 className="mt-4 text-xl font-black">Token berhasil dibuat</h2><p className="mt-2 text-sm text-slate-500">Salin sekarang. Demi keamanan, kode asli tidak dapat ditampilkan lagi.</p><div className="mt-5 break-all rounded-2xl bg-slate-950 p-4 font-mono text-lg font-bold tracking-wider text-white">{newCode}</div><button onClick={async () => { await navigator.clipboard.writeText(newCode); setNotice({ type: 'success', message: 'Token disalin.' }); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 font-bold"><Copy size={18} /> Salin Token</button><button onClick={() => setNewCode('')} className="mt-2 w-full rounded-xl bg-slate-900 py-3 font-bold text-white">Saya sudah menyimpan</button></div></div>}
  </main>;
}
