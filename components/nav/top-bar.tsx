import { ThemeToggle } from "./theme-toggle";
import { LogoutButton } from "./logout-button";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <span className="font-semibold">Study Library</span>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
