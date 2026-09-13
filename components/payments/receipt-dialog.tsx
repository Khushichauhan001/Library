"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";

const LIBRARY_NAME = "Study Library";

export interface ReceiptData {
  receiptNo: string;
  studentName: string;
  seatNumber: number | null;
  periodMonth: Date;
  amount: number;
  mode: string;
  paidOn: Date;
  status: string;
}

export function ReceiptDialog({ receipt }: { receipt: ReceiptData }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Receipt</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <div id="receipt-print-area">
          <DialogHeader>
            <DialogTitle>{LIBRARY_NAME}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <Row label="Receipt No." value={receipt.receiptNo} />
            <Row label="Student" value={receipt.studentName} />
            <Row label="Seat" value={receipt.seatNumber ? `Seat ${receipt.seatNumber}` : "—"} />
            <Row label="Period" value={formatDate(receipt.periodMonth)} />
            <Row label="Amount" value={formatCurrency(receipt.amount)} />
            <Row label="Mode" value={receipt.mode} />
            <Row label="Paid on" value={formatDate(receipt.paidOn)} />
            <Row label="Status" value={receipt.status} />
          </div>
        </div>
        <DialogFooter className="print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button type="button" onClick={() => window.print()}>
            Print
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Print-only CSS: when printing, hide everything on the page except
          the receipt content itself, wherever it happens to be in the DOM
          (the Dialog renders into a portal at the document root). */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area,
          #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: fixed;
            inset: 0;
            top: 2rem;
            left: 2rem;
          }
        }
      `}</style>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
