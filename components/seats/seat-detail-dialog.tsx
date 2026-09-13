"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  assignStudentToSeat,
  markStudentLeft,
  changeStudentSeat,
} from "@/lib/actions/seats";
import type { SeatSummary } from "./types";

interface Props {
  seat: SeatSummary | null;
  vacantSeats: SeatSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type View = "details" | "assign" | "change-seat";

export function SeatDetailDialog({ seat, vacantSeats, open, onOpenChange }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>("details");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [customFee, setCustomFee] = useState("");

  // Change seat state
  const [targetSeatId, setTargetSeatId] = useState<string>("");

  function resetAndClose(nextOpen: boolean) {
    if (!nextOpen) {
      setView("details");
      setName("");
      setPhone("");
      setMonthlyFee("");
      setCustomFee("");
      setTargetSeatId("");
    }
    onOpenChange(nextOpen);
  }

  if (!seat) return null;

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!seat) return;
    const feeValue = Number(monthlyFee);
    if (!name.trim() || !phone.trim() || !monthlyFee || Number.isNaN(feeValue)) {
      toast.error("Please fill in name, phone, and a valid monthly fee.");
      return;
    }
    setIsSubmitting(true);
    const result = await assignStudentToSeat({
      seatId: seat.id,
      name,
      phone,
      monthlyFee: feeValue,
      customFee: customFee ? Number(customFee) : null,
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not assign student.");
      return;
    }
    toast.success(`${name} assigned to seat ${seat.seatNumber}.`);
    router.refresh();
    resetAndClose(false);
  }

  async function handleMarkLeft() {
    if (!seat?.currentStudent) return;
    setIsSubmitting(true);
    const result = await markStudentLeft(seat.currentStudent.id);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not update student.");
      return;
    }
    toast.success(`${seat.currentStudent.name} marked as left. Seat ${seat.seatNumber} is now vacant.`);
    router.refresh();
    resetAndClose(false);
  }

  async function handleChangeSeat() {
    if (!seat?.currentStudent || !targetSeatId) return;
    setIsSubmitting(true);
    const result = await changeStudentSeat(seat.currentStudent.id, targetSeatId);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not change seat.");
      return;
    }
    toast.success("Seat changed.");
    router.refresh();
    resetAndClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent>
        {view === "details" && (
          <>
            <DialogHeader>
              <DialogTitle>Seat {seat.seatNumber}</DialogTitle>
              <DialogDescription>
                {seat.currentStudent ? "Occupied" : "Vacant"}
              </DialogDescription>
            </DialogHeader>

            {seat.currentStudent ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">{seat.currentStudent.name}</p>
                  <p className="text-muted-foreground">{seat.currentStudent.phone}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground">Joined</p>
                    <p>{formatDate(seat.currentStudent.joinDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly fee</p>
                    <p>
                      {formatCurrency(
                        seat.currentStudent.customFee ?? seat.currentStudent.monthlyFee
                      )}
                      {seat.currentStudent.customFee != null && (
                        <span className="ml-1 text-xs text-muted-foreground">(custom)</span>
                      )}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/students/${seat.currentStudent.id}`}
                  className="text-primary underline underline-offset-4"
                >
                  View full student profile &amp; payment history
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This seat is currently free.
              </p>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {!seat.currentStudent ? (
                <Button onClick={() => setView("assign")} className="w-full">
                  Assign new student
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setView("change-seat")}
                  >
                    Change seat
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleMarkLeft}
                    disabled={isSubmitting}
                  >
                    Mark as left
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}

        {view === "assign" && (
          <>
            <DialogHeader>
              <DialogTitle>Assign student to seat {seat.seatNumber}</DialogTitle>
              <DialogDescription>
                Creates a new student record and seats them here.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssign} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="student-name">Name</Label>
                <Input id="student-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-phone">Phone</Label>
                <Input id="student-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly-fee">Monthly fee (₹)</Label>
                <Input
                  id="monthly-fee"
                  type="number"
                  min="0"
                  step="1"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom-fee">Custom fee override (₹, optional)</Label>
                <Input
                  id="custom-fee"
                  type="number"
                  min="0"
                  step="1"
                  value={customFee}
                  onChange={(e) => setCustomFee(e.target.value)}
                  placeholder="Leave blank to use the monthly fee above"
                />
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Assigning..." : "Assign student"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setView("details")}
                >
                  Back
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {view === "change-seat" && seat.currentStudent && (
          <>
            <DialogHeader>
              <DialogTitle>Move {seat.currentStudent.name}</DialogTitle>
              <DialogDescription>
                Choose a vacant seat to move this student to.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {vacantSeats.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No vacant seats are available right now.
                </p>
              ) : (
                <Select
                  value={targetSeatId}
                  onValueChange={(value) => setTargetSeatId(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a vacant seat" />
                  </SelectTrigger>
                  <SelectContent>
                    {vacantSeats.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        Seat {s.seatNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                className="w-full"
                onClick={handleChangeSeat}
                disabled={isSubmitting || !targetSeatId}
              >
                {isSubmitting ? "Moving..." : "Move student"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setView("details")}
              >
                Back
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
