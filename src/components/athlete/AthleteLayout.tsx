import React, { useState } from "react";
import { Menu, X, LogOut, Dumbbell } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

interface Props {
  athleteName: string;
  children: React.ReactNode;
}

// Mismos design tokens que CoachLayout (grafito atlético + acento "cronómetro"),
// para que la vista del atleta comparta look & feel con la del coach.
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
    <div className="flex items-center gap-2 font-display font-bold text-2xl tracking-wide text-[var(--mist-100)]">
      <div className="w-8 h-8 bg-[var(--signal-500)] rounded-lg flex items-center justify-center shrink-0">
        <Dumbbell size={16} className="text-[var(--ink-950)]" />
      </div>
      SPORTPLAN
    </div>
  );

  return (
    <div
      className="flex flex-col md:flex-row min-h-screen bg-[var(--ink-950)] font-sans"
      style={tokens}
    >
      {/* Fuentes: agregar en index.html —
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet">
      */}
      <style>{`
        .font-display { font-family: 'Barlow Condensed', system-ui, sans-serif; }
      `}</style>

      {/* Navbar Móvil */}
      <div className="md:hidden bg-[var(--ink-900)] border-b border-[var(--line-800)] p-4 flex justify-between items-center shadow-md fixed top-0 left-0 w-full z-50 h-16">
        <Logo />
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isOpen}
          className="p-2 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-lg transition-colors text-[var(--mist-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* BUGFIX: overlay para poder cerrar el menú mobile tocando afuera (antes
          solo cerraba con el botón X, inconsistente con CoachLayout). El panel
          queda angosto (w-72) para dejar un área "afuera" tocable. */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 top-16 bg-[var(--ink-950)]/70 backdrop-blur-sm z-30 motion-reduce:backdrop-blur-none"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menú Lateral */}
      <div
        className={`
          ${isOpen ? "fixed inset-y-0 top-16 left-0 flex flex-col z-40 w-72 shadow-2xl" : "hidden"}
          md:relative md:inset-auto md:top-0 md:flex md:flex-col w-72 md:w-72 bg-[var(--ink-900)] border-r border-[var(--line-800)] text-[var(--mist-100)] shrink-0 shadow-xl transition-all
        `}
      >
        <div className="p-6 hidden md:block border-b border-[var(--line-800)]">
          <Logo />
          <p className="text-sm font-medium text-[var(--mist-500)] mt-4 truncate">
            Atleta: <span className="font-bold text-[var(--mist-100)]">{athleteName}</span>
          </p>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          {/* Acá podrías meter links a futuro si el atleta tiene más pantallas */}
        </nav>

        <div className="p-4 border-t border-[var(--line-800)] flex flex-col gap-4">
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 px-4 py-3.5 w-full text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <LogOut size={20} /> Cerrar Sesión
          </button>

          <div className="text-center pt-2 pb-2">
            <p className="text-[10px] text-[var(--mist-500)] font-medium tracking-widest uppercase">
              SportPlan V2.0
            </p>
            <p className="text-xs font-bold text-[var(--mist-300)] tracking-wider">
              Plataforma de Rendimiento
            </p>
          </div>
        </div>
      </div>

      {/* Contenido Principal (Acá adentro va el AthleteView) */}
      <div className="flex-1 overflow-auto bg-[var(--ink-950)] relative z-10 pt-16 md:pt-0">
        {children}
      </div>
    </div>
  );
}