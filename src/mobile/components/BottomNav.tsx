import { NavLink } from "react-router-dom";
import { Calendar, Home, MessageSquare, User } from "lucide-react";

const items = [
  { to: "/m/today", label: "Today", icon: Home },
  { to: "/m/schedule", label: "Schedule", icon: Calendar },
  { to: "/m/messages", label: "Messages", icon: MessageSquare },
  { to: "/m/me", label: "Me", icon: User },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border safe-area-bottom">
      <div className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2.5 text-xs ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5 mb-1" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}