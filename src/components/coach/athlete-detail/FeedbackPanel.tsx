import { ArrowUp, CheckCircle2, MessageSquare } from "lucide-react";
import { FATIGUE_LABELS, isNewWeight, type ExerciseFeel, type SessionFeedback } from "../../../types/models";
import { toDayMonthYear } from "./dateHelpers";

const FEEL_STYLES: Record<ExerciseFeel, string> = {
  "Liviano": "bg-[var(--pulse-500)]/15 text-[var(--pulse-500)]",
  "Justo": "bg-[var(--signal-500)]/15 text-[var(--signal-500)]",
  "Pesado": "bg-red-500/15 text-red-400",
  "No lo hice": "bg-[var(--ink-800)] text-[var(--mist-300)]",
};

// Resumen corto para listas: "2 pesados · 1 peso nuevo"
export function feedbackFlags(fb: SessionFeedback): string[] {
  const heavy = fb.exercises.filter((e) => e.feel === "Pesado").length;
  const light = fb.exercises.filter((e) => e.feel === "Liviano").length;
  const skipped = fb.exercises.filter((e) => e.feel === "No lo hice").length;
  const newWeights = fb.exercises.filter(isNewWeight).length;
  const flags: string[] = [];
  if (heavy) flags.push(`${heavy} pesado${heavy > 1 ? "s" : ""}`);
  if (light) flags.push(`${light} liviano${light > 1 ? "s" : ""}`);
  if (newWeights) flags.push(`${newWeights} peso${newWeights > 1 ? "s" : ""} nuevo${newWeights > 1 ? "s" : ""}`);
  if (skipped) flags.push(`${skipped} sin hacer`);
  return flags;
}

// Feedback que el atleta envió sobre una sesión (solo lectura, para el coach)
export default function FeedbackPanel({ feedback }: { feedback: SessionFeedback }) {
  const rated = feedback.exercises.filter((e) => e.feel || e.weightUsed.trim());

  return (
    <section aria-label="Feedback del atleta" className="bg-[var(--ink-900)] border border-[var(--signal-500)]/30 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display font-bold text-[var(--mist-100)] uppercase tracking-wide flex items-center gap-2">
          <MessageSquare size={18} className="text-[var(--signal-500)]" /> Feedback del atleta
        </h3>
        <span className="text-xs font-medium text-[var(--mist-500)]">
          Enviado el {toDayMonthYear(feedback.updatedAt.slice(0, 10))}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {feedback.rpe !== null && (
          <span className="bg-[var(--ink-800)] text-[var(--mist-100)] px-3 py-1.5 rounded-lg">RPE {feedback.rpe}/10</span>
        )}
        {feedback.fatigue !== null && (
          <span className="bg-[var(--ink-800)] text-[var(--mist-100)] px-3 py-1.5 rounded-lg">Fatiga: {FATIGUE_LABELS[feedback.fatigue - 1]}</span>
        )}
        {feedback.exercises.length > 0 && (
          <span className="bg-[var(--ink-800)] text-[var(--mist-100)] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-[var(--pulse-500)]" />
            {feedback.completedExerciseIds.length}/{feedback.exercises.length} completados
          </span>
        )}
      </div>

      {rated.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--mist-500)] border-b border-[var(--line-800)]">
                <th className="py-2 pr-3 font-bold">Ejercicio</th>
                <th className="py-2 pr-3 font-bold">Planificado</th>
                <th className="py-2 pr-3 font-bold">Usado</th>
                <th className="py-2 font-bold">Sensación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-800)]">
              {rated.map((ex) => (
                <tr key={ex.exerciseId}>
                  <td className="py-2 pr-3 font-bold text-[var(--mist-100)]">{ex.name}</td>
                  <td className="py-2 pr-3 text-[var(--mist-300)]">{ex.plannedWeight || "-"}</td>
                  <td className="py-2 pr-3 font-bold text-[var(--mist-100)]">
                    {ex.weightUsed.trim() ? (
                      <span className="inline-flex items-center gap-1">
                        {ex.weightUsed}
                        {isNewWeight(ex) && <ArrowUp size={14} aria-label="Peso nuevo" className="text-[var(--signal-500)]" />}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="py-2">
                    {ex.feel ? <span className={`px-2 py-0.5 rounded text-xs font-bold ${FEEL_STYLES[ex.feel]}`}>{ex.feel}</span> : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {feedback.notes && (
        <p className="text-sm text-[var(--mist-100)] bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl p-3 whitespace-pre-line">
          “{feedback.notes}”
        </p>
      )}
    </section>
  );
}
