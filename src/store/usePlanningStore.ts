import { create } from 'zustand';
import { Club, TrainingSession } from '../types/planning';

interface PlanningStore {
  clubs: Club[];
  setClubs: (clubs: Club[]) => void;
  activeClubId: string | null;
  setActiveClub: (id: string | null) => void;
  activeCategoryId: string | null;
  setActiveCategory: (id: string | null) => void;
  selectedSession: TrainingSession | null;
  setSelectedSession: (session: TrainingSession | null) => void;
}

export const usePlanningStore = create<PlanningStore>((set) => ({
  clubs: [],
  setClubs: (clubs) => set({ clubs }),
  activeClubId: null,
  setActiveClub: (id) => set({ activeClubId: id }),
  activeCategoryId: null,
  setActiveCategory: (id) => set({ activeCategoryId: id }),
  selectedSession: null,
  setSelectedSession: (session) => set({ selectedSession: session }),
}));