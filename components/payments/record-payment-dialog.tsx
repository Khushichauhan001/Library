"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordPayment } from "@/lib/actions/payments";
import type { PaymentMode } from "@prisma/client";

const PAYMENT_MODES: PaymentMode[] = ["CASH", "UPI", "CARD", "OTHER"];

interface Props {
  studentId: string;
  studentName: string;
  defaultAmount: number;
  defaultMonthsCovered?: number;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "xs";
}

/**
 * Shared "record a payment" dialog, reused from the Dashboard's dues list
 * and the Fees page's per-student row. Pre-fills amount/months from the
 * currently computed due status, but the admin can override either (e.g.
 * to record an advance payment covering more months).
 */
export function RecordPaymentDialog({
  studentId,
  studentName,
  defaultAmount,
  defaultMonthsCovered = 1,
  triggerLabel = "Mark paid",
  triggerVariant = "default",
  triggerSize = "sm",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [monthsCovered, setMonthsCovered] = useState(String(defaultMonthsCovered));
  const [mode, setMode] = useState<PaymentMode>("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setAmount(String(defaultAmount));
      setMonthsCovered(String(defaultMonthsCovered));
      setMode("CASH");
    }
    setOpen(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountValue = Number(amount);
    const monthsValue = Number(monthsCovered);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error("Enter a valid amount greater than zero.");
      return;
    }
    if (!Number.isInteger(monthsValue) || monthsValue < 1) {
      toast.error("Months covered must be a whole number of at least 1.");
      return;
    }

    setIsSubmitting(true);
    const result = await recordPayment({
      studentId,
      amount: amountValue,
      mode,
      monthsCovered: monthsValue,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Could not record payment.");
      return;
    }

    toast.success(`Payment recorded for ${studentName}.`);
    router.refresh();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant={triggerVariant} size={triggerSize} />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment - {studentName}</DialogTitle>
          <DialogDescription>
            Enter what was actually collected. If it&apos;s less than what&apos;s owed
            for the months covered, it&apos;s recorded as a partial payment and
            the due date won&apos;t move.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="payment-amount">Amount (₹)</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment-months">Months covered</Label>
              <Input
                id="payment-months"
                type="number"
                min="1"
                step="1"
                value={monthsCovered}
                onChange={(e) => setMonthsCovered(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-mode">Mode</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as PaymentMode)}>
                <SelectTrigger id="payment-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
