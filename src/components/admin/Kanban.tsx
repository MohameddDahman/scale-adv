"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { Badge, type Tone } from "./ui";

type Column<T> = { key: string; label: string; tone: Tone; items: T[] };

/**
 * Drag cards between pipeline columns. Every card also opens a detail panel
 * with a status menu, so moving work never depends on dragging.
 */
export function Kanban<T extends { _id: string }>({
  columns,
  renderCard,
  onMove,
  onOpen,
}: {
  columns: Column<T>[];
  renderCard: (item: T) => ReactNode;
  onMove: (id: string, to: string) => void;
  onOpen: (item: T) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const all = columns.flatMap((c) => c.items);
  const active = activeId ? all.find((i) => i._id === activeId) : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const from = columns.find((c) => c.items.some((i) => i._id === e.active.id))?.key;
    const to = String(e.over.id);
    if (from && from !== to) onMove(String(e.active.id), to);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-thin md:mx-0 md:px-0">
        <div className="grid min-w-[64rem] auto-cols-fr grid-flow-col gap-3">
          {columns.map((col) => (
            <KanbanColumn key={col.key} column={col}>
              {col.items.map((item) => (
                <DraggableCard key={item._id} id={item._id} onOpen={() => onOpen(item)}>
                  {renderCard(item)}
                </DraggableCard>
              ))}
            </KanbanColumn>
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.25,1,.5,1)" }}>
        {active ? <div className="rotate-1 rounded-[6px] border border-signal bg-a-surface p-3 shadow-2xl">{renderCard(active)}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn<T>({ column, children }: { column: Column<T>; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.label}, ${column.items.length} items`}
      className={cn("flex min-h-[24rem] flex-col rounded-[6px] border bg-a-raised transition-colors", isOver ? "border-signal bg-a-accent-soft" : "border-a-line")}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <Badge tone={column.tone} dot>
          {column.label}
        </Badge>
        <span className="font-mono text-[0.72rem] tabular text-a-faint">{column.items.length}</span>
      </header>
      <div className="flex flex-1 flex-col gap-2 px-2 pb-2">{children}</div>
    </section>
  );
}

function DraggableCard({ id, children, onOpen }: { id: string; children: ReactNode; onOpen: () => void }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
        listeners?.onKeyDown?.(e);
      }}
      className={cn(
        "cursor-grab rounded-[5px] border border-a-line bg-a-surface p-3 text-start shadow-[0_1px_0_rgb(0_0_0/0.03)] transition-[border-color,opacity] hover:border-a-line-strong focus-visible:outline-2 focus-visible:outline-signal active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {children}
    </div>
  );
}
