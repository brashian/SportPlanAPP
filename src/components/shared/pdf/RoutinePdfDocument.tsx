// Formato de impresión para las rutinas que descarga el coach (A4, blanco y negro).
// A propósito no usa los tokens oscuros de la app: es papel, y en blanco y negro
// se lee mejor y ahorra tinta. Los colores van en hex porque html2canvas no
// siempre resuelve variables CSS.

export interface PdfExercise {
  name: string;
  sets?: string;
  reps: string;
  weight: string;
  groupId?: string;
}

export interface PdfDay {
  title: string; // Ej: "Lunes 03/03" o "Día 1"
  sessionType?: string;
  exercises: PdfExercise[];
  notes?: string; // HTML (editor Quill) o texto plano (textarea)
}

export interface PdfSection {
  heading?: string; // Ej: "Semana 2 · Del 10/03 al 16/03"
  days: PdfDay[];
}

export interface RoutinePdfProps {
  title: string;
  subtitle?: string;
  athleteName?: string;
  sections: PdfSection[];
}

const BRAND = "#FF5A1F";

const formatWeight = (weight?: string) => {
  const w = (weight || "").trim();
  if (!w) return "-";
  return /kg|%|lb|seg|rir|rpe/i.test(w) ? w : `${w} kg`;
};

const hasContent = (notes?: string) => !!notes && notes.replace(/<[^>]*>/g, "").trim() !== "";

function DayBlock({ day }: { day: PdfDay }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div className="pdf-day-header" style={{ borderBottom: `2px solid ${BRAND}`, paddingBottom: "4px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "15px", fontWeight: 800, textTransform: "uppercase" }}>{day.title}</span>
        {day.sessionType && <span style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>{day.sessionType}</span>}
      </div>

      {day.exercises.length === 0 ? (
        <p style={{ fontSize: "12px", color: "#6B7280", fontStyle: "italic" }}>Sin ejercicios cargados.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#F3F4F6", textAlign: "left", color: "#4B5563", textTransform: "uppercase", fontSize: "10px" }}>
              <th style={{ padding: "6px", width: "42px", textAlign: "center" }}>Blq</th>
              <th style={{ padding: "6px" }}>Ejercicio</th>
              <th style={{ padding: "6px", width: "110px" }}>Series x Reps</th>
              <th style={{ padding: "6px", width: "90px" }}>Carga</th>
            </tr>
          </thead>
          <tbody>
            {day.exercises.map((ex, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E5E7EB" }}>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: 800, color: BRAND }}>{ex.groupId?.trim() || "-"}</td>
                <td style={{ padding: "6px", fontWeight: 600 }}>{ex.name || "-"}</td>
                <td style={{ padding: "6px" }}>{ex.sets ? `${ex.sets} x ${ex.reps}` : ex.reps || "-"}</td>
                <td style={{ padding: "6px" }}>{formatWeight(ex.weight)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {hasContent(day.notes) && (
        /<[a-z][\s\S]*>/i.test(day.notes!) ? (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#374151", borderLeft: "3px solid #D1D5DB", paddingLeft: "8px" }} dangerouslySetInnerHTML={{ __html: day.notes! }} />
        ) : (
          <p style={{ marginTop: "8px", fontSize: "12px", color: "#374151", borderLeft: "3px solid #D1D5DB", paddingLeft: "8px", whiteSpace: "pre-line" }}>{day.notes}</p>
        )
      )}
    </div>
  );
}

export default function RoutinePdfDocument({ title, subtitle, athleteName, sections }: RoutinePdfProps) {
  return (
    <div style={{ width: "190mm", background: "#FFFFFF", color: "#111827", fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ borderBottom: "4px solid #111827", paddingBottom: "10px", marginBottom: "16px" }}>
        <p style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: BRAND }}>SportPlan</p>
        <h1 style={{ fontSize: "24px", fontWeight: 900, textTransform: "uppercase", margin: "4px 0 0" }}>{title}</h1>
        <p style={{ fontSize: "12px", color: "#4B5563", marginTop: "4px" }}>
          {[athleteName && `Atleta: ${athleteName}`, subtitle].filter(Boolean).join(" · ")}
        </p>
      </header>

      {sections.map((section, i) => (
        <section key={i}>
          {i > 0 && <div className="html2pdf__page-break" />}
          {section.heading && (
            <h2 style={{ fontSize: "14px", fontWeight: 800, textTransform: "uppercase", color: "#4B5563", margin: "0 0 10px" }}>{section.heading}</h2>
          )}
          {section.days.map((day, j) => <DayBlock key={j} day={day} />)}
        </section>
      ))}
    </div>
  );
}
