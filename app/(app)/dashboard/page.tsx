import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import { computeDueStatus } from "@/lib/fees";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totalSeats, occupiedSeats, activeStudents, studentsWithPayments] =
    await Promise.all([
      prisma.seat.count({ where: { isActive: true } }),
      prisma.seat.count({ where: { isActive: true, currentStudent: { isNot: null } } }),
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.student.findMany({
        where: { status: "ACTIVE" },
        include: { seat: true, payments: true },
      }),
    ]);

  const vacantSeats = totalSeats - occupiedSeats;

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
    .sort((a, b) => {
      if (a.due.status !== b.due.status) {
        return a.due.status === "OVERDUE" ? -1 : 1;
      }
      // Most overdue (most negative daysUntilDue) first.
      return a.due.daysUntilDue - b.due.daysUntilDue;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">A quick look at how the library is doing.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total seats" value={totalSeats} />
        <StatCard label="Vacant seats" value={vacantSeats} />
        <StatCard label="Active students" value={activeStudents} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fees due</CardTitle>
        </CardHeader>
        <CardContent>
          {dues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending dues right now.</p>
          ) : (
            <div className="space-y-3">
              {dues.map(({ student, due }) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/students/${student.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {student.name}
                      </Link>
                      {student.seat && (
                        <span className="text-xs text-muted-foreground">
                          Seat {student.seat.seatNumber}
                        </span>
                      )}
                      {due.status === "OVERDUE" ? (
                        <Badge className="bg-red-500 text-white hover:bg-red-500">
                          {-due.daysUntilDue}d overdue
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                          Due soon
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fee {formatCurrency(due.effectiveFee)}
                      {due.paidTowardsCurrentPeriod > 0 && (
                        <> &middot; Paid {formatCurrency(due.paidTowardsCurrentPeriod)} this period</>
                      )}
                      {" "}&middot; Owes{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(due.amountOwed)}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <RecordPaymentDialog
                      studentId={student.id}
                      studentName={student.name}
                      defaultAmount={due.amountOwed}
                      defaultMonthsCovered={due.monthsOwed}
                      triggerLabel="Mark Paid"
                    />
                    <Button variant="outline" size="sm" render={<Link href={`/students/${student.id}`} />}>
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
