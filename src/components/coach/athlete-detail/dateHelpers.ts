import type { Mesocycle } from "../../../types/models";

// Helpers puros de fechas para la planificación del atleta (lado coach).

export const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// "yyyy-MM-dd" → "dd/MM"
export const toDayMonth = (isoDate: string) => isoDate.split('-').reverse().slice(0, 2).join('/');

// "yyyy-MM-dd" → "dd/MM/yyyy"
export const toDayMonthYear = (isoDate: string) => isoDate.split('-').reverse().join('/');

// Las fechas son ISO "yyyy-MM-dd", así que la comparación de strings respeta el orden cronológico
export const sortMesosByStart = (mesos: Mesocycle[] = []) => [...mesos].sort((a, b) => a.startDate.localeCompare(b.startDate));

export interface CalendarWeek {
  label: string;
  days: { date: string; name: string }[];
}

// Semanas completas (lunes a domingo) que cubren el rango [start, end]
export const getWeeksInRange = (start: string, end: string): CalendarWeek[] => {
  const weeks: CalendarWeek[] = [];
  const current = new Date(start + "T12:00:00");
  const day = current.getDay();
  current.setDate(current.getDate() - day + (day === 0 ? -6 : 1));
  const endDate = new Date(end + "T12:00:00");
  let weekNumber = 1;
  while (current <= endDate || current.getDay() !== 1) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push({ date: current.toISOString().split("T")[0], name: DAY_NAMES[current.getDay()] });
      current.setDate(current.getDate() + 1);
    }
    weeks.push({ label: `Semana ${weekNumber}`, days });
    weekNumber++;
    if (current > endDate) break;
  }
  return weeks;
};
