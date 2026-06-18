import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

export function Me() {
  const { user, signOut } = useAuth();
  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">Me</h1>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-medium">{user?.email}</p>
      </Card>
      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>
    </div>
  );
}