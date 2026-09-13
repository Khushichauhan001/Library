"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SeatDetailDialog } from "./seat-detail-dialog";
import type { SeatSummary } from "./types";

interface Props {
  seats: SeatSummary[];
}

export function SeatGrid({ seats }: Props) {
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const selectedSeat = seats.find((s) => s.id === selectedSeatId) ?? null;
  const vacantSeats = useMemo(
    () => seats.filter((s) => s.isActive && !s.currentStudent && s.id !== selectedSeatId),
    [seats, selectedSeatId]
  );

  const vacantCount = seats.filter((s) => s.isActive && !s.currentStudent).length;
  const occupiedCount = seats.filter((s) => s.isActive && s.currentStudent).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Legend colorClass="bg-emerald-500" label={`Vacant (${vacantCount})`} />
        <Legend colorClass="bg-blue-500" label={`Occupied (${occupiedCount})`} />
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10 md:grid-cols-14 lg:grid-cols-16">
        {seats.map((seat) => (
          <button
            key={seat.id}
            onClick={() => {
              setSelectedSeatId(seat.id);
              setOpen(true);
            }}
            className={cn(
              "flex aspect-square min-h-9 items-center justify-center rounded-md text-[0.7rem] font-semibold text-white transition-transform active:scale-95",
              !seat.isActive
                ? "bg-muted text-muted-foreground"
                : seat.currentStudent
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-emerald-500 hover:bg-emerald-600"
            )}
          >
            {seat.seatNumber}
          </button>
        ))}
      </div>

      <SeatDetailDialog
        seat={selectedSeat}
        vacantSeats={vacantSeats}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

function Legend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-sm", colorClass)} />
      {label}
    </span>
  );
}
