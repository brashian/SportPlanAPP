import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import type { DailyBlock, VolumeLevel } from "../../types/models";
import { VOLUME_LEVELS } from "../../types/models";

interface DayBlockEditorProps {
  date: string;
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
      className="bg-white border border-blue-100 rounded-xl p-4 space-y-4 shadow-card"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500">Tipo de sesión</label>
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Duración (min)</label>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">
            Intensidad: <span className="text-blue-500 font-semibold">{intensity}/10</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="mt-2 w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Volumen</label>
          <div className="mt-1 flex gap-2">
            {VOLUME_LEVELS.map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setVolume(v)}
                className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                  volume === v
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500">Notas libres</label>
        <div className="mt-1 rounded-lg overflow-hidden border border-gray-200">
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
          className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
        >
          Guardar bloque
        </button>
      </div>
    </form>
  );
}
