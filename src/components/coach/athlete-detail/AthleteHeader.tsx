import { Link } from "react-router-dom";
import { ChevronLeft, Edit3, Trash2 } from "lucide-react";

interface AthleteHeaderProps {
  fullName?: string;
  sport?: string;
  onEdit: () => void;
  onDelete: () => void;
}

// Link de regreso + tarjeta del atleta con acciones de perfil
export default function AthleteHeader({ fullName, sport, onEdit, onDelete }: AthleteHeaderProps) {
  return (
    <>
      <div>
        <Link to="/athletes" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--mist-300)] hover:text-[var(--signal-500)] transition-colors bg-[var(--ink-900)] px-4 py-2.5 rounded-xl border border-[var(--line-800)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
          <ChevronLeft size={16} /> Volver a Mis Atletas
        </Link>
      </div>

      <div className="bg-[var(--ink-900)] p-6 sm:p-8 rounded-3xl border border-[var(--line-800)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gradient-to-br from-[var(--signal-500)] to-[var(--signal-600)] text-[var(--ink-950)] rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-display font-bold">
            {fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--mist-100)] tracking-tight leading-tight">{fullName}</h1>
            <span className="inline-block mt-2 px-3 py-1 bg-[var(--ink-800)] text-[var(--mist-300)] text-xs font-black uppercase tracking-wider rounded-lg">
              {sport || "Deporte no especificado"}
            </span>
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <button onClick={onEdit} className="flex-1 md:flex-none px-5 py-3.5 bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
            <Edit3 size={18} /> Editar Perfil
          </button>
          <button onClick={onDelete} className="flex-1 md:flex-none px-5 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            <Trash2 size={18} /> Eliminar
          </button>
        </div>
      </div>
    </>
  );
}
