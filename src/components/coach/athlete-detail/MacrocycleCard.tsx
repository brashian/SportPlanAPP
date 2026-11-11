import { Edit3, Plus, Trash2 } from "lucide-react";
import type { DailyBlock, Macrocycle, Mesocycle, SessionFeedback } from "../../../types/models";
import MesocycleCard from "./MesocycleCard";
import { sortMesosByStart, toDayMonthYear } from "./dateHelpers";

interface MacrocycleCardProps {
  macro: Macrocycle;
  blocksByMesocycle: Record<string, DailyBlock[]>;
  feedbackByDate: Record<string, SessionFeedback>;
  activeViewMesoId: string | null;
  isLoadingBlocks: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddMeso: () => void;
  onEditMeso: (meso: Mesocycle) => void;
  onDeleteMeso: (meso: Mesocycle) => void;
  onPasteTemplate: (meso: Mesocycle) => void;
  onToggleCalendar: (meso: Mesocycle) => void;
  onOpenDay: (meso: Mesocycle, date: string, dayName: string, existingBlock?: DailyBlock) => void;
  athleteName: string;
  onPdfError: (message: string) => void;
}

// Tarjeta de un macrociclo con su lista de mesociclos (ordenados por fecha)
export default function MacrocycleCard({
  macro, blocksByMesocycle, feedbackByDate, activeViewMesoId, isLoadingBlocks,
  onEdit, onDelete, onAddMeso, onEditMeso, onDeleteMeso, onPasteTemplate, onToggleCalendar, onOpenDay,
  athleteName, onPdfError,
}: MacrocycleCardProps) {
  return (
    <div className="border border-[var(--line-800)] bg-[var(--ink-900)] rounded-3xl overflow-hidden transition-all">
      <div className="bg-[var(--ink-850)] p-5 sm:p-6 border-b border-[var(--line-800)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-display font-bold text-[var(--mist-100)] tracking-tight">{macro.name}</h3>
            <button onClick={onEdit} aria-label={`Editar macrociclo ${macro.name}`} title="Editar Macrociclo" className="text-[var(--mist-500)] hover:text-[var(--signal-500)] hover:bg-[var(--signal-500)]/10 p-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
              <Edit3 size={16} />
            </button>
            <button onClick={onDelete} aria-label={`Eliminar macrociclo ${macro.name}`} title="Eliminar Macrociclo" className="text-[var(--mist-500)] hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
              <Trash2 size={16} />
            </button>
          </div>
          <p className="text-sm font-medium text-[var(--mist-500)] mt-1">Del {toDayMonthYear(macro.startDate)} al {toDayMonthYear(macro.endDate)}</p>
        </div>
        <button onClick={onAddMeso} className="w-full sm:w-auto text-[var(--signal-500)] font-bold bg-[var(--signal-500)]/10 hover:bg-[var(--signal-500)]/20 px-5 py-2.5 rounded-xl text-sm transition-colors active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
          <Plus size={16} /> Agregar Mesociclo
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {!macro.mesocycles || macro.mesocycles.length === 0 ? (
          <p className="text-sm text-[var(--mist-500)] italic text-center py-6">No hay ciclos menores creados todavía.</p>
        ) : (
          <div className="space-y-4">
            {sortMesosByStart(macro.mesocycles).map((meso) => (
              <MesocycleCard
                key={meso.id}
                meso={meso}
                blocks={blocksByMesocycle[meso.id] || []}
                feedbackByDate={feedbackByDate}
                isCalendarOpen={activeViewMesoId === meso.id}
                isLoadingBlocks={isLoadingBlocks}
                onEdit={() => onEditMeso(meso)}
                onDelete={() => onDeleteMeso(meso)}
                onPasteTemplate={() => onPasteTemplate(meso)}
                onToggleCalendar={() => onToggleCalendar(meso)}
                onOpenDay={(date, dayName, existingBlock) => onOpenDay(meso, date, dayName, existingBlock)}
                athleteName={athleteName}
                onPdfError={onPdfError}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
