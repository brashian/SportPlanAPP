import type { DailyBlock, TemplateDay } from "../../../types/models";
import type { PdfDay, PdfSection } from "./RoutinePdfDocument";

// "yyyy-MM-dd" → "dd/MM"
const dayMonth = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

// Una sesión del calendario del atleta → un día del PDF
export function blockToPdfDay(block: DailyBlock, dayName: string): PdfDay {
  return {
    title: `${dayName} ${dayMonth(block.date)}`,
    sessionType: block.sessionType,
    exercises: (block.exercises || []).map((ex) => ({ name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight, groupId: ex.groupId })),
    notes: block.notesHtml,
  };
}

// Una semana del calendario (solo los días con sesión). null si no hay ninguna.
export function weekToPdfSection(
  week: { label: string; days: { date: string; name: string }[] },
  blocks: DailyBlock[],
): PdfSection | null {
  const days = week.days
    .map((day) => {
      const block = blocks.find((b) => b.date === day.date);
      return block ? blockToPdfDay(block, day.name) : null;
    })
    .filter((d): d is PdfDay => d !== null);
  if (days.length === 0) return null;
  return { heading: `${week.label} · Del ${dayMonth(week.days[0].date)} al ${dayMonth(week.days[6].date)}`, days };
}

// Días de una plantilla de la Biblioteca o de una rutina mensual → una sección del PDF
export function templateDaysToPdfSection(days: TemplateDay[]): PdfSection {
  return {
    days: days.map((d) => ({
      title: `Día ${d.dayNumber}`,
      sessionType: d.sessionType,
      exercises: (d.exercises || []).map((ex) => ({ name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight, groupId: ex.groupId })),
      notes: d.notesHtml,
    })),
  };
}
