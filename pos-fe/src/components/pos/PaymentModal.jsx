"use client";
import {
  X,
  Banknote,
  QrCode,
  Gift,
  CheckCircle2,
  Loader2,
  Printer,
} from "lucide-react";
export default function PaymentModal({
  isOpen,
  onClose,
  paymentStep,
  setPaymentStep,
  cashGiven,
  setCashGiven,
  handleCashInput,
  isCashSufficient,
  change,
  deficit,
  handleProcessTransaction,
  resetTransaction,
  isProcessing,
  hasReceipt,
  onOpenReceipt,
  grandTotal,
  formatNumber,
  member,
  onOpenRewards,
  pointsUsed = 0,
  onRemoveRewards,
}) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Pembayaran"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-800">Pembayaran</h2>
          {!isProcessing && paymentStep !== "SUCCESS" && (
            <button aria-label="Tutup pembayaran" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">
          {paymentStep === "SUCCESS" ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 size={48} className="mx-auto text-green-500" />
              <h3 className="text-xl font-bold text-gray-900">
                Pembayaran Berhasil
              </h3>
              {hasReceipt && (
                <button
                  onClick={onOpenReceipt}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-bold text-gray-700"
                >
                  <Printer size={18} /> Cetak / Lihat Struk
                </button>
              )}
              <button
                onClick={resetTransaction}
                className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white"
              >
                Transaksi Baru
              </button>
            </div>
          ) : (
            <>
              <div className="py-5 text-center">
                <p className="text-xs font-bold uppercase text-gray-400">
                  Total Tagihan
                </p>
                <h3 className="mt-2 text-4xl font-black text-gray-900">
                  Rp {formatNumber(grandTotal)}
                </h3>
              </div>
              {pointsUsed > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
                  <span>{pointsUsed} poin digunakan</span>
                  <button
                    disabled={isProcessing}
                    onClick={onRemoveRewards}
                    className="font-bold"
                  >
                    Batalkan Tukar
                  </button>
                </div>
              )}
              {paymentStep === "INPUT_CASH" ? (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700">
                    Uang diterima
                    <input
                      aria-label="Uang diterima"
                      inputMode="numeric"
                      value={cashGiven === 0 ? "" : formatNumber(cashGiven)}
                      onChange={handleCashInput}
                      className="mt-2 w-full rounded-xl border border-gray-200 p-4 text-xl text-gray-900"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setCashGiven(grandTotal)}
                      className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700"
                    >
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000].map((value) => (
                      <button
                        key={value}
                        onClick={() =>
                          setCashGiven((current) => current + value)
                        }
                        className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700"
                      >
                        +{formatNumber(value)}
                      </button>
                    ))}
                    <button
                      onClick={() => setCashGiven(0)}
                      className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800">
                    <span>{isCashSufficient ? "Kembalian" : "Kurang"}</span>
                    <span>
                      Rp {formatNumber(isCashSufficient ? change : deficit)}
                    </span>
                  </div>
                  <button
                    disabled={!isCashSufficient || isProcessing}
                    onClick={() => handleProcessTransaction("CASH")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-40"
                  >
                    {isProcessing && (
                      <Loader2 size={18} className="animate-spin" />
                    )}{" "}
                    Bayar Sekarang
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => setPaymentStep("SELECT")}
                    className="w-full py-2 text-sm text-gray-500"
                  >
                    Kembali
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {grandTotal > 0 ? (
                    <>
                      <button
                        disabled={isProcessing}
                        onClick={() => setPaymentStep("INPUT_CASH")}
                        className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left hover:border-blue-500"
                      >
                        <Banknote className="text-gray-500" />
                        <div>
                          <p className="font-bold text-gray-800">
                            Tunai (Cash)
                          </p>
                          <p className="text-xs text-gray-400">
                            Bayar manual dengan uang fisik
                          </p>
                        </div>
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() => handleProcessTransaction("QRIS_MANUAL")}
                        className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left hover:border-blue-500"
                      >
                        <QrCode className="text-gray-500" />
                        <div>
                          <p className="font-bold text-gray-800">QRIS</p>
                          <p className="text-xs text-gray-400">
                            Kasir konfirmasi pembayaran QRIS statis
                          </p>
                        </div>
                        {isProcessing && (
                          <Loader2 size={18} className="animate-spin" />
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={isProcessing}
                      onClick={() =>
                        handleProcessTransaction(pointsUsed ? "POINT" : "CASH")
                      }
                      className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-40"
                    >
                      {isProcessing ? "Memproses…" : "Selesaikan Pembayaran"}
                    </button>
                  )}
                  {member && (
                    <button
                      disabled={isProcessing}
                      onClick={onOpenRewards}
                      className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left hover:border-blue-500"
                    >
                      <Gift className="text-gray-500" />
                      <div>
                        <p className="font-bold text-gray-800">Tukar Point</p>
                        <p className="text-xs text-gray-400">
                          Tukar dengan item member ·{" "}
                          {Number(member.points || 0).toLocaleString("id-ID")}{" "}
                          poin
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
