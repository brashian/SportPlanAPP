import React, { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import BrandLogo from '../ui/BrandLogo';

interface Props {
  athleteName: string;
  children: React.ReactNode;
}

const tokens = {
  "--ink-950": "#0A0E14",
  "--ink-900": "#10161F",
  "--ink-850": "#161D29",
  "--ink-800": "#1D2530",
  "--line-800": "#232B37",
  "--mist-500": "#6B7684",
  "--mist-300": "#9AA4B2",
  "--mist-100": "#E7EAEE",
  "--signal-500": "#FF5A1F",
  "--signal-600": "#E64A0F",
  "--pulse-500": "#34D399",
} as React.CSSProperties;

export default function AthleteLayout({ athleteName, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const Logo = () => (
    <div className="flex items-center justify-center h-8 sm:h-10 w-auto px-2">
      {/* Eliminamos el drop-shadow para que el celular lo renderice nítido */}
      <BrandLogo className="w-auto h-full" />
    </div>
  );

  return (
    // Agregamos 'antialiased' para forzar tipografías limpias en móviles
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-[var(--ink-950)] font-sans antialiased text-[var(--mist-100)]" style={tokens}>
      <style>{`.font-display { font-family: 'Barlow Condensed', system-ui, sans-serif; }`}</style>

      {/* Navbar Mobile - Sin backdrop blur pesado */}
      <div className="md:hidden bg-[var(--ink-900)] border-b border-[var(--line-800)] p-4 flex justify-between items-center fixed top-0 left-0 w-full z-50 h-16 shadow-sm">
        <Logo />
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-lg transition-colors text-[var(--mist-100)]">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay - Usamos opacidad sólida en vez de blur */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[var(--ink-950)]/80 z-30" onClick={() => setIsOpen(false)} />
      )}

      <div className={`${isOpen ? "fixed inset-y-0 top-16 left-0 flex flex-col z-40 w-72 shadow-2xl" : "hidden"} md:relative md:inset-auto md:top-0 md:flex md:flex-col w-72 bg-[var(--ink-900)] border-r border-[var(--line-800)] shrink-0 transition-all`}>
        <div className="p-6 hidden md:block border-b border-[var(--line-800)]">
          <Logo />
          <p className="text-sm font-medium text-[var(--mist-500)] mt-5 truncate text-center">
            Atleta: <span className="font-bold text-[var(--mist-100)]">{athleteName}</span>
          </p>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar"></nav>

        <div className="p-4 border-t border-[var(--line-800)] flex flex-col gap-4">
          <button onClick={() => signOut(auth)} className="flex items-center justify-center gap-3 px-4 py-3 w-full text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all font-bold">
            <LogOut size={18} /> Cerrar Sesión
          </button>
          <div className="text-center pt-2 pb-2">
            <p className="text-[10px] text-[var(--mist-500)] font-bold tracking-widest uppercase">SportPlan V2.0</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[var(--ink-950)] relative z-10 pt-16 md:pt-0">
        {children}
      </div>
    </div>
  );
}