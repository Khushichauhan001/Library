"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { deleteStudent } from "@/lib/actions/students";

interface Props {
  studentId: string;
  studentName: string;
  seatNumber: number | null;
  paymentCount: number;
  paymentTotal: number;
}

/**
 * Confirmation for permanently deleting a student.
 *
 * Deliberately spells out both halves of what happens, because the two are
 * easy to confuse: the student and their receipts are gone for good, but the
 * money they already paid stays counted in the months it was collected in.
 * Anything softer than a permanent delete is what "Mark as left" is for.
 */
export function DeleteStudentDialog({
  studentId,
  studentName,
  seatNumber,
  paymentCount,
  paymentTotal,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteStudent(studentId);
    setIsDeleting(false);

    if (!result.success) {
      toast.error(result.error ?? "Could not delete this student.");
      return;
    }

    toast.success(`${studentName} deleted.`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="destructive" size="sm" aria-label={`Delete ${studentName}`} />}
      >
        <Trash2Icon />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {studentName}?</DialogTitle>
          <DialogDescription>
            This removes them permanently. Use &quot;Left&quot; instead if they might
            come back.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span aria-hidden>•</span>
            <span>
              Their entry and{" "}
              {paymentCount === 0 ? (
                <>no payment records (they have none)</>
              ) : (
                <>
                  all <span className="font-medium">{paymentCount}</span> of their
                  payment receipts
                </>
              )}{" "}
              will be erased.
            </span>
          </li>
          {seatNumber != null && (
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>
                Seat <span className="font-medium">{seatNumber}</span> becomes vacant.
              </span>
            </li>
          )}
          {paymentTotal > 0 && (
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>
                The {formatCurrency(paymentTotal)} they already paid{" "}
                <span className="font-medium">stays in your revenue</span> for the
                months it was collected in. Past months will not change.
              </span>
            </li>
          )}
          <li className="flex gap-2">
            <span aria-hidden>•</span>
            <span>
              From now on they are gone from dues, fees, and the seat count.
            </span>
          </li>
        </ul>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
