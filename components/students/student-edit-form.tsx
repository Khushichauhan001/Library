"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStudent } from "@/lib/actions/students";

interface Props {
  studentId: string;
  initialName: string;
  initialPhone: string;
  initialMonthlyFee: number;
  initialCustomFee: number | null;
}

export function StudentEditForm({
  studentId,
  initialName,
  initialPhone,
  initialMonthlyFee,
  initialCustomFee,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [monthlyFee, setMonthlyFee] = useState(String(initialMonthlyFee));
  const [customFee, setCustomFee] = useState(
    initialCustomFee != null ? String(initialCustomFee) : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const feeValue = Number(monthlyFee);
    if (!name.trim() || !phone.trim() || Number.isNaN(feeValue)) {
      toast.error("Please fill in a valid name, phone, and monthly fee.");
      return;
    }
    setIsSubmitting(true);
    const result = await updateStudent({
      studentId,
      name,
      phone,
      monthlyFee: feeValue,
      customFee: customFee ? Number(customFee) : null,
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not save changes.");
      return;
    }
    toast.success("Student updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">Name</Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-phone">Phone</Label>
          <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-fee">Monthly fee (₹)</Label>
          <Input
            id="edit-fee"
            type="number"
            min="0"
            step="1"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-custom-fee">Custom fee override (₹)</Label>
          <Input
            id="edit-custom-fee"
            type="number"
            min="0"
            step="1"
            value={customFee}
            onChange={(e) => setCustomFee(e.target.value)}
            placeholder="Leave blank to use the monthly fee"
          />
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
