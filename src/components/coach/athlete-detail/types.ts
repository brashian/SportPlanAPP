import type { MesocyclePhase, VolumeLevel } from "../../../types/models";

// Tipos de los formularios de AthleteDetailView, compartidos con sus modales.

export interface MacroFormData {
  name: string;
  startDate: string;
  endDate: string;
}

export interface MesoFormData {
  name: string;
  phase: MesocyclePhase;
  startDate: string;
  endDate: string;
}

export interface AthleteFormData {
  name: string;
  sport: string;
  email: string;
  phone: string;
}

export interface BlockExerciseForm {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  groupId?: string;
  videoUrl?: string;
}

export interface BlockFormData {
  sessionType: string;
  intensity: number;
  volume: VolumeLevel;
  durationMinutes: number;
  notesHtml: string;
  exercises: BlockExerciseForm[];
}

export interface BlockContext {
  mesoId: string;
  date: string;
  name: string;
  existingId?: string;
}

// Mapeo "número de día de la plantilla" → día de la semana JS ("0" = domingo ... "6" = sábado)
export type DayMapping = Record<number, string>;
