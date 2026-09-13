export interface StudentSummary {
  id: string;
  name: string;
  phone: string;
  status: "ACTIVE" | "LEFT";
  monthlyFee: number;
  customFee: number | null;
  joinDate: string; // ISO date string
}

export interface SeatSummary {
  id: string;
  seatNumber: number;
  isActive: boolean;
  currentStudent: StudentSummary | null;
}
