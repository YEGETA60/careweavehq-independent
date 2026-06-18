import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

const ALL_ROLES: AppRole[] = [
  "admin",
  "manager",
  "operations_manager",
  "supervisor",
  "scheduler",
  "caregiver",
  "billing",
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  operations_manager: "Operations Manager",
  supervisor: "Supervisor",
  scheduler: "Scheduler",
  caregiver: "Caregiver",
  billing: "Billing",
};

interface UserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  roles: AppRole[];
  created_at: string;
}

export function UserAdmin() {
  const { hasRole, user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_users_with_roles");
    if (error) toast.error(error.message);
    else setUsers((data ?? []) as UserRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!hasRole("admin")) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
        <h2 className="text-xl font-semibold">Admins only</h2>
      </div>
    );
  }

  const toggleRole = async (uid: string, role: AppRole, on: boolean) => {
    if (uid === me?.id && role === "admin" && !on) {
      const adminCount = users.filter(u => u.roles.includes("admin")).length;
      if (adminCount <= 1) return toast.error("You can't remove the last admin");
    }
    if (on) {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (error) return toast.error(error.message);
      logAudit("grant_role", "user", uid, { role });
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
      if (error) return toast.error(error.message);
      logAudit("revoke_role", "user", uid, { role });
    }
    refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Users & Roles</CardTitle>
          <CardDescription>Assign roles to staff. Users without a role have no access.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  {ALL_ROLES.map(r => (
                    <TableHead key={r} className="text-center">{ROLE_LABELS[r] ?? r}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      {u.roles.length === 0 && <Badge variant="destructive" className="mt-1">no role</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.phone || "—"}</TableCell>
                    {ALL_ROLES.map(r => (
                      <TableCell key={r} className="text-center">
                        <Checkbox
                          checked={u.roles.includes(r)}
                          onCheckedChange={(v) => toggleRole(u.user_id, r, !!v)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            New staff sign up at <code>/auth</code>; come back here to grant their role.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}