import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </form>
  );
}
