import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import type { DailyBlock, VolumeLevel } from "../../types/models";
import { VOLUME_LEVELS } from "../../types/models";

interface DayBlockEditorProps {
  date: string;
  mesocycleId: string;
  initialBlock?: DailyBlock; // si viene, es edición; si no, es creación
  onSave: (block: Omit<DailyBlock, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

const SESSION_TYPES = [
  "Físico - Fuerza",
  "Físico - Resistencia",
  "Técnico",
  "Táctico",
  "Recuperación",
  "Competencia",
];

const QUILL_MODULES = {
  toolbar: [["bold", "italic", "underline"], [{ list: "bullet" }, { list: "ordered" }], ["clean"]],
};

export default function DayBlockEditor({
  date,
  mesocycleId,
  initialBlock,
  onSave,
  onCancel,
}: DayBlockEditorProps) {
  const [sessionType, setSessionType] = useState(initialBlock?.sessionType ?? SESSION_TYPES[0]);
  const [intensity, setIntensity] = useState(initialBlock?.intensity ?? 5);
  const [volume, setVolume] = useState<VolumeLevel>(initialBlock?.volume ?? "Medio");
  const [duration, setDuration] = useState(initialBlock?.durationMinutes ?? 60);
  const [notesHtml, setNotesHtml] = useState(initialBlock?.notesHtml ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      date,
      mesocycleId,
      sessionType,
      intensity,
      volume,
      durationMinutes: duration,
      notesHtml,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--ink-900)] border border-[var(--line-800)] rounded-2xl p-5 space-y-5"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="dbe-session-type" className="text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider">Tipo de sesión</label>
          <select
            id="dbe-session-type"
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--line-800)] bg-[var(--ink-800)] text-[var(--mist-100)] font-semibold px-3 py-2.5 text-sm focus:border-[var(--signal-500)] focus:ring-2 focus:ring-[var(--signal-500)]/20 outline-none transition-all cursor-pointer"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dbe-duration" className="text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider">Duración (min)</label>
          <input
            id="dbe-duration"
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1.5 w-full rounded-lg border border-[var(--line-800)] bg-[var(--ink-800)] text-[var(--mist-100)] font-semibold px-3 py-2.5 text-sm focus:border-[var(--signal-500)] focus:ring-2 focus:ring-[var(--signal-500)]/20 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="dbe-intensity" className="text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider">
            Intensidad: <span className="text-[var(--signal-500)] font-black">{intensity}/10</span>
          </label>
          <input
            id="dbe-intensity"
            type="range"
            min={1}
            max={10}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--signal-500)]"
          />
        </div>

        <div>
          <p className="text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider">Volumen</p>
          <div className="mt-1.5 flex gap-2" role="group" aria-label="Volumen de la sesión">
            {VOLUME_LEVELS.map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setVolume(v)}
                aria-pressed={volume === v}
                className={`flex-1 rounded-lg border px-2 py-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] ${
                  volume === v
                    ? "bg-[var(--signal-500)] border-[var(--signal-500)] text-[var(--ink-950)]"
                    : "border-[var(--line-800)] bg-[var(--ink-800)] text-[var(--mist-300)] hover:border-[var(--signal-500)]/50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* react-quill (tema snow) trae estilos claros hardcodeados: se deja en
          panel claro deliberado, igual criterio que en AthleteDetailView. */}
      <div>
        <label className="text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider">Notas libres</label>
        <div className="mt-1.5 rounded-lg overflow-hidden border border-[var(--line-800)] bg-[var(--mist-100)]">
          <ReactQuill
            theme="snow"
            value={notesHtml}
            onChange={setNotesHtml}
            modules={QUILL_MODULES}
            placeholder="Indicaciones para el atleta, series, RPE, observaciones..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-semibold rounded-lg text-[var(--mist-300)] hover:bg-[var(--ink-800)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 text-sm rounded-lg bg-[var(--signal-500)] text-[var(--ink-950)] font-bold hover:bg-[var(--signal-600)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-900)]"
        >
          Guardar bloque
        </button>
      </div>
    </form>
  );
}