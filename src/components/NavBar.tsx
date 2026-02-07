'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/live', label: 'Live Tracker' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[rgba(15,15,18,0.8)] backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-sm">
            <span role="img" aria-label="basketball">&#127936;</span>
          </div>
          <span className="text-white font-semibold font-display text-sm">NBA 3PM</span>
        </div>
        <div className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
