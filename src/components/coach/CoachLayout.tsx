import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Users, Calendar, BookOpen, LogOut, Menu, X, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import BrandLogo from '../ui/BrandLogo';

// Design tokens — grafito atlético + acento "cronómetro"
const tokens = {
  '--ink-950': '#0A0E14',
  '--ink-900': '#10161F',
  '--ink-850': '#161D29',
  '--ink-800': '#1D2530',
  '--line-800': '#232B37',
  '--mist-500': '#6B7684',
  '--mist-300': '#9AA4B2',
  '--mist-100': '#E7EAEE',
  '--signal-500': '#FF5A1F',
  '--signal-600': '#E64A0F',
  '--pulse-500': '#34D399',
} as React.CSSProperties;

export default function CoachLayout({ coachName }: { coachName: string }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sp_sidebar_collapsed') === '1';
  });
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('sp_sidebar_collapsed', isCollapsed ? '1' : '0');
  }, [isCollapsed]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navLinks = [
    { to: '/athletes', icon: Users, label: 'Mis Atletas' },
    { to: '/planificacion', icon: Calendar, label: 'Clubes' },
    { to: '/library', icon: BookOpen, label: 'Biblioteca' },
  ];

  const initials = useMemo(() => {
    const parts = coachName.trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')) || 'C';
  }, [coachName]);

  return (
    <div
      className="flex h-[100dvh] bg-[var(--ink-950)] overflow-hidden font-sans antialiased selection:bg-[var(--signal-500)]/30"
      style={tokens}
    >
      <style>{`
        .font-display { font-family: 'Barlow Condensed', system-ui, sans-serif; }
      `}</style>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--ink-900)] border-b border-[var(--line-800)] text-[var(--mist-100)] flex items-center justify-between px-4 z-50 shadow-sm">
        <div className="flex items-center gap-2 h-8">
          <BrandLogo className="h-full w-auto drop-shadow-md" />
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isSidebarOpen}
          className="p-2 bg-[var(--ink-800)] rounded-lg text-[var(--mist-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] active:scale-95 transition-transform"
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar Overlay (mobile) */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-[var(--ink-950)]/80 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 flex flex-col
          bg-[var(--ink-900)] border-r border-[var(--line-800)]
          transition-[transform,width] duration-300 ease-out shadow-2xl md:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-20' : 'w-72'}
        `}
      >
        {/* Logo Area */}
        <div className={`h-20 flex items-center border-b border-[var(--line-800)] shrink-0 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
          <div className={`flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'h-10 w-10' : 'h-10 w-full justify-start'}`}>
            <BrandLogo className={`object-contain ${isCollapsed ? 'w-full h-full' : 'h-full w-auto'}`} />
          </div>
        </div>

        {/* Coach card */}
        <div className={`border-b border-[var(--line-800)] py-5 shrink-0 ${isCollapsed ? 'md:px-0 md:flex md:justify-center px-6' : 'px-6'}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center' : ''}`}>
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-[var(--ink-800)] border border-[var(--line-800)] flex items-center justify-center font-display font-bold text-sm text-[var(--mist-100)] shadow-inner">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--pulse-500)] ring-2 ring-[var(--ink-900)]" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-300">
                <p className="text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-widest">Entrenador</p>
                <p className="font-semibold text-[var(--mist-100)] truncate leading-tight">{coachName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsSidebarOpen(false)}
              title={isCollapsed ? link.label : undefined}
              className={({ isActive }) => `
                relative flex items-center gap-3 rounded-xl font-bold text-sm
                transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-900)]
                ${isCollapsed ? 'md:justify-center md:px-0 md:py-3.5 px-4 py-3.5' : 'px-4 py-3.5'}
                ${isActive
                  ? 'bg-[var(--ink-850)] text-[var(--mist-100)] shadow-sm'
                  : 'text-[var(--mist-300)] hover:bg-[var(--ink-850)] hover:text-[var(--mist-100)]'}
              `}
            >
              {({ isActive }) => (
                <>
                  {/* Carril activo — marca de pista estilo neón */}
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full bg-[var(--signal-500)] shadow-[0_0_8px_var(--signal-500)] transition-all duration-300 ${
                      isActive ? 'h-6 opacity-100' : 'h-0 opacity-0'
                    }`}
                  />
                  <link.icon size={20} className={isActive ? 'text-[var(--signal-500)]' : ''} />
                  {!isCollapsed && <span className="truncate">{link.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Colapsar (solo desktop) */}
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="hidden md:flex items-center justify-center gap-2 mx-3 mb-2 px-4 py-3 rounded-xl text-[var(--mist-500)] hover:bg-[var(--ink-850)] hover:text-[var(--mist-100)] transition-colors text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
        >
          {isCollapsed ? <ChevronsRight size={18} /> : <><ChevronsLeft size={18} /> Colapsar Menú</>}
        </button>

        {/* Logout */}
        <div className="p-3 border-t border-[var(--line-800)] shrink-0">
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Cerrar sesión' : undefined}
            className={`flex items-center gap-3 w-full rounded-xl font-bold text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
              isCollapsed ? 'md:justify-center md:px-0 md:py-3.5 px-4 py-3.5' : 'px-4 py-3.5'
            }`}
          >
            <LogOut size={20} />
            {!isCollapsed && 'Cerrar Sesión'}
          </button>
        </div>
      </aside>

      {/* Main Content con Outlet */}
      <main className="flex-1 relative overflow-y-auto pt-16 md:pt-0 bg-[var(--ink-950)]">
        <Outlet />
      </main>
    </div>
  );
}