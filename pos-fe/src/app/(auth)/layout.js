export const metadata = {
  title: 'Akses POS System',
  description: 'Masuk ke dashboard aplikasi kasir',
};

export default function AuthLayout({ children }) {
  const scrollImages1 = [
    { src: '/login-visuals/plush-05.jpg', alt: 'Koleksi boneka karakter warna-warni' },
    { src: '/login-visuals/plush-01.jpg', alt: 'Boneka beruang lembut' },
    { src: '/login-visuals/plush-03.jpg', alt: 'Koleksi boneka hewan anak' },
  ];

  const scrollImages2 = [
    { src: '/login-visuals/plush-03.jpg', alt: 'Boneka dinosaurus dan beruang' },
    { src: '/login-visuals/plush-05.jpg', alt: 'Koleksi boneka lucu' },
    { src: '/login-visuals/plush-01.jpg', alt: 'Boneka teddy bear' },
  ];

  const VisualCard = ({ image }) => (
    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-lg bg-gray-200">
      <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/70 to-transparent px-5 pb-5 pt-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/90">Warna Warni</p>
        <p className="mt-1 text-lg font-black text-white">Temukan teman peluk favoritmu</p>
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

      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 h-full bg-white lg:rounded-l-[40px] shadow-2xl z-20 relative">
        <div className="w-full max-w-[440px]">
            {children}
        </div>
      </div>

    </div>
  );
}
