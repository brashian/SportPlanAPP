import { useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import {
  EXERCISE_FEELS, FATIGUE_LABELS,
  type DailyBlock, type ExerciseFeedback, type ExerciseFeel, type SessionFeedback,
} from "../../types/models";
import type { SaveFeedbackResult } from "../../hooks/useSessionFeedback";
import FormErrorAlert from "../shared/FormErrorAlert";

// Lo que completa el atleta; el resto (ids, fechas, coach) lo agrega AthleteView
export interface FeedbackInput {
  rpe: number | null;
  fatigue: number | null;
  exercises: ExerciseFeedback[];
  notes: string;
}

interface Props {
  block: DailyBlock;
  existing?: SessionFeedback;
  onSave: (input: FeedbackInput) => Promise<SaveFeedbackResult>;
  onDone: (result: SaveFeedbackResult) => void;
  onBack: () => void;
}

const FEEL_STYLES: Record<ExerciseFeel, string> = {
  "Liviano": "bg-[var(--pulse-500)]/15 border-[var(--pulse-500)] text-[var(--pulse-500)]",
  "Justo": "bg-[var(--signal-500)]/15 border-[var(--signal-500)] text-[var(--signal-500)]",
  "Pesado": "bg-red-500/15 border-red-400 text-red-400",
  "No lo hice": "bg-[var(--ink-800)] border-[var(--mist-500)] text-[var(--mist-300)]",
};

const chipBase = "px-3 py-2 rounded-xl text-xs font-bold border transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]";
const chipIdle = "bg-[var(--ink-900)] border-[var(--line-800)] text-[var(--mist-300)] hover:border-[var(--mist-500)]";

// Formulario "¿Cómo te fue?" que el atleta le envía a su coach al terminar la sesión
export default function SessionFeedbackForm({ block, existing, onSave, onDone, onBack }: Props) {
  const [rpe, setRpe] = useState<number | null>(existing?.rpe ?? null);
  const [fatigue, setFatigue] = useState<number | null>(existing?.fatigue ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [exercises, setExercises] = useState<ExerciseFeedback[]>(() =>
    (block.exercises || []).map((ex) => {
      const prev = existing?.exercises.find((e) => e.exerciseId === ex.id);
      return {
        exerciseId: ex.id,
        name: ex.name,
        plannedWeight: ex.weight || "",
        feel: prev?.feel ?? null,
        weightUsed: prev?.weightUsed ?? "",
      };
    })
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateExercise = (id: string, data: Partial<ExerciseFeedback>) =>
    setExercises((prev) => prev.map((e) => (e.exerciseId === id ? { ...e, ...data } : e)));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (rpe === null && fatigue === null && !notes.trim() && exercises.every((ex) => !ex.feel && !ex.weightUsed.trim())) {
      setError("Completá al menos un dato antes de enviar.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const result = await onSave({ rpe, fatigue, exercises, notes: notes.trim() });
      onDone(result);
    } catch (err) {
      console.error("Error al enviar el feedback:", err);
      setError("No se pudo enviar el feedback. Probá de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar overscroll-contain">
        <div>
          <h3 className="font-display text-xl font-bold text-[var(--mist-100)]">¿Cómo te fue hoy?</h3>
          <p className="text-sm text-[var(--mist-500)] mt-1">Tu coach usa esto para ajustar tus próximas rutinas.</p>
        </div>

        {/* EJERCICIOS */}
        {exercises.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-3">Cada ejercicio</legend>
            {exercises.map((ex) => (
              <div key={ex.exerciseId} className="bg-[var(--ink-900)] border border-[var(--line-800)] rounded-2xl p-3 sm:p-4 space-y-3">
                <p className="font-bold text-[var(--mist-100)] text-sm">{ex.name}</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label={`Cómo sentiste ${ex.name}`}>
                  {EXERCISE_FEELS.map((feel) => (
                    <button
                      key={feel}
                      type="button"
                      aria-pressed={ex.feel === feel}
                      onClick={() => updateExercise(ex.exerciseId, { feel: ex.feel === feel ? null : feel })}
                      className={`${chipBase} ${ex.feel === feel ? FEEL_STYLES[feel] : chipIdle}`}
                    >
                      {feel}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[var(--mist-500)] shrink-0">Peso que usaste</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={ex.weightUsed}
                    onChange={(e) => updateExercise(ex.exerciseId, { weightUsed: e.target.value })}
                    placeholder={ex.plannedWeight ? `Planificado: ${ex.plannedWeight}` : "Ej: 40 kg"}
                    className="flex-1 min-w-0 bg-[var(--ink-950)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--mist-100)] outline-none focus:border-[var(--signal-500)] placeholder-[var(--mist-500)]"
                  />
                </label>
              </div>
            ))}
          </fieldset>
        )}

        {/* RPE */}
        <fieldset>
          <legend className="text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-1">Esfuerzo de la sesión (RPE)</legend>
          <p className="text-xs text-[var(--mist-500)] mb-3">1 = muy fácil · 10 = máximo esfuerzo</p>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={rpe === n}
                onClick={() => setRpe(rpe === n ? null : n)}
                className={`${chipBase} py-2.5 ${rpe === n ? "bg-[var(--signal-500)] border-[var(--signal-500)] text-[var(--ink-950)]" : chipIdle}`}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        {/* FATIGA */}
        <fieldset>
          <legend className="text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-3">¿Cómo te sentís?</legend>
          <div className="flex flex-wrap gap-2">
            {FATIGUE_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={fatigue === i + 1}
                onClick={() => setFatigue(fatigue === i + 1 ? null : i + 1)}
                className={`${chipBase} ${fatigue === i + 1 ? "bg-[var(--signal-500)] border-[var(--signal-500)] text-[var(--ink-950)]" : chipIdle}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* COMENTARIO */}
        <div>
          <label htmlFor="feedback-notes" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Comentario para tu coach</label>
          <textarea
            id="feedback-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Molestias, cómo dormiste, algo que quieras contarle..."
            className="w-full bg-[var(--ink-900)] border border-[var(--line-800)] rounded-xl p-3 text-sm font-medium text-[var(--mist-100)] outline-none focus:border-[var(--signal-500)] focus:ring-1 focus:ring-[var(--signal-500)] placeholder-[var(--mist-500)]"
          />
        </div>

        <FormErrorAlert message={error} />
      </div>

      <div className="shrink-0 p-3 sm:p-4 bg-[var(--ink-900)] border-t border-[var(--line-800)] flex gap-3 pb-6 sm:pb-4">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-3.5 rounded-xl font-bold text-sm text-[var(--mist-100)] bg-[var(--ink-800)] hover:bg-[var(--line-800)] transition-colors active:scale-95 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
        >
          <ArrowLeft size={18} /> Volver
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 bg-[var(--signal-500)] hover:bg-[var(--signal-600)] disabled:opacity-70 text-white font-black py-3.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-900)]"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {existing ? "Actualizar feedback" : "Enviar a mi coach"}
        </button>
      </div>
    </form>
  );
}
