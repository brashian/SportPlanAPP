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
            className={`rounded-xl border overflow-hidden ${
              current ? "border-blue-500" : "border-gray-200"
            }`}
          >
            <button
              onClick={() => setOpenWeek(isOpen ? null : week.weekNumber)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                current ? "bg-blue-100/50" : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${
                    current ? "text-blue-500" : "text-gray-900"
                  }`}
                >
                  Semana {week.weekNumber}
                </span>
                {current && (
                  <span className="text-[10px] uppercase tracking-wide bg-blue-500 text-white px-2 py-0.5 rounded-full">
                    Actual
                  </span>
                )}
                <span className="text-xs text-gray-500">{formatWeekRange(week)}</span>
              </div>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2 p-3 bg-gray-50/60">
                {week.days.map((day) => {
                  const today = isToday(day.date);
                  return (
                    <div
                      key={day.date}
                      className={`rounded-xl border p-2 min-h-[140px] flex flex-col gap-2 bg-white ${
                        today ? "border-blue-500 ring-1 ring-blue-500/30" : "border-gray-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-medium capitalize ${
                            today ? "text-blue-500" : "text-gray-500"
                          }`}
                        >
                          {formatDayLabel(day.date)}
                        </span>
                        {!readOnly && (
                          <button
                            onClick={() => onAddBlock?.(day.date)}
                            className="text-blue-500 hover:text-blue-600"
                            aria-label="Agregar bloque"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 flex-1">
                        {day.blocks.length === 0 && (
                          <p className="text-[11px] text-gray-300 italic">Sin sesiones</p>
                        )}
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
