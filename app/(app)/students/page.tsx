import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { computeDueStatus, type DueStatus } from "@/lib/fees";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: string;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q = "", status = "ALL" } = await searchParams;

  const where: Prisma.StudentWhereInput = {};

  if (status === "ACTIVE" || status === "LEFT") {
    where.status = status;
  }

  if (q.trim()) {
    where.OR = [
      { name: { contains: q.trim(), mode: "insensitive" } },
      { seat: { seatNumber: Number.isNaN(Number(q.trim())) ? -1 : Number(q.trim()) } },
    ];
  }

  const students = await prisma.student.findMany({
    where,
    include: { seat: true, payments: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Students</h1>
        <p className="text-sm text-muted-foreground">
          Search by name or seat number, and filter by status.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row" method="get">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by name or seat number..."
          className="sm:max-w-xs"
        />
        <div className="flex gap-2">
          <StatusLink current={status} value="ALL" q={q} label="All" />
          <StatusLink current={status} value="ACTIVE" q={q} label="Active" />
          <StatusLink current={status} value="LEFT" q={q} label="Left" />
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Seat</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">This month</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/students/${student.id}`} className="font-medium underline-offset-4 hover:underline">
                    {student.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{student.phone}</p>
                </td>
                <td className="px-4 py-3">
                  {student.seat ? `Seat ${student.seat.seatNumber}` : "—"}
                </td>
                <td className="px-4 py-3">
                  {formatCurrency(Number(student.customFee ?? student.monthlyFee))}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={student.status === "ACTIVE" ? "default" : "secondary"}>
                    {student.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {student.status === "ACTIVE" ? (
                    <PaymentStatusBadge
                      status={
                        computeDueStatus({
                          joinDate: student.joinDate,
                          monthlyFee: Number(student.monthlyFee),
                          customFee: student.customFee != null ? Number(student.customFee) : null,
                          payments: student.payments.map((p) => ({
                            status: p.status,
                            periodMonth: p.periodMonth,
                            amount: Number(p.amount),
                            dueDateAfter: p.dueDateAfter,
                          })),
                        }).status
                      }
                    />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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

function StatusLink({
  current,
  value,
  q,
  label,
}: {
  current: string;
  value: string;
  q: string;
  label: string;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (value !== "ALL") params.set("status", value);
  const href = `/students${params.toString() ? `?${params.toString()}` : ""}`;
  const active = current === value;

  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-2 text-sm ${
        active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function PaymentStatusBadge({ status }: { status: DueStatus }) {
  if (status === "OK") {
    return <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">Paid up</Badge>;
  }
  if (status === "DUE_SOON") {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Due soon</Badge>;
  }
  return <Badge className="bg-red-500 text-white hover:bg-red-500">Overdue</Badge>;
}
