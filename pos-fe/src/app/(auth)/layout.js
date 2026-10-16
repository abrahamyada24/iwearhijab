export const metadata = {
  title: 'Masuk ke KasirPOS',
  description: 'Masuk atau daftarkan usaha retail dan F&B di KasirPOS',
};

export default function AuthLayout({ children }) {
  const scrollImages1 = [
    {
      src: '/login-visuals/retail-boutique.webp',
      alt: 'Butik pakaian dengan rak dan meja kasir',
      category: 'Retail',
      caption: 'Kelola stok dan penjualan dengan rapi',
    },
    {
      src: '/login-visuals/fnb-cafe.webp',
      alt: 'Kafe dengan meja kasir dan etalase makanan',
      category: 'F&B',
      caption: 'Catat pesanan dan transaksi lebih praktis',
    },
    {
      src: '/login-visuals/retail-shop.webp',
      alt: 'Toko retail dengan rak produk dan meja kasir',
      category: 'Retail',
      caption: 'Pantau produk dan usaha dari satu tempat',
    },
  ];

  const scrollImages2 = [
    {
      src: '/login-visuals/retail-shop.webp',
      alt: 'Toko retail dengan rak produk dan meja kasir',
      category: 'Retail',
      caption: 'Pantau produk dan usaha dari satu tempat',
    },
    {
      src: '/login-visuals/retail-boutique.webp',
      alt: 'Butik pakaian dengan rak dan meja kasir',
      category: 'Retail',
      caption: 'Kelola stok dan penjualan dengan rapi',
    },
    {
      src: '/login-visuals/fnb-cafe.webp',
      alt: 'Kafe dengan meja kasir dan etalase makanan',
      category: 'F&B',
      caption: 'Catat pesanan dan transaksi lebih praktis',
    },
  ];

  const VisualCard = ({ image }) => (
    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-lg bg-gray-200">
      <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/70 to-transparent px-5 pb-5 pt-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/90">{image.category}</p>
        <p className="mt-1 text-lg font-black text-white">{image.caption}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#EBEDF2] overflow-hidden font-sans">
      
      <div className="hidden lg:flex flex-[1.2] gap-4 p-4 h-full min-w-0 relative">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#EBEDF2] to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#EBEDF2] to-transparent z-10 pointer-events-none" />

        <div className="flex-1 min-w-0 relative overflow-hidden">
          <div className="animate-scroll-up space-y-4">
            {[...scrollImages1, ...scrollImages1].map((image, idx) => (
              <VisualCard key={`${image.src}-${idx}`} image={image} />
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 relative overflow-hidden">
          <div className="animate-scroll-down space-y-4">
            {[...scrollImages2, ...scrollImages2].map((image, idx) => (
              <VisualCard key={`${image.src}-${idx}`} image={image} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start lg:items-center justify-center p-4 lg:p-12 h-full overflow-y-auto bg-white lg:rounded-l-[40px] shadow-2xl z-20 relative">
        <div className="w-full max-w-[440px]">
            {children}
        </div>
      </div>

    </div>
  );
}
