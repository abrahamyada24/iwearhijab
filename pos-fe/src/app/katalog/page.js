/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  ChevronLeft,
  ImageIcon,
  MapPin,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  X,
} from "lucide-react";
import { showAlert } from "@/utils/swal";

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_URL = RAW_API_URL.replace(/\/api$/, "").replace(/\/$/, "");
const ALL_CATEGORIES = "ALL";

function WhatsAppLogo({ size = 20, className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.005-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.981.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.81 9.81 0 0 1 7.021 2.91 9.825 9.825 0 0 1 2.9 7.029c-.002 5.45-4.437 9.884-9.889 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

const isUnlimitedStock = (item) =>
  item?.isUnlimitedStock === true ||
  item?.isUnlimitedStock === 1 ||
  item?.isUnlimitedStock === "1";

const isAvailable = (item) =>
  isUnlimitedStock(item) || Number(item?.stock || 0) > 0;

function CatalogImage({ src, alt, className = "", eager = false }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 text-orange-300 ${className}`}
        role="img"
        aria-label={`Gambar ${alt} belum tersedia`}
      >
        <ImageIcon size={38} strokeWidth={1.6} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={640}
      height={640}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
      <div className="aspect-square animate-pulse bg-orange-50" />
      <div className="space-y-3 p-3">
        <div className="h-3 w-20 animate-pulse rounded-full bg-stone-100" />
        <div className="h-4 w-full animate-pulse rounded-full bg-stone-100" />
        <div className="h-5 w-28 animate-pulse rounded-full bg-stone-100" />
        <div className="h-9 w-full animate-pulse rounded-xl bg-stone-100" />
      </div>
    </div>
  );
}

export default function KatalogPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [sortBy, setSortBy] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const getImageUrl = useCallback((path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  }, []);

  const fetchCatalog = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch(`${API_URL}/api/catalog`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Katalog belum tersedia.");
      }

      const regularProducts = Array.isArray(payload.data?.products)
        ? payload.data.products.map((product) => ({
            ...product,
            originalPrice: Number(product.originalPrice ?? product.price),
            price: Number(product.effectivePrice ?? product.price),
          }))
        : [];
      setProducts(regularProducts);
      setCategories(Array.isArray(payload.data?.categories) ? payload.data.categories : []);
      setSettings(payload.data?.settings || null);
    } catch (error) {
      setLoadError(
        error?.name === "AbortError"
          ? "Koneksi ke katalog terlalu lama. Silakan coba lagi."
          : error?.message || "Gagal mengambil katalog."
      );
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    if (!selectedProduct) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProduct]);

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLocaleLowerCase("id-ID");
    const result = products.filter((product) => {
      const searchable = `${product.name || ""} ${product.category?.name || ""}`.toLocaleLowerCase("id-ID");
      const matchesSearch = !keyword || searchable.includes(keyword);
      const matchesCategory =
        selectedCategory === ALL_CATEGORIES ||
        String(product.categoryId) === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "price-low") return Number(a.price) - Number(b.price);
      if (sortBy === "price-high") return Number(b.price) - Number(a.price);
      if (sortBy === "name") return String(a.name).localeCompare(String(b.name), "id");
      const promoDifference = Number(Boolean(b.isDiscountActive)) - Number(Boolean(a.isDiscountActive));
      if (promoDifference) return promoDifference;
      return String(a.name).localeCompare(String(b.name), "id");
    });
  }, [products, searchQuery, selectedCategory, sortBy]);

  const getStockLabel = (product) => {
    if (isUnlimitedStock(product)) return "Stok tersedia";
    const stock = Number(product.stock) || 0;
    if (stock <= 0) return "Stok habis";
    if (stock <= 5) return `Tersisa ${stock}`;
    return `${stock} tersedia`;
  };

  const openWhatsApp = (product = null) => {
    let phone = settings?.phone || "";
    phone = String(phone).trim();

    if (!phone) {
      showAlert.warning(
        "WhatsApp belum tersedia",
        "Nomor WhatsApp toko belum diatur oleh admin."
      );
      return;
    }

    if (phone.startsWith("0")) phone = `62${phone.slice(1)}`;
    phone = phone.replace(/\D/g, "");
    const message = product
      ? `Halo ${settings?.storeName || "Iwearing Hijab"}, saya tertarik dengan *${product.name}* (${formatRupiah(product.price)}). Apakah masih tersedia?`
      : `Halo ${settings?.storeName || "Iwearing Hijab"}, saya ingin bertanya tentang koleksi boneka yang tersedia.`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8f4] text-stone-900">
        <div className="border-b border-orange-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="h-14 w-64 animate-pulse rounded-2xl bg-orange-50" />
            <div className="mt-4 h-12 w-full animate-pulse rounded-2xl bg-stone-100" />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }, (_, index) => (
              <ProductSkeleton key={index} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8f4] px-5 text-center">
        <div className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-7 shadow-xl shadow-orange-100/60">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertCircle size={27} />
          </div>
          <h1 className="text-xl font-black text-stone-950">Katalog belum dapat dimuat</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">{loadError}</p>
          <button
            type="button"
            onClick={fetchCatalog}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 font-extrabold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700"
          >
            <RefreshCw size={18} />
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  const storeName = settings?.storeName || "Iwearing Hijab";
  const logoUrl = getImageUrl(settings?.logoUrl);

  return (
    <main className="min-h-screen bg-[#fff8f4] pb-24 text-stone-900 sm:pb-10">
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="bg-gradient-to-r from-orange-600 via-rose-500 to-fuchsia-500 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs font-semibold sm:px-6 lg:px-8">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} /> Koleksi boneka pilihan untuk setiap momen
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <ShieldCheck size={14} /> Stok langsung dari toko
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 shadow-sm sm:h-14 sm:w-14">
              {logoUrl ? (
                <CatalogImage src={logoUrl} alt={`Logo ${storeName}`} className="h-full w-full object-contain p-1" eager />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-orange-500">
                  <Store size={26} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-black tracking-tight text-stone-950 sm:text-xl">
                {storeName}
              </h1>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-stone-500">
                <MapPin size={13} className="shrink-0 text-orange-500" />
                {settings?.address || "Katalog boneka dan hadiah"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openWhatsApp()}
              className="hidden h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-extrabold text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-700 sm:flex"
            >
              <WhatsAppLogo size={18} /> Hubungi Toko
            </button>
          </div>

          <div className="mt-3 flex h-12 items-center gap-2 rounded-2xl border-2 border-orange-500 bg-white px-4 shadow-sm focus-within:ring-4 focus-within:ring-orange-100">
            <Search size={20} className="shrink-0 text-orange-500" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari boneka, ukuran, atau kategori..."
              aria-label="Cari produk"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-medium placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Hapus pencarian"
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="border-b border-orange-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Belanja berdasarkan</p>
              <h2 className="mt-0.5 text-lg font-black text-stone-950">Kategori Boneka</h2>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
              {products.length} produk
            </span>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {[{ id: ALL_CATEGORIES, name: "Semua Produk" }, ...categories].map((category) => {
              const id = String(category.id);
              const active = selectedCategory === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedCategory(id)}
                  className={`shrink-0 rounded-2xl border px-4 py-2.5 text-sm font-extrabold transition ${
                    active
                      ? "border-orange-600 bg-orange-600 text-white shadow-md shadow-orange-100"
                      : "border-stone-200 bg-white text-stone-600 hover:border-orange-300 hover:text-orange-700"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-stone-950">
              {filteredProducts.length} produk ditemukan
            </p>
            <p className="mt-0.5 hidden text-xs text-stone-500 sm:block">
              Klik produk untuk melihat foto dan detail lebih lengkap.
            </p>
          </div>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-600 shadow-sm">
            <ArrowDownUp size={15} className="text-orange-500" />
            <span className="hidden sm:inline">Urutkan</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Urutkan produk"
              className="bg-transparent font-bold outline-none"
            >
              <option value="featured">Rekomendasi</option>
              <option value="name">Nama A-Z</option>
              <option value="price-low">Harga terendah</option>
              <option value="price-high">Harga tertinggi</option>
            </select>
          </label>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-orange-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-400">
              <ShoppingBag size={30} />
            </div>
            <h2 className="mt-4 text-lg font-black text-stone-900">Produk tidak ditemukan</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">
              Coba kata pencarian lain atau pilih kategori Semua Produk.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory(ALL_CATEGORIES);
              }}
              className="mt-5 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-extrabold text-white"
            >
              Tampilkan Semua
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product, index) => {
              const productImage = getImageUrl(product.imageUrl);
              const available = isAvailable(product);

              return (
                <article
                  key={product.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/70"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="relative block aspect-square w-full overflow-hidden bg-orange-50 text-left"
                    aria-label={`Lihat detail ${product.name}`}
                  >
                    <CatalogImage
                      src={productImage}
                      alt={product.name}
                      eager={index < 4}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    {product.isDiscountActive && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[10px] font-black uppercase text-white shadow-md">
                        <Tag size={11} /> {product.discountLabel || "Promo"}
                      </span>
                    )}
                    {!available && (
                      <div className="absolute inset-0 flex items-center justify-center bg-stone-950/45">
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-stone-800">
                          Stok Habis
                        </span>
                      </div>
                    )}
                  </button>

                  <div className="flex flex-1 flex-col p-3">
                    <p className="truncate text-[10px] font-black uppercase tracking-wider text-orange-600">
                      {product.category?.name || "Boneka"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="mt-1 min-h-10 text-left text-sm font-bold leading-5 text-stone-800 line-clamp-2 hover:text-orange-700"
                    >
                      {product.name}
                    </button>
                    <div className="mt-2">
                      {product.isDiscountActive && (
                        <p className="text-[10px] font-medium text-stone-400 line-through">
                          {formatRupiah(product.originalPrice)}
                        </p>
                      )}
                      <p className={`text-base font-black tracking-tight ${product.isDiscountActive ? "text-red-600" : "text-orange-700"}`}>
                        {formatRupiah(product.price)}
                      </p>
                    </div>
                    <p className={`mt-1 text-[11px] font-bold ${available ? "text-stone-500" : "text-red-500"}`}>
                      {getStockLabel(product)}
                    </p>
                    <button
                      type="button"
                      disabled={!available}
                      onClick={() => openWhatsApp(product)}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                    >
                      <WhatsAppLogo size={15} /> Tanya Produk
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-orange-100 bg-white/95 p-3 backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={() => openWhatsApp()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-100"
        >
          <WhatsAppLogo size={19} /> Chat Toko via WhatsApp
        </button>
      </div>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Detail ${selectedProduct.name}`}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600 sm:hidden"
                aria-label="Kembali"
              >
                <ChevronLeft size={21} />
              </button>
              <p className="font-black text-stone-900">Detail Produk</p>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
                aria-label="Tutup detail"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid gap-0 md:grid-cols-2">
              <div className="aspect-square overflow-hidden bg-orange-50">
                <CatalogImage
                  src={getImageUrl(selectedProduct.imageUrl)}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                  eager
                />
              </div>
              <div className="flex flex-col p-5 sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                  {selectedProduct.category?.name || "Boneka"}
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-stone-950 sm:text-3xl">
                  {selectedProduct.name}
                </h2>
                <div className="mt-5 rounded-2xl bg-orange-50 p-4">
                  {selectedProduct.isDiscountActive && (
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-black uppercase text-white">
                        {selectedProduct.discountLabel || "Promo"}
                      </span>
                      <span className="text-xs font-semibold text-stone-400 line-through">
                        {formatRupiah(selectedProduct.originalPrice)}
                      </span>
                    </div>
                  )}
                  <p className="text-2xl font-black text-orange-700">
                    {formatRupiah(selectedProduct.price)}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-bold text-stone-500">
                    <Package size={18} className="text-orange-500" /> Ketersediaan
                  </span>
                  <span className={`text-sm font-black ${isAvailable(selectedProduct) ? "text-emerald-700" : "text-red-600"}`}>
                    {getStockLabel(selectedProduct)}
                  </span>
                </div>

                {Array.isArray(selectedProduct.addons) && selectedProduct.addons.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-orange-700">
                      Opsi tambahan tersedia
                    </p>
                    <div className="mt-3 space-y-2">
                      {selectedProduct.addons.map((addon) => (
                        <div key={addon.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-stone-700">{addon.name}</span>
                          <span className="shrink-0 font-black text-orange-700">+ {formatRupiah(addon.price)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] leading-4 text-stone-500">
                      Pilih jumlah dan detailnya saat menghubungi toko melalui WhatsApp.
                    </p>
                  </div>
                )}

                <div className="mt-auto pt-6">
                  <p className="mb-3 text-xs leading-5 text-stone-500">
                    Konfirmasi warna, ukuran, dan ketersediaan terbaru langsung dengan toko sebelum memesan.
                  </p>
                  <button
                    type="button"
                    disabled={!isAvailable(selectedProduct)}
                    onClick={() => openWhatsApp(selectedProduct)}
                    className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:bg-stone-300"
                  >
                    <WhatsAppLogo size={20} /> Tanya Produk via WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
