import type { Athlete, DailyBlock } from "./types/models";

/**
 * Datos semilla SOLO para poder previsualizar la app sin backend.
 * Reemplazar por llamadas reales a tu API cuando conectes el backend.
 *
 * Nota clave: "Bruno" (athlete-2) tiene 3 Macrociclos en su historial
 * (2024, 2025 y la temporada vigente) para demostrar la relación 1:N
 * athlete.macrocycles: Macrocycle[] — nada se pierde de temporadas pasadas.
 */
export const seedAthletes: Athlete[] = [
  {
    id: "athlete-1",
    firstName: "Julia",
    lastName: "Fernández",
    email: "julia@example.com",
    coachId: "coach-1",
    macrocycles: [
      {
        id: "macro-1",
        athleteId: "athlete-1",
        name: "Temporada 2026",
        startDate: "2026-01-05",
        endDate: "2026-11-30",
        createdAt: "2026-01-01T10:00:00Z",
        mesocycles: [
          {
            id: "meso-1",
            macrocycleId: "macro-1",
            name: "Base General 1",
            phase: "Preparación General",
            startDate: "2026-06-01",
            endDate: "2026-06-28",
            order: 0,
          },
          {
            id: "meso-2",
            macrocycleId: "macro-1",
            name: "Específico 1",
            phase: "Preparación Específica",
            startDate: "2026-06-29",
            endDate: "2026-07-26",
            order: 1,
          },
        ],
      },
    ],
  },
  {
    id: "athlete-2",
    firstName: "Bruno",
    lastName: "Gómez",
    email: "bruno@example.com",
    coachId: "coach-1",
    macrocycles: [
      {
        id: "macro-bruno-2024",
        athleteId: "athlete-2",
        name: "Temporada 2024",
        startDate: "2024-02-01",
        endDate: "2024-11-30",
        createdAt: "2024-01-15T10:00:00Z",
        mesocycles: [
          {
            id: "meso-bruno-2024-1",
            macrocycleId: "macro-bruno-2024",
            name: "Pretemporada",
            phase: "Preparación General",
            startDate: "2024-02-01",
            endDate: "2024-03-01",
            order: 0,
          },
        ],
      },
      {
        id: "macro-bruno-2025",
        athleteId: "athlete-2",
        name: "Temporada 2025",
        startDate: "2025-02-01",
        endDate: "2025-11-30",
        createdAt: "2025-01-15T10:00:00Z",
        mesocycles: [
          {
            id: "meso-bruno-2025-1",
            macrocycleId: "macro-bruno-2025",
            name: "Competitivo Apertura",
            phase: "Competitiva",
            startDate: "2025-04-01",
            endDate: "2025-04-29",
            order: 0,
          },
        ],
      },
      {
        id: "macro-bruno-2026",
        athleteId: "athlete-2",
        name: "Temporada 2026",
        startDate: "2026-01-05",
        endDate: "2026-11-30",
        createdAt: "2026-01-01T10:00:00Z",
        mesocycles: [
          {
            id: "meso-bruno-2026-1",
            macrocycleId: "macro-bruno-2026",
            name: "Base General 1",
            phase: "Preparación General",
            startDate: "2026-06-15",
            endDate: "2026-07-12",
            order: 0,
          },
          {
            id: "meso-bruno-2026-2",
            macrocycleId: "macro-bruno-2026",
            name: "Pre-Competitivo",
            phase: "Pre-Competitiva",
            startDate: "2026-07-13",
            endDate: "2026-08-09",
            order: 1,
          },
        ],
      },
    ],
  },
];

export const seedBlocksByMesocycle: Record<string, DailyBlock[]> = {
  "meso-1": [
    {
      id: "block-1",
      date: "2026-06-02",
      sessionType: "Físico - Fuerza",
      intensity: 6,
      volume: "Medio",
      durationMinutes: 75,
      notesHtml: "<p>Foco en <strong>tren inferior</strong>. RPE objetivo 6-7.</p>",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    },
  ],
  "meso-bruno-2026-1": [
    {
      id: "block-bruno-1",
      date: "2026-07-06",
      sessionType: "Técnico",
      intensity: 5,
      volume: "Medio",
      durationMinutes: 90,
      notesHtml: "<p>Trabajo de <em>recepción</em> y saque en salto.</p>",
      createdAt: "2026-07-01T10:00:00Z",
      updatedAt: "2026-07-01T10:00:00Z",
    },
  ],
};
