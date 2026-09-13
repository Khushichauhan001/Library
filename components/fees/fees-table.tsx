"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import { bulkMarkPaid } from "@/lib/actions/payments";
import type { DueStatus } from "@/lib/fees";
import type { PaymentMode } from "@prisma/client";

export interface FeeRow {
  id: string;
  name: string;
  seatNumber: number | null;
  effectiveFee: number;
  paidThisPeriod: number;
  amountOwed: number;
  monthsOwed: number;
  status: DueStatus;
}

const PAYMENT_MODES: PaymentMode[] = ["CASH", "UPI", "CARD", "OTHER"];

export function FeesTable({ rows }: { rows: FeeRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<PaymentMode>("CASH");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true;
      if (r.seatNumber != null && String(r.seatNumber) === q) return true;
      return false;
    });
  }, [rows, search]);

  const selectableIds = useMemo(
    () => new Set(filteredRows.filter((r) => r.amountOwed > 0).map((r) => r.id)),
    [filteredRows]
  );

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedTotal = selectedRows.reduce((sum, r) => sum + r.amountOwed, 0);

  const allSelectableSelected =
    selectableIds.size > 0 &&
    [...selectableIds].every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelectableSelected) {
        const next = new Set(prev);
        for (const id of selectableIds) next.delete(id);
        return next;
      }
      return new Set([...prev, ...selectableIds]);
    });
  }

  async function handleBulkMarkPaid() {
    if (selectedRows.length === 0) return;
    const confirmed = window.confirm(
      `Mark ${selectedRows.length} student(s) as paid for a total of ${formatCurrency(selectedTotal)}?`
    );
    if (!confirmed) return;

    setIsBulkSubmitting(true);
    const result = await bulkMarkPaid({
      studentIds: selectedRows.map((r) => r.id),
      mode: bulkMode,
    });
    setIsBulkSubmitting(false);

    if (result.succeeded.length > 0) {
      toast.success(`Marked ${result.succeeded.length} student(s) as paid.`);
    }
    if (result.failed.length > 0) {
      toast.error(
        `${result.failed.length} failed: ${result.failed
          .map((f) => f.error)
          .slice(0, 3)
          .join("; ")}`
      );
    }
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name or seat number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:max-w-xs"
      />

      {selected.size > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-medium">{selected.size} selected</span> &middot; total{" "}
            {formatCurrency(selectedTotal)}
          </p>
          <div className="flex items-center gap-2">
            <Select value={bulkMode} onValueChange={(value) => setBulkMode(value as PaymentMode)}>
              <SelectTrigger className="w-28">
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
            <Button onClick={handleBulkMarkPaid} disabled={isBulkSubmitting}>
              {isBulkSubmitting ? "Marking..." : `Mark ${selected.size} as paid`}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={allSelectableSelected}
                  onChange={toggleAll}
                  disabled={selectableIds.size === 0}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Seat</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Paid this period</th>
              <th className="px-4 py-3">Owed</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    disabled={row.amountOwed <= 0}
                    aria-label={`Select ${row.name}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/students/${row.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.seatNumber ? `Seat ${row.seatNumber}` : "—"}</td>
                <td className="px-4 py-3">{formatCurrency(row.effectiveFee)}</td>
                <td className="px-4 py-3">
                  {row.paidThisPeriod > 0 ? formatCurrency(row.paidThisPeriod) : "—"}
                </td>
                <td className="px-4 py-3">
                  {row.amountOwed > 0 ? (
                    <span className="font-medium">{formatCurrency(row.amountOwed)}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3">
                  {row.amountOwed > 0 && (
                    <RecordPaymentDialog
                      studentId={row.id}
                      studentName={row.name}
                      defaultAmount={row.amountOwed}
                      defaultMonthsCovered={row.monthsOwed}
                      triggerLabel="Record payment"
                      triggerVariant="outline"
                    />
                  )}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DueStatus }) {
  if (status === "OK") {
    return <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">Paid up</Badge>;
  }
  if (status === "DUE_SOON") {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Due soon</Badge>;
  }
  return <Badge className="bg-red-500 text-white hover:bg-red-500">Overdue</Badge>;
}
