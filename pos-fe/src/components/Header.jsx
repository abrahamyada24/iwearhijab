"use client";

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';

export default function Header({ toggleSidebar }) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options = {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      };
      setCurrentDate(now.toLocaleDateString('id-ID', options));
    };

    updateDate();

    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 z-40 sticky top-0">
      <button
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu size={24} />
      </button>

      <div className="flex items-center gap-4 ml-auto">
        <div className="text-right hidden md:block">
          <p className="text-xs text-gray-500 font-medium">
            {currentDate || 'Memuat tanggal...'}
          </p>
          <p className="text-sm font-bold text-gray-800 tracking-wide">
            KasirPOS
          </p>
        </div>
      </div>
    </header>
  );
}