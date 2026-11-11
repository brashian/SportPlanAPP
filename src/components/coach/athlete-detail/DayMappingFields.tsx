import type { TemplateDay } from "../../../types/models";
import type { DayMapping } from "./types";

interface DayMappingFieldsProps {
  days: TemplateDay[];
  mapping: DayMapping;
  onChange: (mapping: DayMapping) => void;
  heading: string;
  placeholder: string;
  // Prefijo de los ids de los <select> (cada modal usa el suyo para no repetir ids)
  idPrefix: string;
  // Muestra "Día N: tipo de sesión" en vez de solo "Día N"
  showSessionType?: boolean;
}

// Asigna cada día de una plantilla/rutina a un día de la semana
export default function DayMappingFields({ days, mapping, onChange, heading, placeholder, idPrefix, showSessionType = false }: DayMappingFieldsProps) {
  return (
    <div className="bg-[var(--ink-800)] p-5 rounded-2xl border border-[var(--line-800)] space-y-4">
      <p className="text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider">{heading}</p>
      {days.map(d => (
        <div key={d.dayNumber} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-[var(--line-800)] pb-3 last:border-0 last:pb-0">
          {showSessionType ? (
            <label htmlFor={`${idPrefix}-${d.dayNumber}`} className="text-xs font-bold text-[var(--mist-100)] truncate w-32" title={d.sessionType}>Día {d.dayNumber}: {d.sessionType}</label>
          ) : (
            <label htmlFor={`${idPrefix}-${d.dayNumber}`} className="text-sm font-bold text-[var(--mist-100)]">Día {d.dayNumber}</label>
          )}
          <select id={`${idPrefix}-${d.dayNumber}`} required value={mapping[d.dayNumber] || ""} onChange={(e) => onChange({ ...mapping, [d.dayNumber]: e.target.value })} className="bg-[var(--ink-900)] border border-[var(--line-800)] rounded-xl p-2 text-sm font-bold text-[var(--mist-100)] w-full sm:w-36 outline-none focus:ring-2 focus:ring-[var(--signal-500)] transition-all">
            <option value="">{placeholder}</option><option value="1">Lunes</option><option value="2">Martes</option><option value="3">Miércoles</option><option value="4">Jueves</option><option value="5">Viernes</option><option value="6">Sábado</option><option value="0">Domingo</option>
          </select>
        </div>
      ))}
    </div>
  );
}
