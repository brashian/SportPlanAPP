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
// Fases estrictas de un Mesociclo
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
  mesocycleId: string;
  date: string; // ISO "yyyy-MM-dd"
  sessionType: string; // Ej: "Fuerza", "Técnico", "Táctico", "Recuperación"
  intensity: number; // Escala 1-10
  volume: "Bajo" | "Medio" | "Alto";
  durationMinutes: number;
  notesHtml: string; 
  createdAt: string;
  updatedAt: string;
  exercises?: {id:string, name: string, sets?: string, reps:string, weight:string, groupId?:string, videoUrl?: string}[];
}

// ----------------------------------------------------------------------------
// Día (contenedor de N bloques)
// ----------------------------------------------------------------------------
export interface DayPlan {
  date: string; // ISO "yyyy-MM-dd"
  dayOfWeek: number; // 0 (domingo) - 6 (sábado)
  blocks: DailyBlock[];
}

// ----------------------------------------------------------------------------
// Semana — SIEMPRE calculada en runtime a partir de las fechas del Mesociclo.
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
}

export type DailyBlocksMap = Record<string /* yyyy-MM-dd */, DailyBlock[]>;

// ----------------------------------------------------------------------------
// Macrociclo
// ----------------------------------------------------------------------------
export interface Macrocycle {
  id: string;
  athleteId: string;
  name: string;
  startDate: string; // ISO
  endDate: string; // ISO
  createdAt: string; 
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
  sport: string;
  phone?: string;
  macrocycles: Macrocycle[];
}

export function athleteFullName(athlete: Pick<Athlete, "firstName" | "lastName">): string {
  return `${athlete.firstName} ${athlete.lastName}`.trim();
}

export interface Coach {
  id: string;
  name: string;
  email: string;
  athleteIds: string[];
  isApproved?: boolean;
}

// ============================================================================
// MÓDULO 2: Planificación del Club (independiente)
// ============================================================================
export type ClubSport = "Vóley" | "Beach Vóley";

export interface Team {
  id: string;
  coachId: string;
  sport: ClubSport;
  category: string; 
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

export interface TemplateDay {
  dayNumber: number; 
  sessionType: string;
  exercises: any[]; 
  notesHtml: string;
}

export interface RoutineTemplate {
  id: string;
  coachId: string;
  name: string;
  daysCount: number;
  days: TemplateDay[];
  createdAt: string;
}

export interface MonthlyRoutine {
  id: string;
  athleteId: string;
  coachId: string;
  monthName: string; 
  days: TemplateDay[];
  createdAt: string;
}