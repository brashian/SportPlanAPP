import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Users, Search, Plus, X, ChevronRight, Activity, Loader2, AlertCircle, MessageSquare } from "lucide-react";
import { auth, db } from "../../firebase";
import type { Athlete } from "../../types/models";
import { athleteFullName } from "../../types/models";
import ModalShell from "../shared/ModalShell";
import { Skeleton } from "../ui/Skeleton";

interface Props {
  athletes: Athlete[];
  // true mientras llega la lista de atletas
  isLoading: boolean;
  // true mientras llegan los macrociclos (solo afecta al contador de cada tarjeta)
  areMacrosLoading: boolean;
  onCreateAthlete: (data: { name: string; sport: string; email?: string; phone?: string }) => Promise<void>;
}

// Skeleton de la grilla: muestra la forma de las tarjetas que están por llegar
function AthleteGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-44 rounded-3xl" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

export default function AthleteListView({ athletes, isLoading, areMacrosLoading, onCreateAthlete }: Props) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", sport: "", email: "", phone: "",
  });

  // Feedback sin ver por atleta: una sola consulta para toda la lista
  const [unseenByAthlete, setUnseenByAthlete] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    async function loadUnseen() {
      const coachId = auth.currentUser?.uid;
      if (!coachId) return;
      try {
        const snap = await getDocs(query(
          collection(db, "sessionFeedback"),
          where("coachId", "==", coachId),
          where("seenByCoach", "==", false),
        ));
        const counts: Record<string, number> = {};
        snap.forEach((d) => {
          const athleteId = d.data().athleteId as string;
          counts[athleteId] = (counts[athleteId] || 0) + 1;
        });
        if (!cancelled) setUnseenByAthlete(counts);
      } catch (error) {
        // No es crítico: la lista se muestra igual, sin los badges
        if (!cancelled) console.error("Error al traer el feedback sin ver:", error);
      }
    }
    loadUnseen();
    return () => { cancelled = true; };
  }, []);

  const filteredAthletes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return athletes;
    return athletes.filter((a) => {
      const full = (athleteFullName(a) || a.name || "").toLowerCase();
      return full.includes(term) || a.sport.toLowerCase().includes(term);
    });
  }, [athletes, searchTerm]);

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const nameCombo = `${formData.firstName} ${formData.lastName}`.trim();
      await onCreateAthlete({
        name: nameCombo, sport: formData.sport, email: formData.email, phone: formData.phone,
      });
      closeModal();
      setFormData({ firstName: "", lastName: "", sport: "", email: "", phone: "" });
    } catch {
      // Se conservan los datos cargados para que el coach pueda reintentar
      setFormError("No se pudo registrar al atleta. Revisá tu conexión y probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToAthlete = (id: string) => navigate(`/athletes/${id}`);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 bg-[var(--ink-950)]">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-[var(--mist-100)] tracking-wide uppercase flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-[var(--signal-500)] flex items-center justify-center shrink-0">
              <Users className="text-[var(--ink-950)]" size={22} strokeWidth={2.5} />
            </span>
            Mis Atletas
          </h1>
          <p className="text-[var(--mist-500)] font-medium mt-2">Gestioná los perfiles y planificaciones de tu equipo.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] px-6 py-3.5 rounded-2xl font-display font-bold uppercase tracking-wide transition-colors active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-950)]"
        >
          <Plus size={20} strokeWidth={2.5} /> Nuevo Atleta
        </button>
      </div>

      <div className="bg-[var(--ink-900)] p-2 rounded-2xl border border-[var(--line-800)] flex items-center gap-3 focus-within:ring-2 focus-within:ring-[var(--signal-500)]/40 transition-all">
        <Search className="text-[var(--mist-500)] ml-3 shrink-0" size={20} />
        <label htmlFor="athlete-search" className="sr-only">Buscar por nombre o deporte</label>
        <input
          id="athlete-search"
          type="text"
          placeholder="Buscar por nombre o deporte..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 bg-transparent border-none focus:outline-none text-[var(--mist-100)] font-medium placeholder:text-[var(--mist-500)]"
        />
      </div>

      {isLoading ? (
        <AthleteGridSkeleton />
      ) : athletes.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-[var(--line-800)] rounded-3xl bg-[var(--ink-900)]/50 flex flex-col items-center">
          <Users size={56} className="text-[var(--mist-500)] mb-4" />
          <p className="text-xl font-display font-bold text-[var(--mist-100)] uppercase tracking-wide">Aún no tenés atletas</p>
          <p className="text-[var(--mist-500)] mt-2 font-medium">Hacé clic en "Nuevo Atleta" para empezar a armar tu equipo.</p>
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="p-12 text-center text-[var(--mist-500)] font-medium">
          No se encontraron atletas que coincidan con "{searchTerm}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredAthletes.map((athlete) => {
            const name = athleteFullName(athlete) || athlete.name;
            return (
              <div
                key={athlete.id}
                role="button"
                tabIndex={0}
                aria-label={`Ver perfil de ${name}`}
                onClick={() => goToAthlete(athlete.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToAthlete(athlete.id);
                  }
                }}
                className="bg-[var(--ink-900)] border border-[var(--line-800)] rounded-3xl p-6 hover:border-[var(--signal-500)]/50 hover:-translate-y-1 transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0 cursor-pointer group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-950)]"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-[var(--signal-500)] to-[var(--signal-600)] text-[var(--ink-950)] rounded-2xl flex items-center justify-center text-xl font-display font-bold shrink-0 group-hover:scale-105 transition-transform motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                    {name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg text-[var(--mist-100)] tracking-tight leading-tight truncate group-hover:text-[var(--signal-500)] transition-colors">
                      {name}
                    </h3>
                    <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-wider bg-[var(--ink-800)] text-[var(--mist-300)] px-2 py-0.5 rounded-md">
                      {athlete.sport || "Sin Deporte"}
                    </span>
                    {unseenByAthlete[athlete.id] > 0 && (
                      <span className="inline-flex items-center gap-1 mt-1 ml-1.5 text-[10px] font-black uppercase tracking-wider bg-[var(--signal-500)] text-[var(--ink-950)] px-2 py-0.5 rounded-md">
                        <MessageSquare size={11} /> {unseenByAthlete[athlete.id]} nuevo{unseenByAthlete[athlete.id] > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-[var(--line-800)] flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--mist-500)]">
                    <Activity size={14} />
                    {areMacrosLoading && (athlete.macrocycles || []).length === 0 ? (
                      <Skeleton className="h-3 w-14 rounded" aria-label="Cargando macrociclos" />
                    ) : (
                      <>{(athlete.macrocycles || []).length} Macros</>
                    )}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[var(--ink-800)] flex items-center justify-center group-hover:bg-[var(--signal-500)]/15 transition-colors">
                    <ChevronRight size={18} className="text-[var(--mist-500)] group-hover:text-[var(--signal-500)]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Atleta */}
      {isModalOpen && (
        <ModalShell onClose={closeModal} labelledBy="new-athlete-title" panelClassName="max-w-md p-8">
          {(close) => (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 id="new-athlete-title" className="text-2xl font-display font-bold text-[var(--mist-100)] uppercase tracking-wide">
                  Nuevo Atleta
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Cerrar formulario"
                  className="p-2 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-full transition-colors text-[var(--mist-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {formError && (
                  <div role="alert" className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="shrink-0" /> {formError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="af-firstname" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Nombre *</label>
                    <input
                      id="af-firstname" required type="text" value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all placeholder:text-[var(--mist-500)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="af-lastname" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Apellido *</label>
                    <input
                      id="af-lastname" required type="text" value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all placeholder:text-[var(--mist-500)]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="af-sport" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Deporte o Categoría *</label>
                  <input
                    id="af-sport" required type="text" placeholder="Ej: Fútbol Primera" value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all placeholder:text-[var(--mist-500)]"
                  />
                </div>
                <div>
                  <label htmlFor="af-email" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Email (Para que pueda ingresar)</label>
                  <input
                    id="af-email" type="email" placeholder="atleta@correo.com" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all placeholder:text-[var(--mist-500)]"
                  />
                </div>
                <div>
                  <label htmlFor="af-phone" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Teléfono</label>
                  <input
                    id="af-phone" type="tel" placeholder="+54 9 11 ..." value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all placeholder:text-[var(--mist-500)]"
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="submit" disabled={isSubmitting}
                    className="w-full bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] font-display font-bold uppercase tracking-wide py-4 rounded-xl disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-900)]"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {isSubmitting ? "Guardando..." : "Registrar Atleta"}
                  </button>
                </div>
              </form>
            </>
          )}
        </ModalShell>
      )}
    </div>
  );
}