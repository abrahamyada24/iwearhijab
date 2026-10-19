import "./globals.css";
import localFont from 'next/font/local';

const geist = localFont({
  src: './fonts/Geist-Variable.woff2',
  variable: '--font-geist',
  weight: '100 900',
  display: 'swap',
});

export const metadata = {
  title: "Iwearing Hijab Dashboard",
  description: "Point of Sales Application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={geist.variable}>
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
