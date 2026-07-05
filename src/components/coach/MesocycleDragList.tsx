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
import { formatWeekRange } from "../../utils/dateUtils";
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
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-2 cursor-pointer transition-colors ${
        isActive
          ? "bg-blue-100/60 border-blue-300"
          : "bg-white border-gray-200 hover:border-blue-200"
      }`}
      onClick={onSelect}
    >
      {/* Handle de arrastre: separado del click de selección */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="text-gray-400 hover:text-blue-500 cursor-grab active:cursor-grabbing"
        aria-label="Reordenar mesociclo"
      >
        <GripVertical size={18} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{mesocycle.name}</p>
        <p className="text-xs text-gray-500">
          {mesocycle.phase} · {format(parseISO(mesocycle.startDate), "d MMM")} -{" "}
          {format(parseISO(mesocycle.endDate), "d MMM yyyy")}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="text-gray-400 hover:text-blue-500 shrink-0"
        aria-label="Editar mesociclo"
      >
        <Pencil size={14} />
      </button>

      {isActive && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
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
