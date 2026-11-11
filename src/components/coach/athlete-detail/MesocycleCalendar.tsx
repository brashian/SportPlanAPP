import type { DailyBlock, Mesocycle } from "../../../types/models";
import { getWeeksInRange, toDayMonth } from "./dateHelpers";

interface MesocycleCalendarProps {
  meso: Mesocycle;
  blocks: DailyBlock[];
  expandedWeek: string | null;
  onToggleWeek: (weekKey: string | null) => void;
  onOpenDay: (date: string, dayName: string, existingBlock?: DailyBlock) => void;
}

// Acordeón de semanas de un mesociclo, con la sesión cargada en cada día
export default function MesocycleCalendar({ meso, blocks, expandedWeek, onToggleWeek, onOpenDay }: MesocycleCalendarProps) {
  return (
    <div className="space-y-3">
      {getWeeksInRange(meso.startDate, meso.endDate).map((week, idx) => {
        const weekKey = `${meso.id}-w${idx}`;
        const isExpanded = expandedWeek === weekKey;

        return (
          <div key={weekKey} className="border border-[var(--line-800)] bg-[var(--ink-900)] rounded-xl overflow-hidden transition-all">
            <button onClick={() => onToggleWeek(isExpanded ? null : weekKey)} aria-expanded={isExpanded} className="w-full flex justify-between items-center p-4 hover:bg-[var(--ink-850)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-inset">
              <span className="font-display font-bold text-[var(--mist-100)] text-sm md:text-base">{week.label}</span>
              <span className="text-xs font-bold text-[var(--mist-500)] bg-[var(--ink-800)] px-2.5 py-1 rounded-lg">Del {toDayMonth(week.days[0].date)} al {toDayMonth(week.days[6].date)}</span>
            </button>

            {isExpanded && (
              <div className="border-t border-[var(--line-800)] divide-y divide-[var(--line-800)] bg-[var(--ink-950)]">
                {week.days.map(day => {
                  const existingBlock = blocks.find((b) => b.date === day.date);
                  const isOutside = day.date < meso.startDate || day.date > meso.endDate;

                  return (
                    <div key={day.date} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 text-sm transition-colors ${isOutside ? 'bg-[var(--ink-900)]/40 opacity-50' : 'bg-[var(--ink-900)] hover:bg-[var(--ink-850)]'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 w-full sm:w-auto">
                        <span className="font-bold w-full sm:w-28 text-[var(--mist-100)] flex items-center justify-between sm:justify-start gap-2">
                          {day.name} <span className="font-medium text-xs text-[var(--mist-500)]">{toDayMonth(day.date)}</span>
                        </span>
                        {existingBlock ? (
                          <span className="text-[var(--signal-500)] font-black truncate bg-[var(--signal-500)]/10 px-2.5 py-0.5 rounded text-xs">{existingBlock.sessionType}</span>
                        ) : (
                          <span className="text-[var(--mist-500)] italic text-xs font-medium">Descanso / Libre</span>
                        )}
                      </div>
                      {isOutside && !existingBlock ? (
                        // Fuera del rango del mesociclo: no se cargan sesiones nuevas
                        <button type="button" disabled className="w-full sm:w-auto text-center px-4 py-2 rounded-lg text-xs font-bold border bg-[var(--ink-800)] border-[var(--line-800)] text-[var(--mist-500)] cursor-not-allowed">
                          Fuera del ciclo
                        </button>
                      ) : (
                        <button onClick={() => onOpenDay(day.date, day.name, existingBlock)} className={`w-full sm:w-auto text-center px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] ${existingBlock ? 'bg-[var(--ink-800)] border-[var(--line-800)] text-[var(--mist-100)] hover:bg-[var(--line-800)]' : 'bg-[var(--signal-500)]/10 border-[var(--signal-500)]/20 text-[var(--signal-500)] hover:bg-[var(--signal-500)]/20'}`}>
                          {existingBlock ? "Editar" : "Cargar Sesión"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
