import React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil } from "lucide-react";
import type { Mesocycle } from "../../types/models";
import { parseISO, format } from "date-fns";

interface MesocycleDragListProps {
  mesocycles: Mesocycle[];
  activeMesocycleId: string | null;
  onSelect: (mesocycleId: string) => void;
  onEdit: (mesocycleId: string) => void;
  onReorder: (reordered: Mesocycle[]) => void;
}

/**
 * Item individual arrastrable. Usa useSortable de @dnd-kit/sortable.
 */
function SortableMesocycleItem({
  mesocycle,
  isActive,
  onSelect,
  onEdit,
}: {
  mesocycle: Mesocycle;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mesocycle.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-center gap-3 rounded-xl border px-4 py-3 mb-2 cursor-pointer transition-colors motion-reduce:transition-none ${
        isActive
          ? "bg-[var(--ink-800)] border-[var(--line-800)]"
          : "bg-[var(--ink-900)] border-[var(--line-800)] hover:border-[var(--mist-500)]/40"
      }`}
      onClick={onSelect}
    >
      {/* Carril activo, mismo motivo visual del sidebar principal */}
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full bg-[var(--signal-500)] transition-all duration-200 motion-reduce:transition-none ${
          isActive ? "h-6 opacity-100" : "h-0 opacity-0"
        }`}
      />

      {/* Handle de arrastre: separado del click de selección */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="text-[var(--mist-500)] hover:text-[var(--signal-500)] cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] rounded"
        aria-label={`Reordenar mesociclo ${mesocycle.name}`}
      >
        <GripVertical size={18} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--mist-100)] truncate">{mesocycle.name}</p>
        <p className="text-xs text-[var(--mist-500)] font-medium">
          {mesocycle.phase} · {format(parseISO(mesocycle.startDate), "d MMM")} -{" "}
          {format(parseISO(mesocycle.endDate), "d MMM yyyy")}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="text-[var(--mist-500)] hover:text-[var(--signal-500)] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] rounded p-1"
        aria-label={`Editar mesociclo ${mesocycle.name}`}
      >
        <Pencil size={14} />
      </button>

      {isActive && <span className="h-2 w-2 rounded-full bg-[var(--signal-500)] shrink-0" />}
    </div>
  );
}

export default function MesocycleDragList({
  mesocycles,
  activeMesocycleId,
  onSelect,
  onEdit,
  onReorder,
}: MesocycleDragListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ordered = [...mesocycles].sort((a, b) => a.order - b.order);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((m) => m.id === active.id);
    const newIndex = ordered.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(ordered, oldIndex, newIndex).map((m, idx) => ({
      ...m,
      order: idx,
    }));

    onReorder(reordered);
  }

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-[var(--mist-500)] italic px-1">
        Todavía no hay mesociclos en este macrociclo.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        {ordered.map((meso) => (
          <SortableMesocycleItem
            key={meso.id}
            mesocycle={meso}
            isActive={meso.id === activeMesocycleId}
            onSelect={() => onSelect(meso.id)}
            onEdit={() => onEdit(meso.id)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}