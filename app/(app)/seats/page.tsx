import { prisma } from "@/lib/prisma";
import { SeatGrid } from "@/components/seats/seat-grid";
import type { SeatSummary } from "@/components/seats/types";

export const dynamic = "force-dynamic";

export default async function SeatsPage() {
  const seats = await prisma.seat.findMany({
    orderBy: { seatNumber: "asc" },
    include: { currentStudent: true },
  });

  const seatSummaries: SeatSummary[] = seats.map((seat) => ({
    id: seat.id,
    seatNumber: seat.seatNumber,
    isActive: seat.isActive,
    currentStudent: seat.currentStudent
      ? {
          id: seat.currentStudent.id,
          name: seat.currentStudent.name,
          phone: seat.currentStudent.phone,
          status: seat.currentStudent.status,
          monthlyFee: Number(seat.currentStudent.monthlyFee),
          customFee:
            seat.currentStudent.customFee != null
              ? Number(seat.currentStudent.customFee)
              : null,
          joinDate: seat.currentStudent.joinDate.toISOString(),
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Seats</h1>
        <p className="text-sm text-muted-foreground">
          Tap a seat to assign a student, mark them as left, or move them.
        </p>
      </div>
      <SeatGrid seats={seatSummaries} />
    </div>
  );
}
