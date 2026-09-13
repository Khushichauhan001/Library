import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeDueStatus, type DueStatus } from "@/lib/fees";
import { formatCurrency, formatDate } from "@/lib/format";
import { ReportExports, type OverdueExportRow, type PaymentExportRow } from "@/components/reports/report-exports";

export const dynamic = "force-dynamic";

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export default async function ReportsPage() {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);

  // Last 6 calendar months, oldest first, including the current month.
  const monthStarts: Date[] = [];
  for (let i = 5; i >= 0; i--) {
    monthStarts.push(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    );
  }
  const earliestMonthStart = monthStarts[0];

  const [studentsWithPayments, paymentsInRange] = await Promise.all([
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      include: { seat: true, payments: true },
    }),
    prisma.payment.findMany({
      where: { paidOn: { gte: earliestMonthStart } },
      select: { amount: true, paidOn: true },
    }),
  ]);

  const monthlyTotals = monthStarts.map((monthStart) => {
    const monthEnd = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)
    );
    const total = paymentsInRange
      .filter((p) => p.paidOn >= monthStart && p.paidOn < monthEnd)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { monthStart, total };
  });

  const thisMonthTotal = monthlyTotals[monthlyTotals.length - 1]?.total ?? 0;

  const dues = studentsWithPayments
    .map((student) => {
      const due = computeDueStatus({
        joinDate: student.joinDate,
        monthlyFee: Number(student.monthlyFee),
        customFee: student.customFee != null ? Number(student.customFee) : null,
        payments: student.payments.map((p) => ({
          status: p.status,
          periodMonth: p.periodMonth,
          amount: Number(p.amount),
          dueDateAfter: p.dueDateAfter,
        })),
      });
      return { student, due };
    })
    .filter(
      ({ due }) =>
        (due.status === "DUE_SOON" || due.status === "OVERDUE") && due.amountOwed > 0
    )
    .sort((a, b) => a.due.daysUntilDue - b.due.daysUntilDue);

  // This month's payments, for CSV export (join a couple of student fields).
  const thisMonthPayments = await prisma.payment.findMany({
    where: { paidOn: { gte: thisMonthStart } },
    include: { student: { include: { seat: true } } },
    orderBy: { paidOn: "desc" },
  });

  const paymentExportRows: PaymentExportRow[] = thisMonthPayments.map((p) => ({
    receiptNo: p.receiptNo,
    studentName: p.student.name,
    seatNumber: p.student.seat?.seatNumber ?? null,
    periodMonth: p.periodMonth.toISOString(),
    paidOn: p.paidOn.toISOString(),
    amount: Number(p.amount),
    mode: p.mode,
    status: p.status,
  }));

  const overdueExportRows: OverdueExportRow[] = dues.map(({ student, due }) => ({
    studentName: student.name,
    seatNumber: student.seat?.seatNumber ?? null,
    status: due.status,
    daysOverdue: due.status === "OVERDUE" ? -due.daysUntilDue : 0,
    amountOwed: due.amountOwed,
    effectiveFee: due.effectiveFee,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Collection totals and dues, exportable as CSV.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">This month&apos;s collection</p>
            <p className="text-3xl font-semibold">{formatCurrency(thisMonthTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Students with dues</p>
            <p className="text-3xl font-semibold">{dues.length}</p>
          </CardContent>
        </Card>
      </div>

      <ReportExports paymentRows={paymentExportRows} overdueRows={overdueExportRows} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 6 months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Collected</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTotals.map(({ monthStart, total }) => (
                  <tr key={monthStart.toISOString()} className="border-t">
                    <td className="px-4 py-3">
                      {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
                        monthStart
                      )}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Due soon &amp; overdue students</CardTitle>
        </CardHeader>
        <CardContent>
          {dues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending dues right now.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Seat</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3">Owed</th>
                    <th className="px-4 py-3">Due date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dues.map(({ student, due }) => (
                    <tr key={student.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/students/${student.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {student.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {student.seat ? `Seat ${student.seat.seatNumber}` : "—"}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(due.effectiveFee)}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(due.amountOwed)}</td>
                      <td className="px-4 py-3">{formatDate(due.currentDueDate)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={due.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: DueStatus }) {
  if (status === "DUE_SOON") {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Due soon</Badge>;
  }
  return <Badge className="bg-red-500 text-white hover:bg-red-500">Overdue</Badge>;
}
