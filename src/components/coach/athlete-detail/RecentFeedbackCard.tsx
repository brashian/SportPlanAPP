import { useState } from "react";
import { ChevronRight, MessageSquare, X } from "lucide-react";
import type { SessionFeedback } from "../../../types/models";
import ModalShell from "../../shared/ModalShell";
import FeedbackPanel, { feedbackFlags } from "./FeedbackPanel";
import { toDayMonthYear } from "./dateHelpers";

interface Props {
  feedbackByDate: Record<string, SessionFeedback>;
  onSeen: (date: string) => void;
}

const MAX_ITEMS = 10;

// Últimos feedbacks del atleta: lo que el coach mira para ajustar las rutinas siguientes
export default function RecentFeedbackCard({ feedbackByDate, onSeen }: Props) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const items = Object.values(feedbackByDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_ITEMS);
  if (items.length === 0) return null;

  const unseen = items.filter((fb) => !fb.seenByCoach).length;
  const opened = openDate ? feedbackByDate[openDate] : null;

  const open = (fb: SessionFeedback) => {
    setOpenDate(fb.date);
    onSeen(fb.date);
  };

  return (
    <section className="bg-[var(--ink-900)] border border-[var(--line-800)] rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-display font-bold text-[var(--mist-100)] uppercase tracking-wide flex items-center gap-2">
          <MessageSquare className="text-[var(--signal-500)]" size={22} /> Feedback reciente
        </h2>
        {unseen > 0 && (
          <span className="text-xs font-black bg-[var(--signal-500)] text-[var(--ink-950)] px-2.5 py-1 rounded-full">
            {unseen} nuevo{unseen > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <ul className="divide-y divide-[var(--line-800)]">
        {items.map((fb) => {
          const flags = feedbackFlags(fb);
          return (
            <li key={fb.id}>
              <button
                onClick={() => open(fb)}
                className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-[var(--ink-850)] rounded-xl px-2 -mx-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--mist-100)] flex items-center gap-2">
                    {!fb.seenByCoach && <span className="w-2 h-2 rounded-full bg-[var(--signal-500)] shrink-0" aria-label="Nuevo" />}
                    <span className="truncate">{toDayMonthYear(fb.date)} · {fb.sessionType}</span>
                  </p>
                  <p className="text-xs text-[var(--mist-500)] mt-0.5 truncate">
                    {[fb.rpe !== null ? `RPE ${fb.rpe}` : null, ...flags].filter(Boolean).join(" · ") || "Solo comentario"}
                  </p>
                </div>
                <ChevronRight size={18} className="text-[var(--mist-500)] shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>

      {opened && (
        <ModalShell
          onClose={() => setOpenDate(null)}
          labelledBy="feedback-modal-title"
          panelClassName="max-w-2xl p-0 overflow-hidden"
        >
          {(close) => (
            <div className="max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between gap-3 p-5 border-b border-[var(--line-800)]">
                <h2 id="feedback-modal-title" className="font-display font-bold text-lg text-[var(--mist-100)] uppercase tracking-wide">
                  {toDayMonthYear(opened.date)} · {opened.sessionType}
                </h2>
                <button onClick={close} aria-label="Cerrar feedback" className="p-2 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-full transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
                  <X size={18} className="text-[var(--mist-100)]" />
                </button>
              </div>
              <div className="p-5">
                <FeedbackPanel feedback={opened} />
              </div>
            </div>
          )}
        </ModalShell>
      )}
    </section>
  );
}
