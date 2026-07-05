import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import type { DailyBlocksMap, DayPlan, Week } from "../types/models";

/**
 * getWeeksInRange
 * ----------------------------------------------------------------------------
 * Toma la fecha de inicio y fin de un Mesociclo y devuelve un array de
 * semanas (bloques secuenciales de 7 días, empezando exactamente en la fecha
 * de inicio del mesociclo, NO alineadas a lunes/domingo del calendario).
 *
 * Cada semana trae ya generados sus 7 DayPlan (vacíos de bloques), listos
 * para ser "hidratados" con los DailyBlock reales mediante hydrateWeeksWithBlocks.
 */
export function getWeeksInRange(startDateStr: string, endDateStr: string): Week[] {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);

  const totalDays = Math.max(differenceInCalendarDays(end, start) + 1, 1);
  const totalWeeks = Math.ceil(totalDays / 7);

  const weeks: Week[] = [];

  for (let w = 0; w < totalWeeks; w++) {
    const weekStart = addDays(start, w * 7);
    const days: DayPlan[] = [];

    for (let d = 0; d < 7; d++) {
      const currentDate = addDays(weekStart, d);
      days.push({
        date: format(currentDate, "yyyy-MM-dd"),
        dayOfWeek: currentDate.getDay(),
        blocks: [],
      });
    }

    weeks.push({
      weekNumber: w + 1,
      startDate: days[0].date,
      endDate: days[6].date,
      days,
    });
  }

  return weeks;
}

/**
 * hydrateWeeksWithBlocks
 * ----------------------------------------------------------------------------
 * Combina las semanas calculadas (estructura) con los bloques de
 * entrenamiento persistidos (contenido), indexados por fecha.
 */
export function hydrateWeeksWithBlocks(weeks: Week[], blocksMap: DailyBlocksMap): Week[] {
  return weeks.map((week) => ({
    ...week,
    days: week.days.map((day) => ({
      ...day,
      blocks: blocksMap[day.date] ?? [],
    })),
  }));
}

/** Formatea el rango de una semana para el header del acordeón. Ej: "3 mar - 9 mar 2026" */
export function formatWeekRange(week: Week): string {
  const start = parseISO(week.startDate);
  const end = parseISO(week.endDate);
  return `${format(start, "d MMM", { locale: es })} — ${format(end, "d MMM yyyy", { locale: es })}`;
}

/** Nombre corto de día en español. Ej: "Lun", "Mar" */
export function formatDayLabel(dateStr: string): string {
  return format(parseISO(dateStr), "EEE d", { locale: es });
}

export function isToday(dateStr: string): boolean {
  return isSameDay(parseISO(dateStr), new Date());
}

export function isCurrentWeek(week: Week): boolean {
  return isWithinInterval(new Date(), {
    start: parseISO(week.startDate),
    end: parseISO(week.endDate),
  });
}

/** Determina si "hoy" cae dentro del rango del mesociclo/macrociclo (para resaltar en vista Atleta) */
export function isCurrentPeriod(startDateStr: string, endDateStr: string): boolean {
  return isWithinInterval(new Date(), {
    start: parseISO(startDateStr),
    end: parseISO(endDateStr),
  });
}
