import { Skeleton } from "../../ui/Skeleton";

// Forma del perfil del atleta mientras CoachApp sigue trayendo la lista
export default function AthleteDetailSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8" aria-busy="true" aria-live="polite">
      <Skeleton className="h-5 w-40 rounded-lg" />
      <Skeleton className="h-32 w-full rounded-3xl" />
      <Skeleton className="h-8 w-72 rounded-lg" />
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-28 w-full rounded-3xl" />
    </div>
  );
}
