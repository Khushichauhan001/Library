"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface PaymentExportRow {
  receiptNo: string;
  studentName: string;
  seatNumber: number | null;
  periodMonth: string; // ISO date
  paidOn: string; // ISO date
  amount: number;
  mode: string;
  status: string;
}

export interface OverdueExportRow {
  studentName: string;
  seatNumber: number | null;
  status: string;
  daysOverdue: number;
  amountOwed: number;
  effectiveFee: number;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const s = String(value);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReportExports({
  paymentRows,
  overdueRows,
}: {
  paymentRows: PaymentExportRow[];
  overdueRows: OverdueExportRow[];
}) {
  function exportPayments() {
    const csv = toCsv(
      ["Receipt No", "Student", "Seat", "Period", "Paid On", "Amount", "Mode", "Status"],
      paymentRows.map((r) => [
        r.receiptNo,
        r.studentName,
        r.seatNumber ?? "",
        r.periodMonth.slice(0, 10),
        r.paidOn.slice(0, 10),
        r.amount,
        r.mode,
        r.status,
      ])
    );
    downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  function exportOverdue() {
    const csv = toCsv(
      ["Student", "Seat", "Status", "Days Overdue", "Amount Owed", "Effective Fee"],
      overdueRows.map((r) => [
        r.studentName,
        r.seatNumber ?? "",
        r.status,
        r.daysOverdue,
        r.amountOwed,
        r.effectiveFee,
      ])
    );
    downloadCsv(`overdue-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exports</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportPayments} disabled={paymentRows.length === 0}>
          Export this month&apos;s payments
        </Button>
        <Button variant="outline" onClick={exportOverdue} disabled={overdueRows.length === 0}>
          Export overdue list
        </Button>
      </CardContent>
    </Card>
  );
}
