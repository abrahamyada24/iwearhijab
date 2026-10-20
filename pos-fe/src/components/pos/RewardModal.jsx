"use client";
import { useEffect, useState } from "react";
import { X, Minus, Plus } from "lucide-react";
export default function RewardModal({
  isOpen,
  onClose,
  member,
  cart,
  pointsPerReward,
  quantities,
  onApply,
}) {
  const [draft, setDraft] = useState({});
  useEffect(() => {
    if (isOpen) setDraft(quantities);
  }, [isOpen, quantities]);
  if (!isOpen || !member) return null;
  const max = Math.floor(Number(member.points || 0) / pointsPerReward);
  const count = Object.values(draft).reduce((sum, value) => sum + value, 0);
  const change = (item, delta) =>
    setDraft((current) => ({
      ...current,
      [item.id]: Math.max(
        0,
        Math.min(item.qty, (current[item.id] || 0) + delta),
      ),
    }));
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 id="reward-title" className="text-lg font-bold text-gray-900">
            Pilih Produk Gratis
          </h2>
          <button
            aria-label="Tutup penukaran poin"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-2"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {pointsPerReward} poin = 1 produk. Tersedia {max} penukaran; sisanya
          boleh disimpan.
        </p>
        <div className="my-5 max-h-[45vh] space-y-4 overflow-y-auto">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-bold text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-500">
                  Rp {Number(item.price).toLocaleString("id-ID")} · {item.qty}{" "}
                  di keranjang
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  aria-label={`Kurangi penukaran ${item.name}`}
                  disabled={!draft[item.id]}
                  onClick={() => change(item, -1)}
                  className="rounded-full bg-gray-100 p-2 disabled:opacity-40"
                >
                  <Minus size={16} />
                </button>
                <span className="min-w-4 text-center font-bold text-gray-900">
                  {draft[item.id] || 0}
                </span>
                <button
                  aria-label={`Tambah penukaran ${item.name}`}
                  disabled={count >= max || (draft[item.id] || 0) >= item.qty}
                  onClick={() => change(item, 1)}
                  className="rounded-full bg-blue-600 p-2 text-white disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mb-3 flex justify-between text-sm font-bold">
          <span className="text-gray-600">Dipakai</span>
          <span className="text-blue-600">
            {count * pointsPerReward} poin · {count} produk
          </span>
        </div>
        <button
          disabled={count === 0 || count > max}
          onClick={() => onApply(draft)}
          className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-40"
        >
          Gunakan Poin
        </button>
      </div>
    </div>
  );
}
