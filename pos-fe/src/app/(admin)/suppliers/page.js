"use client";

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, MapPin } from 'lucide-react';
import { showAlert } from '@/utils/swal';
import { useStore } from '@/store/useStore';
import SupplierModal from '@/components/SupplierModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function SuppliersPage() {
    const { token } = useStore();
    const [suppliers, setSuppliers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSuppliers = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_URL}/api/suppliers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setSuppliers(result.data);
            }
        } catch (error) {
            showAlert.error("Error", "Gagal mengambil data supplier");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchSuppliers();
    }, [token]);

    const handleSave = async (formData) => {
        try {
            const isEditing = !!selectedSupplier;
            const url = isEditing
                ? `${API_URL}/api/suppliers/${selectedSupplier.id}`
                : `${API_URL}/api/suppliers`;
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await res.json();
            if (result.success) {
                showAlert.success("Berhasil", result.message);
                setIsModalOpen(false);
                fetchSuppliers();
            } else {
                showAlert.error("Gagal", result.message);
            }
        } catch (error) {
            showAlert.error("Error", "Gagal menyimpan data");
        }
    };

    const handleDelete = async (id) => {
        const confirm = await showAlert.confirm(
            "Hapus Supplier?",
            "Data yang dihapus tidak dapat dikembalikan."
        );

        if (confirm) {
            try {
                const res = await fetch(`${API_URL}/api/suppliers/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (result.success) {
                    showAlert.success("Berhasil", "Supplier dihapus");
                    fetchSuppliers();
                } else {
                    showAlert.error("Gagal", result.message);
                }
            } catch (error) {
                showAlert.error("Error", "Gagal menghapus data");
            }
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.phone && s.phone.includes(searchQuery))
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section... */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Manajemen Supplier</h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola data pemasok barang</p>
                </div>
                <button
                    onClick={() => { setSelectedSupplier(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    <span>Tambah Supplier</span>
                </button>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cari berdasarkan nama atau no HP..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    />
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 h-40 animate-pulse">
                            <div className="h-6 w-1/2 bg-gray-200 rounded-md mb-4"></div>
                            <div className="h-4 w-3/4 bg-gray-100 rounded-md mb-2"></div>
                            <div className="h-4 w-2/3 bg-gray-100 rounded-md"></div>
                        </div>
                    ))}
                </div>
            ) : filteredSuppliers.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <div className="w-20 h-20 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <MapPin className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Tidak ada data</h3>
                    <p className="text-gray-500">Belum ada supplier yang ditambahkan atau ditemukan.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredSuppliers.map((supplier) => (
                        <div key={supplier.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{supplier.name}</h3>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => { setSelectedSupplier(supplier); setIsModalOpen(true); }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(supplier.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {supplier.phone && (
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                                            <Phone size={14} />
                                        </div>
                                        <span>{supplier.phone}</span>
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-start gap-3 text-sm text-gray-600">
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0 mt-0.5">
                                            <MapPin size={14} />
                                        </div>
                                        <span className="line-clamp-2 leading-relaxed">{supplier.address}</span>
                                    </div>
                                )}
                            </div>

                            {supplier.notes && (
                                <div className="mt-4 pt-4 border-t border-gray-50">
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Catatan</p>
                                    <p className="text-sm text-gray-600 line-clamp-2">{supplier.notes}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <SupplierModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={selectedSupplier}
            />
        </div>
    );
}
