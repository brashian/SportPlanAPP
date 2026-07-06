// ============================================================================
// MODELO DE DATOS
// Jerarquía: Coach -> Athlete -> Macrocycle -> Mesocycle -> Week (calculada) -> DailyBlock
// ============================================================================

export type UserRole = "coach" | "athlete";

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  avatarUrl?: string;
}

// ----------------------------------------------------------------------------
// Fases estrictas de un Mesociclo (según requerimiento)
// ----------------------------------------------------------------------------
export type MesocyclePhase =
  | "Preparación General"
  | "Preparación Específica"
  | "Pre-Competitiva"
  | "Competitiva"
  | "Transición";

export const MESOCYCLE_PHASES: MesocyclePhase[] = [
  "Preparación General",
  "Preparación Específica",
  "Pre-Competitiva",
  "Competitiva",
  "Transición",
];

export type VolumeLevel = "Bajo" | "Medio" | "Alto";
export const VOLUME_LEVELS: VolumeLevel[] = ["Bajo", "Medio", "Alto"];

// ----------------------------------------------------------------------------
// Bloque de entrenamiento diario (unidad mínima editable)
// ----------------------------------------------------------------------------
export interface DailyBlock {
  id: string;
  mesocyclyId: string;
  date: string; // ISO "yyyy-MM-dd"
  sessionType: string; // Ej: "Fuerza", "Técnico", "Táctico", "Recuperación"
  intensity: number; // Escala 1-10
  volume: "Bajo" | "Medio" | "Alto";
  durationMinutes: number;
  notesHtml: string; 
  createdAt: string;
  updatedAt: string;
  //ejercicios anachi
  exercises?: {id:string, name: string, reps:String, weight:string}[];
}

// ----------------------------------------------------------------------------
// Día (contenedor de N bloques) — parte de la semana CALCULADA, no persistida
// ----------------------------------------------------------------------------
export interface DayPlan {
  date: string; // ISO "yyyy-MM-dd"
  dayOfWeek: number; // 0 (domingo) - 6 (sábado)
  blocks: DailyBlock[];
}

// ----------------------------------------------------------------------------
// Semana — SIEMPRE calculada en runtime a partir de las fechas del Mesociclo.
// No se persiste como entidad propia en la base de datos.
// ----------------------------------------------------------------------------
export interface Week {
  weekNumber: number; // 1, 2, 3...
  startDate: string; // ISO
  endDate: string; // ISO
  days: DayPlan[]; // longitud 7
}

// ----------------------------------------------------------------------------
// Mesociclo
// ----------------------------------------------------------------------------
export interface Mesocycle {
  id: string;
  macrocycleId: string;
  name: string;
  phase: MesocyclePhase;
  startDate: string; // ISO
  endDate: string; // ISO
  order: number; // posición para drag-and-drop
  // Los bloques diarios reales se guardan en un mapa plano (ver DailyBlocksMap)
  // y se "hidratan" contra las semanas calculadas mediante el hook useMesocycleWeeks.
}

// Mapa plano fecha -> bloques, para no duplicar persistencia de semanas/días
export type DailyBlocksMap = Record<string /* yyyy-MM-dd */, DailyBlock[]>;

// ----------------------------------------------------------------------------
// Macrociclo
// ----------------------------------------------------------------------------
export interface Macrocycle {
  id: string;
  athleteId: string;
  name: string;
  startDate: string; // ISO, fecha libre elegida por el coach
  endDate: string; // ISO, fecha libre elegida por el coach
  createdAt: string; // ISO — permite ordenar el historial (más reciente primero)
  mesocycles: Mesocycle[];
}

// ----------------------------------------------------------------------------
// Atleta
// ----------------------------------------------------------------------------
export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  coachId: string;
  avatarUrl?: string;
  // Relación 1:N — un atleta acumula TODO su historial de macrociclos a lo
  // largo de los años (temporadas, recuperaciones de lesión, etc.) sin perder
  // el pasado al armar uno nuevo.
  sport: string;
  phone?: string;
  macrocycles: Macrocycle[];
}

/** Nombre completo listo para mostrar en listados y encabezados */
export function athleteFullName(athlete: Pick<Athlete, "firstName" | "lastName">): string {
  return `${athlete.firstName} ${athlete.lastName}`.trim();
}

export interface Coach {
  id: string;
  name: string;
  email: string;
  athleteIds: string[];
}

// ============================================================================
// MÓDULO 2: Planificación del Club (independiente de la planificación individual)
// ============================================================================
export type ClubSport = "Vóley" | "Beach Vóley";

export interface Team {
  id: string;
  coachId: string;
  sport: ClubSport;
  category: string; // Ej: "Sub-16 Femenino", "Primera División"
}

export interface ClubSession {
  id: string;
  teamId: string;
  date: string; // ISO
  sessionType: string;
  intensity: number;
  volume: VolumeLevel;
  durationMinutes: number;
  notesHtml: string;
}
