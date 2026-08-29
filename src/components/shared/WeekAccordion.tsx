import React, { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { DailyBlock, Week } from "../../types/models";
import { formatDayLabel, formatWeekRange, isCurrentWeek, isToday } from "../../utils/dateUtils";
import BlockCard from "./BlockCard";

interface WeekAccordionProps {
  weeks: Week[];
  readOnly?: boolean;
  onAddBlock?: (date: string) => void;
  onEditBlock?: (date: string, block: DailyBlock) => void;
  onDeleteBlock?: (date: string, blockId: string) => void;
}

export default function WeekAccordion({
  weeks,
  readOnly = false,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
}: WeekAccordionProps) {
  // Por defecto, se abre automáticamente la semana actual (útil sobre todo para el Atleta)
  const defaultOpenWeek = weeks.find((w) => isCurrentWeek(w))?.weekNumber ?? weeks[0]?.weekNumber;
  const [openWeek, setOpenWeek] = useState<number | null>(defaultOpenWeek ?? null);

  return (
    <div className="space-y-2">
      {weeks.map((week) => {
        const isOpen = openWeek === week.weekNumber;
        const current = isCurrentWeek(week);

        return (
          <div
            key={week.weekNumber}
            className={`rounded-xl border overflow-hidden transition-colors ${
              current ? "border-[var(--signal-500)]/60" : "border-[var(--line-800)]"
            }`}
          >
            <button
              onClick={() => setOpenWeek(isOpen ? null : week.weekNumber)}
              aria-expanded={isOpen}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-inset ${
                current ? "bg-[var(--signal-500)]/10" : "bg-[var(--ink-900)] hover:bg-[var(--ink-850)]"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-bold ${
                    current ? "text-[var(--signal-500)]" : "text-[var(--mist-100)]"
                  }`}
                >
                  Semana {week.weekNumber}
                </span>
                {current && (
                  <span className="text-[10px] font-black uppercase tracking-wide bg-[var(--signal-500)] text-[var(--ink-950)] px-2 py-0.5 rounded-full">
                    Actual
                  </span>
                )}
                <span className="text-xs text-[var(--mist-500)] font-medium">{formatWeekRange(week)}</span>
              </div>
              <ChevronDown
                size={16}
                className={`text-[var(--mist-500)] transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2 p-3 bg-[var(--ink-950)] border-t border-[var(--line-800)]">
                {week.days.map((day) => {
                  const today = isToday(day.date);
                  return (
                    <div
                      key={day.date}
                      className={`rounded-xl border p-2 min-h-[140px] flex flex-col gap-2 bg-[var(--ink-900)] transition-colors ${
                        today ? "border-[var(--signal-500)] ring-1 ring-[var(--signal-500)]/30" : "border-[var(--line-800)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold capitalize ${
                            today ? "text-[var(--signal-500)]" : "text-[var(--mist-500)]"
                          }`}
                        >
                          {formatDayLabel(day.date)}
                        </span>
                        {!readOnly && (
                          <button
                            onClick={() => onAddBlock?.(day.date)}
                            className="text-[var(--mist-500)] hover:text-[var(--signal-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] rounded"
                            aria-label={`Agregar bloque el ${day.date}`}
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 flex-1">
                        {day.blocks.length === 0 && (
                          <p className="text-[11px] text-[var(--mist-500)] italic">Sin sesiones</p>
                        )}
                        {/* BlockCard es un componente hijo no reskinado todavía —
                            va a renderizar con su estética propia (probablemente
                            clara) dentro de esta celda oscura hasta que se pase
                            su código para unificarlo con el resto del sistema. */}
                        {day.blocks.map((block) => (
                          <BlockCard
                            key={block.id}
                            block={block}
                            readOnly={readOnly}
                            onEdit={() => onEditBlock?.(day.date, block)}
                            onDelete={() => onDeleteBlock?.(day.date, block.id)}
                          />
                        ))}
                      </div>
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