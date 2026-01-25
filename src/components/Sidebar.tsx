export function Sidebar() {
  return (
    <div className="w-20 bg-[#1a1a1f] flex flex-col items-center py-6 gap-8">
      {/* Logo */}
      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-2xl">
        <span role="img" aria-label="basketball">&#127936;</span>
      </div>

      {/* Nav Icons */}
      <nav className="flex flex-col gap-4">
        <NavIcon icon="&#128202;" active />
        <NavIcon icon="&#128200;" />
        <NavIcon icon="&#9881;" />
      </nav>
    </div>
  );
}

function NavIcon({ icon, active = false }: { icon: string; active?: boolean }) {
  return (
    <button
      className={['w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all',
        active ? 'bg-white/10' : 'hover:bg-white/5'
      ].join(' ')}
      dangerouslySetInnerHTML={{ __html: icon }}
    />
  );
}
