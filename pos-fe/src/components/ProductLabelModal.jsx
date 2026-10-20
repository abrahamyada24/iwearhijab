"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, Printer, Download } from "lucide-react";
import {
  createReceiptImageBlob,
  downloadReceiptImage,
} from "@/utils/receiptImage";
import { hasThermalPrinter, printThermalReceipt } from "@/utils/thermalPrinter";
import { showAlert } from "@/utils/swal";
export default function ProductLabelModal({ product, onClose }) {
  const [qr, setQr] = useState("");
  const label = useRef(null);
  useEffect(() => {
    let active = true;
    setQr("");
    if (product)
      QRCode.toDataURL(product.barcode || product.sku, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: "M",
      })
        .then((value) => {
          if (active) setQr(value);
        })
        .catch((error) => showAlert.error("Label gagal", error.message));
    return () => {
      active = false;
    };
  }, [product]);
  if (!product) return null;
  const print = async () => {
    try {
      if (hasThermalPrinter()) await printThermalReceipt(label.current);
      else window.print();
    } catch (error) {
      showAlert.error("Gagal mencetak label", error.message);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-title"
    >
      <style>{`@media print {body *{visibility:hidden!important} #product-qr-label,#product-qr-label *{visibility:visible!important} #product-qr-label{position:fixed!important;left:0!important;top:0!important;box-shadow:none!important}@page{size:58mm auto;margin:0}}`}</style>
      <div className="w-full max-w-md rounded-3xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="label-title" className="font-bold text-gray-900">
            Label Produk
          </h2>
          <button onClick={onClose} aria-label="Tutup label">
            <X size={20} />
          </button>
        </div>
        <div
          id="product-qr-label"
          ref={label}
          className="mx-auto flex items-center gap-2 rounded-lg border border-black bg-white p-2 text-black"
          style={{
            width: "54mm",
            minHeight: "28mm",
            fontFamily: "Arial, Helvetica, sans-serif",
            boxSizing: "border-box",
          }}
        >
          {qr && (
            <img
              src={qr}
              alt={`QR ${product.sku}`}
              style={{ width: "20mm", height: "20mm", flexShrink: 0 }}
            />
          )}
          <div
            style={{
              fontSize: "11px",
              lineHeight: 1.25,
              overflowWrap: "anywhere",
            }}
          >
            <strong>{product.name}</strong>
            {product.variant && <div>{product.variant}</div>}
            {product.color && <div>{product.color}</div>}
            <div style={{ marginTop: "5px", fontSize: "14px" }}>
              Rp{" "}
              {Number(product.effectivePrice ?? product.price).toLocaleString(
                "id-ID",
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            disabled={!qr}
            onClick={async () => {
              try {
                downloadReceiptImage(
                  await createReceiptImageBlob(label.current),
                  `Label-${product.sku}.png`,
                );
              } catch (error) {
                showAlert.error("Unduh gagal", error.message);
              }
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700"
          >
            <Download size={16} /> Unduh
          </button>
          <button
            disabled={!qr}
            onClick={print}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"
          >
            <Printer size={16} /> Cetak Label
          </button>
        </div>
      </div>
    </div>
  );
}
