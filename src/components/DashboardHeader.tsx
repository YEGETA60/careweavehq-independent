import { Search, Settings, User, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { AiCoPilot } from "@/components/AiCoPilot";

interface Props { onMenuClick?: () => void }

export function DashboardHeader({ onMenuClick }: Props) {
  const { user, roles, signOut } = useAuth();
  return (
    <header className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border sticky top-0 z-30">
      <div className="h-14 md:h-16 px-3 md:px-6 flex items-center justify-between gap-3">
        {/* Left: menu + brand */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden -ml-1 h-9 w-9"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-border/40">
              <span className="text-primary-foreground font-bold text-[10px] tracking-tight">CWHQ</span>
            </div>
            <div className="min-w-0 leading-tight">
              <h1
                className="text-[15px] md:text-lg font-semibold text-foreground truncate"
                style={{ fontFamily: "'Playfair Display', ui-serif, Georgia, serif", letterSpacing: "-0.01em" }}
              >
                CareWeaveHQ
              </h1>
              <p className="text-[11px] text-muted-foreground hidden md:block">Home Care Operating System</p>
            </div>
          </div>
        </div>

        {/* Center: search (desktop only) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
            <Input
              placeholder="Search clients, caregivers, visits…"
              className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-input"
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>

          <NotificationBell />

          <Separator orientation="vertical" className="hidden sm:block h-6 mx-1" />

          <AiCoPilot />

          <Separator orientation="vertical" className="hidden sm:block h-6 mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Account menu">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user?.email ?? user?.phone ?? "My Account"}</DropdownMenuLabel>
              <div className="px-2 pb-1 text-xs text-muted-foreground">
                {roles.length
                  ? roles
                      .map((r) =>
                        r === "operations_manager"
                          ? "Operations Manager"
                          : r.charAt(0).toUpperCase() + r.slice(1)
                      )
                      .join(", ")
                  : "no role assigned"}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}