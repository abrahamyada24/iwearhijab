import "./globals.css";

export const metadata = {
  title: "KasirPOS Dashboard",
  description: "Point of Sales Application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      {/* Kita biarkan body bersih (hanya antialiased).
        suppressHydrationWarning tetap dipasang untuk jaga-jaga.
      */}
      <body 
        className="antialiased" 
        suppressHydrationWarning={true}
      >
        {/* Pindahkan warna background dan text ke div wrapper ini.
          Ini membuat React lebih stabil karena div ini tidak akan disentuh oleh ekstensi browser.
        */}
        <div className="min-h-screen bg-gray-50 text-gray-900">
          {children}
        </div>
      </body>
    </html>
  );
}