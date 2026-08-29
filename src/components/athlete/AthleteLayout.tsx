import React, { useState } from "react";
import { Menu, X, LogOut, Dumbbell } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

interface Props {
  athleteName: string;
  children: React.ReactNode;
}

export default function AthleteLayout({ athleteName, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const Logo = () => (
    <div className="flex items-center gap-2 font-black text-xl tracking-tight">
      <Dumbbell className="text-blue-500" /> SportPlan
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      {/* Navbar Móvil */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md fixed top-0 left-0 w-full z-50 h-16">
        <Logo />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menú Lateral */}
      <div
        className={`
          ${isOpen ? "fixed inset-0 top-16 bg-slate-900 flex flex-col z-40" : "hidden"} 
          md:relative md:top-0 md:flex md:flex-col w-full md:w-72 md:bg-slate-900 text-white shrink-0 shadow-xl transition-all
        `}
      >
        <div className="p-6 hidden md:block border-b border-slate-800">
          <Logo />
          <p className="text-sm font-medium text-slate-400 mt-4 truncate">
            Atleta: <span className="font-bold text-white">{athleteName}</span>
          </p>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          {/* Acá podrías meter links a futuro si el atleta tiene más pantallas */}
        </nav>

        <div className="p-4 border-t border-slate-800 flex flex-col gap-4">
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 px-4 py-3.5 w-full text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all font-bold"
          >
            <LogOut size={20} /> Cerrar Sesión
          </button>
          
          <div className="text-center pt-2 pb-2">
            <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
              SportPlan V2.0
            </p>
            <p className="text-xs font-bold text-slate-400 tracking-wider">
              Plataforma de Rendimiento
            </p>
          </div>
        </div>
      </div>

      {/* Contenido Principal (Acá adentro va el AthleteView) */}
      <div className="flex-1 overflow-auto bg-slate-50 relative z-10 pt-16 md:pt-0">
        {children}
      </div>
    </div>
  );
}