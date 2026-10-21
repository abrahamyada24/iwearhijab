"use client";
import React, { useEffect, useState } from 'react';
import { Wallet, Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import { showAlert } from '@/utils/swal';
import CurrencyInput from '@/components/CurrencyInput';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const EXPENSE_CATEGORIES = ['Umum', 'Operasional', 'Konveksi', 'Gaji'];

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ description: '', amount: '', category: 'Umum', type: 'EXPENSE' });
    const [categoryFilter, setCategoryFilter] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
    const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

    const loadExpenses = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ startDate, endDate });
            if (categoryFilter) params.set('category', categoryFilter);
            const res = await fetch(`${API_URL}/api/expenses?${params}`, { headers: headers(), credentials: 'include' });
            const data = await res.json();
            if (data.success) { setExpenses(data.data); setTotal(data.total); }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { loadExpenses(); }, [startDate, endDate, categoryFilter]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/expenses`, {
                method: 'POST',
                headers: headers(),
                credentials: 'include',
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Pengeluaran belum dapat disimpan.');
            if (data.success) {
                setShowForm(false);
                setForm({ description: '', amount: '', category: 'Umum', type: 'EXPENSE' });
                loadExpenses();
            }
        } catch (e) { showAlert.error('Gagal menyimpan pengeluaran', e.message || 'Silakan coba lagi.'); }
    };

    const handleDelete = async (id) => {
        const confirmed = await showAlert.confirmDanger('Hapus pengeluaran?', 'Catatan pengeluaran ini tidak dapat dikembalikan.', 'Ya, Hapus');
        if (!confirmed) return;
        try {
            const response = await fetch(`${API_URL}/api/expenses/${id}`, { method: 'DELETE', headers: headers() });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || data.error);
            loadExpenses();
            showAlert.success('Pengeluaran dihapus', 'Catatan berhasil dihapus.');
        } catch (e) { showAlert.error('Gagal menghapus', e.message || 'Coba lagi.'); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">Pengeluaran</h1>
                    <p className="text-sm text-gray-500 mt-1">Pencatatan pengeluaran perusahaan</p>
                </div>
                <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg">
                    <Plus size={18} /> Tambah
                </button>
            </div>

            <section aria-label="Total pengeluaran" className="rounded-2xl border border-gray-900 bg-gray-900 p-4 text-white shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total</p>
                <p className="text-xl font-black mt-1">{formatRp(total)}</p>
                <p className="text-[10px] mt-1 text-gray-400">{expenses.length} catatan</p>
            </section>

            {/* Date Filter */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200">
                    <Calendar size={16} className="text-gray-400" />
                    <input type="date" aria-label="Tanggal awal pengeluaran" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="min-w-0 text-sm font-medium text-gray-700 outline-none" />
                    <span className="text-gray-400">—</span>
                    <input type="date" aria-label="Tanggal akhir pengeluaran" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="min-w-0 text-sm font-medium text-gray-700 outline-none" />
                </div>
                <select aria-label="Filter kategori pengeluaran" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-blue-500">
                    <option value="">Semua Kategori</option>
                    {EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
            </div>

            {/* Add Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                        <h2 className="text-lg font-bold text-gray-800">Tambah Pengeluaran</h2>


                        <input required placeholder="Deskripsi" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-blue-500 outline-none" />
                        <CurrencyInput required placeholder="Jumlah (Rp)" value={form.amount} onChange={value => setForm({ ...form, amount: value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-blue-500 outline-none" />
                        <select aria-label="Kategori pengeluaran" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-blue-500 outline-none">
                            {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Batal</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800">Simpan</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Expenses Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-20 text-gray-400"><Wallet size={48} className="mx-auto mb-3 opacity-50" /><p className="font-medium">Belum ada pengeluaran</p></div>
                ) : (
                    <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Tanggal</th>
                            <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Deskripsi</th>
                            <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Kategori</th>
                            <th className="text-right px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Jumlah</th>
                            <th className="px-6 py-3.5"></th>
                        </tr></thead>
                        <tbody>
                            {expenses.map(e => (
                                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(e.createdAt).toLocaleDateString('id-ID')}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{e.description}</td>
                                    <td className="px-6 py-4"><span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">{e.category}</span></td>
                                    <td className="px-6 py-4 text-sm font-bold text-red-600 text-right">{formatRp(Number(e.amount))}</td>
                                    <td className="px-6 py-4 text-right"><button onClick={() => handleDelete(e.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
