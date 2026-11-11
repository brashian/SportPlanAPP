import { useState } from "react";
import { Edit3, Trash2 } from "lucide-react";
import type { DailyBlock, Mesocycle } from "../../../types/models";
import MesocycleCalendar from "./MesocycleCalendar";
import { toDayMonthYear } from "./dateHelpers";

interface MesocycleCardProps {
  meso: Mesocycle;
  blocks: DailyBlock[];
  isCalendarOpen: boolean;
  isLoadingBlocks: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPasteTemplate: () => void;
  onToggleCalendar: () => void;
  onOpenDay: (date: string, dayName: string, existingBlock?: DailyBlock) => void;
}

// Fila de un mesociclo con sus acciones y, si está abierto, su calendario
export default function MesocycleCard({
  meso, blocks, isCalendarOpen, isLoadingBlocks, onEdit, onDelete, onPasteTemplate, onToggleCalendar, onOpenDay,
}: MesocycleCardProps) {
  // Vive acá (y no dentro del calendario) para que la semana abierta se mantenga
  // cuando el calendario se recarga, por ejemplo después de inyectar una rutina
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  return (
    <div className="border border-[var(--line-800)] rounded-2xl p-4 sm:p-5 bg-[var(--ink-850)] hover:border-[var(--mist-500)]/40 transition-colors">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h4 className="font-display font-bold text-lg text-[var(--mist-100)]">{meso.name}</h4>
            <span className="text-[10px] font-black uppercase tracking-wider bg-[var(--ink-800)] text-[var(--mist-300)] px-2 py-1 rounded-md">{meso.phase}</span>
            <button onClick={onEdit} aria-label={`Editar mesociclo ${meso.name}`} title="Editar Mesociclo" className="text-[var(--mist-500)] hover:text-[var(--signal-500)] hover:bg-[var(--signal-500)]/10 p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
              <Edit3 size={15} />
            </button>
            <button onClick={onDelete} aria-label={`Eliminar mesociclo ${meso.name}`} title="Eliminar Mesociclo" className="text-[var(--mist-500)] hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
              <Trash2 size={15} />
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--mist-500)] mt-1">{toDayMonthYear(meso.startDate)} → {toDayMonthYear(meso.endDate)}</p>
        </div>

        <div className="flex w-full lg:w-auto gap-2">
          <button onClick={onPasteTemplate} className="flex-1 lg:flex-none text-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
            Pegar Plantilla
          </button>
          <button
            onClick={onToggleCalendar}
            aria-expanded={isCalendarOpen}
            className={`flex-1 lg:flex-none text-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors active:scale-95 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] ${isCalendarOpen ? 'bg-[var(--signal-500)] text-[var(--ink-950)] border-[var(--signal-500)]' : 'bg-[var(--ink-800)] border-[var(--line-800)] text-[var(--mist-100)] hover:bg-[var(--line-800)]'}`}
          >
            {isCalendarOpen ? "Ocultar Días" : "Ver Calendario"}
          </button>
        </div>
      </div>

      {isCalendarOpen && (
        <div className="mt-5 p-3 sm:p-4 bg-[var(--ink-950)] rounded-2xl border border-[var(--line-800)] animate-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
          {isLoadingBlocks ? (
            <div className="space-y-2 p-2" aria-live="polite" aria-busy="true">
              {[0, 1, 2].map(i => <div key={i} className="h-11 bg-[var(--ink-800)] rounded-xl animate-pulse motion-reduce:animate-none" />)}
            </div>
          ) : (
            <MesocycleCalendar
              meso={meso}
              blocks={blocks}
              expandedWeek={expandedWeek}
              onToggleWeek={setExpandedWeek}
              onOpenDay={onOpenDay}
            />
          )}
        </div>
      )}
    </div>
  );
}
